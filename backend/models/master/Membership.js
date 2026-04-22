const mongoose = require("mongoose")

const membershipSchema = new mongoose.Schema({
  user_id:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  station_id: { type: String, required: true },
  joined_at:  { type: Date, default: Date.now },
  status:     {
    type:    String,
    enum:    ["pending", "active", "suspended"],
    default: "pending"
  }
})

membershipSchema.index({ user_id: 1, station_id: 1 }, { unique: true })

module.exports = mongoose.model("Membership", membershipSchema)
