const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/cloudinaryMiddleware');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../presenters/apiPresenter');
const { toUserDTO } = require('../services/authService');
const User = require('../models/User');

const router = express.Router();

router.put(
  '/profile',
  requireAuth,
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'background', maxCount: 1 }
  ]),
  asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { name, email, phone, jobTitle, bio } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update text fields if provided
    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return res.status(400).json({ message: 'Name cannot be empty' });
      }
      user.name = trimmedName;
    }

    if (email !== undefined) {
      const nextEmail = email.trim().toLowerCase();
      if (!nextEmail) {
        return res.status(400).json({ message: 'Email cannot be empty' });
      }
      if (nextEmail !== user.email) {
        const existing = await User.findOne({ email: nextEmail, _id: { $ne: userId } });
        if (existing) {
          return res.status(409).json({ message: 'Email already exists' });
        }
        user.email = nextEmail;
      }
    }

    if (phone !== undefined) {
      user.phone = phone.trim();
    }
    
    if (jobTitle !== undefined) {
      user.jobTitle = jobTitle.trim();
    }
    
    if (bio !== undefined) {
      user.bio = bio.trim();
    }

    // Process uploaded files if any
    if (req.files) {
      if (req.files.avatar && req.files.avatar[0]) {
        user.avatarUrl = req.files.avatar[0].path; // Cloudinary secure_url is stored in path in multer-storage-cloudinary
      }
      if (req.files.background && req.files.background[0]) {
        user.homeBackgroundUrl = req.files.background[0].path;
      }
    }

    await user.save();

    return success(res, { user: toUserDTO(user) });
  })
);

module.exports = router;
