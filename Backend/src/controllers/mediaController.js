const db = require("../config/db");
const mediaService = require("../services/mediaService");
const { extractUploadedFiles } = require("../middleware/uploadMiddleware");

/**
 * POST /api/media/upload
 * Handles single or multiple standalone media uploads.
 */
const uploadMedia = async (req, res) => {
  const files = extractUploadedFiles(req);

  if (!files || files.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No files uploaded. Attach files using form fields: 'media', 'images', 'videos', or 'file'.",
    });
  }

  const userId = req.user.user_id;
  try {
    if (req.body.memory_id || req.body.diary_id) {
      mediaService.cleanupFiles(files);
      return res.status(400).json({
        success: false,
        message: "Upload linked files through the memory or diary media endpoint.",
      });
    }

    const savedFiles = await mediaService.saveUploadedFiles({
      files,
      userId,
    });

    const images = savedFiles.filter((f) => f.file_type === "image");
    const videos = savedFiles.filter((f) => f.file_type === "video");
    const audio = savedFiles.filter((f) => f.file_type === "audio");

    return res.status(201).json({
      success: true,
      message: `${savedFiles.length} file(s) uploaded successfully.`,
      data: savedFiles,
      images,
      videos,
      audio,
    });
  } catch (error) {
    console.error("Media upload error:", error);
    try {
      await mediaService.rollbackUploadedFiles(files);
    } catch (cleanupError) {
      console.error("Media upload rollback failed:", cleanupError.message);
    }
    return res.status(500).json({
      success: false,
      message: "Failed to process media upload.",
      error: error.message,
    });
  }
};

/**
 * GET /api/media
 * Fetch all media files for current user with optional filters (memory_id, diary_id, file_type, pagination).
 */
const getMedia = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const isAdmin = req.user.role?.toLowerCase() === "admin";
    const {
      memory_id,
      diary_id,
      file_type,
      user_id,
      page = 1,
      limit = 50,
      search = "",
    } = req.query;

    let targetUserId = userId;
    if (isAdmin && user_id) {
      targetUserId = user_id;
    }

    let whereSql = "WHERE user_id = ?";
    const values = [targetUserId];

    if (memory_id) {
      whereSql += " AND memory_id = ?";
      values.push(Number(memory_id));
    }

    if (diary_id) {
      whereSql += " AND diary_id = ?";
      values.push(Number(diary_id));
    }

    if (file_type && file_type !== "all") {
      whereSql += " AND file_type = ?";
      values.push(file_type);
    }

    if (search) {
      whereSql += " AND (original_name LIKE ? OR file_name LIKE ?)";
      values.push(`%${search}%`, `%${search}%`);
    }

    // Count total
    const [countResult] = await db.query(
      `SELECT COUNT(*) AS total FROM media_files ${whereSql}`,
      values
    );
    const total = Number(countResult[0]?.total || 0);

    const parsedLimit = Math.max(1, Math.min(100, Number(limit) || 50));
    const parsedPage = Math.max(1, Number(page) || 1);
    const offset = (parsedPage - 1) * parsedLimit;

    const [rows] = await db.query(
      `SELECT id, user_id, memory_id, diary_id, file_name, original_name,
              stored_name, file_path, file_url, file_type, media_type, mime_type,
              file_size, created_at, updated_at
       FROM media_files
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...values, parsedLimit, offset]
    );

    const images = rows.filter((r) => r.file_type === "image");
    const videos = rows.filter((r) => r.file_type === "video");
    const audio = rows.filter((r) => r.file_type === "audio");

    return res.json({
      success: true,
      message: "Media files fetched successfully",
      data: rows,
      images,
      videos,
      audio,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit) || 1,
      },
    });
  } catch (error) {
    console.error("Fetch media error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch media files.",
      error: error.message,
    });
  }
};

/**
 * GET /api/media/:id
 * Get single media file details by ID.
 */
const getMediaDetailsById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const isAdmin = req.user.role?.toLowerCase() === "admin";

    const query = isAdmin
      ? "SELECT * FROM media_files WHERE id = ?"
      : "SELECT * FROM media_files WHERE id = ? AND user_id = ?";
    const params = isAdmin ? [id] : [id, userId];

    const [rows] = await db.query(query, params);
    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Media file not found or access denied.",
      });
    }

    return res.json({
      success: true,
      message: "Media file fetched successfully",
      data: rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch media file.",
      error: error.message,
    });
  }
};

const getMediaById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const isAdmin = req.user.role?.toLowerCase() === "admin";
    const query = isAdmin
      ? "SELECT * FROM media_files WHERE id = ?"
      : "SELECT * FROM media_files WHERE id = ? AND user_id = ?";
    const [rows] = await db.query(query, isAdmin ? [id] : [id, userId]);

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Media file not found or access denied.",
      });
    }

    return mediaService.streamMediaFile(rows[0].file_path, rows[0].mime_type, req, res, rows[0].original_name);
  } catch (error) {
    console.error("Stream media error:", error);
    if (res.headersSent) return res.destroy(error);
    return res.status(500).json({
      success: false,
      message: "Failed to stream media file.",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/media/:id
 * Delete media file from disk and database with ownership check.
 */
const deleteMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const isAdmin = req.user.role?.toLowerCase() === "admin";

    const result = await mediaService.deleteMediaById(id, userId, isAdmin);
    if (!result.found) {
      return res.status(404).json({
        success: false,
        message: "Media file not found or access denied.",
      });
    }

    return res.json({
      success: true,
      message: "Media file deleted successfully.",
      data: { id: Number(id) },
    });
  } catch (error) {
    console.error("Delete media error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete media file.",
      error: error.message,
    });
  }
};

/**
 * GET /api/media/memory/:memoryId
 * Get all media files belonging to a memory.
 */
const getMediaByMemoryId = async (req, res) => {
  try {
    const { memoryId } = req.params;
    const userId = req.user.user_id;
    const isAdmin = req.user.role?.toLowerCase() === "admin";

    const [rows] = await db.query(
      `SELECT m.* FROM media_files m
       INNER JOIN memories mem ON mem.id = m.memory_id
       WHERE m.memory_id = ? AND (mem.user_id = ? OR ? = true)
       ORDER BY m.created_at ASC`,
      [memoryId, userId, isAdmin]
    );

    const images = rows.filter((r) => r.file_type === "image");
    const videos = rows.filter((r) => r.file_type === "video");
    const audio = rows.filter((r) => r.file_type === "audio");

    return res.json({
      success: true,
      message: "Memory media fetched successfully",
      data: rows,
      images,
      videos,
      audio,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch memory media.",
      error: error.message,
    });
  }
};

/**
 * GET /api/media/diary/:diaryId
 * Get all media files belonging to a diary entry.
 */
const getMediaByDiaryId = async (req, res) => {
  try {
    const { diaryId } = req.params;
    const userId = req.user.user_id;
    const isAdmin = req.user.role?.toLowerCase() === "admin";

    const [rows] = await db.query(
      `SELECT m.* FROM media_files m
       INNER JOIN diary_entries d ON d.id = m.diary_id
       WHERE m.diary_id = ? AND (d.user_id = ? OR ? = true)
       ORDER BY m.created_at ASC`,
      [diaryId, userId, isAdmin]
    );

    const images = rows.filter((r) => r.file_type === "image");
    const videos = rows.filter((r) => r.file_type === "video");
    const audio = rows.filter((r) => r.file_type === "audio");

    return res.json({
      success: true,
      message: "Diary media fetched successfully",
      data: rows,
      images,
      videos,
      audio,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch diary media.",
      error: error.message,
    });
  }
};

/**
 * GET /api/media/stream/:id
 * Stream video with HTTP Range request support.
 */
const streamVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const isAdmin = req.user.role?.toLowerCase() === "admin";

    const query = isAdmin
      ? "SELECT * FROM media_files WHERE id = ?"
      : "SELECT * FROM media_files WHERE id = ? AND user_id = ?";
    const [rows] = await db.query(query, isAdmin ? [id] : [id, userId]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Video not found or access denied." });
    }

    const media = rows[0];
    if (media.file_type !== "video" && !(media.mime_type || "").startsWith("video/")) {
      return res.status(400).json({ success: false, message: "Requested file is not a video." });
    }

    return mediaService.streamVideoFile(media.file_path, media.mime_type, req, res, media.original_name);
  } catch (error) {
    console.error("Stream video error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to stream video.",
      error: error.message,
    });
  }
};

module.exports = {
  uploadMedia,
  getMedia,
  getMediaById,
  getMediaDetailsById,
  deleteMedia,
  getMediaByMemoryId,
  getMediaByDiaryId,
  streamVideo,
};
