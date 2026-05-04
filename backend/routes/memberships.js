const express = require("express")
const router = express.Router()
const Membership = require("../models/master/Membership")
const User = require("../models/master/User")
const LockerStation = require("../models/master/LockerStation")
const { getStationDB } = require("../config/stationDB")
const stationMemberSchema = require("../models/station/StationMember")

const getStationMemberModel = (stationId) => {
  const conn = getStationDB(stationId)
  return conn.models.StationMember || conn.model("StationMember", stationMemberSchema)
}


// ─────────────────────────────────────────────────────────
// GET /api/memberships/status/:station_id?user_id=
// Returns membership status for a user at a station
// Returns: none | pending | member
// ─────────────────────────────────────────────────────────
router.get("/status/:station_id", async (req, res) => {
  try {
    const { station_id } = req.params
    const { user_id }    = req.query

    if (!user_id) {
      return res.status(400).json({ message: "user_id is required" })
    }

    const membership = await Membership.findOne({ user_id, station_id })

    if (!membership) {
      return res.status(200).json({ status: "none" })
    }

    if (membership.status === "active") {
      return res.status(200).json({ status: "member" })
    }

    if (membership.status === "pending") {
      return res.status(200).json({ status: "pending" })
    }

    return res.status(200).json({ status: "none" })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})


// ─────────────────────────────────────────────────────────
// POST /api/memberships/request
// User requests membership for a station
// ─────────────────────────────────────────────────────────
router.post("/request", async (req, res) => {
  try {
    const { user_id, station_id } = req.body

    if (!user_id || !station_id) {
      return res.status(400).json({ message: "user_id and station_id are required" })
    }

    const user = await User.findById(user_id)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    const station = await LockerStation.findOne({ station_id })
    if (!station) {
      return res.status(404).json({ message: "Station not found" })
    }
    if (station.status !== "active") {
      return res.status(400).json({ message: `Station is currently ${station.status}. Cannot request membership.` })
    }

    const existing = await Membership.findOne({ user_id, station_id })
    if (existing) {
      return res.status(400).json({ message: `Membership already exists with status: ${existing.status}` })
    }

    const membership = await Membership.create({
      user_id,
      station_id,
      status: "pending"
    })

    res.status(201).json({
      message:       "Membership requested successfully. Waiting for station approval.",
      membership_id: membership._id,
      status:        membership.status
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})


// ─────────────────────────────────────────────────────────
// PUT /api/memberships/accept
// Station accepts a pending membership request
// Automatically writes user into the station DB
// ─────────────────────────────────────────────────────────
router.put("/accept", async (req, res) => {
  try {
    const { membership_id } = req.body

    if (!membership_id) {
      return res.status(400).json({ message: "membership_id is required" })
    }

    const membership = await Membership.findById(membership_id)
    if (!membership) {
      return res.status(404).json({ message: "Membership not found" })
    }

    if (membership.status !== "pending") {
      return res.status(400).json({ message: `Membership is already ${membership.status}` })
    }

    membership.status   = "active"
    membership.joined_at = new Date()
    await membership.save()

    // Write user into Station DB
    const StationMember = getStationMemberModel(membership.station_id)
    const alreadyInStation = await StationMember.findOne({ user_id: membership.user_id })
    if (!alreadyInStation) {
      await StationMember.create({
        user_id:       membership.user_id,
        membership_id: membership._id,
        synced_at:     new Date(),
        local_status:  "active"
      })
    }

    res.status(200).json({
      ok:         true,
      message:    "Membership accepted. User has been added to the station.",
      membership: {
        membership_id: membership._id,
        user_id:       membership.user_id,
        station_id:    membership.station_id,
        status:        membership.status,
        joined_at:     membership.joined_at
      }
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})


// ─────────────────────────────────────────────────────────
// POST /api/memberships/ignore
// Station ignores/rejects a pending membership request
// ─────────────────────────────────────────────────────────
router.post("/ignore", async (req, res) => {
  try {
    const { membership_id } = req.body

    if (!membership_id) {
      return res.status(400).json({ message: "membership_id is required" })
    }

    const membership = await Membership.findById(membership_id)
    if (!membership) {
      return res.status(404).json({ message: "Membership not found" })
    }

    // Delete the membership request entirely
    await Membership.findByIdAndDelete(membership_id)

    res.status(200).json({ ok: true, message: "Membership request ignored and removed" })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})


// ─────────────────────────────────────────────────────────
// GET /api/memberships/pending/:station_id
// Get all pending membership requests for a station
// ─────────────────────────────────────────────────────────
router.get("/pending/:station_id", async (req, res) => {
  try {
    const { station_id } = req.params

    const pending = await Membership.find({ station_id, status: "pending" })
      .populate("user_id", "name email")

    res.status(200).json({
      message:  `Pending membership requests for ${station_id}`,
      count:    pending.length,
      requests: pending.map((m) => ({
        membership_id: m._id,
        user: {
          id:    m.user_id._id,
          name:  m.user_id.name,
          email: m.user_id.email
        },
        station_id: m.station_id,
        joined_at:  m.joined_at
      }))
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

module.exports = router
