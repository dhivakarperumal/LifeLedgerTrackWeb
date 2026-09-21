const express = require("express");
const router = express.Router();

const { register, login, getAllUsers, googleLogin, getProfile, updateProfile, changePassword, updateUser, deleteUser } = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.get("/users", getAllUsers);
router.put("/users/:id", updateUser); // Admin update
router.delete("/users/:id", deleteUser); // Admin delete
router.post("/google-login", googleLogin);

// Profile routes
router.get("/profile/:id", getProfile);
router.put("/profile/:id", updateProfile);
router.put("/profile/:id/password", changePassword);

module.exports = router;