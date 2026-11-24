const path = require("path");
const fs = require("fs");
const db = require("../config/db");
const mediaService = require("../services/mediaService");
const { extractUploadedFiles } = require("../middleware/uploadMiddleware");

const parseJsonField = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
};

const parseIdList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((id) => String(id));
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((id) => String(id)) : [String(parsed)];
  } catch {
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((id) => String(id));
  }
};

const isDiaryCategoryRow = (category) => {
  const typeValue = String(category?.catType || category?.type || category?.category_type || "").trim().toLowerCase();
  const nameValue = String(category?.name || "").trim().toLowerCase();

  return (
    ["diary", "journal", "daily", "journal entry", "diary entry", "dairy"].includes(typeValue) ||
    ["diary", "journal", "daily", "dairy"].some((keyword) => typeValue.includes(keyword)) ||
    ["diary", "journal", "daily", "dairy"].some((keyword) => nameValue.includes(keyword))
  );
};

const diarySelectBase = `
  d.id, d.user_id, d.title, d.content, d.category, d.category_id,
  COALESCE(d.category_name, d.category, dc.name) AS category_name,
  dc.catType AS category_type,
  d.mood, d.tags, d.location, d.entry_date, d.entry_time, d.status,
  d.is_favorite, d.is_private, d.is_locked, d.image_path, d.video_path, d.audio_path, d.file_path, d.media_files,
  d.created_at, d.updated_at, d.created_by, d.updated_by
`;

/**
 * Normalizes a diary entry row and merges related media_files
 */
const formatDiaryResponse = (row, mediaBucket = { images: [], videos: [], audio: [], media_files: [] }) => {
  const images = [...(mediaBucket.images || [])];
  const videos = [...(mediaBucket.videos || [])];
  const audio = [...(mediaBucket.audio || [])];
  const allMedia = [...(mediaBucket.media_files || [])];

  // Merge legacy media_files JSON if not already in media_files table
  const legacyMedia = parseJsonField(row.media_files);
  if (Array.isArray(legacyMedia) && legacyMedia.length) {
    legacyMedia.forEach((item, index) => {
      const url = item?.file_url || item?.url || item?.path || item?.src || (typeof item === "string" ? item : "");
      if (url && !allMedia.some((media) => media.file_url === url)) {
        const fileName = item?.file_name || item?.name || url.split("/").pop() || `media-${index + 1}`;
        const type = String(item?.mime_type || item?.file_type || item?.type || "").toLowerCase();
        const isAudio = type.startsWith("audio/") || type === "audio" || /\.(mp3|wav|m4a|aac)$/i.test(fileName);
        const isVideo = type.startsWith("video/") || type === "video" || (!isAudio && /\.(mp4|webm|mov|mkv)$/i.test(fileName));
        const mediaObj = {
          id: item?.id || `legacy-${row.id}-${index}`,
          file_name: fileName,
          original_name: fileName,
          file_url: url,
          file_type: isAudio ? "audio" : isVideo ? "video" : "image",
          mime_type: item?.mime_type || (isAudio ? "audio/webm" : isVideo ? "video/mp4" : "image/jpeg"),
          file_size: Number(item?.file_size || 0),
          created_at: row.created_at,
        };
        allMedia.push(mediaObj);
        if (isAudio) audio.push(mediaObj);
        else if (isVideo) videos.push(mediaObj);
        else images.push(mediaObj);
      }
    });
  }

  // Also include individual legacy columns (image_path, video_path) if not yet listed
  if (row.image_path && !allMedia.some((item) => item.file_url === row.image_path)) {
    const fileName = row.image_path.split("/").pop() || "image";
    const imageObj = {
      id: `legacy-${row.id}-image`,
      file_name: fileName,
      original_name: fileName,
      file_url: row.image_path,
      file_type: "image",
      mime_type: "image/jpeg",
      file_size: 0,
      created_at: row.created_at,
    };
    images.unshift(imageObj);
    allMedia.unshift(imageObj);
  }

  if (row.video_path && !allMedia.some((item) => item.file_url === row.video_path)) {
    const fileName = row.video_path.split("/").pop() || "video";
    const videoObj = {
      id: `legacy-${row.id}-video`,
      file_name: fileName,
      original_name: fileName,
      file_url: row.video_path,
      file_type: "video",
      mime_type: "video/mp4",
      file_size: 0,
      created_at: row.created_at,
    };
    videos.unshift(videoObj);
    allMedia.push(videoObj);
  }

  if (row.audio_path && !allMedia.some((item) => item.file_url === row.audio_path)) {
    const fileName = row.audio_path.split("/").pop() || "audio";
    const audioObj = {
      id: `legacy-${row.id}-audio`,
      file_name: fileName,
      original_name: fileName,
      file_url: row.audio_path,
      file_type: "audio",
      mime_type: "audio/webm",
      file_size: 0,
      created_at: row.created_at,
    };
    audio.unshift(audioObj);
    allMedia.unshift(audioObj);
  }

  const primaryImage = images[0]?.file_url || row.image_path || null;
  const primaryVideo = videos[0]?.file_url || row.video_path || null;
  const primaryAudio = allMedia.find((m) => m.file_type === "audio")?.file_url || row.audio_path || null;
  const primaryFile = allMedia.find((m) => m.file_type === "file")?.file_url || row.file_path || null;

  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    content: row.content,
    category: row.category || row.category_name || "General",
    category_id: row.category_id || null,
    category_name: row.category_name || row.category || "General",
    category_type: row.category_type || "Diary",
    mood: row.mood || "Normal",
    tags: parseJsonField(row.tags),
    location: row.location || null,
    entry_date: row.entry_date,
    entry_time: row.entry_time || null,
    status: row.status || "published",
    is_favorite: Boolean(row.is_favorite),
    favorite: Boolean(row.is_favorite),
    is_private: Boolean(row.is_private),
    is_locked: Boolean(row.is_locked),
    image_path: primaryImage,
    video_path: primaryVideo,
    audio_path: primaryAudio,
    file_path: primaryFile,
    attachment_count: allMedia.length,
    attachments: allMedia,
    media_files: allMedia,
    images,
    videos,
    audio,
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by: row.created_by,
    updated_by: row.updated_by,
  };
};

/**
 * GET /api/diary/categories
 */
const getCategoryList = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*
       FROM categories c
       WHERE (c.user_id = ? OR c.user_id IS NULL)
       ORDER BY c.catType ASC, c.name ASC`,
      [req.user.user_id]
    );

    const diaryOnly = rows.filter((row) => isDiaryCategoryRow(row));
    res.json(diaryOnly);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch diary categories", error: error.message });
  }
};

/**
 * POST /api/diary/categories
 */
const createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: "Category name is required." });
    }

    const trimmedName = String(name).trim();
    const [result] = await db.query(
      "INSERT INTO categories (user_id, name, catType, status, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)",
      [req.user.user_id, trimmedName, "Diary", "Active"]
    );

    const [rows] = await db.query("SELECT * FROM categories WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create diary category", error: error.message });
  }
};

/**
 * PUT /api/diary/categories/:id
 */
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: "Category name is required." });
    }

    const [rows] = await db.query(
      "SELECT * FROM categories WHERE id = ? AND (user_id = ? OR user_id IS NULL)",
      [id, req.user.user_id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Category not found." });
    }

    await db.query(
      "UPDATE categories SET name = ?, catType = 'Diary', status = 'Active' WHERE id = ? AND (user_id = ? OR user_id IS NULL)",
      [String(name).trim(), id, req.user.user_id]
    );

    const [updated] = await db.query("SELECT * FROM categories WHERE id = ?", [id]);
    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update diary category", error: error.message });
  }
};

/**
 * DELETE /api/diary/categories/:id
 */
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      "SELECT * FROM categories WHERE id = ? AND (user_id = ? OR user_id IS NULL)",
      [id, req.user.user_id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Category not found." });
    }

    await db.query("DELETE FROM categories WHERE id = ? AND (user_id = ? OR user_id IS NULL)", [id, req.user.user_id]);
    res.json({ success: true, message: "Category deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete diary category", error: error.message });
  }
};

/**
 * Query diary entries with search, filters, and pagination
 */
const queryDiaryEntries = async ({
  userId,
  isAdmin = false,
  filterUserId = null,
  search = "",
  category = "all",
  startDate = "",
  endDate = "",
  date = "",
  mood = "all",
  favorite = "",
  status = "all",
  page = 1,
  limit = "all",
}) => {
  let targetUserId = userId;
  if (isAdmin && filterUserId) {
    targetUserId = filterUserId;
  }

  let whereSql = "WHERE d.user_id = ?";
  const values = [targetUserId];

  if (search) {
    whereSql += " AND (d.title LIKE ? OR d.content LIKE ? OR d.location LIKE ? OR d.mood LIKE ? OR d.tags LIKE ? OR d.category LIKE ? OR dc.name LIKE ?)";
    const term = `%${search}%`;
    values.push(term, term, term, term, term, term, term);
  }

  if (category && category !== "all") {
    if (/^\d+$/.test(String(category))) {
      whereSql += " AND d.category_id = ?";
      values.push(Number(category));
    } else {
      whereSql += " AND (d.category = ? OR d.category_name = ? OR dc.name = ?)";
      values.push(category, category, category);
    }
  }

  if (date) {
    whereSql += " AND d.entry_date = ?";
    values.push(date);
  } else {
    if (startDate) {
      whereSql += " AND d.entry_date >= ?";
      values.push(startDate);
    }
    if (endDate) {
      whereSql += " AND d.entry_date <= ?";
      values.push(endDate);
    }
  }

  if (mood && mood !== "all") {
    whereSql += " AND d.mood = ?";
    values.push(mood);
  }

  if (favorite === "true" || favorite === "1" || favorite === true) {
    whereSql += " AND d.is_favorite = 1";
  }

  if (status === "draft") {
    whereSql += " AND d.status = 'draft'";
  } else if (status === "published") {
    whereSql += " AND d.status = 'published'";
  }

  // Count total matching
  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM diary_entries d
     LEFT JOIN categories dc ON dc.id = d.category_id
     ${whereSql}`,
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
    `SELECT ${diarySelectBase}
     FROM diary_entries d
     LEFT JOIN categories dc ON dc.id = d.category_id
     ${whereSql}
     ORDER BY d.entry_date DESC, d.entry_time DESC, d.created_at DESC
     ${paginationSql}`,
    values
  );

  const diaryIds = rows.map((r) => r.id);
  const mediaMap = await mediaService.getMediaMapForDiary(diaryIds);

  const data = rows.map((row) => formatDiaryResponse(row, mediaMap.get(row.id)));

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
 * GET /api/diary
 * List diary entries with search, filters, pagination, and media relations.
 */
const getDiaryEntries = async (req, res) => {
  try {
    const {
      search = "",
      category = "all",
      start_date = "",
      end_date = "",
      date = "",
      mood = "all",
      favorite = "",
      status = "all",
      user_id = "",
      page = 1,
      limit = "all",
    } = req.query;

    const isAdmin = req.user.role?.toLowerCase() === "admin";
    const result = await queryDiaryEntries({
      userId: req.user.user_id,
      isAdmin,
      filterUserId: user_id || null,
      search,
      category,
      startDate: start_date,
      endDate: end_date,
      date,
      mood,
      favorite,
      status,
      page,
      limit,
    });

    return res.json({
      success: true,
      message: "Diary entries fetched successfully",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Get diary entries error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch diary entries",
      error: error.message,
    });
  }
};

/**
 * GET /api/diary/user/:userId
 * Fetch diary entries for a specific user ID.
 */
const getDiaryEntriesByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.user_id;
    const isAdmin = req.user.role?.toLowerCase() === "admin";

    if (!isAdmin && currentUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view another user's diary entries.",
      });
    }

    const result = await queryDiaryEntries({
      userId: currentUserId,
      isAdmin,
      filterUserId: userId,
      search: req.query.search || "",
      category: req.query.category || "all",
      startDate: req.query.start_date || "",
      endDate: req.query.end_date || "",
      date: req.query.date || "",
      mood: req.query.mood || "all",
      favorite: req.query.favorite || "",
      status: req.query.status || "all",
      page: req.query.page || 1,
      limit: req.query.limit || "all",
    });

    return res.json({
      success: true,
      message: `Diary entries fetched successfully for user ${userId}`,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch diary entries by user ID",
      error: error.message,
    });
  }
};

/**
 * GET /api/diary/:id
 * Fetch single diary entry by ID.
 */
const getDiaryEntryById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const isAdmin = req.user.role?.toLowerCase() === "admin";

    const query = isAdmin
      ? `SELECT ${diarySelectBase} FROM diary_entries d LEFT JOIN categories dc ON dc.id = d.category_id WHERE d.id = ?`
      : `SELECT ${diarySelectBase} FROM diary_entries d LEFT JOIN categories dc ON dc.id = d.category_id WHERE d.id = ? AND d.user_id = ?`;
    const params = isAdmin ? [id] : [id, userId];

    const [rows] = await db.query(query, params);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Diary entry not found." });
    }

    const mediaMap = await mediaService.getMediaMapForDiary([rows[0].id]);
    const entry = formatDiaryResponse(rows[0], mediaMap.get(rows[0].id));

    return res.json({
      success: true,
      message: "Diary entry fetched successfully",
      data: entry,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch diary entry",
      error: error.message,
    });
  }
};

/**
 * POST /api/diary
 * Create a new diary entry with optional images and videos.
 */
const createDiaryEntry = async (req, res) => {
  const uploadedFiles = extractUploadedFiles(req);

  try {
    const {
      title,
      content,
      category,
      category_id,
      category_name,
      mood,
      tags,
      location,
      entry_date,
      entry_time,
      status,
      is_favorite,
      is_private,
      is_locked,
    } = req.body;

    if (!title || !String(title).trim()) {
      mediaService.cleanupFiles(uploadedFiles);
      return res.status(400).json({ success: false, message: "Diary title is required." });
    }

    if (!content || !String(content).trim()) {
      mediaService.cleanupFiles(uploadedFiles);
      return res.status(400).json({ success: false, message: "Diary content is required." });
    }

    if (!entry_date) {
      mediaService.cleanupFiles(uploadedFiles);
      return res.status(400).json({ success: false, message: "Entry date is required." });
    }

    const tagsValue = Array.isArray(tags) ? JSON.stringify(tags) : JSON.stringify(parseJsonField(tags));
    const finalCategory = category || category_name || "General";

    const [result] = await db.query(
      `INSERT INTO diary_entries (
        user_id, title, content, category, category_id, category_name, mood, tags, location, entry_date, entry_time,
        status, is_favorite, is_private, is_locked, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.user_id,
        String(title).trim(),
        String(content),
        finalCategory,
        category_id || null,
        finalCategory,
        mood || "Normal",
        tagsValue,
        location || null,
        entry_date,
        entry_time || null,
        status === "draft" ? "draft" : "published",
        is_favorite ? 1 : 0,
        is_private ? 1 : 0,
        is_locked ? 1 : 0,
        req.user.user_id,
        req.user.user_id,
      ]
    );

    const newDiaryId = result.insertId;

    // Save uploaded media files in MySQL media_files linked to newDiaryId
    let savedMedia = [];
    if (uploadedFiles.length > 0) {
      savedMedia = await mediaService.saveUploadedFiles({
        files: uploadedFiles,
        userId: req.user.user_id,
        diaryId: newDiaryId,
      });

      const primaryImage = savedMedia.find((f) => f.file_type === "image")?.file_url || null;
      const primaryVideo = savedMedia.find((f) => f.file_type === "video")?.file_url || null;
      const primaryAudio = savedMedia.find((f) => f.file_type === "audio")?.file_url || null;

      await db.query(
        "UPDATE diary_entries SET image_path = ?, video_path = ?, audio_path = ?, media_files = ? WHERE id = ?",
        [primaryImage, primaryVideo, primaryAudio, JSON.stringify(savedMedia), newDiaryId]
      );
    }

    const [rows] = await db.query(
      `SELECT ${diarySelectBase} FROM diary_entries d LEFT JOIN categories dc ON dc.id = d.category_id WHERE d.id = ?`,
      [newDiaryId]
    );
    const mediaMap = await mediaService.getMediaMapForDiary([newDiaryId]);
    const entry = formatDiaryResponse(rows[0], mediaMap.get(newDiaryId));

    return res.status(201).json({
      success: true,
      message: "Diary entry created successfully",
      data: entry,
    });
  } catch (error) {
    try {
      await mediaService.rollbackUploadedFiles(uploadedFiles);
    } catch (cleanupError) {
      console.error("Create diary media rollback failed:", cleanupError.message);
    }
    console.error("Create diary error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create diary entry",
      error: error.message,
    });
  }
};

/**
 * PUT /api/diary/:id
 * Update an existing diary entry, remove specified media, and append newly uploaded media.
 */
const updateDiaryEntry = async (req, res) => {
  const uploadedFiles = extractUploadedFiles(req);
  const { id } = req.params;
  const userId = req.user.user_id;
  const isAdmin = req.user.role?.toLowerCase() === "admin";

  try {
    const [existing] = await db.query(
      isAdmin ? "SELECT * FROM diary_entries WHERE id = ?" : "SELECT * FROM diary_entries WHERE id = ? AND user_id = ?",
      isAdmin ? [id] : [id, userId]
    );

    if (!existing.length) {
      mediaService.cleanupFiles(uploadedFiles);
      return res.status(404).json({ success: false, message: "Diary entry not found or access denied." });
    }

    const current = existing[0];
    const {
      title,
      content,
      category,
      category_id,
      category_name,
      mood,
      tags,
      location,
      entry_date,
      entry_time,
      status,
      is_favorite,
      is_private,
      is_locked,
    } = req.body;

    // Remove any requested media
    const removedMediaIds = [
      ...parseIdList(req.body.removed_media_ids),
      ...parseIdList(req.body.removed_image_ids),
      ...parseIdList(req.body.removed_video_ids),
      ...parseIdList(req.body.removed_audio_ids),
      ...parseIdList(req.body.removed_zip_ids),
    ];

    const removedMedia = removedMediaIds.length > 0
      ? await mediaService.deleteMediaByIds(removedMediaIds, userId, isAdmin)
      : [];

    // Save newly uploaded media files
    if (uploadedFiles.length > 0) {
      await mediaService.saveUploadedFiles({
        files: uploadedFiles,
        userId: current.user_id,
        diaryId: current.id,
      });
    }

    const tagsValue = tags !== undefined
      ? (Array.isArray(tags) ? JSON.stringify(tags) : JSON.stringify(parseJsonField(tags)))
      : current.tags;

    const finalCategory = category || category_name || current.category || current.category_name || "General";

    // Re-fetch media to update legacy columns
    const mediaMap = await mediaService.getMediaMapForDiary([current.id]);
    const diaryMedia = mediaMap.get(current.id) || { images: [], videos: [], audio: [], media_files: [] };
    const removedTypes = new Set(removedMedia.map((media) => media.file_type));
    const primaryImage = diaryMedia.images[0]?.file_url || (!removedTypes.has("image") ? current.image_path : null);
    const primaryVideo = diaryMedia.videos[0]?.file_url || (!removedTypes.has("video") ? current.video_path : null);
    const primaryAudio = diaryMedia.audio[0]?.file_url || (!removedTypes.has("audio") ? current.audio_path : null);
    const primaryFile = diaryMedia.media_files.find((item) => item.file_type === "file")?.file_url
      || (!removedTypes.has("file") ? current.file_path : null);

    await db.query(
      `UPDATE diary_entries SET
        title = ?, content = ?, category = ?, category_id = ?, category_name = ?, mood = ?, tags = ?, location = ?,
        entry_date = ?, entry_time = ?, status = ?, is_favorite = ?, is_private = ?, is_locked = ?,
        image_path = ?, video_path = ?, audio_path = ?, file_path = ?, media_files = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        title !== undefined ? String(title).trim() : current.title,
        content !== undefined ? String(content) : current.content,
        finalCategory,
        category_id !== undefined ? category_id : current.category_id,
        finalCategory,
        mood !== undefined ? mood : current.mood,
        tagsValue,
        location !== undefined ? location : current.location,
        entry_date !== undefined ? entry_date : current.entry_date,
        entry_time !== undefined ? entry_time : current.entry_time,
        status !== undefined ? status : current.status,
        is_favorite !== undefined ? (is_favorite ? 1 : 0) : current.is_favorite,
        is_private !== undefined ? (is_private ? 1 : 0) : current.is_private,
        is_locked !== undefined ? (is_locked ? 1 : 0) : current.is_locked,
        primaryImage,
        primaryVideo,
        primaryAudio,
        primaryFile,
        JSON.stringify(diaryMedia.media_files),
        req.user.user_id,
        current.id,
      ]
    );

    const [updatedRows] = await db.query(
      `SELECT ${diarySelectBase} FROM diary_entries d LEFT JOIN categories dc ON dc.id = d.category_id WHERE d.id = ?`,
      [current.id]
    );
    const updatedMediaMap = await mediaService.getMediaMapForDiary([current.id]);
    const updatedEntry = formatDiaryResponse(updatedRows[0], updatedMediaMap.get(current.id));

    return res.json({
      success: true,
      message: "Diary entry updated successfully",
      data: updatedEntry,
    });
  } catch (error) {
    try {
      await mediaService.rollbackUploadedFiles(uploadedFiles);
    } catch (cleanupError) {
      console.error("Update diary media rollback failed:", cleanupError.message);
    }
    console.error("Update diary error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update diary entry",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/diary/:id
 * Delete diary entry and all related media files.
 */
const deleteDiaryEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const isAdmin = req.user.role?.toLowerCase() === "admin";

    const [rows] = await db.query(
      isAdmin ? "SELECT * FROM diary_entries WHERE id = ?" : "SELECT * FROM diary_entries WHERE id = ? AND user_id = ?",
      isAdmin ? [id] : [id, userId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Diary entry not found or access denied." });
    }

    // Safely delete all associated physical media files and media_files rows
    await mediaService.deleteMediaForDiary(id, userId, isAdmin);

    // Also clean up any legacy files on disk
    ["image_path", "video_path", "audio_path", "file_path"].forEach((key) => {
      if (rows[0][key]) mediaService.safeUnlink(rows[0][key]);
    });

    await db.query("DELETE FROM diary_entries WHERE id = ?", [id]);

    return res.json({
      success: true,
      message: "Diary entry and associated media deleted successfully.",
      data: { id: Number(id) },
    });
  } catch (error) {
    console.error("Delete diary error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete diary entry",
      error: error.message,
    });
  }
};

/**
 * PATCH /api/diary/:id/favorite
 */
const toggleFavorite = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      "SELECT is_favorite FROM diary_entries WHERE id = ? AND (user_id = ? OR ? = 'admin')",
      [id, req.user.user_id, req.user.role?.toLowerCase()]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Diary entry not found." });
    }

    const nextValue = rows[0].is_favorite ? 0 : 1;
    await db.query(
      "UPDATE diary_entries SET is_favorite = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
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
 * POST /api/diary/:id/attachments
 * Upload one or more attachment files to a diary entry.
 */
const addAttachment = async (req, res) => {
  const uploadedFiles = extractUploadedFiles(req);
  const { id } = req.params;

  if (!uploadedFiles.length) {
    return res.status(400).json({ success: false, message: "No attachment file uploaded." });
  }

  try {
    const [rows] = await db.query(
      "SELECT * FROM diary_entries WHERE id = ? AND (user_id = ? OR ? = 'admin')",
      [id, req.user.user_id, req.user.role?.toLowerCase()]
    );

    if (!rows.length) {
      mediaService.cleanupFiles(uploadedFiles);
      return res.status(404).json({ success: false, message: "Diary entry not found." });
    }

    const savedMedia = await mediaService.saveUploadedFiles({
      files: uploadedFiles,
      userId: rows[0].user_id,
      diaryId: Number(id),
    });

    const mediaMap = await mediaService.getMediaMapForDiary([Number(id)]);
    const diaryMedia = mediaMap.get(Number(id)) || { images: [], videos: [], audio: [], media_files: [] };
    const first = savedMedia[0];
    await db.query(
      `UPDATE diary_entries
       SET image_path = ?, video_path = ?, audio_path = ?, file_path = ?, media_files = ?,
           updated_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
         diaryMedia.images[0]?.file_url || rows[0].image_path,
         diaryMedia.videos[0]?.file_url || rows[0].video_path,
         diaryMedia.audio[0]?.file_url || rows[0].audio_path,
         diaryMedia.media_files.find((item) => item.file_type === "file")?.file_url || rows[0].file_path,
        JSON.stringify(diaryMedia.media_files),
        req.user.user_id,
        id,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Attachment uploaded successfully.",
      data: savedMedia,
      fileUrl: first.file_url,
      fileName: first.original_name,
      fileType: first.mime_type,
    });
  } catch (error) {
    try {
      await mediaService.rollbackUploadedFiles(uploadedFiles);
    } catch (cleanupError) {
      console.error("Diary attachment rollback failed:", cleanupError.message);
    }
    console.error("Add attachment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload attachment",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/diary/attachments/:id
 */
const deleteAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const isAdmin = req.user.role?.toLowerCase() === "admin";

    const result = await mediaService.deleteMediaById(id, userId, isAdmin);
    if (!result.found) {
      return res.status(404).json({ success: false, message: "Attachment not found or access denied." });
    }

    return res.json({
      success: true,
      message: "Attachment deleted successfully.",
      data: { id: Number(id) },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete attachment",
      error: error.message,
    });
  }
};

module.exports = {
  getCategoryList,
  createCategory,
  updateCategory,
  deleteCategory,
  getDiaryEntries,
  getDiaryEntriesByUserId,
  getDiaryEntryById,
  createDiaryEntry,
  updateDiaryEntry,
  deleteDiaryEntry,
  toggleFavorite,
  addAttachment,
  deleteAttachment,
};
