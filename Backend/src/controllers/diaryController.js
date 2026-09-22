const db = require("../config/db");
const fs = require("fs");
const path = require("path");

const normalizeDiaryEntry = (row = {}) => {
  const attachments = Array.isArray(row.media_files)
    ? row.media_files
    : parseJsonField(row.media_files) || [];

  const derivedAttachments = [
    ...(row.image_path ? [{ id: `image-${row.id || Date.now()}`, file_name: path.basename(row.image_path), file_url: row.image_path, file_type: "image" }] : []),
    ...(row.video_path ? [{ id: `video-${row.id || Date.now()}`, file_name: path.basename(row.video_path), file_url: row.video_path, file_type: "video" }] : []),
    ...(row.file_path ? [{ id: `file-${row.id || Date.now()}`, file_name: path.basename(row.file_path), file_url: row.file_path, file_type: "file" }] : []),
    ...attachments,
  ];

  return {
    ...row,
    tags: parseJsonField(row.tags),
    attachment_count: Number(row.attachment_count || derivedAttachments.length || 0),
    attachments: derivedAttachments,
    media_files: derivedAttachments,
    favorite: Boolean(row.is_favorite),
    is_favorite: Boolean(row.is_favorite),
    is_private: Boolean(row.is_private),
    is_locked: Boolean(row.is_locked),
    status: row.status || "published",
    created_at: row.created_at,
    updated_at: row.updated_at,
    category_name: row.category_name || row.category || row.name || null,
  };
};

const ensureDiaryFolders = () => {
  const base = path.join(__dirname, "..", "..", "uploads", "diary");
  const images = path.join(base, "images");
  const videos = path.join(base, "videos");
  const files = path.join(base, "files");

  [base, images, videos, files].forEach((dir) => fs.mkdirSync(dir, { recursive: true }));
};

const parseJsonField = (value) => {
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

const diarySelectBase = `
  d.id, d.user_id, d.title, d.content, d.category_id,
  COALESCE(d.category_name, dc.name) AS category_name,
  dc.catType AS category_type,
  d.mood, d.tags, d.location, d.entry_date, d.entry_time, d.status,
  d.is_favorite, d.is_private, d.is_locked, d.image_path, d.video_path, d.file_path, d.media_files,
  d.created_at, d.updated_at, d.created_by, d.updated_by
`;

const isDiaryCategoryRow = (category) => {
  const typeValue = String(category?.catType || category?.type || category?.category_type || "").trim().toLowerCase();
  const nameValue = String(category?.name || "").trim().toLowerCase();

  return (
    ["diary", "journal", "daily", "journal entry", "diary entry"].includes(typeValue) ||
    ["diary", "journal", "daily"].some((keyword) => typeValue.includes(keyword)) ||
    ["diary", "journal", "daily"].some((keyword) => nameValue.includes(keyword))
  );
};

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
    res.status(500).json({ message: "Failed to fetch diary categories", error: error.message });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Category name is required." });
    }

    const trimmedName = String(name).trim();
    const [result] = await db.query(
      "INSERT INTO categories (user_id, name, catType, status, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)",
      [req.user.user_id, trimmedName, "Diary", "Active"]
    );

    const [rows] = await db.query("SELECT * FROM categories WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Failed to create diary category", error: error.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Category name is required." });
    }

    const [rows] = await db.query("SELECT * FROM categories WHERE id = ? AND (user_id = ? OR user_id IS NULL)", [id, req.user.user_id]);
    if (!rows.length) {
      return res.status(404).json({ message: "Category not found." });
    }

    await db.query(
      "UPDATE categories SET name = ?, catType = 'Diary', status = 'Active' WHERE id = ? AND (user_id = ? OR user_id IS NULL)",
      [String(name).trim(), id, req.user.user_id]
    );

    const [updated] = await db.query("SELECT * FROM categories WHERE id = ?", [id]);
    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ message: "Failed to update diary category", error: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query("SELECT * FROM categories WHERE id = ? AND (user_id = ? OR user_id IS NULL)", [id, req.user.user_id]);
    if (!rows.length) {
      return res.status(404).json({ message: "Category not found." });
    }

    await db.query("DELETE FROM categories WHERE id = ? AND (user_id = ? OR user_id IS NULL)", [id, req.user.user_id]);
    res.json({ message: "Category deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete diary category", error: error.message });
  }
};

const getDiaryEntries = async (req, res) => {
  try {
    const { search = "", category = "", mood = "", favorite = "", status = "" } = req.query;
    let query = `
      SELECT ${diarySelectBase}
      FROM diary_entries d
      LEFT JOIN categories dc ON dc.id = d.category_id
      WHERE d.user_id = ?
    `;
    const values = [req.user.user_id];

    if (search) {
      query += " AND (d.title LIKE ? OR d.content LIKE ? OR d.location LIKE ? OR d.mood LIKE ? OR d.tags LIKE ? OR dc.name LIKE ?)";
      const term = `%${search}%`;
      values.push(term, term, term, term, term, term);
    }

    if (category && category !== "all") {
      query += " AND d.category_id = ?";
      values.push(category);
    }

    if (mood && mood !== "all") {
      query += " AND d.mood = ?";
      values.push(mood);
    }

    if (favorite === "true") {
      query += " AND d.is_favorite = 1";
    }

    if (status === "draft") {
      query += " AND d.status = 'draft'";
    } else if (status === "published") {
      query += " AND d.status = 'published'";
    }

    query += " ORDER BY d.entry_date DESC, d.entry_time DESC, d.created_at DESC";

    const [rows] = await db.query(query, values);
    const entries = rows.map(normalizeDiaryEntry);
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch diary entries", error: error.message });
  }
};

const getDiaryEntryById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `SELECT ${diarySelectBase}
       FROM diary_entries d
       LEFT JOIN categories dc ON dc.id = d.category_id
       WHERE d.id = ? AND d.user_id = ?`,
      [id, req.user.user_id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Diary entry not found." });
    }

    const entry = normalizeDiaryEntry(rows[0]);
    res.json({ ...entry, tags: parseJsonField(entry.tags) });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch diary entry", error: error.message });
  }
};

const createDiaryEntry = async (req, res) => {
  try {
    const {
      title,
      content,
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
      image_path,
      video_path,
      file_path,
      media_files,
    } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: "Diary title is required." });
    }

    if (!content || !String(content).trim()) {
      return res.status(400).json({ message: "Diary content is required." });
    }

    if (!entry_date) {
      return res.status(400).json({ message: "Entry date is required." });
    }

    const tagsValue = Array.isArray(tags) ? JSON.stringify(tags) : JSON.stringify(parseJsonField(tags));
    const attachmentsValue = Array.isArray(media_files)
      ? JSON.stringify(media_files)
      : JSON.stringify(parseJsonField(media_files));

    const [result] = await db.query(
      `INSERT INTO diary_entries (
        user_id, title, content, category_id, category_name, mood, tags, location, entry_date, entry_time,
        status, is_favorite, is_private, is_locked, image_path, video_path, file_path, media_files,
        created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        req.user.user_id,
        String(title).trim(),
        String(content),
        category_id || null,
        category_name || null,
        mood || "Normal",
        tagsValue,
        location || null,
        entry_date,
        entry_time || null,
        status === "draft" ? "draft" : "published",
        is_favorite ? 1 : 0,
        is_private ? 1 : 0,
        is_locked ? 1 : 0,
        image_path || null,
        video_path || null,
        file_path || null,
        attachmentsValue,
        req.user.user_id,
        req.user.user_id,
      ]
    );

    const [rows] = await db.query(`SELECT ${diarySelectBase} FROM diary_entries d LEFT JOIN categories dc ON dc.id = d.category_id WHERE d.id = ?`, [result.insertId]);
    res.status(201).json(normalizeDiaryEntry(rows[0]));
  } catch (error) {
    res.status(500).json({ message: "Failed to create diary entry", error: error.message });
  }
};

const updateDiaryEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.query("SELECT * FROM diary_entries WHERE id = ? AND user_id = ?", [id, req.user.user_id]);
    if (!existing[0].length) {
      return res.status(404).json({ message: "Diary entry not found." });
    }

    const {
      title,
      content,
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
      image_path,
      video_path,
      file_path,
      media_files,
    } = req.body;

    const nextMediaFiles = Array.isArray(media_files) ? media_files : parseJsonField(media_files);

    await db.query(
      `UPDATE diary_entries SET
        title = ?, content = ?, category_id = ?, category_name = ?, mood = ?, tags = ?, location = ?,
        entry_date = ?, entry_time = ?, status = ?, is_favorite = ?, is_private = ?, is_locked = ?,
        image_path = ?, video_path = ?, file_path = ?, media_files = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [
        title || existing[0][0].title,
        content || existing[0][0].content,
        category_id ?? existing[0][0].category_id,
        category_name ?? existing[0][0].category_name,
        mood || existing[0][0].mood,
        JSON.stringify(Array.isArray(tags) ? tags : parseJsonField(tags)),
        location ?? existing[0][0].location,
        entry_date || existing[0][0].entry_date,
        entry_time ?? existing[0][0].entry_time,
        status || existing[0][0].status,
        is_favorite ? 1 : 0,
        is_private ? 1 : 0,
        is_locked ? 1 : 0,
        image_path ?? existing[0][0].image_path,
        video_path ?? existing[0][0].video_path,
        file_path ?? existing[0][0].file_path,
        JSON.stringify(nextMediaFiles),
        req.user.user_id,
        id,
        req.user.user_id,
      ]
    );

    const [rows] = await db.query(`SELECT ${diarySelectBase} FROM diary_entries d LEFT JOIN categories dc ON dc.id = d.category_id WHERE d.id = ?`, [id]);
    res.json(normalizeDiaryEntry(rows[0]));
  } catch (error) {
    res.status(500).json({ message: "Failed to update diary entry", error: error.message });
  }
};

const deleteDiaryEntry = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM diary_entries WHERE id = ? AND user_id = ?", [id, req.user.user_id]);
    res.json({ message: "Diary entry deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete diary entry", error: error.message });
  }
};

const toggleFavorite = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query("SELECT is_favorite FROM diary_entries WHERE id = ? AND user_id = ?", [id, req.user.user_id]);
    if (!rows.length) {
      return res.status(404).json({ message: "Diary entry not found." });
    }

    const nextValue = rows[0].is_favorite ? 0 : 1;
    await db.query("UPDATE diary_entries SET is_favorite = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?", [nextValue, req.user.user_id, id, req.user.user_id]);
    res.json({ is_favorite: !!nextValue });
  } catch (error) {
    res.status(500).json({ message: "Failed to update favorite status", error: error.message });
  }
};

const addAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const [rows] = await db.query("SELECT * FROM diary_entries WHERE id = ? AND user_id = ?", [id, req.user.user_id]);
    if (!rows.length) {
      return res.status(404).json({ message: "Diary entry not found." });
    }

    const fileUrl = `/uploads/diary/${path.basename(path.dirname(file.path))}/${path.basename(file.path)}`;
    const fileType = file.mimetype || "application/octet-stream";
    const nextMediaFiles = parseJsonField(rows[0].media_files);
    nextMediaFiles.push({
      id: Date.now(),
      file_name: file.originalname,
      file_url: fileUrl,
      file_type: fileType,
      file_size: file.size,
    });

    const fieldName = fileType.startsWith("image/") ? "image_path" : fileType.startsWith("video/") ? "video_path" : "file_path";
    await db.query(
      `UPDATE diary_entries SET ${fieldName} = ?, media_files = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`,
      [fileUrl, JSON.stringify(nextMediaFiles), req.user.user_id, id, req.user.user_id]
    );

    res.status(201).json({ message: "Attachment uploaded successfully.", fileUrl, fileName: file.originalname, fileType });
  } catch (error) {
    res.status(500).json({ message: "Failed to upload attachment", error: error.message });
  }
};

const deleteAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query("SELECT * FROM diary_entries WHERE id = ? AND user_id = ?", [id, req.user.user_id]);
    if (!rows.length) {
      return res.status(404).json({ message: "Diary entry not found." });
    }

    const mediaFiles = parseJsonField(rows[0].media_files);
    const remaining = mediaFiles.filter((file) => String(file.id) !== String(req.body?.attachment_id || req.query?.attachment_id));

    await db.query(
      "UPDATE diary_entries SET media_files = ?, image_path = ?, video_path = ?, file_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
      [JSON.stringify(remaining), remaining.find((file) => file.file_type === "image")?.file_url || null, remaining.find((file) => file.file_type === "video")?.file_url || null, remaining.find((file) => file.file_type === "file")?.file_url || null, id, req.user.user_id]
    );

    res.json({ message: "Attachment deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete attachment", error: error.message });
  }
};

module.exports = {
  getCategoryList,
  createCategory,
  updateCategory,
  deleteCategory,
  getDiaryEntries,
  getDiaryEntryById,
  createDiaryEntry,
  updateDiaryEntry,
  deleteDiaryEntry,
  toggleFavorite,
  addAttachment,
  deleteAttachment,
};
