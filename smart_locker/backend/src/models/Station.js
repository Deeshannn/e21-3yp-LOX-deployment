const mongoose = require('mongoose');

const stationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    timezone: { type: String, default: 'Asia/Colombo' },
    schedule: {
      enabled: { type: Boolean, default: true },
      openTime: { type: String, default: '08:00' },
      closeTime: { type: String, default: '20:00' }
    },
    emergencyMode: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Station', stationSchema);
