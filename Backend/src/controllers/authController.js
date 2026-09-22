const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  try {
    const {
      username, name, email, phone, role, password,
      street_address, city, district, state, country, zip_code
    } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = "USR" + Math.random().toString(36).substr(2, 9).toUpperCase();

    const [result] = await db.query(
      `INSERT INTO users (
        user_id, username, name, email, phone, role, password,
        street_address, city, district, state, country, zip_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, username, name || username, email, phone, role || "Customer", hashedPassword,
        street_address || null, city || null, district || null, state || null, country || "India", zip_code || null
      ]
    );

    res.json({ message: "User registered successfully", user_id: userId });
  } catch (err) {
    console.error("Register Error:", err);
    if (err.code === "ER_DUP_ENTRY") {
      if (err.sqlMessage.includes("username")) {
        return res.status(400).json({ message: "Username already exists" });
      }
      return res.status(400).json({ message: "Email already exists" });
    }
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body; // 'identifier' field can be email or username

    if (!identifier || !password) {
      return res.status(400).json({ message: "Email/Username and password are required" });
    }

    const [results] = await db.query(
      "SELECT * FROM users WHERE email = ? OR username = ?",
      [identifier, identifier]
    );

    if (results.length === 0) {
      return res.status(400).json({ message: "User not found" });
    }

    const user = results[0];

    // Check if user has a password (users without password can only login via Google)
    if (!user.password) {
      return res.status(400).json({ message: "Please use Google login for this account" });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({ message: "Wrong password" });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || "secretkey", {
      expiresIn: "1d",
    });

    res.json({
      token,
      user: {
        id: user.id,
        user_id: user.user_id,
        username: user.username,
        name: user.name,
        name: user.name,
        email: user.email,
        phone: user.phone,
        phone: user.phone,
        role: user.role,
        state: user.state,
        city: user.city,
        country: user.country,
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};

// ── Get Profile ──
exports.getProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const [results] = await db.query(
      "SELECT id, user_id, username, name, email, phone, role, street_address, city, district, state, country, zip_code, created_at FROM users WHERE id = ?",
      [id]
    );

    if (results.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(results[0]);
  } catch (err) {
    console.error("Get Profile Error:", err);
    res.status(500).json({ message: "Failed to fetch profile", error: err.message });
  }
};

// ── Update Profile ──
exports.updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, name, email, phone, street_address, city, district, state, country, zip_code } = req.body;

    // Check for duplicate username/email (excluding current user)
    if (username) {
      const [existing] = await db.query("SELECT id FROM users WHERE username = ? AND id != ?", [username, id]);
      if (existing.length > 0) {
        return res.status(400).json({ message: "Username already taken" });
      }
    }

    if (email) {
      const [existing] = await db.query("SELECT id FROM users WHERE email = ? AND id != ?", [email, id]);
      if (existing.length > 0) {
        return res.status(400).json({ message: "Email already in use" });
      }
    }

    await db.query(
      `UPDATE users SET username = ?, name = ?, email = ?, phone = ?, street_address = ?, city = ?, district = ?, state = ?, country = ?, zip_code = ? WHERE id = ?`,
      [username, name || username, email, phone || "", street_address || null, city || null, district || null, state || null, country || "India", zip_code || null, id]
    );

    // Return updated user data
    const [updated] = await db.query(
      "SELECT id, user_id, username, name, email, phone, role, street_address, city, district, state, country, zip_code FROM users WHERE id = ?",
      [id]
    );

    res.json({ message: "Profile updated successfully", user: updated[0] });
  } catch (err) {
    console.error("Update Profile Error:", err);
    res.status(500).json({ message: "Failed to update profile", error: err.message });
  }
};

// ── Change Password ──
exports.changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    // Get user
    const [results] = await db.query("SELECT password FROM users WHERE id = ?", [id]);
    if (results.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = results[0];

    // If user has no password (Google-only account), let them set one
    if (user.password) {
      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, id]);

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Change Password Error:", err);
    res.status(500).json({ message: "Failed to change password", error: err.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const [results] = await db.query(
      "SELECT id, user_id, name, username, email, phone, role, created_at, CASE WHEN id % 6 = 0 OR id % 9 = 0 THEN 'Inactive' ELSE 'Active' END AS status FROM users"
    );
    res.json(results);
  } catch (err) {
    console.error("Fetch Users Error:", err);
    res.status(500).json({ message: "Failed to fetch users", error: err.message });
  }
};

exports.googleLogin = async (req, res) => {
  try {
    const { name, email, picture, googleId } = req.body;

    // check if user exists by email
    const [users] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    let user;

    if (users.length === 0) {
      // create new user for Google auth
      const userId = "USR" + Date.now();
      const username = email.split("@")[0];

      try {
        const [result] = await db.query(
          "INSERT INTO users (user_id, username, name, email, phone, role) VALUES (?, ?, ?, ?, ?, ?)",
          [userId, username, name, email, "", "Customer"]
        );

        user = {
          id: result.insertId,
          user_id: userId,
          username: username,
          email: email,
          role: "Customer"
        };
      } catch (insertErr) {
        console.error("Insert Error:", insertErr);
        throw insertErr;
      }
    } else {
      // user exists, just login
      user = users[0];
    }

    // generate JWT using same secret as regular login
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "1d" }
    );

    res.json({
      user: {
        id: user.id,
        user_id: user.user_id,
        username: user.username,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        // street_address: user.street_address,
        // city: user.city,
        // district: user.district,
        // state: user.state,
        // country: user.country,
        // zip_code: user.zip_code
      },
      token
    });

  } catch (error) {
    console.error("Google Login Error:", error);
    res.status(500).json({
      message: "Google login failed",
      error: error.message
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, name, email, phone, role } = req.body;

    await db.query(
      "UPDATE users SET username = ?, name = ?, email = ?, phone = ?, role = ? WHERE id = ?",
      [username, name || username, email, phone || "", role, id]
    );

    res.json({ message: "User updated successfully" });
  } catch (err) {
    console.error("Update User Error:", err);
    res.status(500).json({ message: "Failed to update user", error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM users WHERE id = ?", [id]);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete User Error:", err);
    res.status(500).json({ message: "Failed to delete user", error: err.message });
  }
};