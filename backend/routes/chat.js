const express = require("express")
const { authenticateToken, requireRole } = require("../middleware/auth")
const {
  getConversationSummariesForUser,
  getMessagesForStation,
  getNotificationsForUser,
  sendMessage,
} = require("../utils/chatService")

const router = express.Router()

const ADMIN_ROLES = ["sub_admin", "super_admin"]

router.use(authenticateToken)
router.use(requireRole(ADMIN_ROLES))

router.get("/conversations", async (req, res) => {
  try {
    const conversations = await getConversationSummariesForUser(req.user)

    res.status(200).json({
      message: "Conversations retrieved successfully",
      conversations,
    })
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

router.get("/messages/:station_id", async (req, res) => {
  try {
    const { station_id } = req.params
    const payload = await getMessagesForStation(req.user, station_id)

    res.status(200).json({
      message: "Messages retrieved successfully",
      ...payload,
    })
  } catch (err) {
    const status = err.message.includes("own station") ? 403 : 400
    res.status(status).json({ message: err.message })
  }
})

router.post("/messages", async (req, res) => {
  try {
    const message = await sendMessage(req.user, {
      station_id: req.body.station_id,
      content: req.body.content,
    })

    res.status(201).json({
      message: "Message sent successfully",
      data: message,
    })
  } catch (err) {
    const status = err.message.includes("required") ? 400 : err.message.includes("own station") ? 403 : 500
    res.status(status).json({ message: err.message })
  }
})

router.get("/notifications", async (req, res) => {
  try {
    const payload = await getNotificationsForUser(req.user)

    res.status(200).json({
      message: "Unread chat notifications retrieved successfully",
      ...payload,
    })
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

module.exports = router