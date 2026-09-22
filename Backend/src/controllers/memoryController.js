const db = require("../config/db");
const fs = require("fs");
const path = require("path");

const normalizeMediaGallery = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
};

const normalizeMemory = (row) => ({
  ...row,
  tags: row.tags ? (Array.isArray(row.tags) ? row.tags : String(row.tags).split(",").map((tag) => tag.trim()).filter(Boolean)) : [],
  media_url: row.media_url || "",
  media_gallery: normalizeMediaGallery(row.media_gallery || row.gallery || []),
  media_type: row.media_type || "image",
  is_favorite: Boolean(row.is_favorite),
  favorite: Boolean(row.is_favorite),
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const parseTags = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return value.split(",").map((tag) => tag.trim()).filter(Boolean);
    }
  }
  return [];
};

const syncMemoryCategoryFromShared = async (userId, categoryId, fallbackName = null) => {
  const resolvedId = categoryId ? Number(categoryId) : null;

  if (resolvedId) {
    const [memoryRows] = await db.query("SELECT * FROM memory_categories WHERE id = ? AND user_id = ?", [resolvedId, userId]);
    if (memoryRows.length) return resolvedId;

    const [sharedRows] = await db.query(
      "SELECT * FROM categories WHERE id = ? AND (user_id = ? OR user_id IS NULL)",
      [resolvedId, userId]
    );

    if (sharedRows.length) {
      const shared = sharedRows[0];
      await db.query(
        `INSERT INTO memory_categories (id, user_id, name, description, color, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), color = VALUES(color), updated_by = VALUES(updated_by)`,
        [
          shared.id,
          shared.user_id || userId,
          shared.name,
          shared.description || "",
          shared.color || "#8B5CF6",
          userId,
          userId,
        ]
      );
      return shared.id;
    }
  }

  const candidateName = fallbackName ? String(fallbackName).trim() : null;
  if (candidateName) {
    const [existingRows] = await db.query("SELECT * FROM memory_categories WHERE user_id = ? AND name = ?", [userId, candidateName]);
    if (existingRows.length) return existingRows[0].id;

    const [sharedRows] = await db.query(
      "SELECT * FROM categories WHERE (user_id = ? OR user_id IS NULL) AND name = ? ORDER BY id DESC LIMIT 1",
      [userId, candidateName]
    );

    if (sharedRows.length) {
      return syncMemoryCategoryFromShared(userId, sharedRows[0].id, candidateName);
    }

    const [result] = await db.query(
      `INSERT INTO memory_categories (user_id, name, description, color, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, candidateName, "", "#8B5CF6", userId, userId]
    );
    return result.insertId;
  }

  return null;
};

const getMemoryCategories = async (req, res) => {
  try {
    const [sharedRows] = await db.query(
      `SELECT * FROM categories
       WHERE (user_id = ? OR user_id IS NULL)
         AND (LOWER(catType) LIKE '%memory%' OR LOWER(name) LIKE '%memory%')
       ORDER BY name ASC`,
      [req.user.user_id]
    );

    for (const category of sharedRows) {
      await syncMemoryCategoryFromShared(req.user.user_id, category.id, category.name);
    }

    const [rows] = await db.query(
      `SELECT * FROM memory_categories WHERE user_id = ? OR user_id IS NULL ORDER BY name ASC`,
      [req.user.user_id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch memory categories", error: error.message });
  }
};

const createMemoryCategory = async (req, res) => {
  try {
    const { name, description, color } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Category name is required." });
    }

    const [result] = await db.query(
      `INSERT INTO memory_categories (user_id, name, description, color, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.user_id, String(name).trim(), description || "", color || "#8B5CF6", req.user.user_id, req.user.user_id]
    );

    const [rows] = await db.query("SELECT * FROM memory_categories WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Failed to create memory category", error: error.message });
  }
};

const updateMemoryCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, color } = req.body;

    const [rows] = await db.query("SELECT * FROM memory_categories WHERE id = ? AND user_id = ?", [id, req.user.user_id]);
    if (!rows.length) {
      return res.status(404).json({ message: "Memory category not found." });
    }

    await db.query(
      `UPDATE memory_categories
       SET name = ?, description = ?, color = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [String(name || rows[0].name).trim(), description ?? rows[0].description, color ?? rows[0].color, req.user.user_id, id, req.user.user_id]
    );

    const [updated] = await db.query("SELECT * FROM memory_categories WHERE id = ?", [id]);
    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ message: "Failed to update memory category", error: error.message });
  }
};

const deleteMemoryCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM memory_categories WHERE id = ? AND user_id = ?", [id, req.user.user_id]);
    res.json({ message: "Memory category deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete memory category", error: error.message });
  }
};

const getMemories = async (req, res) => {
  try {
    const { search = "", category = "all", favorite = "", status = "all" } = req.query;
    let query = `
      SELECT m.*, c.name AS category_name, c.color AS category_color
      FROM memories m
      LEFT JOIN memory_categories c ON c.id = m.category_id
      WHERE m.user_id = ?
    `;
    const values = [req.user.user_id];

    if (search) {
      query += " AND (m.title LIKE ? OR m.description LIKE ? OR m.tags LIKE ? OR m.location LIKE ?)";
      const term = `%${search}%`;
      values.push(term, term, term, term);
    }

    if (category && category !== "all") {
      query += " AND m.category_id = ?";
      values.push(category);
    }

    if (favorite === "true") {
      query += " AND m.is_favorite = 1";
    }

    if (status && status !== "all") {
      query += " AND m.status = ?";
      values.push(status);
    }

    query += " ORDER BY m.memory_date DESC, m.created_at DESC";

    const [rows] = await db.query(query, values);
    res.json(rows.map(normalizeMemory));
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch memories", error: error.message });
  }
};

const getMemoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `SELECT m.*, c.name AS category_name
       FROM memories m
       LEFT JOIN memory_categories c ON c.id = m.category_id
       WHERE m.id = ? AND m.user_id = ?`,
      [id, req.user.user_id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Memory not found." });
    }

    const memory = normalizeMemory(rows[0]);
    memory.tags = parseTags(memory.tags);
    res.json(memory);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch memory", error: error.message });
  }
};

const createMemory = async (req, res) => {
  try {
    const { title, description, category_id, memory_date, location, tags, mood, status, is_favorite, voice_note } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: "Memory title is required." });
    }

    const resolvedCategoryId = await syncMemoryCategoryFromShared(req.user.user_id, category_id, req.body.category_name || req.body.category || null);
    const uploadedFiles = Array.isArray(req.files) ? req.files : [];
    const gallery = uploadedFiles.map((file) => `/uploads/memories/${path.basename(path.dirname(file.path))}/${path.basename(file.path)}`);
    const primaryFile = uploadedFiles[0];
    const mediaType = primaryFile ? (
      primaryFile.mimetype.startsWith("image/") ? "image" :
      primaryFile.mimetype.startsWith("video/") ? "video" :
      primaryFile.mimetype.startsWith("audio/") ? "audio" : "file"
    ) : "image";

    const mediaUrl = primaryFile ? gallery[0] : (req.body.media_url || "");
    const tagValue = Array.isArray(tags) ? JSON.stringify(tags) : JSON.stringify(parseTags(tags));

    const [result] = await db.query(
      `INSERT INTO memories (
        user_id, title, description, category_id, memory_date, location, mood,
        tags, status, is_favorite, media_url, media_gallery, media_type, voice_note, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        req.user.user_id,
        String(title).trim(),
        description || "",
        resolvedCategoryId || null,
        memory_date || new Date().toISOString().slice(0, 10),
        location || "",
        mood || "Happy",
        tagValue,
        status || "published",
        is_favorite ? 1 : 0,
        mediaUrl,
        JSON.stringify(gallery),
        mediaType,
        voice_note || "",
        req.user.user_id,
        req.user.user_id,
      ]
    );

    const [rows] = await db.query("SELECT * FROM memories WHERE id = ?", [result.insertId]);
    res.status(201).json(normalizeMemory(rows[0]));
  } catch (error) {
    res.status(500).json({ message: "Failed to create memory", error: error.message });
  }
};

const updateMemory = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.query("SELECT * FROM memories WHERE id = ? AND user_id = ?", [id, req.user.user_id]);
    if (!existing[0].length) {
      return res.status(404).json({ message: "Memory not found." });
    }

    const { title, description, category_id, memory_date, location, tags, mood, status, is_favorite, voice_note } = req.body;
    const resolvedCategoryId = await syncMemoryCategoryFromShared(req.user.user_id, category_id ?? existing[0][0].category_id, req.body.category_name || req.body.category || null);
    const uploadedFiles = Array.isArray(req.files) ? req.files : [];
    const gallery = uploadedFiles.length
      ? uploadedFiles.map((file) => `/uploads/memories/${path.basename(path.dirname(file.path))}/${path.basename(file.path)}`)
      : normalizeMediaGallery(existing[0][0].media_gallery || existing[0][0].gallery || []);

    const primaryFile = uploadedFiles[0] || null;
    const mediaType = primaryFile ? (
      primaryFile.mimetype.startsWith("image/") ? "image" :
      primaryFile.mimetype.startsWith("video/") ? "video" :
      primaryFile.mimetype.startsWith("audio/") ? "audio" : "file"
    ) : existing[0][0].media_type || "image";

    const mediaUrl = primaryFile
      ? gallery[0]
      : (req.body.media_url || existing[0][0].media_url || "");

    const tagValue = Array.isArray(tags) ? JSON.stringify(tags) : JSON.stringify(parseTags(tags ?? existing[0][0].tags));

    await db.query(
      `UPDATE memories
       SET title = ?, description = ?, category_id = ?, memory_date = ?, location = ?, mood = ?, tags = ?,
           status = ?, is_favorite = ?, media_url = ?, media_gallery = ?, media_type = ?, voice_note = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [
        title || existing[0][0].title,
        description ?? existing[0][0].description,
        resolvedCategoryId ?? existing[0][0].category_id,
        memory_date || existing[0][0].memory_date,
        location ?? existing[0][0].location,
        mood || existing[0][0].mood,
        tagValue,
        status || existing[0][0].status,
        is_favorite ? 1 : (existing[0][0].is_favorite ? 1 : 0),
        mediaUrl,
        JSON.stringify(gallery),
        mediaType,
        voice_note ?? existing[0][0].voice_note,
        req.user.user_id,
        id,
        req.user.user_id,
      ]
    );

    const [rows] = await db.query("SELECT * FROM memories WHERE id = ?", [id]);
    res.json(normalizeMemory(rows[0]));
  } catch (error) {
    res.status(500).json({ message: "Failed to update memory", error: error.message });
  }
};

const toggleFavorite = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query("SELECT is_favorite FROM memories WHERE id = ? AND user_id = ?", [id, req.user.user_id]);
    if (!rows.length) {
      return res.status(404).json({ message: "Memory not found." });
    }

    const nextValue = rows[0].is_favorite ? 0 : 1;
    await db.query("UPDATE memories SET is_favorite = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?", [nextValue, req.user.user_id, id, req.user.user_id]);
    res.json({ is_favorite: !!nextValue });
  } catch (error) {
    res.status(500).json({ message: "Failed to update favorite status", error: error.message });
  }
};

const deleteMemory = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query("SELECT media_url FROM memories WHERE id = ? AND user_id = ?", [id, req.user.user_id]);

    if (rows.length && rows[0].media_url) {
      const relative = rows[0].media_url.replace(/^\//, "");
      const diskPath = path.join(__dirname, "..", "..", relative);
      if (fs.existsSync(diskPath)) {
        fs.unlinkSync(diskPath);
      }
    }

    await db.query("DELETE FROM memories WHERE id = ? AND user_id = ?", [id, req.user.user_id]);
    res.json({ message: "Memory deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete memory", error: error.message });
  }
};

module.exports = {
  getMemoryCategories,
  createMemoryCategory,
  updateMemoryCategory,
  deleteMemoryCategory,
  getMemories,
  getMemoryById,
  createMemory,
  updateMemory,
  toggleFavorite,
  deleteMemory,
};
