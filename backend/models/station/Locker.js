const mongoose = require("mongoose")

const lockerSchema = new mongoose.Schema({
  locker_id:   { type: String, required: true, unique: true },

  lock_state: {
    type:    String,
    enum:    ["locked", "unlocked"],
    default: "locked"
  },
  door_state: {
    type:    String,
    enum:    ["open", "closed"],
    default: "closed"
  },

  state: {
    type:    String,
    enum:    ["lock_close", "unlock_close", "unlock_open", "fault", "offline"],
    default: "lock_close"
  },

  availability: {
    type:    String,
    enum:    ["available", "reserved", "unavailable", "queue_hold", "overdue"],
    default: "available"
  },

  reserved_by: { type: mongoose.Schema.Types.ObjectId, default: null },
  reserved_at: { type: Date, default: null },

  // Overdue tracking
  overdue_at: { type: Date, default: null },

  // Release request — user asks admin to unlock overdue locker
  release_requested:    { type: Boolean, default: false },
  release_requested_at: { type: Date,    default: null  }
})

lockerSchema.index({ state: 1 })
lockerSchema.index({ availability: 1 })
lockerSchema.index({ reserved_at: 1 })

module.exports = lockerSchema