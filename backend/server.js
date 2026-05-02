require("dotenv").config()
const express = require("express")
const cors    = require("cors")
const connectMasterDB    = require("./config/masterDB")
const { initStationDBs } = require("./config/stationDB")

const app = express()
app.use(cors())
app.use(express.json())

// Connect databases
connectMasterDB()
initStationDBs()

// Initialize MQTT — connects to broker and listens to ESP32
require("./services/mqttService")

// Start overdue locker checker — runs every 60 seconds
// Reads station IDs from env to know which stations to check
const { startOverdueChecker }  = require("./utils/overdueChecker")
const { publishCommand }       = require("./services/mqttService")
const stationIds = process.env.STATION_DBS
  .split(",")
  .map((entry) => entry.split("|")[0].trim())
startOverdueChecker(stationIds, publishCommand)

// Routes
app.use("/api/users",            require("./routes/users"))
app.use("/api/stations",         require("./routes/stations"))
app.use("/api/memberships",      require("./routes/memberships"))
app.use("/api/lockers",          require("./routes/lockers"))
app.use("/api/queue",            require("./routes/queue"))
app.use("/api/station-settings", require("./routes/stationSettings"))

// Health check
app.get("/health", (req, res) => {
  const { isMqttConnected } = require("./services/mqttService")
  const mongoose = require("mongoose")
  res.json({
    ok:             true,
    db_connected:   mongoose.connection.readyState === 1,
    mqtt_connected: isMqttConnected()
  })
})

app.get("/", (req, res) => res.send("Locker system running"))

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))