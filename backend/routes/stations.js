const express = require("express")
const router = express.Router()
const LockerStation = require("../models/master/LockerStation")
const { authenticateToken, requireRole } = require("../middleware/auth")
const { getStationDB } = require("../config/stationDB")
const lockerSchema = require("../models/station/Locker")
const { buildStationDatabaseUri } = require("../config/stationDB")
const { provisionStationDatabase } = require("../utils/stationProvisioner")

const getLockerModel = (stationId) => {
  try {
    const conn = getStationDB(stationId)
    return conn.models.Locker || conn.model("Locker", lockerSchema)
  } catch {
    return null
  }
}

const normalizeStationId = (value) => String(value || "").trim().toUpperCase()

const parseNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const validateStationPayload = (payload) => {
  const station_id = normalizeStationId(payload.station_id)
  const name = String(payload.name || "").trim()
  const locker_count = parseNumber(payload.locker_count)
  const estimated_members = parseNumber(payload.estimated_members ?? 0)
  const notes = String(payload.notes || "").trim()
  const location = payload.location || {}

  const address = String(location.address || "").trim()
  const city = String(location.city || "").trim()
  const district = String(location.district || "").trim()
  const latitude = parseNumber(location.latitude)
  const longitude = parseNumber(location.longitude)

  if (!station_id || !name || locker_count == null || !address || !city || !district || latitude == null || longitude == null) {
    return {
      error: "station_id, name, locker_count, location.address, location.city, location.district, location.latitude and location.longitude are required"
    }
  }

  if (locker_count < 1) {
    return { error: "locker_count must be at least 1" }
  }

  if (estimated_members < 0) {
    return { error: "estimated_members must be zero or greater" }
  }

  return {
    value: {
      station_id,
      name,
      locker_count,
      estimated_members,
      notes,
      location: {
        address,
        city,
        district,
        latitude,
        longitude
      }
    }
  }
}

const respondStation = async (station) => {
  let locker_count = station.locker_count || 0

  const Locker = getLockerModel(station.station_id)
  if (Locker) {
    locker_count = await Locker.countDocuments()
  }

  return {
    station_id: station.station_id,
    name: station.name,
    status: station.status,
    locker_count,
    estimated_members: station.estimated_members || 0,
    notes: station.notes || "",
    location: {
      address: station.location.address,
      city: station.location.city,
      district: station.location.district,
      latitude: station.location.latitude,
      longitude: station.location.longitude
    },
    station_db_uri: station.station_db_uri || "",
    last_heartbeat_at: station.last_heartbeat_at
  }
}

const saveStation = async ({ existingStation, payload }) => {
  const station_db_uri = existingStation?.station_db_uri || buildStationDatabaseUri(payload.station_id)

  const station = existingStation || new LockerStation()
  station.station_id = payload.station_id
  station.name = payload.name
  station.locker_count = payload.locker_count
  station.estimated_members = payload.estimated_members
  station.notes = payload.notes
  station.station_db_uri = station_db_uri
  station.status = "active"
  station.location = payload.location
  station.last_heartbeat_at = new Date()

  await station.save()

  const provisioned = await provisionStationDatabase({
    station_id: station.station_id,
    locker_count: station.locker_count,
    station_db_uri,
    estimated_members: station.estimated_members
  })

  return { station, provisioned }
}

// POST /api/stations/add
router.post(["/", "/add"], authenticateToken, requireRole("super_admin"), async (req, res) => {
  try {
    const validation = validateStationPayload(req.body)
    if (validation.error) {
      return res.status(400).json({ message: validation.error })
    }

    const { value: payload } = validation
    const existing = await LockerStation.findOne({ station_id: payload.station_id })
    if (existing) {
      return res.status(409).json({ message: "Station ID already exists" })
    }

    const { station, provisioned } = await saveStation({ payload })

    res.status(201).json({
      message: "Locker station created successfully",
      station: await respondStation(station),
      provisioned
    })
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

// GET /api/stations
router.get("/", async (req, res) => {
  try {
    const stations = await LockerStation.find({ status: "active" })
      .select("station_id name locker_count estimated_members notes location.latitude location.longitude location.city location.address location.district status station_db_uri last_heartbeat_at -_id")

    const result = await Promise.all(stations.map((station) => respondStation(station)))

    res.status(200).json({
      message: "Stations retrieved successfully",
      count: result.length,
      stations: result
    })
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

// GET /api/stations/me
router.get("/me", authenticateToken, requireRole("sub_admin"), async (req, res) => {
  try {
    const stationId = normalizeStationId(req.user.station_id)

    if (!stationId) {
      return res.status(403).json({ message: "This account is not assigned to a locker station" })
    }

    const station = await LockerStation.findOne({ station_id: stationId, status: "active" })

    if (!station) {
      return res.status(404).json({ message: "Assigned locker station was not found" })
    }

    res.status(200).json({
      message: "Assigned station retrieved successfully",
      station: await respondStation(station)
    })
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

// GET /api/stations/:station_id
router.get("/:station_id", authenticateToken, async (req, res) => {
  try {
    const { station_id } = req.params
    const normalizedStationId = normalizeStationId(station_id)

    if (req.user.role !== "super_admin" && normalizeStationId(req.user.station_id) !== normalizedStationId) {
      return res.status(403).json({ message: "You can only access your assigned locker station" })
    }

    const station = await LockerStation.findOne({ station_id: normalizedStationId })

    if (!station) {
      return res.status(404).json({ message: "Station not found" })
    }

    res.status(200).json({
      message: "Station retrieved successfully",
      station: await respondStation(station)
    })
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

// PUT /api/stations/:station_id
router.put("/:station_id", authenticateToken, requireRole("super_admin"), async (req, res) => {
  try {
    const { station_id: currentStationId } = req.params
    const station = await LockerStation.findOne({ station_id: normalizeStationId(currentStationId) })

    if (!station) {
      return res.status(404).json({ message: "Station not found" })
    }

    const requestStationId = normalizeStationId(req.body.station_id || station.station_id)
    if (requestStationId !== station.station_id) {
      return res.status(400).json({ message: "Station ID cannot be changed during update" })
    }

    const validation = validateStationPayload({ ...req.body, station_id: station.station_id })
    if (validation.error) {
      return res.status(400).json({ message: validation.error })
    }

    const { value: payload } = validation
    const updatedStation = await LockerStation.findOneAndUpdate(
      { station_id: station.station_id },
      {
        station_id: station.station_id,
        name: payload.name,
        locker_count: payload.locker_count,
        estimated_members: payload.estimated_members,
        notes: payload.notes,
        station_db_uri: station.station_db_uri || buildStationDatabaseUri(payload.station_id),
        status: "active",
        location: payload.location,
        last_heartbeat_at: new Date()
      },
      { new: true, runValidators: true }
    )

    const provisioned = await provisionStationDatabase({
      station_id: updatedStation.station_id,
      locker_count: updatedStation.locker_count,
      station_db_uri: updatedStation.station_db_uri,
      estimated_members: updatedStation.estimated_members
    })

    res.status(200).json({
      message: "Locker station updated successfully",
      station: await respondStation(updatedStation),
      provisioned,
    })
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

// DELETE /api/stations/:station_id
router.delete("/:station_id", authenticateToken, requireRole("super_admin"), async (req, res) => {
  try {
    const { station_id } = req.params
    const normalizedStationId = normalizeStationId(station_id)
    const station = await LockerStation.findOne({ station_id: normalizedStationId })

    if (!station || station.status === "deleted") {
      return res.status(404).json({ message: "Station not found" })
    }

    station.status = "deleted"
    station.last_heartbeat_at = new Date()
    await station.save()

    res.status(200).json({
      message: "Locker station deleted successfully",
      station_id: normalizedStationId
    })
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

module.exports = router