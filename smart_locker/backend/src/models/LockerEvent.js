const mongoose = require('mongoose');

const lockerEventSchema = new mongoose.Schema(
  {
    lockerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Locker', required: true },
    stationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
    eventType: { type: String, required: true },
    message: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

lockerEventSchema.index({ stationId: 1, createdAt: -1 });
lockerEventSchema.index({ lockerId: 1, createdAt: -1 });

module.exports = mongoose.model('LockerEvent', lockerEventSchema);
