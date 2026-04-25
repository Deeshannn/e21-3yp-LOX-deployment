const express = require("express")
const router  = express.Router()
const { getStationDB }       = require("../config/stationDB")
const lockerSchema           = require("../models/station/Locker")
const stationMemberSchema    = require("../models/station/StationMember")
const { publishCommand }     = require("../services/mqttService")
const { processNextInQueue } = require("../utils/queueProcessor")
const {
  getUserOffer,
  confirmQueueReservation
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

// Shared state derivation helpers — used by hardware-event, sync-states, online routes
const deriveState = (lockState, doorState) => {
  if (lockState === "locked"   && doorState === "closed") return "lock_close"
  if (lockState === "unlocked" && doorState === "closed") return "unlock_close"
  if (lockState === "unlocked" && doorState === "open")   return "unlock_open"
  if (lockState === "locked"   && doorState === "open")   return "fault"
  return "lock_close"
}

const deriveAvailability = (state, reserved_by) => {
  if (state === "offline")      return "unavailable"
  if (state === "unlock_close") return "unavailable"
  if (state === "fault")        return "unavailable"
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
    // This lets frontend show the release banner without exposing reserved_by on other lockers
    const myLockerRaw = await Locker.findOne({ reserved_by: user_id })
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
        // reserved_by intentionally omitted — use my_reservation for own locker only
      }))
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})


// ─────────────────────────────────────────────────────────
// POST /api/lockers/reserve
// Member reserves a locker
// If user has an active queue offer, they must use that locker
// If no queue offer, any available locker can be reserved
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

    // Check user does not already have a reserved locker
    const alreadyReserved = await Locker.findOne({ reserved_by: user_id })
    if (alreadyReserved) {
      return res.status(400).json({
        message: `You already have locker ${alreadyReserved.locker_id} reserved at this station.`
      })
    }

    // Check if user has an active queue offer
    const offer = await getUserOffer(station_id, user_id)

    if (offer) {
      // User is the peek of queue — they must reserve the offered locker only
      if (locker_id !== offer.offered_locker) {
        return res.status(400).json({
          message: `You have a queue offer for locker ${offer.offered_locker}. You must reserve that locker.`,
          offered_locker:   offer.offered_locker,
          offer_expires_at: offer.offer_expires_at
        })
      }
    } else {
      // User has no active offer — check if they are in queue
      // If they are in queue but not at the peek, block reservation
      // Only the peek user (who has an active offer) can reserve
      const { getQueueStatus } = require("../utils/queueProcessor")
      const queueStatus = await getQueueStatus(station_id, user_id)
      if (queueStatus.in_queue) {
        return res.status(400).json({
          message: `You are position ${queueStatus.your_position} in the queue. Only the first person in queue can reserve when notified.`,
          your_position: queueStatus.your_position,
          queue_size:    queueStatus.queue_size
        })
      }
    }

    const locker = await Locker.findOne({ locker_id })
    if (!locker) {
      return res.status(404).json({ message: `Locker ${locker_id} not found` })
    }

    if (locker.availability !== "available") {
      return res.status(400).json({
        message: `Locker ${locker_id} is not available. Current state: ${locker.state}`
      })
    }

    // Reserve the locker
    locker.reserved_by  = user_id
    locker.reserved_at  = new Date()
    locker.availability = "unavailable"
    await locker.save()

    // If user came from queue, mark their entry as reserved
    if (offer) {
      await confirmQueueReservation(station_id, user_id)
    }

    // Send UNLOCK command to ESP32
    await publishCommand(station_id, locker_id, "UNLOCK")

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
    locker.reserved_by  = null
    locker.reserved_at  = null
    locker.availability = "unavailable"
    await locker.save()

    // Send UNLOCK so user can retrieve items
    await publishCommand(station_id, locker_id, "UNLOCK")

    res.status(200).json({
      message: `Locker ${locker_id} released. Unlock command sent — open door to retrieve your items.`,
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
      locker: {
        locker_id:    locker.locker_id,
        state:        locker.state,
        availability: locker.availability
      }
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})


// ─────────────────────────────────────────────────────────
// PUT /api/lockers/online
// Mark an offline locker back as online
// Re-derives state from last known lock + door signals
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

    // Re-derive state from last known hardware signals
    // If signals are valid restore from them, otherwise default to lock_close
    const validLockStates = ["locked", "unlocked"]
    const validDoorStates = ["open", "closed"]

    const hasValidSignals =
      validLockStates.includes(locker.lock_state) &&
      validDoorStates.includes(locker.door_state)

    if (hasValidSignals) {
      locker.state = deriveState(locker.lock_state, locker.door_state)
    } else {
      // No valid signals — default to safe locked closed state
      locker.lock_state = "locked"
      locker.door_state = "closed"
      locker.state      = "lock_close"
    }

    // Re-derive availability from restored state + reservation
    locker.availability =
      (locker.state === "lock_close" || locker.state === "unlock_open") &&
      !locker.reserved_by
        ? "available"
        : "unavailable"

    locker.last_reported_at = new Date()
    await locker.save()

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
// One-time fix — updates state and availability fields
// on all lockers in a station based on lock + door signals
// Run this once on existing data after schema update
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
      const newState        = deriveState(locker.lock_state, locker.door_state)
      const newAvailability = deriveAvailability(newState, locker.reserved_by)

      locker.state        = newState
      locker.availability = newAvailability
      await locker.save()
      updated++
    }

    // After syncing — check if any locker is now available
    // and trigger queue processing for each available locker found
    let notified = 0
    for (const locker of lockers) {
      if (locker.availability === "available") {
        const result = await processNextInQueue(station_id, locker.locker_id)
        if (result) {
          notified++
          break   // one notification at a time — next locker triggers after reservation
        }
      }
    }

    res.status(200).json({
      message:          `Synced state and availability for ${updated} locker(s) in ${station_id}`,
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
// Manually trigger queue processing for a station
// Scans for available lockers and notifies first in queue
// Useful for testing without hardware connected
// Also called internally when a locker becomes available
// ─────────────────────────────────────────────────────────
router.post("/trigger-queue", async (req, res) => {
  try {
    const { station_id } = req.body

    if (!station_id) {
      return res.status(400).json({ message: "station_id is required" })
    }

    const Locker = getLockerModel(station_id)

    // Find first available locker
    const availableLocker = await Locker.findOne({
      state:       { $in: ["lock_close", "unlock_open"] },
      reserved_by: null
    })

    if (!availableLocker) {
      return res.status(200).json({
        message:       "No available lockers to offer",
        queue_notified: false
      })
    }

    // Trigger queue processing with this locker
    const result = await processNextInQueue(station_id, availableLocker.locker_id)

    if (!result) {
      return res.status(200).json({
        message:        "No one in queue to notify",
        queue_notified: false
      })
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
// Derives logical state and availability automatically
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

    const newState        = deriveState(lock_state, door_state)
    const newAvailability = deriveAvailability(newState, locker.reserved_by)

    locker.lock_state       = lock_state
    locker.door_state       = door_state
    locker.state            = newState
    locker.availability     = newAvailability
    locker.last_reported_at = new Date()
    await locker.save()

    // Trigger queue if locker just became available
    if (newAvailability === "available") {
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

module.exports = router