const LockerStation = require("../models/master/LockerStation")
const { ensureStationDB, buildStationDatabaseUri, getStationDBUri } = require("../config/stationDB")
const lockerSchema = require("../models/station/Locker")
const stationMemberSchema = require("../models/station/StationMember")
const queueSchema = require("../models/station/Queue")
const stationSettingsSchema = require("../models/station/StationSettings")

const getStationModels = (stationId) => {
  const conn = ensureStationDB(stationId)

  return {
    conn,
    Locker: conn.models.Locker || conn.model("Locker", lockerSchema),
    StationMember: conn.models.StationMember || conn.model("StationMember", stationMemberSchema),
    Queue: conn.models.Queue || conn.model("Queue", queueSchema),
    StationSettings: conn.models.StationSettings || conn.model("StationSettings", stationSettingsSchema)
  }
}

const createLockerDocs = (lockerCount) => {
  const total = Math.max(1, Number(lockerCount) || 0)

  return Array.from({ length: total }, (_, index) => ({
    locker_id: String(index + 1).padStart(2, "0")
  }))
}

const syncLockerCollection = async (Locker, lockerCount) => {
  const desiredDocs = createLockerDocs(lockerCount)
  const desiredIds = desiredDocs.map((locker) => locker.locker_id)
  const existingDocs = await Locker.find().select("locker_id -_id")
  const existingIds = new Set(existingDocs.map((locker) => locker.locker_id))

  const missingDocs = desiredDocs.filter((locker) => !existingIds.has(locker.locker_id))
  if (missingDocs.length > 0) {
    await Locker.insertMany(missingDocs, { ordered: false }).catch(() => undefined)
  }

  const extraIds = existingDocs
    .map((locker) => locker.locker_id)
    .filter((lockerId) => !desiredIds.includes(lockerId))

  if (extraIds.length > 0) {
    await Locker.deleteMany({ locker_id: { $in: extraIds } })
  }

  return {
    created: missingDocs.length,
    removed: extraIds.length
  }
}

const ensureStationInfrastructure = async (stationRecord) => {
  const { Locker, Queue, StationSettings } = getStationModels(stationRecord.station_id)

  const lockerSync = await syncLockerCollection(Locker, stationRecord.locker_count)

  let queueCreated = false
  const queueExists = await Queue.findOne()
  if (!queueExists) {
    await Queue.create({})
    queueCreated = true
  }

  let settingsCreated = false
  const settings = await StationSettings.findOne()
  if (!settings) {
    await StationSettings.create({})
    settingsCreated = true
  }

  return {
    lockerSync,
    queueCreated,
    settingsCreated
  }
}

const provisionStationDatabase = async (stationRecord) => {
  const { Locker } = getStationModels(stationRecord.station_id)
  const stationDbUri = stationRecord.station_db_uri || getStationDBUri(stationRecord.station_id) || buildStationDatabaseUri(stationRecord.station_id)
  const resolvedLockerCount = Number(stationRecord.locker_count) > 0
    ? Number(stationRecord.locker_count)
    : Math.max(1, await Locker.countDocuments().catch(() => 0))
  const resolvedEstimatedMembers = Number(stationRecord.estimated_members) >= 0
    ? Number(stationRecord.estimated_members)
    : Math.max(0, Math.round(resolvedLockerCount * 2.5))
  const normalizedStationRecord = {
    ...stationRecord,
    locker_count: resolvedLockerCount,
    estimated_members: resolvedEstimatedMembers,
    station_db_uri: stationDbUri
  }

  const existing = await LockerStation.findOne({ station_id: stationRecord.station_id })

  if (existing) {
    await LockerStation.updateOne(
      { _id: existing._id },
      {
        $set: {
          locker_count: resolvedLockerCount,
          estimated_members: resolvedEstimatedMembers,
          station_db_uri: stationDbUri
        }
      },
      { runValidators: false }
    )
  }

  const result = await ensureStationInfrastructure(normalizedStationRecord)

  return {
    ...result,
    station_id: stationRecord.station_id,
    station_db_uri: stationDbUri
  }
}

const syncProvisionedStationDatabases = async () => {
  const stations = await LockerStation.find({ status: "active" }).select("station_id station_db_uri locker_count estimated_members -_id")

  const results = []
  for (const station of stations) {
    const provisioned = await provisionStationDatabase({
      station_id: station.station_id,
      station_db_uri: station.station_db_uri,
      locker_count: station.locker_count,
      estimated_members: station.estimated_members
    })

    results.push(provisioned)
  }

  return results
}

module.exports = {
  getStationModels,
  ensureStationInfrastructure,
  provisionStationDatabase,
  syncProvisionedStationDatabases
}