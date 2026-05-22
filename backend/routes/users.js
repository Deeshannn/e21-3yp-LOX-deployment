const express = require("express")
const router = express.Router()
const User = require("../models/master/User")
const LockerStation = require("../models/master/LockerStation")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const { authenticateToken, requireRole } = require("../middleware/auth")

const JWT_SECRET = process.env.JWT_SECRET || "15e876bb86f907b8eac4773c7822d76dfbb503658850bdb9bdcdaac6f614afb7"

const signLoginToken = (user) => {
  return jwt.sign(
    {
      user_id: user._id.toString(),
      email:   user.email,
      name:    user.name
    },
    JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d"
    }
  )
}

const normalizeText = (value) => String(value || "").trim()

const toManagedAdminDto = (user, stationName) => ({
  user_id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  station_id: user.station_id || null,
  station_name: stationName || null,
  created_at: user.created_at,
  approved_at: user.approved_at || null
})

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

// GET /api/users/admins?role=sub_admin|super_admin|all&search=...
router.get("/admins", authenticateToken, requireRole("super_admin"), async (req, res) => {
  try {
    const requestedRole = normalizeText(req.query.role).toLowerCase()
    const search = normalizeText(req.query.search)

    const query = {
      role: { $in: ["super_admin", "sub_admin"] },
      status: { $ne: "disabled" }
    }

    if (requestedRole === "super_admin" || requestedRole === "sub_admin") {
      query.role = requestedRole
    }

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const pattern = new RegExp(escapedSearch, "i")
      query.$or = [
        { name: pattern },
        { email: pattern },
        { station_name: pattern },
        { station_id: pattern }
      ]
    }

    const users = await User.find(query)
      .sort({ role: 1, created_at: -1 })
      .select("name email role status station_id station_name created_at approved_at")

    const stationIds = Array.from(new Set(users
      .map((user) => normalizeText(user.station_id).toUpperCase())
      .filter(Boolean)))

    let stationNameById = new Map()
    if (stationIds.length > 0) {
      const stations = await LockerStation.find({ station_id: { $in: stationIds } })
        .select("station_id name")
        .lean()

      stationNameById = new Map(stations.map((station) => [normalizeText(station.station_id).toUpperCase(), station.name]))
    }

    const admins = users.map((user) => {
      const stationId = normalizeText(user.station_id).toUpperCase()
      const stationName = user.station_name || (stationId ? stationNameById.get(stationId) : null) || null
      return toManagedAdminDto(user, stationName)
    })

    const summary = admins.reduce((acc, admin) => {
      if (admin.role === "super_admin") acc.super_admins += 1
      if (admin.role === "sub_admin") acc.sub_admins += 1
      return acc
    }, { super_admins: 0, sub_admins: 0 })

    res.status(200).json({
      message: "Admin accounts retrieved successfully",
      count: admins.length,
      summary,
      admins
    })
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

// DELETE /api/users/admins/:user_id
router.delete("/admins/:user_id", authenticateToken, requireRole("super_admin"), async (req, res) => {
  try {
    const { user_id } = req.params

    const targetUser = await User.findById(user_id)
    if (!targetUser) {
      return res.status(404).json({ message: "Admin account not found" })
    }

    if (targetUser.role !== "sub_admin") {
      return res.status(400).json({ message: "Only sub admin accounts can be removed from this page" })
    }

    await User.findByIdAndDelete(user_id)

    res.status(200).json({
      message: "Sub admin removed successfully",
      removed_user_id: user_id
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