const jwt = require("jsonwebtoken");
const db = require("../config/db");

const getJwtSecrets = () => {
  const secrets = [process.env.JWT_SECRET, "secretkey"];
  return [...new Set(secrets.filter(Boolean))];
};

const verifyToken = (token) => {
  const secrets = getJwtSecrets();

  for (const secret of secrets) {
    try {
      return jwt.verify(token, secret);
    } catch (error) {
      // Try the next configured secret until one matches.
    }
  }

  throw new Error("Invalid token signature");
};

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const decoded = verifyToken(token);
    const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [decoded.id]);

    if (!rows.length) {
      return res.status(401).json({ message: "User not found or session expired." });
    }

    req.user = {
      id: rows[0].id,
      user_id: rows[0].user_id,
      username: rows[0].username,
      name: rows[0].name,
      email: rows[0].email,
      role: rows[0].role,
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

module.exports = { requireAuth };
