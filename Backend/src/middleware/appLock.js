const crypto = require("crypto");
const db = require("../config/db");

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
const getCookie = (req, name) => {
  const cookieHeader = req.headers.cookie || "";
  const entry = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
};

const requireAppUnlock = async (req, res, next) => {
  try {
    const [settings] = await db.query(
      "SELECT enabled FROM app_lock_settings WHERE user_id = ?",
      [req.user.user_id]
    );

    if (!settings.length || !settings[0].enabled) return next();

    const token = req.get("X-App-Lock-Token");
    if (!token) {
      return res.status(423).json({ code: "APP_LOCK_REQUIRED", message: "Unlock the app to continue." });
    }

    const [sessions] = await db.query(
      "SELECT token_hash FROM app_lock_sessions WHERE token_hash = ? AND user_id = ? AND expires_at > NOW()",
      [hashToken(token), req.user.user_id]
    );
    if (!sessions.length) {
      return res.status(423).json({ code: "APP_LOCK_REQUIRED", message: "Unlock the app to continue." });
    }

    next();
  } catch (error) {
    console.error("App lock middleware error:", error.message);
    return res.status(503).json({ message: "App lock verification is temporarily unavailable." });
  }
};

const requireMediaUnlock = async (req, res, next) => {
  try {
    res.set("Cache-Control", "private, no-store");
    if (String(req.user?.role || "").trim().toLowerCase() !== "admin") {
      return res.status(403).json({ message: "Administrator access required." });
    }
    const [settings] = await db.query(
      "SELECT enabled FROM app_lock_settings WHERE user_id = ?",
      [req.user.user_id]
    );
    if (!settings.length || !settings[0].enabled) return next();

    const token = getCookie(req, "life_ledger_lock");
    if (!token) return res.status(423).json({ message: "Unlock the app before accessing private media." });

    const [sessions] = await db.query(
      `SELECT s.token_hash
       FROM app_lock_sessions s
       JOIN app_lock_settings a ON a.user_id = s.user_id
      WHERE s.token_hash = ? AND s.user_id = ? AND s.expires_at > NOW() AND a.enabled = 1`,
          [hashToken(token), req.user.user_id]
    );
    if (!sessions.length) return res.status(423).json({ message: "Unlock the app before accessing private media." });
    next();
  } catch (error) {
    console.error("Private media authorization error:", error.message);
    return res.status(503).json({ message: "Private media authorization is temporarily unavailable." });
  }
};

module.exports = { requireAppUnlock, requireMediaUnlock, hashToken, getCookie };