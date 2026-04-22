const mongoose = require("mongoose")

const stationConnections = {}

const initStationDBs = () => {
  const entries = process.env.STATION_DBS.split(",")

  entries.forEach((entry) => {
    const [stationId, uri] = entry.split("|")

    if (!stationId || !uri) {
      console.error(`Invalid STATION_DBS entry: "${entry}"`)
      return
    }

    const conn = mongoose.createConnection(uri.trim())

    conn.on("connected", () => console.log(`Station DB connected: ${stationId.trim()}`))
    conn.on("error", (err) => console.error(`Station DB error [${stationId.trim()}]:`, err.message))

    stationConnections[stationId.trim()] = conn
  })
}

const getStationDB = (stationId) => {
  const conn = stationConnections[stationId]
  if (!conn) throw new Error(`No database found for station: ${stationId}`)
  return conn
}

module.exports = { initStationDBs, getStationDB }
