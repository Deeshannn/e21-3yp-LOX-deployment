const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },
  email:         { type: String, required: true, unique: true, trim: true, lowercase: true },
  password_hash: { type: String, required: true },
  phone:         { type: String },
  nic_number:    { type: String },
  age:           { type: Number },
  role: {
    type: String,
    enum: ["user", "sub_admin", "super_admin"],
    default: "user"
  },
  status: {
    type: String,
    enum: ["active", "pending", "rejected", "disabled"],
    default: "active"
  },
  station_id:    { type: String, index: true },
  station_name:  { type: String },
  locker_id:     { type: String },
  approved_by:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  approved_at:   { type: Date },
  created_at:    { type: Date, default: Date.now }
})

module.exports = mongoose.model("User", userSchema)
