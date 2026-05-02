const { getStationDB } = require("../config/stationDB")
const lockerSchema     = require("../models/station/Locker")
const settingsSchema   = require("../models/station/StationSettings")

// ─────────────────────────────────────────────────────────
// MODEL HELPERS
// ─────────────────────────────────────────────────────────

const getLockerModel = (stationId) => {
  const conn = getStationDB(stationId)
  return conn.models.Locker || conn.model("Locker", lockerSchema)
}

const getSettingsModel = (stationId) => {
  const conn = getStationDB(stationId)
  return conn.models.StationSettings || conn.model("StationSettings", settingsSchema)
}

const getOrCreateSettings = async (stationId) => {
  const Settings = getSettingsModel(stationId)
  let settings   = await Settings.findOne()
  if (!settings) settings = await Settings.create({})
  return settings
}


// ─────────────────────────────────────────────────────────
// CHECK OVERDUE LOCKERS FOR ONE STATION
// ─────────────────────────────────────────────────────────
const checkOverdueForStation = async (stationId, publishCommand) => {
  const settings = await getOrCreateSettings(stationId)

  // 0 = no time limit
  if (!settings.free_minutes || settings.free_minutes === 0) return 0

  const Locker  = getLockerModel(stationId)
  const cutoff  = new Date(Date.now() - settings.free_minutes * 60 * 1000)

  // Find reserved lockers past their free time
  const overdueLockers = await Locker.find({
    availability: "reserved",
    reserved_at:  { $lt: cutoff },
    reserved_by:  { $ne: null }
  })

  for (const locker of overdueLockers) {
    locker.availability          = "overdue"
    locker.overdue_at            = new Date()
    // Automatically flag release_requested = true
    // This acts as the user notification — user polls and sees this
    // Also signals admin that this locker needs attention
    locker.release_requested     = true
    locker.release_requested_at  = new Date()
    await locker.save()

    // Send LOCK command to physically lock the locker
    try {
      await publishCommand(stationId, locker.locker_id, "LOCK")
      console.log(`Overdue: locker ${locker.locker_id} at ${stationId} locked and release requested`)
    } catch {
      console.log(`Overdue: locker ${locker.locker_id} at ${stationId} marked overdue (no hardware)`)
    }
  }

  return overdueLockers.length
}


// ─────────────────────────────────────────────────────────
// START OVERDUE CHECKER
// ─────────────────────────────────────────────────────────
const startOverdueChecker = (stationIds, publishCommand) => {
  const CHECK_INTERVAL_MS = 60 * 1000

  const run = async () => {
    for (const stationId of stationIds) {
      try {
        const count = await checkOverdueForStation(stationId, publishCommand)
        if (count > 0) {
          console.log(`Overdue checker [${stationId}]: ${count} locker(s) marked overdue`)
        }
      } catch (err) {
        console.error(`Overdue checker error [${stationId}]:`, err.message)
      }
    }
  }

  run()
  setInterval(run, CHECK_INTERVAL_MS)
  console.log(`Overdue checker started — checking every ${CHECK_INTERVAL_MS / 1000}s`)
}

module.exports = { startOverdueChecker, checkOverdueForStation, getOrCreateSettings }