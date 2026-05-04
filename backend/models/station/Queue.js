const mongoose = require("mongoose")

// One queue document per station
// entries are ordered — index 0 is first in queue
const queueEntrySchema = new mongoose.Schema({
  user_id:        { type: mongoose.Schema.Types.ObjectId, required: true },
  joined_at:      { type: Date, default: Date.now },

  // Set when this user is notified a locker is available
  notified_at:    { type: Date, default: null },

  // Which locker was offered to this user
  offered_locker: { type: String, default: null },

  // Window expires 15 min after notification
  offer_expires_at: { type: Date, default: null },

  status: {
    type:    String,
    enum:    ["waiting", "notified", "reserved", "expired", "skipped"],
    default: "waiting"
  }
}, { _id: false })


const queueSchema = new mongoose.Schema({
  // Max number of users allowed in queue at once
  max_size: { type: Number, default: 10 },

  entries:  { type: [queueEntrySchema], default: [] },

  updated_at: { type: Date, default: Date.now }
})

module.exports = queueSchema
