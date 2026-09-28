const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { requireAuth } = require("../middleware/auth");
const diaryController = require("../controllers/diaryController");

const router = express.Router();
const MAX_ATTACHMENT_FILE_SIZE = 100 * 1024 * 1024;
const uploadDir = path.join(__dirname, "..", "..", "uploads", "diary");
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

  const allowed = [...allowedImage, ...allowedVideo, ...allowedAudio, ...allowedDocs];
  if (allowed.includes(file.mimetype)) {
    return cb(null, true);
  }

  cb(new Error("Unsupported file type. Allowed: images, videos, and documents."));
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
  if (!(error instanceof multer.MulterError)) return next(error);

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
