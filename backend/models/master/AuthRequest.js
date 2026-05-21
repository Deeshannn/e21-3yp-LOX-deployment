const mongoose = require("mongoose")

const authRequestSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ["sub_admin", "super_admin"],
    required: true
  },
  full_name:    { type: String, required: true, trim: true },
  nic_number:   { type: String, required: true, trim: true },
  age:          { type: Number, required: true },
  email:        { type: String, required: true, trim: true, lowercase: true },
  phone:        { type: String, required: true, trim: true },
  password_hash:{ type: String, required: true },
  station_id:   { type: String, trim: true },
  station_name: { type: String, trim: true },
  locker_id:    { type: String, trim: true },
  document_name:{ type: String, trim: true },
  request_status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },
  reviewed_by:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reviewed_at:  { type: Date },
  created_at:   { type: Date, default: Date.now },
  updated_at:   { type: Date, default: Date.now }
})

authRequestSchema.pre("save", function updateTimestamps() {
  this.updated_at = new Date()
})

authRequestSchema.index({ email: 1, request_status: 1 })

module.exports = mongoose.model("AuthRequest", authRequestSchema)