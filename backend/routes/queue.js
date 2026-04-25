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

// A locker is reservable if:
//   - state is lock_close or unlock_open  (resting states)
//   - AND no reserved_by (not owned by anyone)
// This works even on old documents that have no availability field
const hasReservableLocker = async (stationId) => {
  const conn   = getStationDB(stationId)
  const Locker = conn.models.Locker || conn.model("Locker", lockerSchema)

  // A locker is reservable when ANY of these conditions are true:
  // 1. state is a resting state AND no owner           (new documents with state field)
  // 2. availability is "available"                     (documents with availability field)
  // 3. no state field at all AND no reserved_by        (old documents before schema update)
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
      // Exclude offline and fault states explicitly
      { state: { $nin: ["offline", "fault", "unlock_close"] } }
    ]
  })
  return !!locker
}


// ─────────────────────────────────────────────────────────
// POST /api/queue/join
// Member joins queue only when ALL lockers are unavailable
// ─────────────────────────────────────────────────────────
router.post("/join", async (req, res) => {
  try {
    const { station_id, user_id } = req.body

    if (!station_id || !user_id) {
      return res.status(400).json({ message: "station_id and user_id are required" })
    }

    // Verify membership
    const member = await verifyMembership(station_id, user_id)
    if (!member) {
      return res.status(403).json({ message: "Access denied. You are not an active member of this station." })
    }

    // Block joining if any locker is reservable
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
// Member voluntarily leaves the queue — entry removed from DB
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
// Member checks their queue position and offer status
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

    // Expire stale offers before returning status
    await expireStaleOffers(station_id)

    const status = await getQueueStatus(station_id, user_id)
    // Normalize response shape to match frontend expectations
    res.status(200).json({
      message:        `Queue status for station ${station_id}`,
      in_queue:       status.in_queue,
      position:       status.your_position,
      total_in_queue: status.queue_size,
      your_status:    status.your_status,
      offered_locker: status.offered_locker,
      offer_expires_at: status.offer_expires_at
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})


// ─────────────────────────────────────────────────────────
// GET /api/queue/notification/:station_id
// Client polls this to check if they have a locker offer
// Returns offer details if user is at top of queue
// and a locker has been assigned to them
// Returns nothing if user has no active offer
// ─────────────────────────────────────────────────────────
router.get("/notification/:station_id", async (req, res) => {
  try {
    const { station_id } = req.params
    const { user_id }    = req.query

    if (!user_id) {
      return res.status(400).json({ message: "user_id is required as a query parameter" })
    }

    // Verify membership
    const member = await verifyMembership(station_id, user_id)
    if (!member) {
      return res.status(403).json({ message: "Access denied. You are not an active member of this station." })
    }

    // Expire any stale offers before checking
    await expireStaleOffers(station_id)

    // Check if this user has an active offer
    const offer = await getUserOffer(station_id, user_id)

    if (!offer) {
      // No offer — check if they are still in queue so client knows their state
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

    // User has an active offer — calculate time remaining
    const now              = new Date()
    const ms_remaining     = offer.offer_expires_at - now
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
