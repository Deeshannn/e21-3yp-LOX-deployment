const mongoose = require("mongoose")

const lockerSchema = new mongoose.Schema({
  locker_id:   { type: String, required: true, unique: true },

  // Hardware states
  lock_state:  {
    type:    String,
    enum:    ["locked", "unlocked"],
    default: "locked"
  },
  door_state:  {
    type:    String,
    enum:    ["open", "closed"],
    default: "closed"
  },

  // Combined logical state derived from lock + door
  state: {
    type:    String,
    enum:    ["lock_close", "unlock_close", "unlock_open", "fault", "offline"],
    default: "lock_close"
  },

  // Availability — derived from state + reservation + queue
  // queue_hold = locker is available but held for queue peek user only
  availability: {
    type:    String,
    enum:    ["available", "reserved", "unavailable", "queue_hold"],
    default: "available"
  },

  reserved_by: { type: mongoose.Schema.Types.ObjectId, default: null },
  reserved_at: { type: Date, default: null },

  last_reported_at: { type: Date, default: Date.now }
})

lockerSchema.index({ state: 1 })
lockerSchema.index({ availability: 1 })

module.exports = lockerSchema