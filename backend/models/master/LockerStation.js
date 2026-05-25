const mongoose = require("mongoose")

const lockerStationSchema = new mongoose.Schema({
  station_id: { type: String, required: true, unique: true },
  name:       { type: String, required: true },
  status:     {
    type:    String,
    enum:    ["active", "maintenance", "offline"],
    default: "active"
  },
  location: {
    address:   { type: String, required: true },
    city:      { type: String, required: true },
    district:  { type: String, required: true },
    latitude:  { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  last_heartbeat_at: { type: Date, default: Date.now }
})

module.exports = mongoose.model("LockerStation", lockerStationSchema)
