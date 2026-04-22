const mongoose = require('mongoose');
const { Roles } = require('../constants/enums');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: Object.values(Roles), required: true, default: Roles.USER },
    stationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Station' }]
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
