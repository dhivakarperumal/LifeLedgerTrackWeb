const db = require("../config/db");
const mediaService = require("../services/mediaService");
const { extractUploadedFiles } = require("../middleware/uploadMiddleware");

const getCurrentDateKey = () => {
  const current = new Date();
  const year = current.getFullYear();
  const month = String(current.getMonth() + 1).padStart(2, "0");
  const day = String(current.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseTags = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return value.split(",").map((tag) => tag.trim()).filter(Boolean);
    }
  }
  return [];
};

const parseBooleanValue = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
  }
  return fallback;
};

const parseJsonArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
};

/**
 * Normalizes a memory DB row into standard response format
 */
const formatMemoryResponse = (row, mediaBucket = { images: [], videos: [], audio: [], media_files: [] }) => {
  const images = [...(mediaBucket.images || [])];
  const videos = [...(mediaBucket.videos || [])];
  const audio = [...(mediaBucket.audio || [])];
  const allMedia = [...(mediaBucket.media_files || [])];

  // Also support legacy media_gallery JSON if media_files has not populated it yet
  if (row.media_gallery) {
    try {
      const parsedGallery = typeof row.media_gallery === "string" ? JSON.parse(row.media_gallery) : row.media_gallery;
      if (Array.isArray(parsedGallery)) {
        parsedGallery.forEach((item, idx) => {
          const url = typeof item === "string" ? item : item?.file_url || item?.url || "";
          if (url && !allMedia.some((media) => media.file_url === url)) {
            const fileName = url.split("/").pop() || `media-${idx + 1}`;
            const declaredType = String(item?.mime_type || item?.file_type || item?.type || "").toLowerCase();
            const isAudio = declaredType.startsWith("audio/") || declaredType === "audio" || /\.(mp3|wav|m4a|aac)$/i.test(fileName);
            const isVideo = declaredType.startsWith("video/") || declaredType === "video" || (!isAudio && /\.(mp4|webm|mov|mkv|m4v)$/i.test(fileName));
            const mediaObj = {
              id: `legacy-${row.id}-${idx}`,
              file_name: fileName,
              original_name: fileName,
              file_url: url,
              file_type: isAudio ? "audio" : isVideo ? "video" : "image",
              mime_type: declaredType.includes("/")
                ? declaredType
                : isAudio
                  ? "audio/webm"
                  : isVideo
                    ? "video/mp4"
                    : "image/jpeg",
              file_size: 0,
              created_at: row.created_at,
            };
            allMedia.push(mediaObj);
            if (isAudio) audio.push(mediaObj);
            else if (isVideo) videos.push(mediaObj);
            else images.push(mediaObj);
          }
        });
      }
    } catch {
      // ignore
    }
  }

  // If primary media_url exists and no media yet
  if (row.media_url && !allMedia.some((media) => media.file_url === row.media_url)) {
    const rowMediaType = String(row.media_type || "").toLowerCase();
    const isAudio = rowMediaType === "audio" || rowMediaType.startsWith("audio/");
    const isVideo = !isAudio && (rowMediaType === "video" || rowMediaType.startsWith("video/") || /\.(mp4|webm|mov|mkv|m4v)$/i.test(row.media_url));
    const mediaObj = {
      id: `legacy-${row.id}-primary`,
      file_name: row.media_url.split("/").pop() || "media",
      original_name: row.media_url.split("/").pop() || "media",
      file_url: row.media_url,
      file_type: isAudio ? "audio" : isVideo ? "video" : "image",
      mime_type: isAudio ? "audio/webm" : isVideo ? "video/mp4" : "image/jpeg",
      file_size: 0,
      created_at: row.created_at,
    };
    allMedia.push(mediaObj);
    if (isAudio) audio.push(mediaObj);
    else if (isVideo) videos.push(mediaObj);
    else images.push(mediaObj);
  }

  const primaryMedia = images[0] || videos[0] || audio[0];
  const primaryUrl = primaryMedia?.file_url || row.media_url || "";
  const galleryUrls = allMedia.map((m) => m.file_url);

  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    description: row.description || "",
    category: row.category || row.category_name || "General",
    category_id: row.category_id || null,
    category_name: row.category_name || row.category || "General",
    category_color: row.category_color || "#8B5CF6",
    memory_date: row.memory_date,
    location: row.location || "",
    mood: row.mood || "Happy",
    tags: parseTags(row.tags),
    status: row.status || "published",
    is_favorite: Boolean(row.is_favorite),
    favorite: Boolean(row.is_favorite),
    voice_note: row.voice_note || "",
    media_url: primaryUrl,
    media_type: images.length ? "image" : videos.length ? "video" : audio.length ? "audio" : row.media_type || "image",
    media_gallery: galleryUrls,
    images,
    videos,
    audio,
    media_files: allMedia,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

const syncMemoryCategoryFromShared = async (userId, categoryId, fallbackName = null) => {
  const resolvedId = categoryId ? Number(categoryId) : null;

  if (resolvedId) {
    const [sharedRows] = await db.query(
      "SELECT * FROM categories WHERE id = ? AND (user_id = ? OR user_id IS NULL)",
      [resolvedId, userId]
    );

    if (sharedRows.length) {
      const shared = sharedRows[0];
      return {
        id: shared.id,
        name: shared.name,
        color: shared.color || "#8B5CF6",
      };
    }
  }

  const candidateName = fallbackName ? String(fallbackName).trim() : null;
  if (candidateName) {
    const [sharedRows] = await db.query(
      "SELECT * FROM categories WHERE (user_id = ? OR user_id IS NULL) AND name = ? ORDER BY id DESC LIMIT 1",
      [userId, candidateName]
    );

    if (sharedRows.length) {
      return {
        id: sharedRows[0].id,
        name: sharedRows[0].name,
        color: sharedRows[0].color || "#8B5CF6",
      };
    }

    const [result] = await db.query(
      `INSERT INTO categories (user_id, name, description, status, catType, created_at)
       VALUES (?, ?, ?, 'Active', 'Memory', CURRENT_TIMESTAMP)`,
      [userId, candidateName, ""]
    );

    return {
      id: result.insertId,
      name: candidateName,
      color: "#8B5CF6",
    };
  }

  return { id: null, name: null, color: "#8B5CF6" };
};

/**
 * GET /api/memories/categories
 */
const getMemoryCategories = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM categories
       WHERE (user_id = ? OR user_id IS NULL)
         AND (LOWER(catType) LIKE '%memory%' OR LOWER(name) LIKE '%memory%')
       ORDER BY name ASC`,
      [req.user.user_id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch memory categories", error: error.message });
  }
};

/**
 * POST /api/memories/categories
 */
const createMemoryCategory = async (req, res) => {
  try {
    const { name, description, color } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: "Category name is required." });
    }

    const [result] = await db.query(
      `INSERT INTO categories (user_id, name, description, status, catType, color, created_at)
       VALUES (?, ?, ?, 'Active', 'Memory', ?, CURRENT_TIMESTAMP)`,
      [req.user.user_id, String(name).trim(), description || "", color || "#8B5CF6"]
    );

    const [rows] = await db.query("SELECT * FROM categories WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create memory category", error: error.message });
  }
};

/**
 * PUT /api/memories/categories/:id
 */
const updateMemoryCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, color } = req.body;

    const [rows] = await db.query(
      "SELECT * FROM categories WHERE id = ? AND (user_id = ? OR user_id IS NULL)",
      [id, req.user.user_id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Memory category not found." });
    }

    await db.query(
      `UPDATE categories
       SET name = ?, description = ?, color = ?
       WHERE id = ? AND (user_id = ? OR user_id IS NULL)`,
      [
        String(name || rows[0].name).trim(),
        description ?? rows[0].description,
        color ?? rows[0].color,
        id,
        req.user.user_id,
      ]
    );

    const [updated] = await db.query("SELECT * FROM categories WHERE id = ?", [id]);
    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update memory category", error: error.message });
  }
};

/**
 * DELETE /api/memories/categories/:id
 */
const deleteMemoryCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM categories WHERE id = ? AND (user_id = ? OR user_id IS NULL)", [id, req.user.user_id]);
    res.json({ success: true, message: "Memory category deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete memory category", error: error.message });
  }
};

/**
 * Helper to fetch memories with filters, search, pagination, and full media relations
 */
const queryMemories = async ({
  userId,
  isAdmin = false,
  filterUserId = null,
  search = "",
  category = "all",
  startDate = "",
  endDate = "",
  date = "",
  favorite = "",
  status = "all",
  page = 1,
  limit = 20,
}) => {
  let targetUserId = userId;
  if (isAdmin && filterUserId) {
    targetUserId = filterUserId;
  }

  let whereSql = "WHERE m.user_id = ?";
  const values = [targetUserId];

  if (search) {
    whereSql += " AND (m.title LIKE ? OR m.description LIKE ? OR m.tags LIKE ? OR m.location LIKE ? OR m.category_name LIKE ? OR m.category LIKE ?)";
    const term = `%${search}%`;
    values.push(term, term, term, term, term, term);
  }

  if (category && category !== "all") {
    if (/^\d+$/.test(String(category))) {
      whereSql += " AND m.category_id = ?";
      values.push(Number(category));
    } else {
      whereSql += " AND (m.category = ? OR m.category_name = ?)";
      values.push(category, category);
    }
  }

  if (date) {
    whereSql += " AND m.memory_date = ?";
    values.push(date);
  } else {
    if (startDate) {
      whereSql += " AND m.memory_date >= ?";
      values.push(startDate);
    }
    if (endDate) {
      whereSql += " AND m.memory_date <= ?";
      values.push(endDate);
    }
  }

  if (favorite === "true" || favorite === "1" || favorite === true) {
    whereSql += " AND m.is_favorite = 1";
  }

  if (status && status !== "all") {
    whereSql += " AND m.status = ?";
    values.push(status);
  }

  // Count total matching
  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total FROM memories m ${whereSql}`,
    values
  );
  const total = Number(countRows[0]?.total || 0);

  const isUnlimited = limit === "all" || limit === "0" || Number(limit) <= 0;
  let paginationSql = "";
  let parsedLimit = total || 50;
  let parsedPage = 1;

  if (!isUnlimited) {
    parsedLimit = Math.max(1, Math.min(200, Number(limit) || 20));
    parsedPage = Math.max(1, Number(page) || 1);
    const offset = (parsedPage - 1) * parsedLimit;
    paginationSql = " LIMIT ? OFFSET ?";
    values.push(parsedLimit, offset);
  }

  const [rows] = await db.query(
    `SELECT m.* FROM memories m
     ${whereSql}
     ORDER BY m.memory_date DESC, m.created_at DESC
     ${paginationSql}`,
    values
  );

  const memoryIds = rows.map((r) => r.id);
  const mediaMap = await mediaService.getMediaMapForMemories(memoryIds);

  const data = rows.map((row) => formatMemoryResponse(row, mediaMap.get(row.id)));

  return {
    data,
    pagination: {
      total,
      page: parsedPage,
      limit: isUnlimited ? total : parsedLimit,
      totalPages: isUnlimited ? 1 : Math.ceil(total / parsedLimit) || 1,
    },
  };
};

/**
 * GET /api/memories
 * Supports search, category, date filters, user_id, pagination.
 */
const getMemories = async (req, res) => {
  try {
    const {
      search = "",
      category = "all",
      start_date = "",
      end_date = "",
      date = "",
      favorite = "",
      status = "all",
      user_id = "",
      page = 1,
      limit = "all", // default to 'all' for backward compatibility with frontend clients
    } = req.query;

    const isAdmin = req.user.role?.toLowerCase() === "admin";
    const result = await queryMemories({
      userId: req.user.user_id,
      isAdmin,
      filterUserId: user_id || null,
      search,
      category,
      startDate: start_date,
      endDate: end_date,
      date,
      favorite,
      status,
      page,
      limit,
    });

    return res.json({
      success: true,
      message: "Memories fetched successfully",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Get memories error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch memories",
      error: error.message,
    });
  }
};

/**
 * GET /api/memories/user/:userId
 * Fetch memories for a specific user ID.
 */
const getMemoriesByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.user_id;
    const isAdmin = req.user.role?.toLowerCase() === "admin";

    if (!isAdmin && currentUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view another user's memories.",
      });
    }

    const result = await queryMemories({
      userId: currentUserId,
      isAdmin,
      filterUserId: userId,
      search: req.query.search || "",
      category: req.query.category || "all",
      startDate: req.query.start_date || "",
      endDate: req.query.end_date || "",
      date: req.query.date || "",
      favorite: req.query.favorite || "",
      status: req.query.status || "all",
      page: req.query.page || 1,
      limit: req.query.limit || "all",
    });

    return res.json({
      success: true,
      message: `Memories fetched successfully for user ${userId}`,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch memories by user ID",
      error: error.message,
    });
  }
};

/**
 * GET /api/memories/:id
 * Fetch single memory by ID with complete media information.
 */
const getMemoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const isAdmin = req.user.role?.toLowerCase() === "admin";

    const query = isAdmin
      ? "SELECT m.* FROM memories m WHERE m.id = ?"
      : "SELECT m.* FROM memories m WHERE m.id = ? AND m.user_id = ?";
    const params = isAdmin ? [id] : [id, userId];

    const [rows] = await db.query(query, params);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Memory not found." });
    }

    const mediaMap = await mediaService.getMediaMapForMemories([rows[0].id]);
    const memory = formatMemoryResponse(rows[0], mediaMap.get(rows[0].id));

    return res.json({
      success: true,
      message: "Memory fetched successfully",
      data: memory,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch memory",
      error: error.message,
    });
  }
};

/**
 * POST /api/memories
 * Create a new memory with optional media files (images, videos).
 */
const createMemory = async (req, res) => {
  const uploadedFiles = extractUploadedFiles(req);

  try {
    const {
      title,
      description,
      category,
      category_id,
      category_name,
      memory_date,
      location,
      tags,
      mood,
      status,
      is_favorite,
      voice_note,
    } = req.body;

    if (!title || !String(title).trim()) {
      mediaService.cleanupFiles(uploadedFiles);
      return res.status(400).json({ success: false, message: "Memory title is required." });
    }

    const favoriteFlag = parseBooleanValue(is_favorite, false);
    const resolvedCategory = await syncMemoryCategoryFromShared(
      req.user.user_id,
      category_id,
      category || category_name || null
    );

    const tagValue = Array.isArray(tags) ? JSON.stringify(tags) : JSON.stringify(parseTags(tags));
    const finalCategoryName = resolvedCategory.name || category || category_name || "General";

    const [result] = await db.query(
      `INSERT INTO memories (
        user_id, title, description, category, category_id, category_name, category_color,
        memory_date, location, mood, tags, status, is_favorite, voice_note,
        created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.user_id,
        String(title).trim(),
        description || "",
        finalCategoryName,
        resolvedCategory.id || null,
        finalCategoryName,
        resolvedCategory.color || "#8B5CF6",
        memory_date || getCurrentDateKey(),
        location || "",
        mood || "Happy",
        tagValue,
        status || "published",
        favoriteFlag ? 1 : 0,
        voice_note || "",
        req.user.user_id,
        req.user.user_id,
      ]
    );

    const newMemoryId = result.insertId;

    // Save uploaded media files in MySQL media_files linked to newMemoryId
    let savedMedia = [];
    if (uploadedFiles.length > 0) {
      savedMedia = await mediaService.saveUploadedFiles({
        files: uploadedFiles,
        userId: req.user.user_id,
        memoryId: newMemoryId,
      });

      // Also update legacy columns for backward compatibility
      const primaryUrl = savedMedia[0]?.file_url || "";
      const gallery = savedMedia.map((m) => m.file_url);
      const primaryMedia = savedMedia.find((m) => m.file_type === "image")
        || savedMedia.find((m) => m.file_type === "video")
        || savedMedia.find((m) => m.file_type === "audio");
      const mediaType = primaryMedia?.file_type || "image";

      await db.query(
        "UPDATE memories SET media_url = ?, media_gallery = ?, media_type = ? WHERE id = ?",
        [primaryMedia?.file_url || primaryUrl, JSON.stringify(gallery), mediaType, newMemoryId]
      );
    }

    const [rows] = await db.query("SELECT * FROM memories WHERE id = ?", [newMemoryId]);
    const mediaMap = await mediaService.getMediaMapForMemories([newMemoryId]);
    const memory = formatMemoryResponse(rows[0], mediaMap.get(newMemoryId));

    return res.status(201).json({
      success: true,
      message: "Memory created successfully",
      data: memory,
    });
  } catch (error) {
    try {
      await mediaService.rollbackUploadedFiles(uploadedFiles);
    } catch (cleanupError) {
      console.error("Create memory media rollback failed:", cleanupError.message);
    }
    console.error("Create memory error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create memory",
      error: error.message,
    });
  }
};

/**
 * PUT /api/memories/:id
 * Update an existing memory, remove specified media, and append newly uploaded media.
 */
const updateMemory = async (req, res) => {
  const uploadedFiles = extractUploadedFiles(req);
  const { id } = req.params;
  const userId = req.user.user_id;
  const isAdmin = req.user.role?.toLowerCase() === "admin";

  try {
    const [existing] = await db.query(
      isAdmin ? "SELECT * FROM memories WHERE id = ?" : "SELECT * FROM memories WHERE id = ? AND user_id = ?",
      isAdmin ? [id] : [id, userId]
    );

    if (!existing.length) {
      mediaService.cleanupFiles(uploadedFiles);
      return res.status(404).json({ success: false, message: "Memory not found or access denied." });
    }

    const current = existing[0];
    const {
      title,
      description,
      category,
      category_id,
      category_name,
      memory_date,
      location,
      tags,
      mood,
      status,
      is_favorite,
      voice_note,
    } = req.body;

    // Handle removal of specific media files
    const removedMediaIds = [
      ...parseJsonArray(req.body.removed_media_ids),
      ...parseJsonArray(req.body.removed_image_ids),
      ...parseJsonArray(req.body.removed_video_ids),
      ...parseJsonArray(req.body.removed_audio_ids),
      ...parseJsonArray(req.body.removed_zip_ids),
    ];

    const removedMedia = removedMediaIds.length > 0
      ? await mediaService.deleteMediaByIds(removedMediaIds, userId, isAdmin)
      : [];

    // Save any newly uploaded media files
    if (uploadedFiles.length > 0) {
      await mediaService.saveUploadedFiles({
        files: uploadedFiles,
        userId: current.user_id,
        memoryId: current.id,
      });
    }

    const favoriteFlag = is_favorite !== undefined
      ? parseBooleanValue(is_favorite, Boolean(current.is_favorite))
      : Boolean(current.is_favorite);

    const resolvedCategory = await syncMemoryCategoryFromShared(
      current.user_id,
      category_id ?? current.category_id,
      category || category_name || current.category_name || null
    );

    const tagValue = tags !== undefined
      ? (Array.isArray(tags) ? JSON.stringify(tags) : JSON.stringify(parseTags(tags)))
      : current.tags;

    const finalCategoryName = resolvedCategory.name || category || category_name || current.category || current.category_name || "General";

    // Re-fetch media to update legacy columns
    const mediaMap = await mediaService.getMediaMapForMemories([current.id]);
    const memoryMedia = mediaMap.get(current.id) || { images: [], videos: [], audio: [], media_files: [] };
    const primaryMedia = memoryMedia.images[0] || memoryMedia.videos[0] || memoryMedia.audio[0];
    const hasRemovedStoredMedia = removedMedia.length > 0;
    const primaryUrl = primaryMedia?.file_url || (hasRemovedStoredMedia ? "" : current.media_url || "");
    const gallery = memoryMedia.media_files.map((m) => m.file_url);
    const mediaType = primaryMedia?.file_type || (hasRemovedStoredMedia ? "image" : current.media_type || "image");

    await db.query(
      `UPDATE memories
       SET title = ?, description = ?, category = ?, category_id = ?, category_name = ?, category_color = ?,
           memory_date = ?, location = ?, mood = ?, tags = ?, status = ?, is_favorite = ?,
           media_url = ?, media_gallery = ?, media_type = ?, voice_note = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        title !== undefined ? String(title).trim() : current.title,
        description !== undefined ? description : current.description,
        finalCategoryName,
        resolvedCategory.id !== undefined && resolvedCategory.id !== null ? resolvedCategory.id : current.category_id,
        finalCategoryName,
        resolvedCategory.color !== undefined && resolvedCategory.color !== null ? resolvedCategory.color : current.category_color,
        memory_date !== undefined ? memory_date : current.memory_date,
        location !== undefined ? location : current.location,
        mood !== undefined ? mood : current.mood,
        tagValue,
        status !== undefined ? status : current.status,
        favoriteFlag ? 1 : 0,
        primaryUrl,
        JSON.stringify(gallery),
        mediaType,
        voice_note !== undefined ? voice_note : current.voice_note,
        req.user.user_id,
        current.id,
      ]
    );

    const [updatedRows] = await db.query("SELECT * FROM memories WHERE id = ?", [current.id]);
    const updatedMediaMap = await mediaService.getMediaMapForMemories([current.id]);
    const updatedMemory = formatMemoryResponse(updatedRows[0], updatedMediaMap.get(current.id));

    return res.status(req.method === "POST" ? 201 : 200).json({
      success: true,
      message: "Memory updated successfully",
      data: updatedMemory,
    });
  } catch (error) {
    try {
      await mediaService.rollbackUploadedFiles(uploadedFiles);
    } catch (cleanupError) {
      console.error("Update memory media rollback failed:", cleanupError.message);
    }
    console.error("Update memory error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update memory",
      error: error.message,
    });
  }
};

/**
 * PATCH /api/memories/:id/favorite
 */
const toggleFavorite = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      "SELECT is_favorite FROM memories WHERE id = ? AND (user_id = ? OR ? = 'admin')",
      [id, req.user.user_id, req.user.role?.toLowerCase()]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Memory not found." });
    }

    const nextValue = rows[0].is_favorite ? 0 : 1;
    await db.query(
      "UPDATE memories SET is_favorite = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [nextValue, req.user.user_id, id]
    );

    return res.json({
      success: true,
      message: nextValue ? "Added to favorites" : "Removed from favorites",
      data: { id: Number(id), is_favorite: Boolean(nextValue) },
      is_favorite: Boolean(nextValue),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update favorite status",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/memories/:id
 * Delete a memory and all its associated physical media files from disk.
 */
const deleteMemory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const isAdmin = req.user.role?.toLowerCase() === "admin";

    const [rows] = await db.query(
      isAdmin ? "SELECT * FROM memories WHERE id = ?" : "SELECT * FROM memories WHERE id = ? AND user_id = ?",
      isAdmin ? [id] : [id, userId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Memory not found or access denied." });
    }

    // Safely delete all associated physical media files and media_files rows
    await mediaService.deleteMediaForMemory(id, userId, isAdmin);

    // Also remove any legacy file on disk from media_url if not in media_files
    if (rows[0].media_url) {
      mediaService.safeUnlink(rows[0].media_url);
    }

    await db.query("DELETE FROM memories WHERE id = ?", [id]);

    return res.json({
      success: true,
      message: "Memory and associated media deleted successfully.",
      data: { id: Number(id) },
    });
  } catch (error) {
    console.error("Delete memory error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete memory",
      error: error.message,
    });
  }
};

module.exports = {
  getMemoryCategories,
  createMemoryCategory,
  updateMemoryCategory,
  deleteMemoryCategory,
  getMemories,
  getMemoriesByUserId,
  getMemoryById,
  createMemory,
  updateMemory,
  toggleFavorite,
  deleteMemory,
};
