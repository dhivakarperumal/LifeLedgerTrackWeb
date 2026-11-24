const path = require("path");
const fs = require("fs");
const db = require("../config/db");

const BACKEND_ROOT = path.resolve(__dirname, "..", "..");

/**
 * Normalizes file path to absolute path safely
 */
const getAbsoluteDiskPath = (relativeOrAbsolute) => {
  if (!relativeOrAbsolute) return null;
  const candidate = path.resolve(
    BACKEND_ROOT,
    path.isAbsolute(relativeOrAbsolute)
      ? path.relative(BACKEND_ROOT, relativeOrAbsolute)
      : String(relativeOrAbsolute).replace(/^[\\/]+/, "")
  );
  const relative = path.relative(BACKEND_ROOT, candidate);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return null;
  return candidate;
};

/**
 * Builds an ownership-checked URL for a media record
 */
const toPublicUrl = (mediaId) => {
  if (!mediaId) return "";
  return `/api/media/${encodeURIComponent(mediaId)}`;
};

/**
 * Derives relative storage path from absolute disk path
 */
const toStoragePath = (absoluteDiskPath) => {
  const safePath = getAbsoluteDiskPath(absoluteDiskPath);
  if (!safePath) throw new Error("Uploaded file path is outside the backend storage directory.");
  return path.relative(BACKEND_ROOT, safePath).replace(/\\/g, "/");
};

/**
 * Determines high-level file type ('image', 'video', 'audio', 'file')
 */
const determineFileType = (mimeType, originalName = "") => {
  const mime = String(mimeType || "").toLowerCase();
  const ext = path.extname(originalName).toLowerCase();

  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";

  if ([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".svg"].includes(ext)) return "image";
  if ([".mp4", ".mov", ".webm", ".m4v", ".mkv", ".avi"].includes(ext)) return "video";
  if ([".mp3", ".wav", ".m4a", ".aac", ".ogg"].includes(ext)) return "audio";
  return "file";
};

/**
 * Safely removes a file from disk if it exists
 */
const safeUnlink = (filePath) => {
  try {
    const absPath = getAbsoluteDiskPath(filePath);
    if (absPath && fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
      return true;
    }
  } catch (err) {
    console.error("Failed to delete file from disk:", filePath, err.message);
  }
  return false;
};

/**
 * Cleans up temporary or newly uploaded files from disk on DB errors
 */
const cleanupFiles = (files = []) => {
  if (!files || !files.length) return;
  for (const file of files) {
    if (file.path) {
      safeUnlink(file.path);
    }
  }
};

const unlinkStoredFile = async (filePath) => {
  const absolutePath = getAbsoluteDiskPath(filePath);
  if (!absolutePath) throw new Error("Stored media path is outside the backend storage directory.");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await fs.promises.unlink(absolutePath);
      return;
    } catch (error) {
      if (error.code === "ENOENT") return;
      if (!["EBUSY", "EACCES", "EPERM"].includes(error.code) || attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
    }
  }
};

/**
 * Saves uploaded files into MySQL media_files table
 */
const saveUploadedFiles = async ({ files = [], userId, memoryId = null, diaryId = null }) => {
  if (!files || !files.length) return [];

  const savedRecords = [];
  let connection;
  let transactionStarted = false;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    for (const file of files) {
      const fileName = file.filename || path.basename(file.path);
      const originalName = file.originalname || fileName;
      const fileType = determineFileType(file.mimetype, originalName);
      const storagePath = toStoragePath(file.path);
      const mimeType = file.mimetype || "application/octet-stream";
      const fileStat = await fs.promises.stat(file.path);
      if (!fileStat.isFile() || fileStat.size === 0 || fileStat.size !== file.size) {
        throw new Error(`Uploaded file could not be verified on disk: ${originalName}`);
      }
      const fileSize = fileStat.size;

      const [result] = await connection.query(
        `INSERT INTO media_files (
          user_id, memory_id, diary_id, file_name, stored_name, original_name,
          file_path, file_url, file_type, media_type, mime_type, file_size
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          memoryId || null,
          diaryId || null,
          fileName,
          fileName,
          originalName,
          storagePath,
          "",
          fileType,
          fileType,
          mimeType,
          fileSize,
        ]
      );

      const fileUrl = toPublicUrl(result.insertId);
      await connection.query("UPDATE media_files SET file_url = ? WHERE id = ?", [fileUrl, result.insertId]);
      savedRecords.push({
        id: result.insertId,
        user_id: userId,
        memory_id: memoryId || null,
        diary_id: diaryId || null,
        file_name: fileName,
        stored_name: fileName,
        original_name: originalName,
        file_path: storagePath,
        file_url: fileUrl,
        file_type: fileType,
        media_type: fileType,
        mime_type: mimeType,
        file_size: fileSize,
        created_at: new Date(),
      });
    }

    await connection.commit();
    transactionStarted = false;
    return savedRecords;
  } catch (error) {
    if (connection && transactionStarted) {
      try {
        await connection.rollback();
      } catch (cleanupErr) {
        console.error("Failed to roll back media insert transaction:", cleanupErr.message);
      }
    }
    for (const file of files) {
      if (!file.path) continue;
      try {
        await unlinkStoredFile(file.path);
      } catch (cleanupErr) {
        console.error("Failed to remove uploaded file after database rollback:", cleanupErr.message);
      }
    }
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

const rollbackUploadedFiles = async (files = []) => {
  const validFiles = files.filter((file) => file?.path);
  if (!validFiles.length) return;

  const storagePaths = validFiles.map((file) => toStoragePath(file.path));
  for (const filePath of storagePaths) {
    await unlinkStoredFile(filePath);
  }
  await db.query("DELETE FROM media_files WHERE file_path IN (?)", [storagePaths]);
};

/**
 * Deletes a single media file by ID with user ownership check
 */
const deleteMediaById = async (mediaId, userId, isAdmin = false) => {
  const query = isAdmin
    ? "SELECT * FROM media_files WHERE id = ?"
    : "SELECT * FROM media_files WHERE id = ? AND user_id = ?";
  const params = isAdmin ? [mediaId] : [mediaId, userId];

  const [rows] = await db.query(query, params);
  if (!rows.length) {
    return { found: false };
  }

  const media = rows[0];

  await unlinkStoredFile(media.file_path);

  await db.query("DELETE FROM media_files WHERE id = ?", [mediaId]);

  return { found: true, media };
};

/**
 * Deletes multiple media files by ID with user ownership check
 */
const deleteMediaByIds = async (mediaIds = [], userId, isAdmin = false) => {
  if (!mediaIds || !mediaIds.length) return [];

  const validIds = mediaIds.map((id) => Number(id)).filter(Boolean);
  if (!validIds.length) return [];

  const query = isAdmin
    ? "SELECT * FROM media_files WHERE id IN (?)"
    : "SELECT * FROM media_files WHERE id IN (?) AND user_id = ?";
  const params = isAdmin ? [validIds] : [validIds, userId];

  const [rows] = await db.query(query, params);

  for (const media of rows) await deleteMediaById(media.id, userId, isAdmin);

  return rows;
};

/**
 * Deletes all media files associated with a memory
 */
const deleteMediaForMemory = async (memoryId, userId, isAdmin = false) => {
  const query = isAdmin
    ? "SELECT * FROM media_files WHERE memory_id = ?"
    : "SELECT * FROM media_files WHERE memory_id = ? AND user_id = ?";
  const params = isAdmin ? [memoryId] : [memoryId, userId];

  const [rows] = await db.query(query, params);
  for (const media of rows) await deleteMediaById(media.id, userId, isAdmin);
  return rows.length;
};

/**
 * Deletes all media files associated with a diary entry
 */
const deleteMediaForDiary = async (diaryId, userId, isAdmin = false) => {
  const query = isAdmin
    ? "SELECT * FROM media_files WHERE diary_id = ?"
    : "SELECT * FROM media_files WHERE diary_id = ? AND user_id = ?";
  const params = isAdmin ? [diaryId] : [diaryId, userId];

  const [rows] = await db.query(query, params);
  for (const media of rows) await deleteMediaById(media.id, userId, isAdmin);
  return rows.length;
};

/**
 * Fetches all media for multiple memories in a single efficient query
 */
const getMediaMapForMemories = async (memoryIds = []) => {
  const map = new Map();
  if (!memoryIds || !memoryIds.length) return map;

  const [rows] = await db.query(
    "SELECT * FROM media_files WHERE memory_id IN (?) ORDER BY id ASC",
    [memoryIds]
  );

  for (const row of rows) {
    if (!map.has(row.memory_id)) {
      map.set(row.memory_id, { images: [], videos: [], audio: [], media_files: [] });
    }
    const bucket = map.get(row.memory_id);
    const mediaItem = {
      id: row.id,
      stored_name: row.stored_name || row.file_name,
      file_name: row.file_name,
      original_name: row.original_name,
      file_url: row.file_url,
      file_type: row.file_type,
      media_type: row.media_type || row.file_type,
      mime_type: row.mime_type,
      file_size: Number(row.file_size),
      created_at: row.created_at,
    };

    bucket.media_files.push(mediaItem);
    if (row.file_type === "image") {
      bucket.images.push(mediaItem);
    } else if (row.file_type === "video") {
      bucket.videos.push(mediaItem);
    } else if (row.file_type === "audio") {
      bucket.audio.push(mediaItem);
    }
  }

  return map;
};

/**
 * Fetches all media for multiple diary entries in a single efficient query
 */
const getMediaMapForDiary = async (diaryIds = []) => {
  const map = new Map();
  if (!diaryIds || !diaryIds.length) return map;

  const [rows] = await db.query(
    "SELECT * FROM media_files WHERE diary_id IN (?) ORDER BY id ASC",
    [diaryIds]
  );

  for (const row of rows) {
    if (!map.has(row.diary_id)) {
      map.set(row.diary_id, { images: [], videos: [], audio: [], media_files: [] });
    }
    const bucket = map.get(row.diary_id);
    const mediaItem = {
      id: row.id,
      stored_name: row.stored_name || row.file_name,
      file_name: row.file_name,
      original_name: row.original_name,
      file_url: row.file_url,
      file_type: row.file_type,
      media_type: row.media_type || row.file_type,
      mime_type: row.mime_type,
      file_size: Number(row.file_size),
      created_at: row.created_at,
    };

    bucket.media_files.push(mediaItem);
    if (row.file_type === "image") {
      bucket.images.push(mediaItem);
    } else if (row.file_type === "video") {
      bucket.videos.push(mediaItem);
    } else if (row.file_type === "audio") {
      bucket.audio.push(mediaItem);
    }
  }

  return map;
};

/**
 * Streams a media file with HTTP Range support
 */
const streamMediaFile = (filePath, mimeType, req, res, originalName = "media") => {
  const absolutePath = getAbsoluteDiskPath(filePath);
  if (!absolutePath || !fs.existsSync(absolutePath)) {
    return res.status(404).json({ success: false, message: "Media file not found on server." });
  }

  const fileSize = fs.statSync(absolutePath).size;
  if (fileSize === 0) {
    return res.status(200).set({
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
      "Content-Length": "0",
      "Content-Type": mimeType || "application/octet-stream",
    }).end();
  }
  const rangeHeader = req.headers.range;
  let start = 0;
  let end = fileSize - 1;
  let statusCode = 200;

  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
    if (!match || (!match[1] && !match[2])) {
      res.status(416).set("Content-Range", `bytes */${fileSize}`);
      return res.end();
    }

    if (!match[1]) {
      const suffixLength = Number(match[2]);
      start = Math.max(0, fileSize - suffixLength);
    } else {
      start = Number(match[1]);
      end = match[2] ? Math.min(Number(match[2]), fileSize - 1) : fileSize - 1;
    }

    if (start >= fileSize || start > end) {
      res.status(416).set("Content-Range", `bytes */${fileSize}`);
      return res.end();
    }
    statusCode = 206;
  }

  const headers = {
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "Content-Length": end - start + 1,
    "Content-Type": mimeType || "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(String(originalName).replace(/[\r\n]/g, "_"))}`,
  };
  if (statusCode === 206) headers["Content-Range"] = `bytes ${start}-${end}/${fileSize}`;
  res.writeHead(statusCode, headers);

  const stream = fs.createReadStream(absolutePath, { start, end });
  stream.on("error", (error) => {
    console.error("Media stream failed:", error.message);
    if (res.headersSent) res.destroy(error);
    else res.status(500).end();
  });
  stream.pipe(res);
};

const streamVideoFile = (filePath, mimeType, req, res, originalName) => {
  return streamMediaFile(filePath, mimeType, req, res, originalName);
};

module.exports = {
  determineFileType,
  toPublicUrl,
  toStoragePath,
  getAbsoluteDiskPath,
  safeUnlink,
  cleanupFiles,
  rollbackUploadedFiles,
  saveUploadedFiles,
  deleteMediaById,
  deleteMediaByIds,
  deleteMediaForMemory,
  deleteMediaForDiary,
  getMediaMapForMemories,
  getMediaMapForDiary,
  streamMediaFile,
  streamVideoFile,
};
