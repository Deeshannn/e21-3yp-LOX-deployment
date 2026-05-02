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
const queueSchema         = require("../models/station/Queue")
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


// ─────────────────────────────────────────────────────────
// GET /api/queue/admin/:station_id
// Sub admin view — full queue details including user info
// Shows all waiting and notified users with positions
// ─────────────────────────────────────────────────────────
router.get("/admin/:station_id", async (req, res) => {
  try {
    const { station_id } = req.params

    // Get queue from station DB
    const conn  = getStationDB(station_id)
    const Queue = conn.models.Queue || conn.model("Queue", queueSchema)

    let queue = await Queue.findOne()
    if (!queue) {
      return res.status(200).json({
        message:     `Queue for station ${station_id}`,
        station_id,
        total:       0,
        waiting:     0,
        notified:    0,
        max_size:    10,
        queue_full:  false,
        entries:     []
      })
    }

    // Expire stale offers before returning admin view
    await expireStaleOffers(station_id)

    // Reload after expiry
    queue = await Queue.findOne()

    // Fetch user details from Master DB for each entry
    const mongoose = require("mongoose")
    const User     = require("../models/master/User")

    const entries = await Promise.all(
      queue.entries.map(async (entry, index) => {
        // Look up user in Master DB
        let user = null
        try {
          const userDoc = await User.findById(entry.user_id).select("name email")
          if (userDoc) {
            user = { id: userDoc._id, name: userDoc.name, email: userDoc.email }
          }
        } catch {
          user = null
        }

        const now            = new Date()
        const timeInQueue    = Math.floor((now - new Date(entry.joined_at)) / 60000)
        const timeRemaining  = entry.offer_expires_at
          ? Math.max(0, Math.floor((new Date(entry.offer_expires_at) - now) / 1000))
          : null

        return {
          position:         index + 1,
          user_id:          entry.user_id,
          user:             user || { id: entry.user_id, name: "Unknown", email: "—" },
          status:           entry.status,
          joined_at:        entry.joined_at,
          minutes_in_queue: timeInQueue,
          // Only for notified (peek) user
          offered_locker:   entry.status === "notified" ? entry.offered_locker   : null,
          offer_expires_at: entry.status === "notified" ? entry.offer_expires_at : null,
          seconds_remaining: entry.status === "notified" ? timeRemaining          : null
        }
      })
    )

    const waitingCount  = entries.filter((e) => e.status === "waiting").length
    const notifiedCount = entries.filter((e) => e.status === "notified").length

    res.status(200).json({
      message:    `Queue details for station ${station_id}`,
      station_id,
      total:      entries.length,
      waiting:    waitingCount,
      notified:   notifiedCount,
      max_size:   queue.max_size,
      queue_full: entries.length >= queue.max_size,
      entries
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

module.exports = router