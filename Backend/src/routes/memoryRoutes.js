const express = require("express");
const { requireAuth } = require("../middleware/auth");
const verifyUploadOwnership = require("../middleware/verifyUploadOwnership");
const { uploadMedia, requireUploadedMedia, handleUploadError } = require("../middleware/uploadMiddleware");
const memoryController = require("../controllers/memoryController");

const router = express.Router();

router.use(requireAuth);

// Category endpoints
router.get("/categories", memoryController.getMemoryCategories);
router.post("/categories", memoryController.createMemoryCategory);
router.put("/categories/:id", memoryController.updateMemoryCategory);
router.delete("/categories/:id", memoryController.deleteMemoryCategory);

// Filter by User ID
router.get("/user/:userId", memoryController.getMemoriesByUserId);

// Main CRUD endpoints
router.get("/", memoryController.getMemories);
router.get("/:id", memoryController.getMemoryById);
router.post("/", uploadMedia, handleUploadError, memoryController.createMemory);
router.post("/:id/media", verifyUploadOwnership("memory"), uploadMedia, handleUploadError, requireUploadedMedia, memoryController.updateMemory);
router.put("/:id", verifyUploadOwnership("memory"), uploadMedia, handleUploadError, memoryController.updateMemory);
router.patch("/:id/favorite", memoryController.toggleFavorite);
router.delete("/:id", memoryController.deleteMemory);

module.exports = router;
