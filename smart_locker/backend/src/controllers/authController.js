const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../presenters/apiPresenter');
const { register, login, bootstrapSuperAdmin, toUserDTO, updateProfile } = require('../services/authService');

const registerHandler = asyncHandler(async (req, res) => {
  const { name, email, password, stationCode, role, inviteKey } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email and password are required' });
  }

  const result = await register({ name, email, password, stationCode, role, inviteKey });
  return success(res, result, 201);
});

const loginHandler = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }

  const result = await login({ email, password });
  return success(res, result);
});

const meHandler = asyncHandler(async (req, res) => {
  return success(res, { user: toUserDTO(req.user) });
});

const updateMeHandler = asyncHandler(async (req, res) => {
  const result = await updateProfile(req.user._id, req.body);
  return success(res, result);
});

const bootstrapHandler = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email and password are required' });
  }

  const result = await bootstrapSuperAdmin({ name, email, password });
  return success(res, result, 201);
});

module.exports = {
  registerHandler,
  loginHandler,
  meHandler,
  updateMeHandler,
  bootstrapHandler
};
