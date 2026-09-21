const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const router = express.Router();
const reviewController = require("../controllers/reviewController");

const uploadDir = path.join(__dirname, "..", "..", "uploads", "reviews");
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
	storage: multer.diskStorage({
		destination: uploadDir,
		filename: (req, file, cb) => {
			cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname).toLowerCase()}`);
		},
	}),
	limits: { fileSize: 5 * 1024 * 1024 },
	fileFilter: (req, file, cb) => {
		if (file.mimetype.startsWith("image/")) cb(null, true);
		else cb(new Error("Only image files are allowed."));
	},
});

// ── Public Routes ──
router.get("/product/:productId", reviewController.getProductReviews);
router.get("/check/:productId/:userId", reviewController.checkUserReview);
router.post("/upload", (req, res, next) => {
	upload.single("image")(req, res, (error) => {
		if (error) return res.status(400).json({ message: error.message || "Image upload failed." });
		next();
	});
}, reviewController.uploadReviewImage);
router.post("/", reviewController.submitReview);

// ── Admin Routes ──
router.get("/admin/all", reviewController.getAllReviews);
router.put("/admin/:id/status", reviewController.updateReviewStatus);
router.put("/admin/:id/reply", reviewController.replyToReview);
router.delete("/admin/:id", reviewController.deleteReview);

module.exports = router;
