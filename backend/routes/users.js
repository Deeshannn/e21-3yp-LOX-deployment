const express = require("express")
const router = express.Router()
const User = require("../models/master/User")
const bcrypt = require("bcrypt")

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