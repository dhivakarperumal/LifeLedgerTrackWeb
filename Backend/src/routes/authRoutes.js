const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");

const { register, login, getAllUsers, getUserRecords, googleLogin, getProfile, updateProfile, changePassword, updateUser, updateUserStatus, deleteUser } = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.get("/users", getAllUsers);
router.get("/users/:id/records", requireAuth, getUserRecords);
router.put("/users/:id", updateUser); // Admin update
router.patch("/users/:id/status", updateUserStatus); // Admin status-only update
router.delete("/users/:id", deleteUser); // Admin delete
router.post("/google-login", googleLogin);

// Profile routes
router.get("/profile/:id", getProfile);
router.put("/profile/:id", updateProfile);
router.put("/profile/:id/password", changePassword);

module.exports = router;
