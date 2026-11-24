const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireMediaUnlock } = require("../middleware/appLock");
const mediaController = require("../controllers/mediaController");

const router = express.Router();

router.use(requireAuth, requireMediaUnlock);

// Uploads must be associated with a memory or diary entry.
router.post("/upload", mediaController.uploadMedia);

// List all media with filtering and pagination
router.get("/", mediaController.getMedia);

// Stream video file with HTTP Range support
router.get("/stream/:id", mediaController.streamVideo);

// Get media by memory or diary ID
router.get("/memory/:memoryId", mediaController.getMediaByMemoryId);
router.get("/diary/:diaryId", mediaController.getMediaByDiaryId);

// Get media metadata without streaming the file
router.get("/details/:id", mediaController.getMediaDetailsById);

// Stream a media file after checking ownership
router.get("/:id", mediaController.getMediaById);

// Delete media file
router.delete("/:id", mediaController.deleteMedia);

module.exports = router;
