const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Station = require('../models/Station');
const { env } = require('../config/env');
const { Roles } = require('../constants/enums');

function toUserDTO(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    stationIds: user.stationIds || []
  };
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
    stationIds: []
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
  toUserDTO
};
