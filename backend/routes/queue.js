const express = require("express")
const router  = express.Router()
const {
  joinQueue,
  leaveQueue,
  getQueueStatus,
  expireStaleOffers,
  getUserOffer
} = require("../utils/queueProcessor")
const lockerSchema        = require("../models/station/Locker")
const stationMemberSchema = require("../models/station/StationMember")
const { getStationDB }    = require("../config/stationDB")

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

const verifyMembership = async (stationId, userId) => {
  const conn          = getStationDB(stationId)
  const StationMember = conn.models.StationMember || conn.model("StationMember", stationMemberSchema)
  return await StationMember.findOne({ user_id: userId, local_status: "active" })
}

// A locker is freely reservable (no queue needed) when:
//   - state is a resting state AND no owner AND not queue_hold
// queue_hold means a locker is held for the peek queue user — others must join queue
const hasReservableLocker = async (stationId) => {
  const conn   = getStationDB(stationId)
  const Locker = conn.models.Locker || conn.model("Locker", lockerSchema)

  const locker = await Locker.findOne({
    $and: [
      { reserved_by: null },
      {
        $or: [
          { state:        { $in: ["lock_close", "unlock_open"] } },
          { availability: "available" },
          { state:        { $exists: false } }
        ]
      },
      // Exclude bad states and queue_hold — queue_hold is not freely reservable
      { state:        { $nin: ["offline", "fault", "unlock_close"] } },
      { availability: { $nin: ["queue_hold", "reserved", "unavailable"] } }
    ]
  })
  return !!locker
}


// ─────────────────────────────────────────────────────────
// POST /api/queue/join
// Member joins queue only when no lockers are freely available
// ─────────────────────────────────────────────────────────
router.post("/join", async (req, res) => {
  try {
    const { station_id, user_id } = req.body

    if (!station_id || !user_id) {
      return res.status(400).json({ message: "station_id and user_id are required" })
    }

    const member = await verifyMembership(station_id, user_id)
    if (!member) {
      return res.status(403).json({ message: "Access denied. You are not an active member of this station." })
    }

    // Block joining if any locker is freely reservable
    const reservable = await hasReservableLocker(station_id)
    if (reservable) {
      return res.status(400).json({
        message: "Lockers are currently available. Please reserve one directly instead of joining the queue."
      })
    }

    const result = await joinQueue(station_id, user_id)
    res.status(result.success ? 201 : 400).json(result)

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})


// ─────────────────────────────────────────────────────────
// DELETE /api/queue/leave
// Member voluntarily leaves — queue_hold released if peek
// ─────────────────────────────────────────────────────────
router.delete("/leave", async (req, res) => {
  try {
    const { station_id, user_id } = req.body

    if (!station_id || !user_id) {
      return res.status(400).json({ message: "station_id and user_id are required" })
    }

    const member = await verifyMembership(station_id, user_id)
    if (!member) {
      return res.status(403).json({ message: "Access denied. You are not an active member of this station." })
    }

    const result = await leaveQueue(station_id, user_id)
    res.status(result.success ? 200 : 400).json(result)

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})


// ─────────────────────────────────────────────────────────
// GET /api/queue/status/:station_id
// ─────────────────────────────────────────────────────────
router.get("/status/:station_id", async (req, res) => {
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

    await expireStaleOffers(station_id)

    const status = await getQueueStatus(station_id, user_id)
    res.status(200).json({
      message:          `Queue status for station ${station_id}`,
      in_queue:         status.in_queue,
      position:         status.your_position,
      total_in_queue:   status.queue_size,
      your_status:      status.your_status,
      offered_locker:   status.offered_locker,
      offer_expires_at: status.offer_expires_at
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})


// ─────────────────────────────────────────────────────────
// GET /api/queue/notification/:station_id
// ─────────────────────────────────────────────────────────
router.get("/notification/:station_id", async (req, res) => {
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

    await expireStaleOffers(station_id)

    const offer = await getUserOffer(station_id, user_id)

    if (!offer) {
      const status = await getQueueStatus(station_id, user_id)
      return res.status(200).json({
        has_notification: false,
        in_queue:         status.in_queue,
        your_position:    status.your_position,
        queue_size:       status.queue_size,
        message:          status.in_queue
          ? `You are position ${status.your_position} of ${status.queue_size} in the queue`
          : "You have no active queue entry or offer"
      })
    }

    const now               = new Date()
    const ms_remaining      = offer.offer_expires_at - now
    const minutes_remaining = Math.max(0, Math.floor(ms_remaining / 60000))
    const seconds_remaining = Math.max(0, Math.floor((ms_remaining % 60000) / 1000))

    return res.status(200).json({
      has_notification:  true,
      message:           `Locker ${offer.offered_locker} is available for you. Reserve it within ${minutes_remaining}m ${seconds_remaining}s.`,
      offered_locker:    offer.offered_locker,
      offer_expires_at:  offer.offer_expires_at,
      minutes_remaining,
      seconds_remaining
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

module.exports = router