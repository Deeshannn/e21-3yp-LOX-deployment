const express = require("express")
const router = express.Router()
const User = require("../models/master/User")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const { authenticateToken } = require("../middleware/auth")

const signLoginToken = (user) => {
  const jwtSecret = process.env.JWT_SECRET

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not configured")
  }

  return jwt.sign(
    {
      user_id: user._id.toString(),
      email:   user.email,
      name:    user.name
    },
    jwtSecret,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d"
    }
  )
}

// GET /api/users
// Get all users with id, name, email
router.get("/", async (req, res) => {
  try {
    const users = await User.find().select("_id name email created_at")

    res.status(200).json({
      message: "Users retrieved successfully",
      count:   users.length,
      users:   users.map((u) => ({
        user_id:    u._id,
        name:       u.name,
        email:      u.email,
        created_at: u.created_at
      }))
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

// POST /api/users/add
router.post("/add", async (req, res) => {
  try {
    const { name, email, password } = req.body

    // Check all fields are provided
    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email and password are required" })
    }

    // Check if email already exists
    const existing = await User.findOne({ email })
    if (existing) {
      return res.status(400).json({ message: "Email already exists" })
    }

    // Hash the password
    const password_hash = await bcrypt.hash(password, 10)

    // Create the user
    const user = await User.create({
      name,
      email,
      password_hash
    })

    res.status(201).json({
      message: "User added successfully",
      user: {
        id:         user._id,
        name:       user.name,
        email:      user.email,
        created_at: user.created_at
      }
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

// POST /api/users/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" })
    }

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash)
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    let token
    try {
      token = signLoginToken(user)
    } catch (err) {
      return res.status(500).json({ message: err.message })
    }

    res.status(200).json({
      message: "Login successful",
      token,
      token_type: "Bearer",
      expires_in: process.env.JWT_EXPIRES_IN || "7d",
      user: {
        user_id:    user._id,
        name:       user.name,
        email:      user.email,
        created_at: user.created_at
      }
    })
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

// GET /api/users/me
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.user_id).select("_id name email created_at")

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.status(200).json({
      message: "Current user retrieved successfully",
      user: {
        user_id:    user._id,
        name:       user.name,
        email:      user.email,
        created_at: user.created_at
      }
    })
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

module.exports = router