const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OTP = require('../models/OTP');
const Station = require('../models/Station');
const emailService = require('./emailService');
const { env } = require('../config/env');
const { Roles } = require('../constants/enums');

function toUserDTO(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl || '',
    homeBackgroundUrl: user.homeBackgroundUrl || '',
    phone: user.phone || '',
    jobTitle: user.jobTitle || '',
    bio: user.bio || '',
    stationIds: user.stationIds || []
  };
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, env.jwtSecret, { expiresIn: '7d' });
}

async function register({ name, email, password, stationCode, role = Roles.USER, inviteKey = '' }) {
  const normalizedEmail = email.toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    const error = new Error('Email already exists');
    error.statusCode = 409;
    throw error;
  }

  if (![Roles.SUPER_ADMIN, Roles.SUB_ADMIN, Roles.USER].includes(role)) {
    const error = new Error('Invalid role');
    error.statusCode = 400;
    throw error;
  }

  if ((role === Roles.SUPER_ADMIN || role === Roles.SUB_ADMIN) && (!env.adminInviteKey || inviteKey !== env.adminInviteKey)) {
    const error = new Error('Admin role registration requires valid invite key');
    error.statusCode = 403;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const stationIds = [];
  if (stationCode) {
    const station = await Station.findOne({ code: stationCode.toUpperCase() });
    if (station) {
      stationIds.push(station._id);
    }
  }

  const user = await User.create({
    name,
    email: normalizedEmail,
    passwordHash,
    role,
    avatarUrl: '',
    homeBackgroundUrl: '',
    phone: '',
    jobTitle: '',
    bio: '',
    stationIds
  });

  return {
    token: signToken(user),
    user: toUserDTO(user)
  };
}

async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  return {
    token: signToken(user),
    user: toUserDTO(user)
  };
}

async function bootstrapSuperAdmin({ name, email, password }) {
  const existingAdmin = await User.findOne({ role: Roles.SUPER_ADMIN });
  if (existingAdmin) {
    const error = new Error('Super admin already exists');
    error.statusCode = 409;
    throw error;
  }

  const normalizedEmail = email.toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    const error = new Error('Email already exists');
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email: normalizedEmail,
    passwordHash,
    role: Roles.SUPER_ADMIN,
    avatarUrl: '',
    homeBackgroundUrl: '',
    phone: '',
    jobTitle: '',
    bio: '',
    stationIds: []
  });

  return {
    token: signToken(user),
    user: toUserDTO(user)
  };
}

async function updateProfile(userId, updates) {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const nextName = normalizeText(updates.name);
  const nextEmail = normalizeText(updates.email).toLowerCase();

  if (!nextName) {
    const error = new Error('name is required');
    error.statusCode = 400;
    throw error;
  }

  if (!nextEmail) {
    const error = new Error('email is required');
    error.statusCode = 400;
    throw error;
  }

  if (nextEmail !== user.email) {
    const existing = await User.findOne({ email: nextEmail, _id: { $ne: user._id } });
    if (existing) {
      const error = new Error('Email already exists');
      error.statusCode = 409;
      throw error;
    }
  }

  user.name = nextName;
  user.email = nextEmail;
  user.avatarUrl = normalizeText(updates.avatarUrl);
  user.homeBackgroundUrl = normalizeText(updates.homeBackgroundUrl);
  user.phone = normalizeText(updates.phone);
  user.jobTitle = normalizeText(updates.jobTitle);
  user.bio = normalizeText(updates.bio);

  await user.save();

  return { user: toUserDTO(user) };
}

async function mobileLogin({ email, password, deviceId, deviceName }) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  // Check if deviceId is registered
  const isDeviceRegistered = user.devices && user.devices.some(d => d.deviceId === deviceId);
  if (isDeviceRegistered) {
    return {
      otpRequired: false,
      token: signToken(user),
      user: toUserDTO(user)
    };
  }

  // Generate 6-digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

  // Create OTP record (clearing any old OTP for this user/device first)
  await OTP.deleteMany({ userId: user._id, deviceId });
  await OTP.create({
    userId: user._id,
    code: otpCode,
    deviceId,
    deviceName
  });

  // Send OTP email (falls back to mock logging if SMTP is not configured)
  await emailService.sendOtpEmail({ email: user.email, code: otpCode });

  return {
    otpRequired: true,
    message: 'New device detected. OTP verification required.'
  };
}

async function verifyMobileOtp({ email, otpCode, deviceId, deviceName }) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const otpRecord = await OTP.findOne({
    userId: user._id,
    code: otpCode,
    deviceId
  });

  if (!otpRecord) {
    const error = new Error('Invalid or expired OTP verification code');
    error.statusCode = 400;
    throw error;
  }

  // Register device if not already there
  const exists = user.devices && user.devices.some(d => d.deviceId === deviceId);
  if (!exists) {
    user.devices.push({ deviceId, deviceName });
    await user.save();
  }

  // Delete all OTP codes for this user/device
  await OTP.deleteMany({ userId: user._id, deviceId });

  return {
    token: signToken(user),
    user: toUserDTO(user)
  };
}

async function mobileRegister({ name, email, password, stationCode, role = Roles.USER, inviteKey = '', deviceId, deviceName }) {
  const normalizedEmail = email.toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    const error = new Error('Email already exists');
    error.statusCode = 409;
    throw error;
  }

  if (![Roles.SUPER_ADMIN, Roles.SUB_ADMIN, Roles.USER].includes(role)) {
    const error = new Error('Invalid role');
    error.statusCode = 400;
    throw error;
  }

  if ((role === Roles.SUPER_ADMIN || role === Roles.SUB_ADMIN) && (!env.adminInviteKey || inviteKey !== env.adminInviteKey)) {
    const error = new Error('Admin role registration requires valid invite key');
    error.statusCode = 403;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const stationIds = [];
  if (stationCode) {
    const station = await Station.findOne({ code: stationCode.toUpperCase() });
    if (station) {
      stationIds.push(station._id);
    }
  }

  const user = await User.create({
    name,
    email: normalizedEmail,
    passwordHash,
    role,
    avatarUrl: '',
    homeBackgroundUrl: '',
    phone: '',
    jobTitle: '',
    bio: '',
    stationIds,
    devices: [{ deviceId, deviceName, authorizedAt: new Date() }]
  });

  return {
    token: signToken(user),
    user: toUserDTO(user)
  };
}

module.exports = {
  register,
  login,
  bootstrapSuperAdmin,
  toUserDTO,
  updateProfile,
  mobileLogin,
  verifyMobileOtp,
  mobileRegister
};
