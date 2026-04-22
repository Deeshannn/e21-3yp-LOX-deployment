const mongoose = require('mongoose');

const queueEntrySchema = new mongoose.Schema(
  {
    stationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'AccessRequest', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['WAITING', 'ASSIGNED', 'CANCELLED'], default: 'WAITING' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('QueueEntry', queueEntrySchema);
