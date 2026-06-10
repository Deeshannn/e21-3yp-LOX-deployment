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
    emergencyMode: { type: Boolean, default: false },

    // Overdue / free-duration configuration
    freeDurationMinutes: { type: Number, default: 60, min: 0 },
    overdueRatePerHour: { type: Number, default: 1.00, min: 0 },
    gracePeriodMinutes: { type: Number, default: 10, min: 1 },

    location: {
      type: {
        type: String,
        enum: ['Point'], // MongoDB requires this exact string for GeoJSON
        required: false
      },
      coordinates: {
        type: [Number],  // Array of numbers: [longitude, latitude]
        required: false
      }
    }
  },
  { timestamps: true }
);

stationSchema.index(
  { location: '2dsphere' },
  { sparse: true }          // skips docs where location is absent
);

module.exports = mongoose.model('Station', stationSchema);
