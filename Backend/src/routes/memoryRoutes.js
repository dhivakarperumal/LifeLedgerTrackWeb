const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { requireAuth } = require("../middleware/auth");
const memoryController = require("../controllers/memoryController");

const router = express.Router();
const MAX_MEDIA_FILES = 10;
const MAX_MEDIA_FILE_SIZE = 100 * 1024 * 1024;
const uploadDir = path.join(__dirname, "..", "..", "uploads", "memories");
const MIME_TYPES_BY_EXTENSION = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".mkv": "video/x-matroska",
  ".avi": "video/x-msvideo",
  ".mpeg": "video/mpeg",
  ".mpg": "video/mpeg",
  ".3gp": "video/3gpp",
  ".3g2": "video/3gpp2",
  ".wmv": "video/x-ms-wmv",
  ".flv": "video/x-flv",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".zip": "application/zip",
  ".rar": "application/x-rar-compressed",
  ".7z": "application/x-7z-compressed",
};
fs.mkdirSync(path.join(uploadDir, "images"), { recursive: true });
fs.mkdirSync(path.join(uploadDir, "videos"), { recursive: true });
fs.mkdirSync(path.join(uploadDir, "audio"), { recursive: true });
fs.mkdirSync(path.join(uploadDir, "files"), { recursive: true });

const fileFilter = (req, file, cb) => {
  const allowedImage = ["image/jpeg", "image/png", "image/webp", "image/jpg", "image/gif"];
  const allowedVideo = ["video/mp4", "video/webm", "video/quicktime", "video/x-matroska"];
  const allowedAudio = ["audio/mpeg", "audio/mp4", "audio/wav", "audio/webm", "audio/ogg", "audio/x-wav"];
  const allowedDocs = ["application/pdf", "text/plain", "application/zip", "application/x-rar-compressed", "application/vnd.rar", "application/x-7z-compressed"];
  const originalMimeType = String(file.mimetype || "").toLowerCase();
  const extension = path.extname(file.originalname).toLowerCase();
  const inferredMimeType = MIME_TYPES_BY_EXTENSION[extension];

  if (inferredMimeType && !originalMimeType.startsWith("video/")) {
    file.mimetype = inferredMimeType;
  }

  const mimeType = String(file.mimetype || "").toLowerCase();
  if (
    allowedImage.includes(mimeType) ||
    allowedVideo.includes(mimeType) ||
    mimeType.startsWith("video/") ||
    allowedAudio.includes(mimeType) ||
    allowedDocs.includes(mimeType)
  ) {
    return cb(null, true);
  }

  const error = new Error("Unsupported media type. Choose an image, video, audio, PDF, text, or archive file.");
  error.code = "UNSUPPORTED_FILE_TYPE";
  cb(error);
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) return cb(null, path.join(uploadDir, "images"));
    if (file.mimetype.startsWith("video/")) return cb(null, path.join(uploadDir, "videos"));
    if (file.mimetype.startsWith("audio/")) return cb(null, path.join(uploadDir, "audio"));
    cb(null, path.join(uploadDir, "files"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = file.originalname.replace(ext, "").replace(/[^a-zA-Z0-9_-]/g, "_");
    cb(null, `${Date.now()}-${safeName}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_MEDIA_FILE_SIZE, files: MAX_MEDIA_FILES },
  fileFilter,
});

const handleUploadError = (error, req, res, next) => {
  if (!(error instanceof multer.MulterError)) {
    if (error.code === "UNSUPPORTED_FILE_TYPE") {
      return res.status(400).json({ message: error.message });
    }
    return next(error);
  }

  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: "Each media file must be 100 MB or smaller." });
  }

  if (error.code === "LIMIT_UNEXPECTED_FILE" || error.code === "LIMIT_FILE_COUNT") {
    return res.status(400).json({ message: `A memory can have at most ${MAX_MEDIA_FILES} media files.` });
  }

  return res.status(400).json({ message: "The media upload exceeded the allowed limits." });
};

router.use(requireAuth);

router.get("/categories", memoryController.getMemoryCategories);
router.post("/categories", memoryController.createMemoryCategory);
router.put("/categories/:id", memoryController.updateMemoryCategory);
router.delete("/categories/:id", memoryController.deleteMemoryCategory);

router.get("/", memoryController.getMemories);
router.get("/:id", memoryController.getMemoryById);
router.post("/", upload.array("media", MAX_MEDIA_FILES), handleUploadError, memoryController.createMemory);
router.put("/:id", upload.array("media", MAX_MEDIA_FILES), handleUploadError, memoryController.updateMemory);
router.patch("/:id/favorite", memoryController.toggleFavorite);
router.delete("/:id", memoryController.deleteMemory);

module.exports = router;
