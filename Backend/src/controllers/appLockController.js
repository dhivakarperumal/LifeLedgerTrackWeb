const crypto = require("crypto");
const bcrypt = require("bcrypt");
const {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} = require("@simplewebauthn/server");
const db = require("../config/db");
const { hashToken, getCookie } = require("../middleware/appLock");

const methods = new Set(["pin", "pattern", "password", "biometric"]);
const grantLifetimeHours = 12;
const lockCookieOptions = () => {
  const configuredSameSite = String(process.env.APP_LOCK_COOKIE_SAMESITE || "lax").toLowerCase();
  const sameSite = ["strict", "lax", "none"].includes(configuredSameSite) ? configuredSameSite : "lax";
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || sameSite === "none",
    sameSite,
    path: "/",
  };
};
const mediaSessionCookieOptions = () => ({
  ...lockCookieOptions(),
  path: "/uploads",
});
const setMediaSessionCookie = (req, res) => {
  const authorization = req.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return;
  res.cookie("life_ledger_session", authorization.slice(7), {
    ...mediaSessionCookieOptions(),
    maxAge: 24 * 60 * 60 * 1000,
  });
};
const parseTransports = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch (error) { return []; }
  }
  return [];
};

const publicSettings = (row) => ({
  enabled: Boolean(row?.enabled),
  method: row?.method || "pin",
  hasCredential: Boolean(row?.credential_hash),
  lockOnHidden: row ? Boolean(row.lock_on_hidden) : true,
  idleTimeoutMinutes: Number(row?.idle_timeout_minutes ?? 5),
  biometricEnrolled: Boolean(row?.webauthn_credential_id),
  biometricEnabled: Boolean(row?.biometric_enabled),
});

const getSettings = async (userId) => {
  const [rows] = await db.query("SELECT * FROM app_lock_settings WHERE user_id = ?", [userId]);
  return rows[0] || null;
};

const verifyAccountPassword = async (userId, password) => {
  if (typeof password !== "string" || !password || password.length > 256) return false;
  const [rows] = await db.query("SELECT password FROM users WHERE id = ?", [userId]);
  return Boolean(rows[0]?.password && await bcrypt.compare(password, rows[0].password));
};

const validateCredential = (method, value) => {
  if (typeof value !== "string") return "Enter a lock credential.";
  if (method === "pin" && !/^\d{4,6}$/.test(value)) return "PIN must contain 4 to 6 digits.";
  if (method === "pattern") {
    const points = value.split(",");
    if (points.length < 4 || points.length > 9 || new Set(points).size !== points.length || points.some((point) => !/^[0-8]$/.test(point))) {
      return "Draw a pattern using at least 4 different dots.";
    }
  }
  if (method === "password" && (value.length < 12 || value.length > 128)) {
    return "Lock password must be between 12 and 128 characters.";
  }
  return null;
};

const saveChallenge = async (userId, purpose, challenge) => {
  await db.query(
    `INSERT INTO app_lock_challenges (user_id, purpose, challenge, expires_at)
     VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))
     ON DUPLICATE KEY UPDATE challenge = VALUES(challenge), expires_at = VALUES(expires_at)`,
    [userId, purpose, challenge]
  );
};

const consumeChallenge = async (userId, purpose) => {
  const [rows] = await db.query(
    "SELECT challenge FROM app_lock_challenges WHERE user_id = ? AND purpose = ? AND expires_at > NOW()",
    [userId, purpose]
  );
  if (!rows.length) return null;
  const [deleted] = await db.query(
    "DELETE FROM app_lock_challenges WHERE user_id = ? AND purpose = ? AND expires_at > NOW()",
    [userId, purpose]
  );
  return deleted.affectedRows === 1 ? rows[0].challenge : null;
};

const webAuthnConfig = (req) => {
  const requestOrigin = req.get("origin");
  const expectedOrigin = process.env.APP_LOCK_ORIGIN || requestOrigin;
  if (!expectedOrigin) throw new Error("APP_LOCK_ORIGIN must be configured for WebAuthn.");

  const parsedOrigin = new URL(expectedOrigin);
  const localOrigin = ["localhost", "127.0.0.1", "[::1]"].includes(parsedOrigin.hostname);
  if (parsedOrigin.protocol !== "https:" && !localOrigin) {
    throw new Error("WebAuthn requires HTTPS, except on localhost.");
  }
  if (requestOrigin && requestOrigin !== expectedOrigin) {
    throw new Error("The request origin does not match APP_LOCK_ORIGIN.");
  }

  return {
    expectedOrigin,
    rpID: process.env.APP_LOCK_RP_ID || parsedOrigin.hostname,
  };
};

const issueGrant = async (userId, res) => {
  const token = crypto.randomBytes(32).toString("base64url");
  await db.query("DELETE FROM app_lock_sessions WHERE expires_at <= NOW()");
  await db.query("DELETE FROM app_lock_challenges WHERE expires_at <= NOW()");
  await db.query(
    "INSERT INTO app_lock_sessions (token_hash, user_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))",
    [hashToken(token), userId, grantLifetimeHours]
  );
  res.cookie("life_ledger_lock", token, {
    ...lockCookieOptions(),
    maxAge: grantLifetimeHours * 60 * 60 * 1000,
  });
  return res.json({ token, expiresInSeconds: grantLifetimeHours * 60 * 60 });
};

const verifyLockCredential = async (userId, storedHash, candidate) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      "SELECT failed_attempts, (locked_until > NOW()) AS is_locked, GREATEST(0, TIMESTAMPDIFF(SECOND, NOW(), locked_until)) AS retry_after FROM app_lock_settings WHERE user_id = ? FOR UPDATE",
      [userId]
    );
    const settings = rows[0];
    if (!settings) {
      await connection.rollback();
      return { valid: false, status: 401, message: "The lock credential is not configured." };
    }
    if (settings.is_locked) {
      const retryAfter = Number(settings.retry_after) || 1;
      await connection.rollback();
      return { valid: false, status: 429, retryAfter, message: "Too many attempts. Try again later." };
    }

    const valid = Boolean(storedHash && typeof candidate === "string" && candidate.length <= 256 && await bcrypt.compare(candidate, storedHash));
    if (!valid) {
      const attempts = Number(settings.failed_attempts || 0) + 1;
      const delaySeconds = attempts < 5 ? 0 : Math.min(900, 2 ** Math.min(attempts - 4, 9));
      await connection.query(
        `UPDATE app_lock_settings SET failed_attempts = ?,
         locked_until = ${delaySeconds ? "DATE_ADD(NOW(), INTERVAL ? SECOND)" : "NULL"}
         WHERE user_id = ?`,
        delaySeconds ? [attempts, delaySeconds, userId] : [attempts, userId]
      );
      await connection.commit();
      return {
        valid: false,
        status: delaySeconds ? 429 : 401,
        retryAfter: delaySeconds || undefined,
        message: "That credential is incorrect.",
      };
    }

    await connection.query(
      "UPDATE app_lock_settings SET failed_attempts = 0, locked_until = NULL WHERE user_id = ?",
      [userId]
    );
    await connection.commit();
    return { valid: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const recordWebAuthnFailure = async (userId) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      "SELECT failed_attempts, (locked_until > NOW()) AS is_locked, GREATEST(0, TIMESTAMPDIFF(SECOND, NOW(), locked_until)) AS retry_after FROM app_lock_settings WHERE user_id = ? FOR UPDATE",
      [userId]
    );
    const settings = rows[0];
    if (!settings) {
      await connection.rollback();
      return 0;
    }
    if (settings.is_locked) {
      await connection.rollback();
      return Number(settings.retry_after) || 1;
    }
    const attempts = Number(settings.failed_attempts || 0) + 1;
    const delaySeconds = attempts < 5 ? 0 : Math.min(900, 2 ** Math.min(attempts - 4, 9));
    await connection.query(
      `UPDATE app_lock_settings SET failed_attempts = ?,
       locked_until = ${delaySeconds ? "DATE_ADD(NOW(), INTERVAL ? SECOND)" : "NULL"}
       WHERE user_id = ?`,
      delaySeconds ? [attempts, delaySeconds, userId] : [attempts, userId]
    );
    await connection.commit();
    return delaySeconds;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const activeLockoutSeconds = async (userId) => {
  const [rows] = await db.query(
    "SELECT GREATEST(0, TIMESTAMPDIFF(SECOND, NOW(), locked_until)) AS retry_after FROM app_lock_settings WHERE user_id = ? AND locked_until > NOW()",
    [userId]
  );
  return Number(rows[0]?.retry_after) || 0;
};

exports.status = async (req, res) => {
  try {
    setMediaSessionCookie(req, res);
    res.json(publicSettings(await getSettings(req.user.id)));
  } catch (error) {
    console.error("App lock status error:", error.message);
    res.status(500).json({ message: "Unable to load app-lock settings." });
  }
};

exports.configure = async (req, res) => {
  try {
    const { currentPassword, enabled, method, credential, confirmCredential, lockOnHidden, idleTimeoutMinutes, confirmDisable } = req.body;
    const prior = await getSettings(req.user.id);
    const biometricEnabled = Boolean(req.body.biometricEnabled || (enabled && method === "biometric"));
    if (!await verifyAccountPassword(req.user.id, currentPassword)) {
      return res.status(401).json({ message: "Confirm your account password to change security settings." });
    }
    if (typeof enabled !== "boolean") return res.status(400).json({ message: "Choose whether App Lock is enabled." });
    if (enabled && !methods.has(method)) return res.status(400).json({ message: "Choose a valid lock method." });
    if (!enabled && prior?.enabled && confirmDisable !== true) return res.status(400).json({ message: "Confirm before disabling App Lock." });

    const timeout = Number(idleTimeoutMinutes);
    if (!Number.isInteger(timeout) || ![0, 1, 5, 10, 30].includes(timeout)) {
      return res.status(400).json({ message: "Choose a supported inactivity timeout." });
    }

    let credentialHash;
    if (enabled && method !== "biometric") {
      const replacingCredential = credential !== undefined || confirmCredential !== undefined;
      if (replacingCredential) {
        const validationError = validateCredential(method, credential);
        if (validationError) return res.status(400).json({ message: validationError });
        if (credential !== confirmCredential) return res.status(400).json({ message: "The lock credentials do not match." });
        credentialHash = await bcrypt.hash(credential, 12);
      } else if (method !== prior?.method || !prior?.credential_hash) {
        return res.status(400).json({ message: "Set and confirm a lock credential for this method." });
      }
    }

    if (enabled && biometricEnabled && !prior?.webauthn_credential_id) {
      return res.status(400).json({ message: "Register a platform authenticator before enabling biometric unlock." });
    }

    await db.query(
      `INSERT INTO app_lock_settings
       (user_id, enabled, method, credential_hash, lock_on_hidden, idle_timeout_minutes, biometric_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), method = VALUES(method),
       credential_hash = COALESCE(VALUES(credential_hash), credential_hash),
       lock_on_hidden = VALUES(lock_on_hidden), idle_timeout_minutes = VALUES(idle_timeout_minutes),
       biometric_enabled = VALUES(biometric_enabled)`,
      [req.user.id, enabled ? 1 : 0, enabled ? method : prior?.method || "pin", credentialHash || null,
        lockOnHidden === false ? 0 : 1, timeout, biometricEnabled ? 1 : 0]
    );

    await db.query("DELETE FROM app_lock_sessions WHERE user_id = ?", [req.user.id]);
    res.clearCookie("life_ledger_lock", lockCookieOptions());
    res.json({ message: enabled ? "App Lock settings saved." : "App Lock disabled.", settings: publicSettings(await getSettings(req.user.id)) });
  } catch (error) {
    console.error("App lock configuration error:", error.message);
    res.status(500).json({ message: "Unable to save app-lock settings." });
  }
};

exports.unlock = async (req, res) => {
  try {
    const settings = await getSettings(req.user.id);
    if (!settings?.enabled) return res.status(400).json({ message: "App Lock is not enabled." });

    const isFallback = settings.method === "biometric" && req.body.method === "password";
    if (!isFallback && req.body.method !== settings.method) {
      return res.status(400).json({ message: "Use the configured lock method." });
    }

    let verifier = settings.credential_hash;
    if (isFallback) {
      const [users] = await db.query("SELECT password FROM users WHERE id = ?", [req.user.id]);
      verifier = users[0]?.password;
    }
    const result = await verifyLockCredential(req.user.id, verifier, req.body.credential);
    if (!result.valid) {
      if (result.retryAfter) res.set("Retry-After", String(result.retryAfter));
      return res.status(result.status).json({ message: result.message });
    }
    return issueGrant(req.user.id, res);
  } catch (error) {
    console.error("App lock unlock error:", error.message);
    res.status(500).json({ message: "Unable to verify the lock credential." });
  }
};

exports.lock = async (req, res) => {
  const token = req.get("X-App-Lock-Token") || getCookie(req, "life_ledger_lock");
  if (token) {
    await db.query("DELETE FROM app_lock_sessions WHERE token_hash = ? AND user_id = ?", [hashToken(token), req.user.id]);
  }
  res.clearCookie("life_ledger_lock", lockCookieOptions());
  res.json({ message: "App locked." });
};

exports.logout = async (req, res) => {
  await db.query("DELETE FROM app_lock_sessions WHERE user_id = ?", [req.user.id]);
  res.clearCookie("life_ledger_lock", lockCookieOptions());
  res.clearCookie("life_ledger_session", mediaSessionCookieOptions());
  res.json({ message: "Session ended." });
};

exports.registrationOptions = async (req, res) => {
  try {
    if (!await verifyAccountPassword(req.user.id, req.body.currentPassword)) {
      return res.status(401).json({ message: "Confirm your account password to register a biometric credential." });
    }
    const { rpID } = webAuthnConfig(req);
    const [users] = await db.query("SELECT username, email FROM users WHERE id = ?", [req.user.id]);
    const prior = await getSettings(req.user.id);
    const options = await generateRegistrationOptions({
      rpName: "Life Ledger",
      rpID,
      userID: new TextEncoder().encode(String(req.user.id)),
      userName: users[0]?.username || users[0]?.email || String(req.user.id),
      attestationType: "none",
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        residentKey: "preferred",
        userVerification: "required",
      },
      excludeCredentials: prior?.webauthn_credential_id ? [{
        id: prior.webauthn_credential_id,
        transports: parseTransports(prior.webauthn_transports),
      }] : [],
    });
    await saveChallenge(req.user.id, "registration", options.challenge);
    res.json(options);
  } catch (error) {
    console.error("WebAuthn registration options error:", error.message);
    res.status(400).json({ message: error.message || "Biometric registration is unavailable." });
  }
};

exports.registrationVerify = async (req, res) => {
  try {
    const challenge = await consumeChallenge(req.user.id, "registration");
    if (!challenge) return res.status(400).json({ message: "Registration challenge expired. Start again." });
    const { expectedOrigin, rpID } = webAuthnConfig(req);
    const verification = await verifyRegistrationResponse({
      response: req.body.response,
      expectedChallenge: challenge,
      expectedOrigin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ message: "The platform authenticator could not be verified." });
    }

    const credential = verification.registrationInfo.credential;
    await db.query(
      `INSERT INTO app_lock_settings (user_id, webauthn_credential_id, webauthn_public_key, webauthn_counter, webauthn_transports)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE webauthn_credential_id = VALUES(webauthn_credential_id),
       webauthn_public_key = VALUES(webauthn_public_key), webauthn_counter = VALUES(webauthn_counter),
       webauthn_transports = VALUES(webauthn_transports)`,
      [req.user.id, credential.id, Buffer.from(credential.publicKey).toString("base64url"),
        credential.counter, JSON.stringify(credential.transports || [])]
    );
    res.json({ message: "Platform authenticator registered." });
  } catch (error) {
    console.error("WebAuthn registration verification error:", error.message);
    res.status(400).json({ message: "Biometric registration failed. Try again or use another lock method." });
  }
};

exports.authenticationOptions = async (req, res) => {
  try {
    const retryAfter = await activeLockoutSeconds(req.user.id);
    if (retryAfter) {
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({ message: "Too many attempts. Try again later." });
    }
    const settings = await getSettings(req.user.id);
    if (!settings?.enabled || (!settings.biometric_enabled && settings.method !== "biometric") || !settings.webauthn_credential_id) {
      return res.status(400).json({ message: "Biometric unlock is not configured." });
    }
    const { rpID } = webAuthnConfig(req);
    const transports = parseTransports(settings.webauthn_transports);
    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: [{ id: settings.webauthn_credential_id, transports }],
      userVerification: "required",
    });
    await saveChallenge(req.user.id, "authentication", options.challenge);
    res.json(options);
  } catch (error) {
    console.error("WebAuthn authentication options error:", error.message);
    res.status(400).json({ message: error.message || "Biometric unlock is unavailable." });
  }
};

exports.authenticationVerify = async (req, res) => {
  try {
    const challenge = await consumeChallenge(req.user.id, "authentication");
    if (!challenge) return res.status(400).json({ message: "Authentication challenge expired. Try again." });
    const settings = await getSettings(req.user.id);
    if (!settings?.enabled || !settings.webauthn_credential_id) return res.status(400).json({ message: "Biometric unlock is not configured." });
    const { expectedOrigin, rpID } = webAuthnConfig(req);
    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: req.body.response,
        expectedChallenge: challenge,
        expectedOrigin,
        expectedRPID: rpID,
        credential: {
          id: settings.webauthn_credential_id,
          publicKey: Buffer.from(settings.webauthn_public_key, "base64url"),
          counter: Number(settings.webauthn_counter),
          transports: parseTransports(settings.webauthn_transports),
        },
        requireUserVerification: true,
      });
    } catch (verificationError) {
      const retryAfter = await recordWebAuthnFailure(req.user.id);
      if (retryAfter) res.set("Retry-After", String(retryAfter));
      return res.status(retryAfter ? 429 : 401).json({ message: "Biometric verification failed." });
    }
    if (!verification.verified) {
      const retryAfter = await recordWebAuthnFailure(req.user.id);
      if (retryAfter) res.set("Retry-After", String(retryAfter));
      return res.status(retryAfter ? 429 : 401).json({ message: "Biometric verification failed." });
    }

    await db.query(
      "UPDATE app_lock_settings SET webauthn_counter = ?, failed_attempts = 0, locked_until = NULL WHERE user_id = ?",
      [verification.authenticationInfo.newCounter, req.user.id]
    );
    return issueGrant(req.user.id, res);
  } catch (error) {
    console.error("WebAuthn authentication verification error:", error.message);
    res.status(401).json({ message: "Biometric authentication failed or was cancelled." });
  }
};
