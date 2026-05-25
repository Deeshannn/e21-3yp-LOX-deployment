const mongoose = require("mongoose")

// One settings document per station DB
// Governs station-level policies
const stationSettingsSchema = new mongoose.Schema({
  // How many minutes a user can keep a locker before it becomes overdue
  // 0 = no time limit (free forever until user releases)
  free_minutes: { type: Number, default: 0, min: 0 },

  updated_at: { type: Date, default: Date.now }
})

module.exports = stationSettingsSchema