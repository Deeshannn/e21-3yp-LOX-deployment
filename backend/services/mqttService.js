const mqtt = require("mqtt")
const { getStationDB } = require("../config/stationDB")
const lockerSchema = require("../models/station/Locker")

// ─────────────────────────────────────────────────────────
// MQTT broker connection (HiveMQ Cloud)
// ─────────────────────────────────────────────────────────
const client = mqtt.connect(`mqtts://${process.env.MQTT_SERVER}`, {
  port:            8883,
  username:        process.env.MQTT_USER,
  password:        process.env.MQTT_PASSWORD,
  reconnectPeriod: 5000,
  rejectUnauthorized: false   // HiveMQ Cloud quick setup — use proper CA in production
})

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

// Get Locker model for a specific station DB
const getLockerModel = (stationId) => {
  const conn = getStationDB(stationId)
  return conn.models.Locker || conn.model("Locker", lockerSchema)
}

// Derive logical state from raw hardware signals
const deriveState = (lockState, doorState) => {
  if (lockState === "locked"   && doorState === "closed") return "lock_close"
  if (lockState === "unlocked" && doorState === "closed") return "unlock_close"
  if (lockState === "unlocked" && doorState === "open")   return "unlock_open"
  if (lockState === "locked"   && doorState === "open")   return "fault"
  return "fault"
}

// Derive availability from logical state + reservation
const deriveAvailability = (state, reserved_by) => {
  if (state === "offline")      return "unavailable"
  if (state === "unlock_close") return "unavailable"
  if (state === "fault")        return "unavailable"
  return reserved_by ? "reserved" : "available"
}

// Parse topic → { stationId, lockerId }
// Expected format: locker/{station_id}/{locker_id}/state
const parseTopic = (topic) => {
  const parts = topic.split("/")
  if (parts.length !== 4 || parts[0] !== "locker" || parts[3] !== "state") {
    return null
  }
  return {
    stationId: parts[1],
    lockerId:  parts[2]
  }
}


// ─────────────────────────────────────────────────────────
// MQTT EVENT HANDLERS
// ─────────────────────────────────────────────────────────

client.on("connect", () => {
  console.log("MQTT broker connected")

  // Subscribe to all locker state topics across all stations
  // Wildcard: locker/+/+/state catches all stations and lockers
  client.subscribe("locker/+/+/state", (err) => {
    if (err) {
      console.error("MQTT subscribe failed:", err.message)
    } else {
      console.log("MQTT subscribed to locker/+/+/state")
    }
  })
})


client.on("message", async (topic, payload) => {
  try {
    const parsed = parseTopic(topic)
    if (!parsed) return   // ignore unrecognized topics

    const { stationId, lockerId } = parsed
    const value = payload.toString().trim().toUpperCase()

    // Get the locker from the correct station DB
    const Locker = getLockerModel(stationId)
    const locker = await Locker.findOne({ locker_id: lockerId })
    if (!locker) {
      console.warn(`MQTT: locker ${lockerId} not found in station ${stationId}`)
      return
    }

    // Update hardware signal — lock state
    if (value === "LOCKED") {
      locker.lock_state = "locked"
    } else if (value === "UNLOCKED") {
      locker.lock_state = "unlocked"
    }

    // Update hardware signal — door state
    else if (value === "OPEN") {
      locker.door_state = "open"
    } else if (value === "CLOSED") {
      locker.door_state = "closed"
    }

    else {
      console.warn(`MQTT: unknown payload "${value}" on topic ${topic}`)
      return
    }

    // Derive and update logical state + availability
    locker.state            = deriveState(locker.lock_state, locker.door_state)
    locker.availability     = deriveAvailability(locker.state, locker.reserved_by)
    locker.last_reported_at = new Date()

    await locker.save()

    console.log(`MQTT: [${stationId}] ${lockerId} → lock:${locker.lock_state} door:${locker.door_state} state:${locker.state} availability:${locker.availability}`)

  } catch (err) {
    console.error("MQTT message processing error:", err.message)
  }
})


client.on("error", (err) => {
  console.error("MQTT error:", err.message)
})

client.on("reconnect", () => {
  console.log("MQTT reconnecting...")
})

client.on("offline", () => {
  console.log("MQTT offline")
})


// ─────────────────────────────────────────────────────────
// PUBLISH COMMAND TO ESP32
// Sends LOCK or UNLOCK to the locker's control topic
// topic format: locker/{station_id}/{locker_id}/control
// ─────────────────────────────────────────────────────────
const publishCommand = (stationId, lockerId, command) => {
  return new Promise((resolve, reject) => {
    if (!client.connected) {
      return reject(new Error("MQTT broker not connected"))
    }

    const topic   = `locker/${stationId}/${lockerId}/control`
    const payload = command.toUpperCase()   // LOCK or UNLOCK

    client.publish(topic, payload, (err) => {
      if (err) {
        console.error(`MQTT publish failed [${topic}]:`, err.message)
        return reject(err)
      }
      console.log(`MQTT command sent → ${topic}: ${payload}`)
      resolve()
    })
  })
}


// ─────────────────────────────────────────────────────────
// HEALTH CHECK — is MQTT connected?
// ─────────────────────────────────────────────────────────
const isMqttConnected = () => client.connected

module.exports = { publishCommand, isMqttConnected }
