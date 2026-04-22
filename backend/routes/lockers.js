const express = require("express")
const router = express.Router()
const { getStationDB } = require("../config/stationDB")
const lockerSchema = require("../models/station/Locker")
const stationMemberSchema = require("../models/station/StationMember")

// Helper — get Locker model for a station
const getLockerModel = (stationId) => {
  const conn = getStationDB(stationId)
  return conn.models.Locker || conn.model("Locker", lockerSchema)
}

// Helper — get StationMember model for a station
const getStationMemberModel = (stationId) => {
  const conn = getStationDB(stationId)
  return conn.models.StationMember || conn.model("StationMember", stationMemberSchema)
}

// Helper — verify user is an active member of the station
const verifyMembership = async (stationId, userId) => {
  const StationMember = getStationMemberModel(stationId)
  const member = await StationMember.findOne({
    user_id:      userId,
    local_status: "active"
  })
  return member
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
    const docs = lockers.map((id) => ({ locker_id: id }))

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
// Get all lockers of a station with status
// Returns total, available, reserved, occupied counts
// reserved_by is never exposed to protect user privacy
// ─────────────────────────────────────────────────────────
router.get("/:station_id", async (req, res) => {
  try {
    const { station_id } = req.params
    const { user_id }    = req.query

    if (!user_id) {
      return res.status(400).json({ message: "user_id is required as a query parameter" })
    }

    // Verify membership in station DB
    const member = await verifyMembership(station_id, user_id)
    if (!member) {
      return res.status(403).json({ message: "Access denied. You are not an active member of this station." })
    }

    const Locker = getLockerModel(station_id)

    // Get all lockers — only fetch fields needed for public view
    const lockers = await Locker.find().select("locker_id state -_id")

    // Count by state
    const available_count = lockers.filter((l) => l.state === "available").length

    res.status(200).json({
      message:        `Lockers for station ${station_id}`,
      total_lockers:  lockers.length,
      available_count,
      reserved_count: lockers.filter((l) => l.state === "reserved").length,
      occupied_count: lockers.filter((l) => l.state === "occupied").length,
      lockers:        lockers.map((l) => ({
        locker_id: l.locker_id,
        state:     l.state     // only ID and state — no ownership info exposed
      }))
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})


// ─────────────────────────────────────────────────────────
// POST /api/lockers/reserve
// Member reserves an available locker
// ─────────────────────────────────────────────────────────
router.post("/reserve", async (req, res) => {
  try {
    const { station_id, user_id, locker_id } = req.body

    if (!station_id || !user_id || !locker_id) {
      return res.status(400).json({ message: "station_id, user_id and locker_id are required" })
    }

    // Verify membership
    const member = await verifyMembership(station_id, user_id)
    if (!member) {
      return res.status(403).json({ message: "Access denied. You are not an active member of this station." })
    }

    const Locker = getLockerModel(station_id)

    // Check if user already has a reserved locker at this station
    const alreadyReserved = await Locker.findOne({ reserved_by: user_id })
    if (alreadyReserved) {
      return res.status(400).json({
        message: `You already have locker ${alreadyReserved.locker_id} reserved at this station.`
      })
    }

    // Find the requested locker
    const locker = await Locker.findOne({ locker_id })
    if (!locker) {
      return res.status(404).json({ message: `Locker ${locker_id} not found` })
    }

    // Check if locker is available
    if (locker.state !== "available") {
      return res.status(400).json({ message: `Locker ${locker_id} is currently ${locker.state}` })
    }

    // Reserve the locker
    locker.state       = "reserved"
    locker.reserved_by = user_id
    locker.reserved_at = new Date()
    await locker.save()

    res.status(200).json({
      message: `Locker ${locker_id} reserved successfully`,
      locker: {
        locker_id:   locker.locker_id,
        state:       locker.state,
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
// ─────────────────────────────────────────────────────────
router.put("/release", async (req, res) => {
  try {
    const { station_id, user_id, locker_id } = req.body

    if (!station_id || !user_id || !locker_id) {
      return res.status(400).json({ message: "station_id, user_id and locker_id are required" })
    }

    // Verify membership
    const member = await verifyMembership(station_id, user_id)
    if (!member) {
      return res.status(403).json({ message: "Access denied. You are not an active member of this station." })
    }

    const Locker = getLockerModel(station_id)

    // Find the locker
    const locker = await Locker.findOne({ locker_id })
    if (!locker) {
      return res.status(404).json({ message: `Locker ${locker_id} not found` })
    }

    // Make sure this locker belongs to this user
    if (!locker.reserved_by || locker.reserved_by.toString() !== user_id.toString()) {
      return res.status(403).json({ message: "You can only release your own reserved locker" })
    }

    // Release the locker
    locker.state       = "available"
    locker.reserved_by = null
    locker.reserved_at = null
    await locker.save()

    res.status(200).json({
      message: `Locker ${locker_id} released successfully`,
      locker: {
        locker_id: locker.locker_id,
        state:     locker.state
      }
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

module.exports = router