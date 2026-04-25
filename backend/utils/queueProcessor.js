const queueSchema  = require("../models/station/Queue")
const lockerSchema = require("../models/station/Locker")
const { getStationDB } = require("../config/stationDB")

// Offer window — 15 minutes
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

// Get or create the single queue document for this station
const getOrCreateQueue = async (stationId) => {
  const Queue = getQueueModel(stationId)
  let queue = await Queue.findOne()
  if (!queue) queue = await Queue.create({})
  return queue
}

// ─────────────────────────────────────────────────────────
// CLEAN UP DONE ENTRIES
// Physically removes entries that are no longer active
// Called after every queue mutation to keep DB clean
// Active statuses: waiting, notified only
// ─────────────────────────────────────────────────────────
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
// EXPIRE STALE OFFERS
// If notified user did not reserve within 15 min,
// remove their entry and let processNextInQueue move on
// ─────────────────────────────────────────────────────────
const expireStaleOffers = async (stationId) => {
  const queue = await getOrCreateQueue(stationId)
  const now   = new Date()
  let changed = false

  queue.entries.forEach((entry) => {
    if (
      entry.status === "notified" &&
      entry.offer_expires_at &&
      now > entry.offer_expires_at
    ) {
      entry.status = "expired"
      changed = true
      console.log(`Queue [${stationId}]: offer expired for user ${entry.user_id}`)
    }
  })

  if (changed) {
    // Remove expired entries immediately
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
  const queue = await getOrCreateQueue(stationId)

  // Clean stale entries before checking
  await expireStaleOffers(stationId)

  // Reload after cleanup
  const freshQueue = await getOrCreateQueue(stationId)

  // Check if user is already in queue
  const alreadyIn = freshQueue.entries.find(
    (e) => e.user_id.toString() === userId.toString()
  )
  if (alreadyIn) {
    const position = freshQueue.entries.indexOf(alreadyIn) + 1
    return { success: false, message: "You are already in the queue", position }
  }

  // Check queue size limit
  if (freshQueue.entries.length >= freshQueue.max_size) {
    return {
      success: false,
      message: `Queue is full. Maximum size is ${freshQueue.max_size}`
    }
  }

  // Add to end of queue
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
// Removes the user's entry from the array entirely
// ─────────────────────────────────────────────────────────
const leaveQueue = async (stationId, userId) => {
  const queue = await getOrCreateQueue(stationId)

  const before = queue.entries.length
  queue.entries = queue.entries.filter(
    (e) => e.user_id.toString() !== userId.toString()
  )

  if (queue.entries.length === before) {
    return { success: false, message: "You are not in the queue" }
  }

  queue.updated_at = new Date()
  await queue.save()

  return { success: true, message: "You have left the queue" }
}


// ─────────────────────────────────────────────────────────
// GET QUEUE STATUS
// ─────────────────────────────────────────────────────────
const getQueueStatus = async (stationId, userId) => {
  // Expire stale offers before reading
  await expireStaleOffers(stationId)

  const queue = await getOrCreateQueue(stationId)

  const userEntry   = queue.entries.find(
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
// Called by MQTT service when a locker becomes available
// ─────────────────────────────────────────────────────────
const processNextInQueue = async (stationId, lockerId) => {
  // Expire stale offers first
  await expireStaleOffers(stationId)

  const queue = await getOrCreateQueue(stationId)

  // If someone is already notified, do not notify another
  const alreadyNotified = queue.entries.find((e) => e.status === "notified")
  if (alreadyNotified) {
    console.log(`Queue [${stationId}]: user already notified, skipping`)
    return null
  }

  // Get next waiting user
  const nextEntry = queue.entries.find((e) => e.status === "waiting")
  if (!nextEntry) {
    console.log(`Queue [${stationId}]: queue empty, no one to notify`)
    return null
  }

  // Notify them with 15 min window
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
// ─────────────────────────────────────────────────────────
const confirmQueueReservation = async (stationId, userId) => {
  const queue = await getOrCreateQueue(stationId)

  // Remove this user from queue entirely — they got their locker
  queue.entries = queue.entries.filter(
    (e) => e.user_id.toString() !== userId.toString()
  )

  queue.updated_at = new Date()
  await queue.save()
}


// ─────────────────────────────────────────────────────────
// GET USER OFFER
// Returns active offer for a user if within window
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
