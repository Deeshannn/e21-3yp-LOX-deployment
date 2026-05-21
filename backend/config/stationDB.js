const mongoose = require("mongoose")

const stationConnections = {}
const stationConnectionUris = {}

const normalizeStationId = (stationId) => String(stationId || "").trim()

const getStationUriTemplate = () => process.env.STATION_DB_URI_TEMPLATE || process.env.STATION_DB_BASE_URI || process.env.MASTER_DB_URI

const buildStationDatabaseUri = (stationId) => {
  const normalizedStationId = normalizeStationId(stationId)
  const template = getStationUriTemplate()

  if (!template) {
    throw new Error("Station database URI template is missing")
  }

  if (template.includes("{stationId}")) {
    return template.replaceAll("{stationId}", normalizedStationId.toLowerCase())
  }

  const cleanedTemplate = template.replace(/\/$/, "")
  const stationDbName = normalizedStationId.toLowerCase().replace(/[^a-z0-9]+/g, "_")

  if (cleanedTemplate.includes("?") || cleanedTemplate.match(/\/[^/]+$/)) {
    return cleanedTemplate.replace(/\/[^/?]+(?=\?|$)/, `/${stationDbName}`)
  }

  return `${cleanedTemplate}/${stationDbName}`
}

const registerStationDB = (stationId, uri) => {
  const normalizedStationId = normalizeStationId(stationId)

  if (!normalizedStationId) {
    throw new Error("stationId is required")
  }

  const existing = stationConnections[normalizedStationId]
  if (existing) {
    return existing
  }

  const connectionUri = uri || buildStationDatabaseUri(normalizedStationId)
  const conn = mongoose.createConnection(connectionUri)

  conn.on("connected", () => console.log(`Station DB connected: ${normalizedStationId}`))
  conn.on("error", (err) => console.error(`Station DB error [${normalizedStationId}]:`, err.message))

  stationConnections[normalizedStationId] = conn
  stationConnectionUris[normalizedStationId] = connectionUri
  return conn
}

const ensureStationDB = (stationId, uri) => {
  const normalizedStationId = normalizeStationId(stationId)

  if (!normalizedStationId) {
    throw new Error("stationId is required")
  }

  return stationConnections[normalizedStationId] || registerStationDB(normalizedStationId, uri)
}

const initStationDBs = () => {
  const entries = (process.env.STATION_DBS || "").split(",").filter(Boolean)

  entries.forEach((entry) => {
    const [stationId, uri] = entry.split("|")

    if (!stationId || !uri) {
      console.error(`Invalid STATION_DBS entry: "${entry}"`)
      return
    }

    registerStationDB(stationId.trim(), uri.trim())
  })
}

const getStationDB = (stationId) => {
  const conn = stationConnections[normalizeStationId(stationId)]
  if (!conn) throw new Error(`No database found for station: ${stationId}`)
  return conn
}

const getStationDBUri = (stationId) => stationConnectionUris[normalizeStationId(stationId)] || null

module.exports = { initStationDBs, getStationDB, getStationDBUri, registerStationDB, ensureStationDB, buildStationDatabaseUri }
