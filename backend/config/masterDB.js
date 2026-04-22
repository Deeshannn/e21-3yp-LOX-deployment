const mongoose = require("mongoose")

const connectMasterDB = async () => {
  try {
    await mongoose.connect(process.env.MASTER_DB_URI)
    console.log("Master DB connected")
  } catch (err) {
    console.error("Master DB connection failed:", err.message)
    process.exit(1)
  }
}

module.exports = connectMasterDB
