const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");

const requireAdmin = (req, res, next) => {
	if (String(req.user?.role || "").trim().toLowerCase() !== "admin") {
		return res.status(403).json({ message: "Administrator access required." });
	}
	next();
};

const requireProfileOwner = (req, res, next) => {
	const isOwner = Number(req.params.id) === Number(req.user?.id);
	const isAdmin = String(req.user?.role || "").trim().toLowerCase() === "admin";
	if (!isOwner && !isAdmin) return res.status(403).json({ message: "You are not authorized to access this profile." });
	next();
};

const { register, login, getAllUsers, getUserRecords, googleLogin, getProfile, updateProfile, changePassword, updateUser, updateUserStatus, deleteUser } = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.get("/users", requireAuth, requireAdmin, getAllUsers);
router.get("/users/:id/records", requireAuth, getUserRecords);
router.put("/users/:id", requireAuth, requireAdmin, updateUser);
router.patch("/users/:id/status", requireAuth, requireAdmin, updateUserStatus);
router.delete("/users/:id", requireAuth, requireAdmin, deleteUser);
router.post("/google-login", googleLogin);

// Profile routes
router.get("/profile/:id", requireAuth, requireProfileOwner, getProfile);
router.put("/profile/:id", requireAuth, requireProfileOwner, updateProfile);
router.put("/profile/:id/password", requireAuth, requireProfileOwner, changePassword);

module.exports = router;
