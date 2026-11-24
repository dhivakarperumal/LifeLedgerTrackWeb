const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");

// Base upload directories
const UPLOAD_ROOT = path.join(__dirname, "..", "..", "uploads");
const DIRS = {
  images: path.join(UPLOAD_ROOT, "images"),
  videos: path.join(UPLOAD_ROOT, "videos"),
  audio: path.join(UPLOAD_ROOT, "audio"),
  files: path.join(UPLOAD_ROOT, "files"),
  memoriesImages: path.join(UPLOAD_ROOT, "memories", "images"),
  memoriesVideos: path.join(UPLOAD_ROOT, "memories", "videos"),
  memoriesAudio: path.join(UPLOAD_ROOT, "memories", "audio"),
  memoriesFiles: path.join(UPLOAD_ROOT, "memories", "files"),
  diaryImages: path.join(UPLOAD_ROOT, "diary", "images"),
  diaryVideos: path.join(UPLOAD_ROOT, "diary", "videos"),
  diaryAudio: path.join(UPLOAD_ROOT, "diary", "audio"),
  diaryFiles: path.join(UPLOAD_ROOT, "diary", "files"),
};

// Ensure all upload directories exist recursively
Object.values(DIRS).forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const MAX_FILE_SIZE = 250 * 1024 * 1024; // 250 MB to comfortably support large videos
const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50 MB for images
const MAX_FILES_COUNT = 20;

const EXTENSION_TO_MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".m4v": "video/mp4",
  ".mkv": "video/x-matroska",
  ".avi": "video/x-msvideo",
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
  ".rar": "application/x-rar-compressed",
  ".7z": "application/x-7z-compressed",
};

const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/svg+xml",
]);

const ALLOWED_VIDEO_MIMES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
  "video/x-msvideo",
  "video/m4v",
]);

const ALLOWED_AUDIO_MIMES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/mp4",
  "audio/m4a",
  "audio/aac",
  "audio/ogg",
  "audio/webm",
]);

const ALLOWED_DOC_MIMES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/vnd.rar",
  "application/x-7z-compressed",
  "application/octet-stream",
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, resolveStorageDirectory(req, file)),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const getEffectiveMimeType = (file) => {
  const mimeType = String(file.mimetype || "").toLowerCase().split(";")[0].trim();
  if (mimeType && mimeType !== "application/octet-stream") return mimeType;
  return EXTENSION_TO_MIME[path.extname(file.originalname).toLowerCase()] || mimeType;
};

const getMediaCategory = (mimeType) => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (ALLOWED_DOC_MIMES.has(mimeType)) return "file";
  return null;
};

const resolveStorageDirectory = (req, file) => {
  const mimeType = getEffectiveMimeType(file);
  const isMemoryUpload = req.baseUrl === "/api/memories";
  const isDiaryUpload = req.baseUrl === "/api/diary";
  const directories = isMemoryUpload
    ? {
        image: DIRS.memoriesImages,
        video: DIRS.memoriesVideos,
        audio: DIRS.memoriesAudio,
        file: DIRS.memoriesFiles,
      }
    : isDiaryUpload
      ? {
          image: DIRS.diaryImages,
          video: DIRS.diaryVideos,
          audio: DIRS.diaryAudio,
          file: DIRS.diaryFiles,
        }
      : {
          image: DIRS.images,
          video: DIRS.videos,
          audio: DIRS.audio,
          file: DIRS.files,
        };

  return directories[getMediaCategory(mimeType)] || directories.file;
};

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const extensionMime = EXTENSION_TO_MIME[ext];
  const effectiveMime = getEffectiveMimeType(file);
  const extensionCategory = getMediaCategory(extensionMime || "");
  const mediaCategory = getMediaCategory(effectiveMime || "");
  const isAllowedMime = ALLOWED_IMAGE_MIMES.has(effectiveMime)
    || ALLOWED_VIDEO_MIMES.has(effectiveMime)
    || ALLOWED_AUDIO_MIMES.has(effectiveMime)
    || ALLOWED_DOC_MIMES.has(effectiveMime);
  const isAudioWebm = ext === ".webm" && mediaCategory === "audio";

  if (
    extensionMime
    && isAllowedMime
    && mediaCategory
    && (mediaCategory === extensionCategory || isAudioWebm)
  ) {
    file.mimetype = effectiveMime;
    return cb(null, true);
  }

  const error = new Error(`Unsupported file type: ${file.originalname}. Supported formats include JPG, JPEG, PNG, WEBP, MP4, MOV, WEBM, MP3, WAV, M4A, AAC, OGG, PDF, DOC/DOCX, XLS/XLSX, TXT, ZIP, RAR, and 7Z.`);
  error.code = "UNSUPPORTED_FILE_TYPE";
  cb(error, false);
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES_COUNT,
  },
  fileFilter,
});

// Middleware for memory/diary/media uploads
const uploadMedia = upload.fields([
  { name: "media", maxCount: MAX_FILES_COUNT },
  { name: "images", maxCount: MAX_FILES_COUNT },
  { name: "videos", maxCount: MAX_FILES_COUNT },
  { name: "files", maxCount: MAX_FILES_COUNT },
  { name: "file", maxCount: 1 },
]);

const uploadSingle = upload.single("file");
const uploadArray = (fieldName = "media", maxCount = MAX_FILES_COUNT) => upload.array(fieldName, maxCount);

const handleUploadError = (err, req, res, next) => {
  if (!err) return next();

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        message: `File size exceeds limit (${MAX_FILE_SIZE / (1024 * 1024)} MB).`,
        code: "LIMIT_FILE_SIZE",
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: `Too many files uploaded. Max allowed is ${MAX_FILES_COUNT}.`,
        code: "LIMIT_FILE_COUNT",
      });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: `Unexpected form field: ${err.field}. Use 'media', 'images', 'videos', or 'file'.`,
        code: "LIMIT_UNEXPECTED_FILE",
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
      code: err.code,
    });
  }

  if (err.code === "UNSUPPORTED_FILE_TYPE") {
    return res.status(400).json({
      success: false,
      message: err.message,
      code: "UNSUPPORTED_FILE_TYPE",
    });
  }

  return next(err);
};

/**
 * Extracts all uploaded files from req.files (fields object or array) or req.file (single)
 */
const extractUploadedFiles = (req) => {
  const list = [];
  if (req.file) {
    list.push(req.file);
  }
  if (Array.isArray(req.files)) {
    list.push(...req.files);
  } else if (req.files && typeof req.files === "object") {
    Object.values(req.files).forEach((fieldFiles) => {
      if (Array.isArray(fieldFiles)) {
        list.push(...fieldFiles);
      }
    });
  }
  return list;
};

const requireUploadedMedia = (req, res, next) => {
  if (!extractUploadedFiles(req).length) {
    return res.status(400).json({
      success: false,
      message: "No media files uploaded. Attach files using the 'media' form field.",
    });
  }
  next();
};

module.exports = {
  upload,
  uploadMedia,
  uploadSingle,
  uploadArray,
  requireUploadedMedia,
  handleUploadError,
  extractUploadedFiles,
  DIRS,
  UPLOAD_ROOT,
  getEffectiveMimeType,
  resolveStorageDirectory,
  MAX_FILE_SIZE,
  MAX_IMAGE_SIZE,
};
