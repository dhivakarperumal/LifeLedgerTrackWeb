const express = require("express");
const { requireAuth } = require("../middleware/auth");
const verifyUploadOwnership = require("../middleware/verifyUploadOwnership");
const { uploadMedia, handleUploadError } = require("../middleware/uploadMiddleware");
const diaryController = require("../controllers/diaryController");

const router = express.Router();

router.use(requireAuth);

// Category endpoints
router.get("/categories", diaryController.getCategoryList);
router.post("/categories", diaryController.createCategory);
router.put("/categories/:id", diaryController.updateCategory);
router.delete("/categories/:id", diaryController.deleteCategory);

// Filter by User ID
router.get("/user/:userId", diaryController.getDiaryEntriesByUserId);

// Attachment endpoints
router.post("/:id/media", verifyUploadOwnership("diary"), uploadMedia, handleUploadError, diaryController.addAttachment);
router.post("/:id/attachments", verifyUploadOwnership("diary"), uploadMedia, handleUploadError, diaryController.addAttachment);
router.delete("/attachments/:id", diaryController.deleteAttachment);
router.delete("/:id/attachments/:attachmentId", diaryController.deleteAttachment);

// Main CRUD endpoints
router.get("/", diaryController.getDiaryEntries);
router.get("/:id", diaryController.getDiaryEntryById);
router.post("/", uploadMedia, handleUploadError, diaryController.createDiaryEntry);
router.put("/:id", verifyUploadOwnership("diary"), uploadMedia, handleUploadError, diaryController.updateDiaryEntry);
router.patch("/:id/favorite", diaryController.toggleFavorite);
router.delete("/:id", diaryController.deleteDiaryEntry);

module.exports = router;
