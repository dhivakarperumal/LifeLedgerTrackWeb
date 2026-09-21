const db = require("../config/db");

exports.uploadVideo = (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No video uploaded" });
    res.status(201).json({ url: `/uploads/videos/${req.file.filename}` });
};

exports.uploadVideoThumbnail = (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No video thumbnail uploaded" });
    res.status(201).json({ url: `/uploads/video-thumbnails/${req.file.filename}` });
};

const normalizeYoutubeId = (value) => {
    if (!value || typeof value !== "string") return value;
    try {
        const url = new URL(value);
        if (url.hostname === "youtu.be") return url.pathname.slice(1).split("/")[0];
        if (url.searchParams.get("v")) return url.searchParams.get("v");
        const parts = url.pathname.split("/").filter(Boolean);
        return parts[0] === "shorts" || parts[0] === "embed" ? parts[1] : value;
    } catch {
        return value.trim();
    }
};

exports.getAllVideos = async (req, res) => {
    try {
        const [results] = await db.query("SELECT * FROM videos ORDER BY created_at DESC");
        res.json(results);
    } catch (err) {
        console.error("Fetch Videos Error:", err);
        res.status(500).json({ message: "Failed to fetch videos", error: err.message });
    }
};

exports.createVideo = async (req, res) => {
    try {
        const { videoId, title, thumbnail, type, user_id } = req.body;
        const normalizedVideoId = type === "youtube" ? normalizeYoutubeId(videoId) : videoId;
        const [result] = await db.query(
            "INSERT INTO videos (user_id, videoId, title, thumbnail, type) VALUES (?, ?, ?, ?, ?)",
            [user_id || null, normalizedVideoId, title, thumbnail || (type === 'youtube' ? `https://img.youtube.com/vi/${normalizedVideoId}/maxresdefault.jpg` : null), type || 'youtube']
        );
        res.json({ message: "Video added successfully", id: result.insertId });
    } catch (err) {
        console.error("Add Video Error:", err);
        res.status(500).json({ message: "Failed to add video", error: err.message });
    }
};

exports.updateVideo = async (req, res) => {
    try {
        const { videoId, title, thumbnail, type, user_id } = req.body;
        const normalizedVideoId = type === "youtube" ? normalizeYoutubeId(videoId) : videoId;
        await db.query(
            "UPDATE videos SET user_id=?, videoId=?, title=?, thumbnail=?, type=? WHERE id=?",
            [user_id || null, normalizedVideoId, title, thumbnail || (type === 'youtube' ? `https://img.youtube.com/vi/${normalizedVideoId}/maxresdefault.jpg` : null), type || 'youtube', req.params.id]
        );
        res.json({ message: "Video updated successfully" });
    } catch (err) {
        console.error("Update Video Error:", err);
        res.status(500).json({ message: "Failed to update video", error: err.message });
    }
};

exports.deleteVideo = async (req, res) => {
    try {
        await db.query("DELETE FROM videos WHERE id = ?", [req.params.id]);
        res.json({ message: "Video deleted successfully" });
    } catch (err) {
        console.error("Delete Video Error:", err);
        res.status(500).json({ message: "Failed to delete video", error: err.message });
    }
};
