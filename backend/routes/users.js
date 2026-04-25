const express = require("express")
const router = express.Router()
const User = require("../models/master/User")
const bcrypt = require("bcrypt")

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

module.exports = router