const db = require("../config/db");

exports.getAllCategories = async (req, res) => {
    try {
        const [results] = await db.query("SELECT * FROM categories ORDER BY created_at DESC");
        const formattedResults = results.map(cat => {
            let subcategory = [];
            try { subcategory = typeof cat.subcategory === "string" ? JSON.parse(cat.subcategory) : cat.subcategory; } catch (e) { }

            let images = [];
            try {
                images = typeof cat.images === "string" ? JSON.parse(cat.images) : cat.images;
            } catch (e) {
                // fallback if it's an old string URL
                images = cat.images ? [cat.images] : [];
            }
            if (!Array.isArray(images) && typeof cat.images === "string") {
                images = cat.images ? [cat.images] : [];
            }

            return { ...cat, subcategory: subcategory || [], images: images || [] };
        });
        res.json(formattedResults);
    } catch (err) {
        console.error("Fetch Categories Error:", err);
        res.status(500).json({ message: "Failed to fetch categories", error: err.message });
    }
};

exports.addCategory = async (req, res) => {
    try {
        const { catId, name, description, subcategory, images, user_id, status, catType } = req.body;

        const [result] = await db.query(
            "INSERT INTO categories (user_id, catId, name, description, status, catType, subcategory, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [user_id || null, catId, name, description, status || "Active", catType || "Expensive", JSON.stringify(subcategory || []), JSON.stringify(images || [])]
        );
        res.status(201).json({ message: "Category added successfully", id: result.insertId });
    } catch (err) {
        console.error("Add Category Error:", err);
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(400).json({ message: "Category ID already exists" });
        }
        res.status(500).json({ message: "Failed to add category", error: err.message });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params; // Using catId
        const { name, description, subcategory, images, user_id, status, catType } = req.body;

        await db.query(
            "UPDATE categories SET user_id = ?, name = ?, description = ?, status = ?, catType = ?, subcategory = ?, images = ? WHERE catId = ?",
            [user_id || null, name, description, status || "Active", catType || "Expensive", JSON.stringify(subcategory || []), JSON.stringify(images || []), id]
        );
        res.json({ message: "Category updated successfully" });
    } catch (err) {
        console.error("Update Category Error:", err);
        res.status(500).json({ message: "Failed to update category", error: err.message });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params; // Using catId
        await db.query("DELETE FROM categories WHERE catId = ?", [id]);
        res.json({ message: "Category deleted successfully" });
    } catch (err) {
        console.error("Delete Category Error:", err);
        res.status(500).json({ message: "Failed to delete category", error: err.message });
    }
};
