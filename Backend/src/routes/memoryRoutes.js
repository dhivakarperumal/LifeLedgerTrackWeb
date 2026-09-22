const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { requireAuth } = require("../middleware/auth");
const memoryController = require("../controllers/memoryController");

const router = express.Router();
const uploadDir = path.join(__dirname, "..", "..", "uploads", "memories");
fs.mkdirSync(path.join(uploadDir, "images"), { recursive: true });
fs.mkdirSync(path.join(uploadDir, "videos"), { recursive: true });
fs.mkdirSync(path.join(uploadDir, "audio"), { recursive: true });

const fileFilter = (req, file, cb) => {
  const allowedImage = ["image/jpeg", "image/png", "image/webp", "image/jpg", "image/gif"];
  const allowedVideo = ["video/mp4", "video/webm", "video/quicktime", "video/x-matroska"];
  const allowedAudio = ["audio/mpeg", "audio/mp4", "audio/wav", "audio/webm", "audio/ogg", "audio/x-wav"];
  const allowedDocs = ["application/pdf", "text/plain"];
  const allowed = [...allowedImage, ...allowedVideo, ...allowedAudio, ...allowedDocs];

  if (allowed.includes(file.mimetype)) {
    return cb(null, true);
  }

  cb(new Error("Unsupported file type. Allowed: images, videos, audio, and pdf/text files."));
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) return cb(null, path.join(uploadDir, "images"));
    if (file.mimetype.startsWith("video/")) return cb(null, path.join(uploadDir, "videos"));
    if (file.mimetype.startsWith("audio/")) return cb(null, path.join(uploadDir, "audio"));
    cb(null, path.join(uploadDir, "audio"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = file.originalname.replace(ext, "").replace(/[^a-zA-Z0-9_-]/g, "_");
    cb(null, `${Date.now()}-${safeName}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter,
});

router.use(requireAuth);

router.get("/categories", memoryController.getMemoryCategories);
router.post("/categories", memoryController.createMemoryCategory);
router.put("/categories/:id", memoryController.updateMemoryCategory);
router.delete("/categories/:id", memoryController.deleteMemoryCategory);

router.get("/albums", memoryController.getMemoryAlbums);
router.post("/albums", memoryController.createMemoryAlbum);
router.put("/albums/:id", memoryController.updateMemoryAlbum);
router.delete("/albums/:id", memoryController.deleteMemoryAlbum);

router.get("/", memoryController.getMemories);
router.get("/:id", memoryController.getMemoryById);
router.post("/", upload.single("media"), memoryController.createMemory);
router.put("/:id", upload.single("media"), memoryController.updateMemory);
router.patch("/:id/favorite", memoryController.toggleFavorite);
router.delete("/:id", memoryController.deleteMemory);

module.exports = router;
