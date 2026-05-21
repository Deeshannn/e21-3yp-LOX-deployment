const bcrypt = require("bcrypt")
const User = require("../models/master/User")
const LockerStation = require("../models/master/LockerStation")

const DEFAULT_SUPER_ADMIN = {
  name: "LOX HQ",
  email: "blackswarn@gmail.com",
  password: "123456"
}

const DEFAULT_STATIONS = [
  {
    station_id: "STN-001",
    name: "Kochi Central",
    location: {
      address: "MG Road, Kochi",
      city: "Kochi",
      district: "Ernakulam",
      latitude: 9.9312,
      longitude: 76.2673
    }
  },
  {
    station_id: "STN-002",
    name: "Trivandrum Hub",
    location: {
      address: "MG Road, Trivandrum",
      city: "Trivandrum",
      district: "Thiruvananthapuram",
      latitude: 8.5241,
      longitude: 76.9366
    }
  }
]

const seedAuthData = async () => {
  await Promise.all(
    DEFAULT_STATIONS.map(async (station) => {
      await LockerStation.updateOne(
        { station_id: station.station_id },
        { $setOnInsert: { ...station, status: "active", last_heartbeat_at: new Date() } },
        { upsert: true }
      )
    })
  )

  const existingSuperAdmin = await User.findOne({ email: DEFAULT_SUPER_ADMIN.email })
  if (!existingSuperAdmin) {
    const password_hash = await bcrypt.hash(DEFAULT_SUPER_ADMIN.password, 12)

    await User.create({
      name: DEFAULT_SUPER_ADMIN.name,
      email: DEFAULT_SUPER_ADMIN.email,
      password_hash,
      role: "super_admin",
      status: "active"
    })
  }
}

module.exports = { seedAuthData, DEFAULT_STATIONS }