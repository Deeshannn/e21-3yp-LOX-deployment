const queueSchema  = require("../models/station/Queue")
const lockerSchema = require("../models/station/Locker")
const { getStationDB } = require("../config/stationDB")

const OFFER_WINDOW_MS = 5 * 60 * 1000

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
  let queue = await Queue.findOne()
  if (!queue) queue = await Queue.create({})
  return queue
}

const cleanDoneEntries = (queue) => {
  const before = queue.entries.length
  queue.entries = queue.entries.filter((e) =>
    ["waiting", "notified"].includes(e.status)
  )
  const removed = before - queue.entries.length
  if (removed > 0) {
    console.log(`Queue cleanup: removed ${removed} completed entry/entries`)
  }
}

// ─────────────────────────────────────────────────────────
// SET LOCKER QUEUE HOLD
// Called when peek user is notified — locks the locker
// so only they can reserve it
// ─────────────────────────────────────────────────────────
const setLockerQueueHold = async (stationId, lockerId) => {
  const Locker = getLockerModel(stationId)
  const locker = await Locker.findOne({ locker_id: lockerId })
  if (locker && locker.availability === "available") {
    locker.availability = "queue_hold"
    await locker.save()
    console.log(`Queue hold set on locker ${lockerId} at ${stationId}`)
  }
}

// ─────────────────────────────────────────────────────────
// RELEASE LOCKER QUEUE HOLD
// Called when offer expires or user leaves queue
// Restores locker to available so others can reserve
// ─────────────────────────────────────────────────────────
const releaseLockerQueueHold = async (stationId, lockerId) => {
  if (!lockerId) return
  const Locker = getLockerModel(stationId)
  const locker = await Locker.findOne({ locker_id: lockerId })
  if (locker && locker.availability === "queue_hold") {
    locker.availability = "available"
    await locker.save()
    console.log(`Queue hold released on locker ${lockerId} at ${stationId}`)
  }
}


// ─────────────────────────────────────────────────────────
// EXPIRE STALE OFFERS
// ─────────────────────────────────────────────────────────
const expireStaleOffers = async (stationId) => {
  const queue = await getOrCreateQueue(stationId)
  const now   = new Date()
  let changed = false

  for (const entry of queue.entries) {
    if (
      entry.status === "notified" &&
      entry.offer_expires_at &&
      now > entry.offer_expires_at
    ) {
      // Release the queue_hold on the locker before expiring
      await releaseLockerQueueHold(stationId, entry.offered_locker)

      entry.status = "expired"
      changed = true
      console.log(`Queue [${stationId}]: offer expired for user ${entry.user_id}`)
    }
  }

  if (changed) {
    cleanDoneEntries(queue)
    queue.updated_at = new Date()
    await queue.save()
  }

  return queue
}


// ─────────────────────────────────────────────────────────
// JOIN QUEUE
// ─────────────────────────────────────────────────────────
const joinQueue = async (stationId, userId) => {
  await expireStaleOffers(stationId)
  const freshQueue = await getOrCreateQueue(stationId)

  const alreadyIn = freshQueue.entries.find(
    (e) => e.user_id.toString() === userId.toString()
  )
  if (alreadyIn) {
    const position = freshQueue.entries.indexOf(alreadyIn) + 1
    return { success: false, message: "You are already in the queue", position }
  }

  if (freshQueue.entries.length >= freshQueue.max_size) {
    return {
      success: false,
      message: `Queue is full. Maximum size is ${freshQueue.max_size}`
    }
  }

  freshQueue.entries.push({
    user_id:   userId,
    joined_at: new Date(),
    status:    "waiting"
  })
  freshQueue.updated_at = new Date()
  await freshQueue.save()

  return {
    success:    true,
    message:    "Successfully joined the queue",
    position:   freshQueue.entries.length,
    queue_size: freshQueue.entries.length
  }
}


// ─────────────────────────────────────────────────────────
// LEAVE QUEUE
// Releases queue_hold on locker if user was notified
// ─────────────────────────────────────────────────────────
const leaveQueue = async (stationId, userId) => {
  const queue = await getOrCreateQueue(stationId)

  const leavingEntry = queue.entries.find(
    (e) => e.user_id.toString() === userId.toString()
  )

  if (!leavingEntry) {
    return { success: false, message: "You are not in the queue" }
  }

  // If user was notified, release the queue_hold on their offered locker
  if (leavingEntry.status === "notified" && leavingEntry.offered_locker) {
    await releaseLockerQueueHold(stationId, leavingEntry.offered_locker)
  }

  queue.entries = queue.entries.filter(
    (e) => e.user_id.toString() !== userId.toString()
  )

  queue.updated_at = new Date()
  await queue.save()

  return { success: true, message: "You have left the queue" }
}


// ─────────────────────────────────────────────────────────
// GET QUEUE STATUS
// ─────────────────────────────────────────────────────────
const getQueueStatus = async (stationId, userId) => {
  await expireStaleOffers(stationId)
  const queue = await getOrCreateQueue(stationId)

  const userEntry    = queue.entries.find(
    (e) => e.user_id.toString() === userId.toString()
  )
  const userPosition = userEntry
    ? queue.entries.indexOf(userEntry) + 1
    : null

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
// Sets queue_hold on the locker so only peek user can reserve
// ─────────────────────────────────────────────────────────
const processNextInQueue = async (stationId, lockerId) => {
  await expireStaleOffers(stationId)
  const queue = await getOrCreateQueue(stationId)

  // If someone is already notified, do not notify another
  const alreadyNotified = queue.entries.find((e) => e.status === "notified")
  if (alreadyNotified) {
    console.log(`Queue [${stationId}]: user already notified, skipping`)
    return null
  }

  const nextEntry = queue.entries.find((e) => e.status === "waiting")
  if (!nextEntry) {
    // Queue is empty — ensure locker stays available for everyone
    // Release queue_hold if it was set (e.g. previous offer expired and queue is now empty)
    await releaseLockerQueueHold(stationId, lockerId)
    console.log(`Queue [${stationId}]: queue empty — locker ${lockerId} released to available`)
    return null
  }

  // Queue has users — set queue_hold so only peek user can reserve
  await setLockerQueueHold(stationId, lockerId)

  // Notify the peek user
  nextEntry.status           = "notified"
  nextEntry.notified_at      = new Date()
  nextEntry.offered_locker   = lockerId
  nextEntry.offer_expires_at = new Date(Date.now() + OFFER_WINDOW_MS)

  queue.updated_at = new Date()
  await queue.save()

  console.log(`Queue [${stationId}]: notified user ${nextEntry.user_id} about locker ${lockerId}`)

  return {
    user_id:          nextEntry.user_id,
    offered_locker:   lockerId,
    offer_expires_at: nextEntry.offer_expires_at
  }
}


// ─────────────────────────────────────────────────────────
// CONFIRM QUEUE RESERVATION
// User reserved the offered locker — remove from queue
// No need to release queue_hold — locker is now reserved
// ─────────────────────────────────────────────────────────
const confirmQueueReservation = async (stationId, userId) => {
  const queue = await getOrCreateQueue(stationId)

  queue.entries = queue.entries.filter(
    (e) => e.user_id.toString() !== userId.toString()
  )

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