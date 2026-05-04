const mongoose = require("mongoose")

const stationMemberSchema = new mongoose.Schema({
  user_id:       { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
  membership_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  synced_at:     { type: Date, default: Date.now },
  local_status:  { type: String, enum: ["active", "revoked"], default: "active" }
})

module.exports = stationMemberSchema
