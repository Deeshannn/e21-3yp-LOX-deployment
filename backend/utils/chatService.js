const ChatMessage = require("../models/master/ChatMessage")
const LockerStation = require("../models/master/LockerStation")
const { ensureStationDB } = require("../config/stationDB")
const { buildStationChatMessageModel } = require("../models/station/ChatMessage")

const normalizeId = (value) => String(value || "").trim()
const normalizeContent = (value) => String(value || "").trim()

const toMessageDto = (message) => ({
  id: message._id?.toString?.() || message.id,
  station_id: message.station_id,
  station_name: message.station_name,
  sender_role: message.sender_role,
  sender_user_id: message.sender_user_id,
  sender_name: message.sender_name,
  recipient_role: message.recipient_role,
  content: message.content,
  read_at_super: message.read_at_super || null,
  read_at_sub: message.read_at_sub || null,
  created_at: message.created_at,
  updated_at: message.updated_at || message.created_at,
})

const resolveStation = async (user, stationId) => {
  const requestedStationId = normalizeId(stationId || user.station_id)

  if (!requestedStationId) {
    throw new Error("station_id is required")
  }

  if (user.role === "sub_admin" && user.station_id && requestedStationId !== user.station_id) {
    throw new Error("You can only access your own station conversation")
  }

  const station = await LockerStation.findOne({ station_id: requestedStationId, status: { $ne: "deleted" } })
  if (!station) {
    throw new Error("Station not found")
  }

  return station
}

const getStationChatModel = (station) => {
  const connection = ensureStationDB(station.station_id, station.station_db_uri || undefined)
  return buildStationChatMessageModel(connection)
}

const getUnreadFilter = (user, stationId = null) => {
  if (user.role === "super_admin") {
    return { read_at_super: null }
  }

  return {
    station_id: stationId || user.station_id,
    read_at_sub: null,
  }
}

const getUnreadMessageCount = async (user) => {
  const filter = getUnreadFilter(user)
  return ChatMessage.countDocuments(filter)
}

const getNotificationsForUser = async (user) => {
  const filter = getUnreadFilter(user)
  const unread_count = await getUnreadMessageCount(user)
  const messages = await ChatMessage.find(filter)
    .sort({ created_at: -1 })
    .limit(20)

  return {
    unread_count,
    items: messages.map(toMessageDto),
  }
}

const getMessagesForStation = async (user, stationId) => {
  const station = await resolveStation(user, stationId)
  const stationModel = getStationChatModel(station)
  const readField = user.role === "super_admin" ? "read_at_super" : "read_at_sub"

  await Promise.all([
    ChatMessage.updateMany({ station_id: station.station_id, [readField]: null }, { $set: { [readField]: new Date() } }),
    stationModel.updateMany({ station_id: station.station_id, [readField]: null }, { $set: { [readField]: new Date() } }),
  ])

  const messages = await ChatMessage.find({ station_id: station.station_id }).sort({ created_at: 1 })

  return {
    station: {
      station_id: station.station_id,
      station_name: station.name,
      locker_count: station.locker_count,
      status: station.status,
    },
    messages: messages.map(toMessageDto),
  }
}

const getConversationSummariesForUser = async (user) => {
  const stations = user.role === "super_admin"
    ? await LockerStation.find({ status: { $ne: "deleted" } }).sort({ name: 1 })
    : await LockerStation.find({ station_id: user.station_id, status: { $ne: "deleted" } })

  const summaries = await Promise.all(stations.map(async (station) => {
    const lastMessage = await ChatMessage.findOne({ station_id: station.station_id }).sort({ created_at: -1 })
    const unreadFilter = user.role === "super_admin"
      ? { station_id: station.station_id, read_at_super: null }
      : { station_id: station.station_id, read_at_sub: null }

    const unreadCount = await ChatMessage.countDocuments(unreadFilter)

    return {
      station_id: station.station_id,
      station_name: station.name,
      locker_count: station.locker_count,
      status: station.status,
      unread_count: unreadCount,
      last_message: lastMessage ? toMessageDto(lastMessage) : null,
      last_message_at: lastMessage ? lastMessage.created_at : null,
    }
  }))

  return summaries.sort((a, b) => {
    const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
    const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
    return bTime - aTime
  })
}

const sendMessage = async (user, payload) => {
  const content = normalizeContent(payload.content)
  if (!content) {
    throw new Error("Message content is required")
  }

  const station = await resolveStation(user, payload.station_id)
  const now = new Date()
  const document = {
    station_id: station.station_id,
    station_name: station.name,
    sender_role: user.role,
    sender_user_id: normalizeId(user.user_id),
    sender_name: normalizeContent(user.name),
    recipient_role: user.role === "super_admin" ? "sub_admin" : "super_admin",
    content,
    read_at_super: user.role === "super_admin" ? now : null,
    read_at_sub: user.role === "sub_admin" ? now : null,
    created_at: now,
    updated_at: now,
  }

  const masterMessage = await ChatMessage.create(document)
  const stationModel = getStationChatModel(station)
  await stationModel.create({ ...document, _id: masterMessage._id })

  return toMessageDto(masterMessage)
}

module.exports = {
  getUnreadMessageCount,
  getNotificationsForUser,
  getMessagesForStation,
  getConversationSummariesForUser,
  sendMessage,
  toMessageDto,
}