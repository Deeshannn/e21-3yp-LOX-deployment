const mongoose = require("mongoose")

const chatMessageSchema = new mongoose.Schema({
  station_id: { type: String, required: true, index: true },
  station_name: { type: String, required: true },
  sender_role: { type: String, required: true, enum: ["sub_admin", "super_admin"] },
  sender_user_id: { type: String, required: true, index: true },
  sender_name: { type: String, required: true },
  recipient_role: { type: String, required: true, enum: ["sub_admin", "super_admin"] },
  content: { type: String, required: true, trim: true },
  read_at_super: { type: Date, default: null },
  read_at_sub: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
}, {
  versionKey: false,
})

chatMessageSchema.index({ station_id: 1, created_at: -1 })
chatMessageSchema.index({ station_id: 1, read_at_super: 1, created_at: -1 })
chatMessageSchema.index({ station_id: 1, read_at_sub: 1, created_at: -1 })

module.exports = mongoose.model("ChatMessage", chatMessageSchema)