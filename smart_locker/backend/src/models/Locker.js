const mongoose = require('mongoose');
const { LockerStates, DoorStates } = require('../constants/enums');

const lockerSchema = new mongoose.Schema(
  {
    stationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    controlTopic: { type: String, required: true },
    stateTopic: { type: String, required: true },
    lockState: { type: String, enum: Object.values(LockerStates), default: LockerStates.UNKNOWN },
    doorState: { type: String, enum: Object.values(DoorStates), default: DoorStates.UNKNOWN },
    isBooked: { type: Boolean, default: false },
    currentUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    activeRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'AccessRequest', default: null },
    lastSeenAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Locker', lockerSchema);
