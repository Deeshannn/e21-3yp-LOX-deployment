const express = require("express")
const router  = express.Router()
const { getOrCreateSettings, checkOverdueForStation } = require("../utils/overdueChecker")
const { publishCommand } = require("../services/mqttService")

// ─────────────────────────────────────────────────────────
// GET /api/station-settings/:station_id
// Get current settings for a station
// ─────────────────────────────────────────────────────────
router.get("/:station_id", async (req, res) => {
  try {
    const { station_id } = req.params

    const settings = await getOrCreateSettings(station_id)

    res.status(200).json({
      message:      `Settings for station ${station_id}`,
      station_id,
      free_minutes: settings.free_minutes,
      free_time:    settings.free_minutes === 0
        ? "No time limit"
        : `${settings.free_minutes} minutes`,
      updated_at:   settings.updated_at
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})


// ─────────────────────────────────────────────────────────
// PUT /api/station-settings/:station_id
// Sub admin sets free_minutes for their station
// ─────────────────────────────────────────────────────────
router.put("/:station_id", async (req, res) => {
  try {
    const { station_id }  = req.params
    const { free_minutes } = req.body

    if (free_minutes === undefined || free_minutes === null) {
      return res.status(400).json({ message: "free_minutes is required" })
    }

    if (typeof free_minutes !== "number" || free_minutes < 0) {
      return res.status(400).json({ message: "free_minutes must be a non-negative number. Use 0 for no limit." })
    }

    const settings        = await getOrCreateSettings(station_id)
    settings.free_minutes = free_minutes
    settings.updated_at   = new Date()
    await settings.save()

    res.status(200).json({
      message:      `Settings updated for station ${station_id}`,
      station_id,
      free_minutes: settings.free_minutes,
      free_time:    settings.free_minutes === 0
        ? "No time limit"
        : `${settings.free_minutes} minutes`,
      updated_at:   settings.updated_at
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})


// ─────────────────────────────────────────────────────────
// POST /api/station-settings/:station_id/check-overdue
// Manually trigger overdue check for a station
// Useful for testing without waiting for the 60s interval
// ─────────────────────────────────────────────────────────
router.post("/:station_id/check-overdue", async (req, res) => {
  try {
    const { station_id } = req.params

    const count = await checkOverdueForStation(station_id, publishCommand)

    res.status(200).json({
      message:         `Overdue check complete for station ${station_id}`,
      overdue_found:   count || 0
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

module.exports = router