const jwt = require("jsonwebtoken")

const JWT_SECRET = process.env.JWT_SECRET || "15e876bb86f907b8eac4773c7822d76dfbb503658850bdb9bdcdaac6f614afb7"

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({ message: "Authorization header is required" })
  }

  const [scheme, token] = authHeader.split(" ")

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Authorization header must use Bearer token" })
  }

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) {
      return res.status(401).json({ message: "Invalid or expired token" })
    }

    req.user = payload
    next()
  })
}

const requireRole = (roles) => (req, res, next) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles]

  if (!req.user) {
    return res.status(401).json({ message: "Authentication is required" })
  }

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: "You do not have permission to access this resource" })
  }

  next()
}

module.exports = { authenticateToken, requireRole }