const express = require("express")
const router  = express.Router()
const { getStationDB }       = require("../config/stationDB")
const lockerSchema           = require("../models/station/Locker")
const stationMemberSchema    = require("../models/station/StationMember")
const { publishCommand }     = require("../services/mqttService")
const {
  getUserOffer,
  confirmQueueReservation,
  processNextInQueue,
  getQueueStatus
} = require("../utils/queueProcessor")

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

const getLockerModel = (stationId) => {
  const conn = getStationDB(stationId)
  return conn.models.Locker || conn.model("Locker", lockerSchema)
}

const getStationMemberModel = (stationId) => {
  const conn = getStationDB(stationId)
  return conn.models.StationMember || conn.model("StationMember", stationMemberSchema)
}

const verifyMembership = async (stationId, userId) => {
  const StationMember = getStationMemberModel(stationId)
  return await StationMember.findOne({ user_id: userId, local_status: "active" })
}

// Shared — derive logical state from hardware signals
const deriveState = (lockState, doorState) => {
  if (lockState === "locked"   && doorState === "closed") return "lock_close"
  if (lockState === "unlocked" && doorState === "closed") return "unlock_close"
  if (lockState === "unlocked" && doorState === "open")   return "unlock_open"
  if (lockState === "locked"   && doorState === "open")   return "fault"
  return "lock_close"
}

// Shared — derive availability from state + reservation + queue hold
// Pass currentAvailability to preserve queue_hold through hardware events
const deriveAvailability = (state, reserved_by, currentAvailability) => {
  if (state === "offline")      return "unavailable"
  if (state === "unlock_close") return "unavailable"
  if (state === "fault")        return "unavailable"
  // Preserve queue_hold — hardware events must not overwrite it
  if (currentAvailability === "queue_hold" && !reserved_by) return "queue_hold"
  return reserved_by ? "reserved" : "available"
}


// ─────────────────────────────────────────────────────────
// POST /api/lockers/add
// ─────────────────────────────────────────────────────────
router.post("/add", async (req, res) => {
  try {
    const { station_id, lockers } = req.body

    if (!station_id || !lockers || !Array.isArray(lockers) || lockers.length === 0) {
      return res.status(400).json({ message: "station_id and a non-empty lockers array are required" })
    }

    const Locker = getLockerModel(station_id)
    const docs   = lockers.map((id) => ({ locker_id: id }))

    const inserted = await Locker.insertMany(docs, { ordered: false }).catch((err) => {
      if (err.code === 11000) return err.insertedDocs
      throw err
    })

    res.status(201).json({
      message: `${inserted.length} locker(s) added to ${station_id}`,
      lockers: inserted
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})


// ─────────────────────────────────────────────────────────
// GET /api/lockers/reserved-details/:station_id
// Returns full details of the locker currently reserved by user
// ─────────────────────────────────────────────────────────
router.get("/reserved-details/:station_id", async (req, res) => {
  try {
    const { station_id } = req.params
    const { user_id }    = req.query

    if (!user_id) {
      return res.status(400).json({ message: "user_id is required as a query parameter" })
    }

    const member = await verifyMembership(station_id, user_id)
    if (!member) {
      return res.status(403).json({ message: "Access denied. You are not an active member of this station." })
    }

    const Locker = getLockerModel(station_id)
    const locker = await Locker.findOne({ reserved_by: user_id })

    if (!locker) {
      return res.status(404).json({ message: "You have no reserved locker at this station." })
    }

    res.status(200).json({
      message: `Reserved locker details for user ${user_id} at station ${station_id}`,
      locker: {
        locker_id:            locker.locker_id,
        lock_state:           locker.lock_state,
        door_state:           locker.door_state,
        state:                locker.state,
        availability:         locker.availability,
        reserved_by:          locker.reserved_by,
        reserved_at:          locker.reserved_at,
        overdue_at:           locker.overdue_at,
        release_requested:    locker.release_requested,
        release_requested_at: locker.release_requested_at,
        last_reported_at:     locker.last_reported_at
      }
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})


// ─────────────────────────────────────────────────────────
// GET /api/lockers/:station_id
// ─────────────────────────────────────────────────────────
router.get("/:station_id", async (req, res) => {
  try {
    const { station_id } = req.params
    const { user_id }    = req.query

    if (!user_id) {
      return res.status(400).json({ message: "user_id is required as a query parameter" })
    }

    const member = await verifyMembership(station_id, user_id)
    if (!member) {
      return res.status(403).json({ message: "Access denied. You are not an active member of this station." })
    }

    const Locker  = getLockerModel(station_id)
    const lockers = await Locker.find().select("locker_id lock_state door_state state availability last_reported_at -_id")

    // Find the user's own reserved locker — returned separately as my_reservation
    const myLockerRaw    = await Locker.findOne({ reserved_by: user_id })
    const my_reservation = myLockerRaw ? {
      locker_id:        myLockerRaw.locker_id,
      lock_state:       myLockerRaw.lock_state,
      door_state:       myLockerRaw.door_state,
      state:            myLockerRaw.state,
      availability:     myLockerRaw.availability,
      last_reported_at: myLockerRaw.last_reported_at
    } : null

    res.status(200).json({
      message:           `Lockers for station ${station_id}`,
      total_lockers:     lockers.length,
      available_count:   lockers.filter((l) => l.availability === "available").length,
      reserved_count:    lockers.filter((l) => l.availability === "reserved").length,
      unavailable_count: lockers.filter((l) => l.availability === "unavailable").length,
      my_reservation,
      lockers:           lockers.map((l) => ({
        locker_id:        l.locker_id,
        lock_state:       l.lock_state,
        door_state:       l.door_state,
        state:            l.state,
        availability:     l.availability,
        last_reported_at: l.last_reported_at
      }))
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})


// ─────────────────────────────────────────────────────────
// POST /api/lockers/reserve
// ─────────────────────────────────────────────────────────
router.post("/reserve", async (req, res) => {
  try {
    const { station_id, user_id, locker_id } = req.body

    if (!station_id || !user_id || !locker_id) {
      return res.status(400).json({ message: "station_id, user_id and locker_id are required" })
    }

    const member = await verifyMembership(station_id, user_id)
    if (!member) {
      return res.status(403).json({ message: "Access denied. You are not an active member of this station." })
    }

    const Locker = getLockerModel(station_id)

    const alreadyReserved = await Locker.findOne({ reserved_by: user_id })
    if (alreadyReserved) {
      return res.status(400).json({
        message: `You already have locker ${alreadyReserved.locker_id} reserved at this station.`
      })
    }

    // Check if user has an active queue offer
    const offer = await getUserOffer(station_id, user_id)

    if (offer) {
      // Peek queue user — must reserve the offered locker only
      if (locker_id !== offer.offered_locker) {
        return res.status(400).json({
          message:          `You have a queue offer for locker ${offer.offered_locker}. You must reserve that locker.`,
          offered_locker:   offer.offered_locker,
          offer_expires_at: offer.offer_expires_at
        })
      }
    } else {
      // No active offer — check if user is waiting in queue
      const queueStatus = await getQueueStatus(station_id, user_id)
      if (queueStatus.in_queue) {
        return res.status(400).json({
          message:       `You are position ${queueStatus.your_position} in the queue. Only the first person in queue can reserve when notified.`,
          your_position: queueStatus.your_position,
          queue_size:    queueStatus.queue_size
        })
      }
    }

    const locker = await Locker.findOne({ locker_id })
    if (!locker) {
      return res.status(404).json({ message: `Locker ${locker_id} not found` })
    }

    // Availability check:
    // "available"   → anyone can reserve (no queue offer needed)
    // "queue_hold"  → only peek user with active offer can reserve
    // anything else → blocked for everyone
    if (locker.availability === "available") {
      // open to anyone — proceed
    } else if (locker.availability === "queue_hold" && offer) {
      // peek user with valid offer — allowed to proceed
    } else if (locker.availability === "queue_hold" && !offer) {
      return res.status(400).json({
        message: `Locker ${locker_id} is held for the queue. Join the queue to get your chance.`
      })
    } else {
      return res.status(400).json({
        message: `Locker ${locker_id} is not available. Current state: ${locker.state}`
      })
    }

    // Reserve the locker
    locker.reserved_by  = user_id
    locker.reserved_at  = new Date()
    locker.availability = "unavailable"
    await locker.save()

    if (offer) {
      await confirmQueueReservation(station_id, user_id)
    }

    // Send UNLOCK command to ESP32
    try {
      await publishCommand(station_id, locker_id, "UNLOCK")
    } catch {
      // Hardware not connected — continue anyway
    }

    res.status(200).json({
      message: `Locker ${locker_id} reserved. Unlock command sent to hardware.`,
      locker: {
        locker_id:    locker.locker_id,
        availability: locker.availability,
        reserved_at:  locker.reserved_at
      }
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})


// ─────────────────────────────────────────────────────────
// PUT /api/lockers/release
// ─────────────────────────────────────────────────────────
router.put("/release", async (req, res) => {
  try {
    const { station_id, user_id, locker_id } = req.body

    if (!station_id || !user_id || !locker_id) {
      return res.status(400).json({ message: "station_id, user_id and locker_id are required" })
    }

    const member = await verifyMembership(station_id, user_id)
    if (!member) {
      return res.status(403).json({ message: "Access denied. You are not an active member of this station." })
    }

    const Locker = getLockerModel(station_id)

    const locker = await Locker.findOne({ locker_id })
    if (!locker) {
      return res.status(404).json({ message: `Locker ${locker_id} not found` })
    }

    if (!locker.reserved_by || locker.reserved_by.toString() !== user_id.toString()) {
      return res.status(403).json({ message: "You can only release your own reserved locker" })
    }

    // Clear reservation
    locker.reserved_by = null
    locker.reserved_at = null

    // Try hardware unlock
    let hardwareConnected = false
    try {
      await publishCommand(station_id, locker_id, "UNLOCK")
      hardwareConnected = true
    } catch {
      hardwareConnected = false
    }

    if (hardwareConnected) {
      // Wait for ESP32 to report LOCKED+CLOSED via MQTT before marking available
      locker.availability = "unavailable"
    } else {
      // No hardware — reset to available immediately
      locker.lock_state   = "locked"
      locker.door_state   = "closed"
      locker.state        = "lock_close"
      locker.availability = "available"
    }

    await locker.save()

    // Trigger queue if locker is now available
    if (locker.availability === "available") {
      await processNextInQueue(station_id, locker_id)
    }

    res.status(200).json({
      message: hardwareConnected
        ? `Locker ${locker_id} released. Unlock command sent — open door to retrieve your items.`
        : `Locker ${locker_id} released and is now available.`,
      locker: {
        locker_id:    locker.locker_id,
        availability: locker.availability
      }
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})


// ─────────────────────────────────────────────────────────
// PUT /api/lockers/offline
// ─────────────────────────────────────────────────────────
router.put("/offline", async (req, res) => {
  try {
    const { station_id, locker_id } = req.body

    if (!station_id || !locker_id) {
      return res.status(400).json({ message: "station_id and locker_id are required" })
    }

    const Locker = getLockerModel(station_id)
    const locker = await Locker.findOne({ locker_id })
    if (!locker) {
      return res.status(404).json({ message: `Locker ${locker_id} not found` })
    }

    locker.state            = "offline"
    locker.availability     = "unavailable"
    locker.last_reported_at = new Date()
    await locker.save()

    res.status(200).json({
      message: `Locker ${locker_id} marked as offline`,
      locker:  { locker_id: locker.locker_id, state: locker.state, availability: locker.availability }
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})


// ─────────────────────────────────────────────────────────
// PUT /api/lockers/online
// ─────────────────────────────────────────────────────────
router.put("/online", async (req, res) => {
  try {
    const { station_id, locker_id } = req.body

    if (!station_id || !locker_id) {
      return res.status(400).json({ message: "station_id and locker_id are required" })
    }

    const Locker = getLockerModel(station_id)
    const locker = await Locker.findOne({ locker_id })
    if (!locker) {
      return res.status(404).json({ message: `Locker ${locker_id} not found` })
    }

    if (locker.state !== "offline") {
      return res.status(400).json({
        message: `Locker ${locker_id} is not offline. Current state: ${locker.state}`
      })
    }

    const validLockStates = ["locked", "unlocked"]
    const validDoorStates = ["open", "closed"]
    const hasValidSignals =
      validLockStates.includes(locker.lock_state) &&
      validDoorStates.includes(locker.door_state)

    if (hasValidSignals) {
      locker.state = deriveState(locker.lock_state, locker.door_state)
    } else {
      locker.lock_state = "locked"
      locker.door_state = "closed"
      locker.state      = "lock_close"
    }

    locker.availability     = deriveAvailability(locker.state, locker.reserved_by, null)
    locker.last_reported_at = new Date()
    await locker.save()

    // Trigger queue if locker came back as available
    if (locker.availability === "available") {
      await processNextInQueue(station_id, locker_id)
    }

    res.status(200).json({
      message: `Locker ${locker_id} is back online`,
      locker: {
        locker_id:        locker.locker_id,
        lock_state:       locker.lock_state,
        door_state:       locker.door_state,
        state:            locker.state,
        availability:     locker.availability,
        last_reported_at: locker.last_reported_at
      }
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})


// ─────────────────────────────────────────────────────────
// POST /api/lockers/sync-states
// ─────────────────────────────────────────────────────────
router.post("/sync-states", async (req, res) => {
  try {
    const { station_id } = req.body

    if (!station_id) {
      return res.status(400).json({ message: "station_id is required" })
    }

    const Locker  = getLockerModel(station_id)
    const lockers = await Locker.find()

    let updated = 0
    for (const locker of lockers) {
      // Pass null for currentAvailability — sync-states is a full reset
      const newState        = deriveState(locker.lock_state, locker.door_state)
      const newAvailability = deriveAvailability(newState, locker.reserved_by, null)

      locker.state        = newState
      locker.availability = newAvailability
      await locker.save()
      updated++
    }

    // Trigger queue for any locker that is now available
    let notified = 0
    for (const locker of lockers) {
      if (locker.availability === "available") {
        const result = await processNextInQueue(station_id, locker.locker_id)
        if (result) { notified++; break }
      }
    }

    res.status(200).json({
      message:          `Synced ${updated} locker(s) in ${station_id}`,
      updated,
      queue_notified:   notified > 0,
      notification_msg: notified > 0
        ? "First user in queue has been notified about an available locker"
        : "No one in queue to notify"
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})


// ─────────────────────────────────────────────────────────
// POST /api/lockers/trigger-queue
// ─────────────────────────────────────────────────────────
router.post("/trigger-queue", async (req, res) => {
  try {
    const { station_id } = req.body

    if (!station_id) {
      return res.status(400).json({ message: "station_id is required" })
    }

    const Locker = getLockerModel(station_id)

    const availableLocker = await Locker.findOne({
      state:        { $in: ["lock_close", "unlock_open"] },
      availability: { $in: ["available"] },
      reserved_by:  null
    })

    if (!availableLocker) {
      return res.status(200).json({ message: "No available lockers to offer", queue_notified: false })
    }

    const result = await processNextInQueue(station_id, availableLocker.locker_id)

    if (!result) {
      return res.status(200).json({ message: "No one in queue to notify", queue_notified: false })
    }

    res.status(200).json({
      message:          `User notified about locker ${availableLocker.locker_id}`,
      queue_notified:   true,
      offered_locker:   result.offered_locker,
      offer_expires_at: result.offer_expires_at
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})


// ─────────────────────────────────────────────────────────
// PUT /api/lockers/hardware-event
// Receives lock_state + door_state from physical device
// ─────────────────────────────────────────────────────────
router.put("/hardware-event", async (req, res) => {
  try {
    const { station_id, locker_id, lock_state, door_state } = req.body

    if (!station_id || !locker_id || !lock_state || !door_state) {
      return res.status(400).json({ message: "station_id, locker_id, lock_state and door_state are required" })
    }

    if (!["locked", "unlocked"].includes(lock_state)) {
      return res.status(400).json({ message: "lock_state must be locked or unlocked" })
    }

    if (!["open", "closed"].includes(door_state)) {
      return res.status(400).json({ message: "door_state must be open or closed" })
    }

    const Locker = getLockerModel(station_id)
    const locker = await Locker.findOne({ locker_id })
    if (!locker) {
      return res.status(404).json({ message: `Locker ${locker_id} not found` })
    }

    const prevAvailability = locker.availability
    const newState         = deriveState(lock_state, door_state)
    const newAvailability  = deriveAvailability(newState, locker.reserved_by, locker.availability)

    locker.lock_state       = lock_state
    locker.door_state       = door_state
    locker.state            = newState
    locker.availability     = newAvailability
    locker.last_reported_at = new Date()
    await locker.save()

    // Trigger queue if locker just became available
    if (prevAvailability !== "available" && newAvailability === "available") {
      await processNextInQueue(station_id, locker_id)
    }

    res.status(200).json({
      message: `Hardware event recorded for locker ${locker_id}`,
      locker: {
        locker_id:    locker.locker_id,
        lock_state:   locker.lock_state,
        door_state:   locker.door_state,
        state:        locker.state,
        availability: locker.availability
      }
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})


// ─────────────────────────────────────────────────────────
// POST /api/lockers/unlock
// Owner manually unlocks their reserved locker
// Only valid when locker is in lock_close state
// ─────────────────────────────────────────────────────────
router.post("/unlock", async (req, res) => {
  try {
    const { station_id, user_id, locker_id } = req.body

    if (!station_id || !user_id || !locker_id) {
      return res.status(400).json({ message: "station_id, user_id and locker_id are required" })
    }

    const member = await verifyMembership(station_id, user_id)
    if (!member) {
      return res.status(403).json({ message: "Access denied. You are not an active member of this station." })
    }

    const Locker = getLockerModel(station_id)
    const locker = await Locker.findOne({ locker_id })
    if (!locker) {
      return res.status(404).json({ message: `Locker ${locker_id} not found` })
    }

    // Only the owner can unlock
    if (!locker.reserved_by || locker.reserved_by.toString() !== user_id.toString()) {
      return res.status(403).json({ message: "You can only unlock your own reserved locker" })
    }

    // Only valid from lock_close state
    if (locker.state !== "lock_close") {
      return res.status(400).json({
        message: `Locker can only be unlocked from lock_close state. Current state: ${locker.state}`
      })
    }

    // Send UNLOCK command to hardware
    try {
      await publishCommand(station_id, locker_id, "UNLOCK")
    } catch {
      // No hardware — update state directly
      locker.lock_state = "unlocked"
      locker.state      = "unlock_close"
      await locker.save()
    }

    res.status(200).json({
      message: `Unlock command sent to locker ${locker_id}`,
      locker: {
        locker_id: locker.locker_id,
        state:     locker.state
      }
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})


// ─────────────────────────────────────────────────────────
// POST /api/lockers/lock
// Owner manually locks their reserved locker
// Only valid when locker is in unlock_close or unlock_open state
// ─────────────────────────────────────────────────────────
router.post("/lock", async (req, res) => {
  try {
    const { station_id, user_id, locker_id } = req.body

    if (!station_id || !user_id || !locker_id) {
      return res.status(400).json({ message: "station_id, user_id and locker_id are required" })
    }

    const member = await verifyMembership(station_id, user_id)
    if (!member) {
      return res.status(403).json({ message: "Access denied. You are not an active member of this station." })
    }

    const Locker = getLockerModel(station_id)
    const locker = await Locker.findOne({ locker_id })
    if (!locker) {
      return res.status(404).json({ message: `Locker ${locker_id} not found` })
    }

    // Only the owner can lock
    if (!locker.reserved_by || locker.reserved_by.toString() !== user_id.toString()) {
      return res.status(403).json({ message: "You can only lock your own reserved locker" })
    }

    // Only valid from unlock_close or unlock_open states
    if (!["unlock_close", "unlock_open"].includes(locker.state)) {
      return res.status(400).json({
        message: `Locker can only be locked from unlock_close or unlock_open state. Current state: ${locker.state}`
      })
    }

    locker.lock_state = "locked"
    locker.state = "lock_close"
    await locker.save()

    // Send LOCK command to hardware
    try {
      await publishCommand(station_id, locker_id, "LOCK")
    } catch {
      // No hardware — update state directly (already set)
      locker.lock_state = "locked"
      locker.state      = "lock_close"
      await locker.save()
    }

    res.status(200).json({
      message: `Lock command sent to locker ${locker_id}`,
      locker: {
        locker_id: locker.locker_id,
        state:     locker.state
      }
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})



// ─────────────────────────────────────────────────────────
// POST /api/lockers/admin-release
// Sub admin force releases an overdue locker
// Clears reservation and sends UNLOCK to hardware
// User must come back and collect items then door auto locks
// ─────────────────────────────────────────────────────────
router.post("/admin-release", async (req, res) => {
  try {
    const { station_id, locker_id } = req.body

    if (!station_id || !locker_id) {
      return res.status(400).json({ message: "station_id and locker_id are required" })
    }

    const Locker = getLockerModel(station_id)
    const locker = await Locker.findOne({ locker_id })
    if (!locker) {
      return res.status(404).json({ message: `Locker ${locker_id} not found` })
    }

    if (locker.availability !== "overdue") {
      return res.status(400).json({
        message: `Locker ${locker_id} is not overdue. Current availability: ${locker.availability}`
      })
    }

    // Clear reservation and release request
    locker.reserved_by           = null
    locker.reserved_at           = null
    locker.overdue_at            = null
    locker.release_requested     = false
    locker.release_requested_at  = null

    // Try to unlock so user can retrieve items
    let hardwareConnected = false
    try {
      await publishCommand(station_id, locker_id, "UNLOCK")
      hardwareConnected = true
      locker.availability = "unavailable"  // wait for door cycle to complete
    } catch {
      // No hardware — reset directly
      locker.lock_state   = "locked"
      locker.door_state   = "closed"
      locker.state        = "lock_close"
      locker.availability = "available"
    }

    await locker.save()

    // Trigger queue if locker is now available
    if (locker.availability === "available") {
      await processNextInQueue(station_id, locker_id)
    }

    res.status(200).json({
      message: hardwareConnected
        ? `Locker ${locker_id} admin-released. Unlock command sent — user should retrieve items.`
        : `Locker ${locker_id} admin-released and is now available.`,
      locker: {
        locker_id:    locker.locker_id,
        availability: locker.availability,
        state:        locker.state
      }
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})


// ─────────────────────────────────────────────────────────
// GET /api/lockers/time-remaining/:station_id
// Returns how much free time the user has left on their
// reserved locker before it becomes overdue
// ─────────────────────────────────────────────────────────
router.get("/time-remaining/:station_id", async (req, res) => {
  try {
    const { station_id } = req.params
    const { user_id }    = req.query

    if (!user_id) {
      return res.status(400).json({ message: "user_id is required as a query parameter" })
    }

    const member = await verifyMembership(station_id, user_id)
    if (!member) {
      return res.status(403).json({ message: "Access denied. You are not an active member of this station." })
    }

    const Locker = getLockerModel(station_id)

    // Find user's reserved locker
    const locker = await Locker.findOne({ reserved_by: user_id })
    if (!locker) {
      return res.status(404).json({ message: "You have no reserved locker at this station." })
    }

    // Get station free_minutes setting
    const { getOrCreateSettings } = require("../utils/overdueChecker")
    const settings = await getOrCreateSettings(station_id)

    // No time limit set
    if (!settings.free_minutes || settings.free_minutes === 0) {
      return res.status(200).json({
        locker_id:       locker.locker_id,
        availability:    locker.availability,
        reserved_at:     locker.reserved_at,
        free_minutes:    0,
        time_limit:      false,
        message:         "No time limit set for this station"
      })
    }

    // Locker already overdue
    if (locker.availability === "overdue") {
      return res.status(200).json({
        locker_id:         locker.locker_id,
        availability:      "overdue",
        reserved_at:       locker.reserved_at,
        overdue_at:        locker.overdue_at,
        free_minutes:      settings.free_minutes,
        time_limit:        true,
        is_overdue:        true,
        minutes_remaining: 0,
        seconds_remaining: 0,
        message:           "Your locker time has expired. Please contact the station admin to release it."
      })
    }

    // Calculate time remaining
    const now             = new Date()
    const expiresAt       = new Date(locker.reserved_at.getTime() + settings.free_minutes * 60 * 1000)
    const ms_remaining    = expiresAt - now
    const isOverdue       = ms_remaining <= 0

    const minutes_remaining = isOverdue ? 0 : Math.floor(ms_remaining / 60000)
    const seconds_remaining = isOverdue ? 0 : Math.floor((ms_remaining % 60000) / 1000)

    res.status(200).json({
      locker_id:         locker.locker_id,
      availability:      locker.availability,
      reserved_at:       locker.reserved_at,
      expires_at:        expiresAt,
      free_minutes:      settings.free_minutes,
      time_limit:        true,
      is_overdue:        isOverdue,
      minutes_remaining,
      seconds_remaining,
      message: isOverdue
        ? "Your locker time has expired. Please contact the station admin to release it."
        : `You have ${minutes_remaining}m ${seconds_remaining}s remaining before your locker is locked.`
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})


// ─────────────────────────────────────────────────────────
// GET /api/lockers/overdue-status/:station_id
// User polls this to check if their locker is overdue
// Acts as the notification endpoint for the user
// ─────────────────────────────────────────────────────────
router.get("/overdue-status/:station_id", async (req, res) => {
  try {
    const { station_id } = req.params
    const { user_id }    = req.query

    if (!user_id) {
      return res.status(400).json({ message: "user_id is required as a query parameter" })
    }

    const member = await verifyMembership(station_id, user_id)
    if (!member) {
      return res.status(403).json({ message: "Access denied. You are not an active member of this station." })
    }

    const Locker = getLockerModel(station_id)
    const locker = await Locker.findOne({ reserved_by: user_id })

    if (!locker) {
      return res.status(200).json({
        has_overdue:  false,
        message:      "You have no reserved locker at this station."
      })
    }

    if (locker.availability !== "overdue") {
      return res.status(200).json({
        has_overdue:          false,
        locker_id:            locker.locker_id,
        availability:         locker.availability,
        release_requested:    locker.release_requested,
        message:              "Your locker is active and within time limit."
      })
    }

    // Locker is overdue
    const overdueMinutes = locker.overdue_at
      ? Math.floor((Date.now() - new Date(locker.overdue_at).getTime()) / 60000)
      : 0

    res.status(200).json({
      has_overdue:          true,
      locker_id:            locker.locker_id,
      availability:         locker.availability,
      overdue_at:           locker.overdue_at,
      overdue_minutes:      overdueMinutes,
      release_requested:    locker.release_requested,
      release_requested_at: locker.release_requested_at,
      message:              locker.release_requested
        ? "Your locker is overdue. Release request has been sent to the station admin. Please wait for approval."
        : "Your locker is overdue. Please request a release from the station admin."
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})


// ─────────────────────────────────────────────────────────
// POST /api/lockers/request-release
// User manually requests admin to release their overdue locker
// (Auto-requested when overdue, but user can re-request)
// ─────────────────────────────────────────────────────────
router.post("/request-release", async (req, res) => {
  try {
    const { station_id, user_id } = req.body

    if (!station_id || !user_id) {
      return res.status(400).json({ message: "station_id and user_id are required" })
    }

    const member = await verifyMembership(station_id, user_id)
    if (!member) {
      return res.status(403).json({ message: "Access denied. You are not an active member of this station." })
    }

    const Locker = getLockerModel(station_id)
    const locker = await Locker.findOne({ reserved_by: user_id })

    if (!locker) {
      return res.status(404).json({ message: "You have no reserved locker at this station." })
    }

    if (locker.availability !== "overdue") {
      return res.status(400).json({
        message: `Your locker is not overdue. Current status: ${locker.availability}`
      })
    }

    if (locker.release_requested) {
      return res.status(400).json({
        message:              "Release already requested. Please wait for admin approval.",
        release_requested_at: locker.release_requested_at
      })
    }

    locker.release_requested    = true
    locker.release_requested_at = new Date()
    await locker.save()

    res.status(200).json({
      message:              "Release request sent to station admin. Please wait for approval.",
      locker_id:            locker.locker_id,
      release_requested_at: locker.release_requested_at
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})


// ─────────────────────────────────────────────────────────
// GET /api/lockers/admin/overdues/:station_id
// Admin view — all overdue lockers with user details
// and release request status
// ─────────────────────────────────────────────────────────
router.get("/admin/overdues/:station_id", async (req, res) => {
  try {
    const { station_id } = req.params

    const Locker = getLockerModel(station_id)
    const User   = require("../models/master/User")

    // Get all overdue lockers
    const overdues = await Locker.find({ availability: "overdue" })

    const result = await Promise.all(
      overdues.map(async (locker) => {
        // Fetch user details from Master DB
        let user = null
        try {
          const userDoc = await User.findById(locker.reserved_by).select("name email")
          if (userDoc) user = { id: userDoc._id, name: userDoc.name, email: userDoc.email }
        } catch { user = null }

        const now            = new Date()
        const overdueMinutes = locker.overdue_at
          ? Math.floor((now - new Date(locker.overdue_at)) / 60000)
          : 0

        return {
          locker_id:            locker.locker_id,
          state:                locker.state,
          user:                 user || { id: locker.reserved_by, name: "Unknown", email: "—" },
          reserved_at:          locker.reserved_at,
          overdue_at:           locker.overdue_at,
          overdue_minutes:      overdueMinutes,
          release_requested:    locker.release_requested,
          release_requested_at: locker.release_requested_at
        }
      })
    )

    // Sort — release requested ones first
    result.sort((a, b) => {
      if (a.release_requested && !b.release_requested) return -1
      if (!a.release_requested && b.release_requested) return 1
      return new Date(a.overdue_at) - new Date(b.overdue_at)
    })

    res.status(200).json({
      message:           `Overdue lockers for station ${station_id}`,
      station_id,
      total_overdue:     result.length,
      pending_requests:  result.filter((l) => l.release_requested).length,
      overdues:          result
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

module.exports = router