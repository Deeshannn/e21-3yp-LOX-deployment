const jwt = require("jsonwebtoken")

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({ message: "Authorization header is required" })
  }

  const [scheme, token] = authHeader.split(" ")

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Authorization header must use Bearer token" })
  }

  const jwtSecret = process.env.JWT_SECRET

  if (!jwtSecret) {
    return res.status(500).json({ message: "JWT_SECRET is not configured" })
  }

  jwt.verify(token, jwtSecret, (err, payload) => {
    if (err) {
      return res.status(401).json({ message: "Invalid or expired token" })
    }

    req.user = payload
    next()
  })
}

module.exports = { authenticateToken }