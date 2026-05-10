const queueSchema  = require("../models/station/Queue")
const lockerSchema = require("../models/station/Locker")
const { getStationDB } = require("../config/stationDB")

const OFFER_WINDOW_MS = 15 * 60 * 1000

// ─────────────────────────────────────────────────────────
// MODEL HELPERS
// ─────────────────────────────────────────────────────────

const getQueueModel = (stationId) => {
  const conn = getStationDB(stationId)
  return conn.models.Queue || conn.model("Queue", queueSchema)
}

const getLockerModel = (stationId) => {
  const conn = getStationDB(stationId)
  return conn.models.Locker || conn.model("Locker", lockerSchema)
}

const getOrCreateQueue = async (stationId) => {
  const Queue = getQueueModel(stationId)
  let queue   = await Queue.findOne()
  if (!queue) queue = await Queue.create({})
  return queue
}

const cleanDoneEntries = (queue) => {
  const before = queue.entries.length
  queue.entries = queue.entries.filter((e) =>
    ["waiting", "notified"].includes(e.status)
  )
  if (before - queue.entries.length > 0) {
    console.log(`Queue cleanup: removed ${before - queue.entries.length} done entries`)
  }
}

// ─────────────────────────────────────────────────────────
// LOCKER HOLD HELPERS
// Use findOneAndUpdate to avoid Mongoose cache issues
// ─────────────────────────────────────────────────────────

const setLockerQueueHold = async (stationId, lockerId) => {
  const Locker = getLockerModel(stationId)
  const result = await Locker.findOneAndUpdate(
    { locker_id: lockerId, availability: "available" },
    { $set: { availability: "queue_hold" } },
    { new: true }
  )
  if (result) {
    console.log(`Queue hold SET on locker ${lockerId} at ${stationId}`)
  } else {
    console.log(`Queue hold NOT set on locker ${lockerId} — not available (current state may differ)`)
  }
  return result
}

const setLockerAvailable = async (stationId, lockerId) => {
  // Force locker to available regardless of current hold state
  const Locker = getLockerModel(stationId)
  const result = await Locker.findOneAndUpdate(
    { locker_id: lockerId, availability: "queue_hold" },
    { $set: { availability: "available" } },
    { new: true }
  )
  if (result) {
    console.log(`Queue hold RELEASED on locker ${lockerId} at ${stationId}`)
  }
  return result
}


// ─────────────────────────────────────────────────────────
// OFFER LOCKER TO NEXT PERSON IN QUEUE
// Core internal function — does NOT call expireStaleOffers
// to avoid circular calls
// ─────────────────────────────────────────────────────────
const _offerToNext = async (stationId, lockerId) => {
  const queue = await getOrCreateQueue(stationId)

  // Make sure no one is already notified
  const alreadyNotified = queue.entries.find((e) => e.status === "notified")
  if (alreadyNotified) {
    console.log(`Queue [${stationId}]: someone already notified — skipping`)
    return null
  }

  const nextEntry = queue.entries.find((e) => e.status === "waiting")

  if (!nextEntry) {
    // Queue is empty — ensure locker is available for everyone
    const Locker = getLockerModel(stationId)
    await Locker.findOneAndUpdate(
      { locker_id: lockerId },
      { $set: { availability: "available" } }
    )
    console.log(`Queue [${stationId}]: queue empty — locker ${lockerId} released to available`)
    return null
  }

  // Set queue_hold on locker
  await setLockerQueueHold(stationId, lockerId)

  // Notify the next user
  nextEntry.status           = "notified"
  nextEntry.notified_at      = new Date()
  nextEntry.offered_locker   = lockerId
  nextEntry.offer_expires_at = new Date(Date.now() + OFFER_WINDOW_MS)
  queue.updated_at           = new Date()
  await queue.save()

  console.log(`Queue [${stationId}]: offered locker ${lockerId} to user ${nextEntry.user_id}. Expires: ${nextEntry.offer_expires_at}`)

  return {
    user_id:          nextEntry.user_id,
    offered_locker:   lockerId,
    offer_expires_at: nextEntry.offer_expires_at
  }
}


// ─────────────────────────────────────────────────────────
// EXPIRE STALE OFFERS
// Removes expired notified entry and immediately offers
// the same locker to the next person in queue.
// Repeats until queue is empty or someone accepts.
// ─────────────────────────────────────────────────────────
const expireStaleOffers = async (stationId) => {
  const queue = await getOrCreateQueue(stationId)
  const now   = new Date()

  const expiredEntry = queue.entries.find(
    (e) => e.status === "notified" &&
           e.offer_expires_at &&
           now > e.offer_expires_at
  )

  if (!expiredEntry) return  // nothing to expire

  const expiredLockerId = expiredEntry.offered_locker

  console.log(`Queue [${stationId}]: offer expired for user ${expiredEntry.user_id} on locker ${expiredLockerId}`)

  // Remove the expired entry
  expiredEntry.status = "expired"
  cleanDoneEntries(queue)
  queue.updated_at = new Date()
  await queue.save()

  // Release hold so we can re-offer
  await setLockerAvailable(stationId, expiredLockerId)

  // Offer same locker to next person immediately
  await _offerToNext(stationId, expiredLockerId)
}


// ─────────────────────────────────────────────────────────
// JOIN QUEUE
// ─────────────────────────────────────────────────────────
const joinQueue = async (stationId, userId) => {
  await expireStaleOffers(stationId)
  const queue = await getOrCreateQueue(stationId)

  const alreadyIn = queue.entries.find(
    (e) => e.user_id.toString() === userId.toString()
  )
  if (alreadyIn) {
    return {
      success:  false,
      message:  "You are already in the queue",
      position: queue.entries.indexOf(alreadyIn) + 1
    }
  }

  if (queue.entries.length >= queue.max_size) {
    return { success: false, message: `Queue is full. Maximum size is ${queue.max_size}` }
  }

  queue.entries.push({ user_id: userId, joined_at: new Date(), status: "waiting" })
  queue.updated_at = new Date()
  await queue.save()

  return {
    success:    true,
    message:    "Successfully joined the queue",
    position:   queue.entries.length,
    queue_size: queue.entries.length
  }
}


// ─────────────────────────────────────────────────────────
// LEAVE QUEUE
// If peek user leaves — release hold and offer to next
// ─────────────────────────────────────────────────────────
const leaveQueue = async (stationId, userId) => {
  const queue = await getOrCreateQueue(stationId)

  const leavingEntry = queue.entries.find(
    (e) => e.user_id.toString() === userId.toString()
  )

  if (!leavingEntry) {
    return { success: false, message: "You are not in the queue" }
  }

  const wasNotified   = leavingEntry.status === "notified"
  const offeredLocker = leavingEntry.offered_locker

  // Remove user
  queue.entries    = queue.entries.filter((e) => e.user_id.toString() !== userId.toString())
  queue.updated_at = new Date()
  await queue.save()

  if (wasNotified && offeredLocker) {
    // Release hold then offer to next person
    await setLockerAvailable(stationId, offeredLocker)
    await _offerToNext(stationId, offeredLocker)
  }

  return { success: true, message: "You have left the queue" }
}


// ─────────────────────────────────────────────────────────
// GET QUEUE STATUS
// ─────────────────────────────────────────────────────────
const getQueueStatus = async (stationId, userId) => {
  await expireStaleOffers(stationId)
  const queue = await getOrCreateQueue(stationId)

  const userEntry    = queue.entries.find((e) => e.user_id.toString() === userId.toString())
  const userPosition = userEntry ? queue.entries.indexOf(userEntry) + 1 : null

  return {
    queue_size:       queue.entries.length,
    max_size:         queue.max_size,
    queue_full:       queue.entries.length >= queue.max_size,
    in_queue:         !!userEntry,
    your_position:    userPosition,
    your_status:      userEntry ? userEntry.status : null,
    offered_locker:   userEntry?.status === "notified" ? userEntry.offered_locker   : null,
    offer_expires_at: userEntry?.status === "notified" ? userEntry.offer_expires_at : null
  }
}


// ─────────────────────────────────────────────────────────
// PROCESS NEXT IN QUEUE
// Called externally when a locker first becomes available
// ─────────────────────────────────────────────────────────
const processNextInQueue = async (stationId, lockerId) => {
  await expireStaleOffers(stationId)
  return await _offerToNext(stationId, lockerId)
}


// ─────────────────────────────────────────────────────────
// CONFIRM QUEUE RESERVATION
// User reserved the locker — remove them from queue
// ─────────────────────────────────────────────────────────
const confirmQueueReservation = async (stationId, userId) => {
  const queue      = await getOrCreateQueue(stationId)
  queue.entries    = queue.entries.filter((e) => e.user_id.toString() !== userId.toString())
  queue.updated_at = new Date()
  await queue.save()
}


// ─────────────────────────────────────────────────────────
// GET USER OFFER
// ─────────────────────────────────────────────────────────
const getUserOffer = async (stationId, userId) => {
  const queue = await getOrCreateQueue(stationId)
  const now   = new Date()

  const entry = queue.entries.find(
    (e) => e.user_id.toString() === userId.toString() &&
           e.status === "notified" &&
           e.offer_expires_at > now
  )

  if (!entry) return null

  return {
    offered_locker:   entry.offered_locker,
    offer_expires_at: entry.offer_expires_at
  }
}


module.exports = {
  joinQueue,
  leaveQueue,
  getQueueStatus,
  processNextInQueue,
  confirmQueueReservation,
  getUserOffer,
  expireStaleOffers
}