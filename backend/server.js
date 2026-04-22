require("dotenv").config()
const express = require("express")
const connectMasterDB = require("./config/masterDB")
const { initStationDBs } = require("./config/stationDB")

const app = express()
app.use(express.json())

connectMasterDB()
initStationDBs()

// Routes
app.use("/api/users",       require("./routes/users"))
app.use("/api/stations",    require("./routes/stations"))
app.use("/api/memberships", require("./routes/memberships"))
app.use("/api/lockers",    require("./routes/lockers"))

app.get("/", (req, res) => res.send("Locker system running"))

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
