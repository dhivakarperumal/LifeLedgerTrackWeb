const db = require("../config/db");

exports.uploadBannerImage = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No banner image uploaded" });
    }

    const type = req.body.type === "offer" ? "offer" : "hero";
    res.status(201).json({
        url: `/uploads/banners/${type}/${req.file.filename}`
    });
};

exports.getAllBanners = async (req, res) => {
    try {
        const [results] = await db.query("SELECT * FROM banners ORDER BY created_at DESC");
        res.json(results);
    } catch (err) {
        console.error("Fetch Banners Error:", err);
        res.status(500).json({ message: "Failed to fetch banners", error: err.message });
    }
};

exports.getBannersByType = async (req, res) => {
    try {
        const [results] = await db.query(
            "SELECT * FROM banners WHERE type = ? AND active = TRUE ORDER BY created_at DESC",
            [req.params.type]
        );
        res.json(results);
    } catch (err) {
        console.error("Fetch Banners by Type Error:", err);
        res.status(500).json({ message: "Failed to fetch banners by type", error: err.message });
    }
};

exports.createBanner = async (req, res) => {
    try {
        const { image, mobile_image, title, subtitle, description, link, type, active, user_id } = req.body;
        const [result] = await db.query(
            "INSERT INTO banners (user_id, image, mobile_image, title, subtitle, description, link, type, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [user_id || null, image, mobile_image, title, subtitle, description, link, type || 'hero', active !== undefined ? active : true]
        );
        res.status(201).json({ message: "Banner added successfully", id: result.insertId });
    } catch (err) {
        console.error("Add Banner Error:", err);
        res.status(500).json({ message: "Failed to add banner", error: err.message });
    }
};

exports.updateBanner = async (req, res) => {
    try {
        const { image, mobile_image, title, subtitle, description, link, type, active, user_id } = req.body;
        await db.query(
            "UPDATE banners SET user_id=?, image=?, mobile_image=?, title=?, subtitle=?, description=?, link=?, type=?, active=? WHERE id=?",
            [user_id || null, image, mobile_image, title, subtitle, description, link, type || 'hero', active !== undefined ? active : true, req.params.id]
        );
        res.json({ message: "Banner updated successfully" });
    } catch (err) {
        console.error("Update Banner Error:", err);
        res.status(500).json({ message: "Failed to update banner", error: err.message });
    }
};

exports.deleteBanner = async (req, res) => {
    try {
        await db.query("DELETE FROM banners WHERE id = ?", [req.params.id]);
        res.json({ message: "Banner deleted successfully" });
    } catch (err) {
        console.error("Delete Banner Error:", err);
        res.status(500).json({ message: "Failed to delete banner", error: err.message });
    }
};
