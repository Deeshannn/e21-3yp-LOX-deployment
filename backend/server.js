require("dotenv").config()
const express = require("express")
const connectMasterDB = require("./config/masterDB")
const { initStationDBs } = require("./config/stationDB")

const app = express()
app.use(express.json())

// Connect databases
connectMasterDB()
initStationDBs()

// Initialize MQTT service — connects to broker and starts listening to ESP32
require("./services/mqttService")

// Routes
app.use("/api/users",       require("./routes/users"))
app.use("/api/stations",    require("./routes/stations"))
app.use("/api/memberships", require("./routes/memberships"))
app.use("/api/lockers",     require("./routes/lockers"))

// Health check — shows DB and MQTT connection status
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
