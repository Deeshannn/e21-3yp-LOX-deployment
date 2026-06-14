const mongoose = require('mongoose');
const { RequestStatuses } = require('../constants/enums');

const accessRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    stationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
    lockerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Locker', default: null },
    status: { type: String, enum: Object.values(RequestStatuses), default: RequestStatuses.PENDING },
    note: { type: String, default: '' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    rejectedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

accessRequestSchema.index({ stationId: 1, createdAt: -1 });
accessRequestSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('AccessRequest', accessRequestSchema);
