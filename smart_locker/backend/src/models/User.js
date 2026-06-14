const mongoose = require('mongoose');
const { Roles } = require('../constants/enums');

const deviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true },
  deviceName: { type: String, default: '' },
  authorizedAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: Object.values(Roles), required: true, default: Roles.USER },
    avatarUrl: { type: String, trim: true, default: '' },
    homeBackgroundUrl: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    jobTitle: { type: String, trim: true, default: '' },
    bio: { type: String, trim: true, default: '' },
    stationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Station' }],
    fcmToken: { type: String, default: '' },
    devices: [deviceSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
