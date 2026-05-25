const express = require("express")
const router = express.Router()
const LockerStation = require("../models/master/LockerStation")
const { getStationDB } = require("../config/stationDB")
const lockerSchema = require("../models/station/Locker")

// Helper — get or register Locker model on a station connection
const getLockerModel = (stationId) => {
  try {
    const conn = getStationDB(stationId)
    return conn.models.Locker || conn.model("Locker", lockerSchema)
  } catch {
    return null
  }
}

// POST /api/stations/add
router.post("/add", async (req, res) => {
  try {
    const { station_id, name, location } = req.body

    if (!station_id || !name || !location) {
      return res.status(400).json({ message: "station_id, name and location are required" })
    }

    const { address, city, district, latitude, longitude } = location
    if (!address || !city || !district || latitude == null || longitude == null) {
      return res.status(400).json({ message: "location must include address, city, district, latitude and longitude" })
    }

    const existing = await LockerStation.findOne({ station_id })
    if (existing) {
      return res.status(400).json({ message: "Station ID already exists" })
    }

    const station = await LockerStation.create({
      station_id,
      name,
      location: { address, city, district, latitude, longitude }
    })

    res.status(201).json({
      message: "Locker station added successfully",
      station
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})


// GET /api/stations
// Returns all active stations with name, main town, station_id and locker count
router.get("/", async (req, res) => {
  try {
    // Fetch all active stations from Master DB
    const stations = await LockerStation.find({ status: "active" })
      .select("station_id name location.city location.address location.district location.latitude location.longitude status -_id")

    // For each station, get locker count from its station DB
    const result = await Promise.all(
      stations.map(async (station) => {
        let locker_count = 0

        const Locker = getLockerModel(station.station_id)
        if (Locker) {
          locker_count = await Locker.countDocuments()
        }

        return {
          station_id:   station.station_id,
          name:         station.name,
          main_town:    station.location.city,
          address:      station.location.address,
          district:     station.location.district,
          locker_count,
          latitude:     station.location.latitude,
          longitude:    station.location.longitude
        }
      })
    )

    res.status(200).json({
      message: "Stations retrieved successfully",
      count:    result.length,
      stations: result
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

module.exports = router
