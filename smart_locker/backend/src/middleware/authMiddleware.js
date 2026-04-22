const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { env } = require('../config/env');

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing bearer token' });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

function allowRoles(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    return next();
  };
}

module.exports = {
  requireAuth,
  allowRoles
};
