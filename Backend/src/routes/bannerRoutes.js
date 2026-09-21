const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const router = express.Router();
const bannerController = require("../controllers/bannerController");

const uploadRoot = path.join(__dirname, "..", "..", "uploads", "banners");
fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		const type = req.body.type === "offer" ? "offer" : "hero";
		const uploadDir = path.join(uploadRoot, type);
		fs.mkdirSync(uploadDir, { recursive: true });
		cb(null, uploadDir);
	},
	filename: (req, file, cb) => {
		const extension = path.extname(file.originalname).toLowerCase();
		cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
	}
});

const upload = multer({
	storage,
	limits: { fileSize: 5 * 1024 * 1024 },
	fileFilter: (req, file, cb) => {
		if (file.mimetype.startsWith("image/")) cb(null, true);
		else cb(new Error("Only image files are allowed."));
	}
});

// Basic CRUD for banners
router.get("/", bannerController.getAllBanners);
router.get("/type/:type", bannerController.getBannersByType);
router.post("/upload", (req, res, next) => {
	upload.single("image")(req, res, (error) => {
		if (error) return res.status(400).json({ message: error.message || "Image upload failed." });
		next();
	});
}, bannerController.uploadBannerImage);
router.post("/", bannerController.createBanner);
router.put("/:id", bannerController.updateBanner);
router.delete("/:id", bannerController.deleteBanner);

module.exports = router;
