const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { requireAuth } = require("../middleware/auth");
const diaryController = require("../controllers/diaryController");

const router = express.Router();
const MAX_ATTACHMENT_FILE_SIZE = 100 * 1024 * 1024;
const uploadDir = path.join(__dirname, "..", "..", "uploads", "diary");
const MIME_TYPES_BY_EXTENSION = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
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
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".txt": "text/plain",
  ".zip": "application/zip",
};
fs.mkdirSync(path.join(uploadDir, "images"), { recursive: true });
fs.mkdirSync(path.join(uploadDir, "videos"), { recursive: true });
fs.mkdirSync(path.join(uploadDir, "audio"), { recursive: true });
fs.mkdirSync(path.join(uploadDir, "files"), { recursive: true });

const fileFilter = (req, file, cb) => {
  const allowedImage = ["image/jpeg", "image/png", "image/webp", "image/jpg", "image/gif"];
  const allowedVideo = ["video/mp4", "video/webm", "video/quicktime", "video/x-matroska"];
  const allowedAudio = ["audio/mpeg", "audio/mp4", "audio/wav", "audio/webm", "audio/ogg", "audio/x-wav"];
  const allowedDocs = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "application/zip",
  ];

  const originalMimeType = String(file.mimetype || "").toLowerCase();
  const extension = path.extname(file.originalname).toLowerCase();
  const inferredMimeType = MIME_TYPES_BY_EXTENSION[extension];
  if (inferredMimeType && originalMimeType !== inferredMimeType) {
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

  const error = new Error("Unsupported attachment type. Choose an image, video, audio, document, text, or ZIP file.");
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
    const clean = file.originalname.replace(ext, "").replace(/[^a-zA-Z0-9_-]/g, "_");
    cb(null, `${Date.now()}-${clean}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_ATTACHMENT_FILE_SIZE },
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
    return res.status(413).json({ message: "Each diary attachment must be 100 MB or smaller." });
  }

  return res.status(400).json({ message: "The diary attachment upload exceeded the allowed limits." });
};

router.use(requireAuth);

router.get("/categories", diaryController.getCategoryList);
router.post("/categories", diaryController.createCategory);
router.put("/categories/:id", diaryController.updateCategory);
router.delete("/categories/:id", diaryController.deleteCategory);

router.get("/", diaryController.getDiaryEntries);
router.get("/:id", diaryController.getDiaryEntryById);
router.post("/", diaryController.createDiaryEntry);
router.put("/:id", diaryController.updateDiaryEntry);
router.delete("/:id", diaryController.deleteDiaryEntry);
router.patch("/:id/favorite", diaryController.toggleFavorite);
router.post("/:id/attachments", upload.single("file"), handleUploadError, diaryController.addAttachment);
router.delete("/attachments/:id", diaryController.deleteAttachment);

module.exports = router;
