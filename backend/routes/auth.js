const express = require("express")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const User = require("../models/master/User")
const AuthRequest = require("../models/master/AuthRequest")
const LockerStation = require("../models/master/LockerStation")
const { authenticateToken, requireRole } = require("../middleware/auth")

const router = express.Router()

const ADMIN_ROLES = ["sub_admin", "super_admin"]
const JWT_SECRET = process.env.JWT_SECRET || "15e876bb86f907b8eac4773c7822d76dfbb503658850bdb9bdcdaac6f614afb7"

const normalizeEmail = (email) => String(email || "").trim().toLowerCase()

const signAuthToken = (user) => jwt.sign(
  {
    user_id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    station_id: user.station_id || null,
    locker_id: user.locker_id || null
  },
  JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
)

const toRequestDto = (request) => ({
  request_id: request._id,
  role: request.role,
  full_name: request.full_name,
  nic_number: request.nic_number,
  age: request.age,
  email: request.email,
  phone: request.phone,
  station_id: request.station_id || null,
  station_name: request.station_name || null,
  locker_id: request.locker_id || null,
  document_name: request.document_name || null,
  request_status: request.request_status,
  created_at: request.created_at,
  reviewed_at: request.reviewed_at || null
})

const toUserDto = (user) => ({
  user_id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || null,
  nic_number: user.nic_number || null,
  age: user.age || null,
  role: user.role,
  status: user.status,
  station_id: user.station_id || null,
  station_name: user.station_name || null,
  locker_id: user.locker_id || null,
  created_at: user.created_at
})

const validateRegistrationPayload = async (payload) => {
  const {
    role,
    full_name,
    nic_number,
    age,
    email,
    phone,
    password,
    password_confirm,
    station_id,
    station_name,
    locker_id,
    document_name
  } = payload

  if (!ADMIN_ROLES.includes(role)) {
    return { error: "role must be either sub_admin or super_admin" }
  }

  if (!full_name || !nic_number || age == null || !email || !phone || !password || !password_confirm) {
    return { error: "full_name, nic_number, age, email, phone, password and password_confirm are required" }
  }

  if (password !== password_confirm) {
    return { error: "Password and confirm password do not match" }
  }

  if (typeof age !== "number" || Number.isNaN(age) || age < 18) {
    return { error: "age must be a number of at least 18" }
  }

  if (role === "sub_admin") {
    if (!station_id || !station_name || !locker_id) {
      return { error: "station_id, station_name and locker_id are required for sub admin requests" }
    }

    const station = await LockerStation.findOne({ station_id })
    if (!station) {
      return { error: "Selected locker station was not found" }
    }
  }

  return {
    value: {
      role,
      full_name: String(full_name).trim(),
      nic_number: String(nic_number).trim(),
      age,
      email: normalizeEmail(email),
      phone: String(phone).trim(),
      password,
      station_id: station_id ? String(station_id).trim() : null,
      station_name: station_name ? String(station_name).trim() : null,
      locker_id: locker_id ? String(locker_id).trim() : null,
      document_name: document_name ? String(document_name).trim() : null
    }
  }
}

router.post("/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email)
    const password = req.body.password
    const requestedRole = req.body.role

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" })
    }

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    if (!ADMIN_ROLES.includes(user.role)) {
      return res.status(403).json({ message: "This account is not allowed to sign in to the admin console" })
    }

    if (user.status !== "active") {
      return res.status(403).json({ message: "This account is not active yet" })
    }

    if (requestedRole && requestedRole !== user.role) {
      return res.status(403).json({ message: "Selected role does not match the account role" })
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash)
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    res.status(200).json({
      message: "Login successful",
      token: signAuthToken(user),
      token_type: "Bearer",
      expires_in: process.env.JWT_EXPIRES_IN || "7d",
      user: toUserDto(user)
    })
  } catch (err) {
    console.error('auth /login error:', err)
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

router.post("/register", async (req, res) => {
  try {
    const validation = await validateRegistrationPayload(req.body)
    if (validation.error) {
      return res.status(400).json({ message: validation.error })
    }

    const payload = validation.value
    const email = normalizeEmail(payload.email)

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists" })
    }

    const existingRequest = await AuthRequest.findOne({ email, request_status: "pending" })
    if (existingRequest) {
      return res.status(409).json({ message: "A pending request already exists for this email" })
    }

    const password_hash = await bcrypt.hash(payload.password, 12)

    const request = await AuthRequest.create({
      role: payload.role,
      full_name: payload.full_name,
      nic_number: payload.nic_number,
      age: payload.age,
      email,
      phone: payload.phone,
      password_hash,
      station_id: payload.station_id,
      station_name: payload.station_name,
      locker_id: payload.locker_id,
      document_name: payload.document_name
    })

    res.status(201).json({
      message: "Your request has been submitted to the super admin team",
      request: toRequestDto(request)
    })
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.user_id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.status(200).json({
      message: "Current user retrieved successfully",
      user: toUserDto(user)
    })
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

router.get("/notifications", authenticateToken, requireRole("super_admin"), async (req, res) => {
  try {
    const requests = await AuthRequest.find()
      .sort({ created_at: -1 })
      .limit(50)

    const pending = requests.filter((request) => request.request_status === "pending")

    res.status(200).json({
      message: "Notifications retrieved successfully",
      unread_count: pending.length,
      requests: requests.map(toRequestDto)
    })
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

router.post("/requests/:request_id/approve", authenticateToken, requireRole("super_admin"), async (req, res) => {
  try {
    const { request_id } = req.params
    const request = await AuthRequest.findById(request_id)

    if (!request) {
      return res.status(404).json({ message: "Request not found" })
    }

    if (request.request_status !== "pending") {
      return res.status(400).json({ message: `Request is already ${request.request_status}` })
    }

    const existingUser = await User.findOne({ email: request.email })
    if (existingUser) {
      return res.status(409).json({ message: "An approved account already exists for this email" })
    }

    const user = await User.create({
      name: request.full_name,
      email: request.email,
      phone: request.phone,
      nic_number: request.nic_number,
      age: request.age,
      password_hash: request.password_hash,
      role: request.role,
      status: "active",
      station_id: request.station_id,
      station_name: request.station_name,
      locker_id: request.locker_id,
      approved_by: req.user.user_id,
      approved_at: new Date()
    })

    request.request_status = "approved"
    request.reviewed_by = req.user.user_id
    request.reviewed_at = new Date()
    await request.save()

    res.status(200).json({
      message: "Request approved successfully",
      user: toUserDto(user),
      request: toRequestDto(request)
    })
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

router.post("/requests/:request_id/reject", authenticateToken, requireRole("super_admin"), async (req, res) => {
  try {
    const { request_id } = req.params
    const request = await AuthRequest.findById(request_id)

    if (!request) {
      return res.status(404).json({ message: "Request not found" })
    }

    if (request.request_status !== "pending") {
      return res.status(400).json({ message: `Request is already ${request.request_status}` })
    }

    request.request_status = "rejected"
    request.reviewed_by = req.user.user_id
    request.reviewed_at = new Date()
    await request.save()

    res.status(200).json({
      message: "Request rejected successfully",
      request: toRequestDto(request)
    })
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

module.exports = router