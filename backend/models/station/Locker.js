const mongoose = require("mongoose")

const lockerSchema = new mongoose.Schema({
  locker_id:   { type: String, required: true, unique: true },
  state:       {
    type:    String,
    enum:    ["available", "reserved", "occupied"],
    default: "available"
  },
  reserved_by: { type: mongoose.Schema.Types.ObjectId, default: null },
  reserved_at: { type: Date, default: null }
})

lockerSchema.index({ state: 1 })

module.exports = lockerSchema
