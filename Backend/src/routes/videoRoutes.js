const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const router = express.Router();
const videoController = require("../controllers/videoController");

const createUpload = (folder, fileType, size) => {
	const uploadDir = path.join(__dirname, "..", "..", "uploads", folder);
	fs.mkdirSync(uploadDir, { recursive: true });
	return multer({
		storage: multer.diskStorage({
			destination: uploadDir,
			filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname).toLowerCase()}`),
		}),
		limits: { fileSize: size },
		fileFilter: (req, file, cb) => file.mimetype.startsWith(fileType) ? cb(null, true) : cb(new Error(`Only ${fileType} files are allowed.`)),
	});
};

const uploadVideo = createUpload("videos", "video/", 50 * 1024 * 1024);
const uploadThumbnail = createUpload("video-thumbnails", "image/", 5 * 1024 * 1024);

router.get("/", videoController.getAllVideos);
router.post("/upload", (req, res, next) => {
	uploadVideo.single("video")(req, res, (error) => {
		if (error) return res.status(400).json({ message: error.message || "Video upload failed." });
		next();
	});
}, videoController.uploadVideo);
router.post("/upload-thumbnail", (req, res, next) => {
	uploadThumbnail.single("image")(req, res, (error) => {
		if (error) return res.status(400).json({ message: error.message || "Thumbnail upload failed." });
		next();
	});
}, videoController.uploadVideoThumbnail);
router.post("/", videoController.createVideo);
router.put("/:id", videoController.updateVideo);
router.delete("/:id", videoController.deleteVideo);

module.exports = router;
