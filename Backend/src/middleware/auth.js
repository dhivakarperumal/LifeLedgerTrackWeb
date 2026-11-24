const jwt = require("jsonwebtoken");
const db = require("../config/db");
const { requireAppUnlock, getCookie } = require("./appLock");

const setApiMediaSessionCookie = (res, token) => {
  const configuredSameSite = String(process.env.APP_LOCK_COOKIE_SAMESITE || "lax").toLowerCase();
  const sameSite = ["strict", "lax", "none"].includes(configuredSameSite) ? configuredSameSite : "lax";
  res.cookie("life_ledger_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || sameSite === "none",
    sameSite,
    path: "/api",
    maxAge: 24 * 60 * 60 * 1000,
  });
};

const getJwtSecrets = () => {
  return process.env.JWT_SECRET ? [process.env.JWT_SECRET] : [];
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
  const authHeader = req.headers.authorization || req.headers.Authorization;
  const isMediaPath = req.originalUrl.startsWith("/api/media/");
  const isUploadPath = req.originalUrl.startsWith("/uploads/");
  const token = authHeader && authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : (req.query?.token || (isUploadPath || isMediaPath ? getCookie(req, "life_ledger_session") : null));

  if (!token) {
    return res.status(401).json({ message: "Authentication required." });
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }

  let rows;
  try {
    [rows] = await db.query("SELECT * FROM users WHERE id = ?", [decoded.id]);
  } catch (error) {
    console.error("Authentication user lookup error:", error.message);
    return res.status(503).json({ message: "Authentication service is temporarily unavailable." });
  }

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

  if (authHeader?.startsWith("Bearer ") && !getCookie(req, "life_ledger_session")) {
    setApiMediaSessionCookie(res, authHeader.split(" ")[1]);
  }

  if (req.originalUrl.startsWith("/api/app-lock/") || isUploadPath || isMediaPath) return next();
  return requireAppUnlock(req, res, next);
};

module.exports = { requireAuth };
