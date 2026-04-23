const express = require("express")
const router = express.Router()
const { getStationDB } = require("../config/stationDB")
const lockerSchema = require("../models/station/Locker")
const stationMemberSchema = require("../models/station/StationMember")
const { publishCommand } = require("../services/mqttService")

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


// ─────────────────────────────────────────────────────────
// POST /api/lockers/add
// Add lockers to a station
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
// Get all lockers — shows state and availability only
// reserved_by never exposed to protect privacy
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

    res.status(200).json({
      message:           `Lockers for station ${station_id}`,
      total_lockers:     lockers.length,
      available_count:   lockers.filter((l) => l.availability === "available").length,
      reserved_count:    lockers.filter((l) => l.availability === "reserved").length,
      unavailable_count: lockers.filter((l) => l.availability === "unavailable").length,
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
// Member reserves an available locker
// Sends UNLOCK command to ESP32 via MQTT
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

    const locker = await Locker.findOne({ locker_id })
    if (!locker) {
      return res.status(404).json({ message: `Locker ${locker_id} not found` })
    }

    if (locker.availability !== "available") {
      return res.status(400).json({
        message: `Locker ${locker_id} is not available. Current state: ${locker.state}`
      })
    }

    // Mark as reserved in DB
    locker.reserved_by  = user_id
    locker.reserved_at  = new Date()
    locker.availability = "unavailable"   // transitioning
    await locker.save()

    // Send UNLOCK command to physical ESP32
    // ESP32 will publish back UNLOCKED → MQTT service updates state automatically
    await publishCommand(station_id, locker_id, "UNLOCK")

    res.status(200).json({
      message: `Locker ${locker_id} reserved. Unlock command sent to hardware.`,
      locker: {
        locker_id:   locker.locker_id,
        availability: locker.availability,
        reserved_at: locker.reserved_at
      }
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})


// ─────────────────────────────────────────────────────────
// PUT /api/lockers/release
// Member releases their reserved locker
// Sends UNLOCK command to ESP32 so user can retrieve items
// Auto lock happens after door closes (hardware driven)
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

    // Clear reservation in DB
    locker.reserved_by  = null
    locker.reserved_at  = null
    locker.availability = "unavailable"   // stays unavailable until door closes and hardware auto locks
    await locker.save()

    // Send UNLOCK command to ESP32 so user can open door and retrieve items
    // After door closes, ESP32 auto locks and publishes LOCKED → MQTT updates state to lock_close + available
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
// Mark a locker as offline when hardware stops reporting
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

module.exports = router
