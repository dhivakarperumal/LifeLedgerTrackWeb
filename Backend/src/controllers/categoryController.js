const db = require("../config/db");

const getNextCategoryId = async (userId) => {
    const [rows] = await db.query(
        "SELECT catId FROM categories WHERE user_id = ? AND catId REGEXP '^CAT[0-9]+$'",
        [userId]
    );
    const highestId = rows.reduce((highest, row) => {
        const match = String(row.catId || "").match(/^CAT(\d+)$/i);
        return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0);

    return `CAT${String(highestId + 1).padStart(3, "0")}`;
};

exports.getAllCategories = async (req, res) => {
    try {
        const currentUserId = req.user?.user_id;

        if (!currentUserId) {
            return res.status(401).json({ message: "Authentication required." });
        }

        const [results] = await db.query(
            "SELECT * FROM categories WHERE user_id = ? ORDER BY created_at DESC",
            [currentUserId]
        );

        const formattedResults = results.map(cat => {
            let subcategory = [];
            try { subcategory = typeof cat.subcategory === "string" ? JSON.parse(cat.subcategory) : cat.subcategory; } catch (e) { }

            let images = [];
            try {
                images = typeof cat.images === "string" ? JSON.parse(cat.images) : cat.images;
            } catch (e) {
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
        const { catId, name, description, subcategory, images, status, catType } = req.body;
        const currentUserId = req.user?.user_id;
        if (!currentUserId) {
            return res.status(401).json({ message: "Authentication required." });
        }
        const requestedCatId = String(catId || "").trim();

        let finalCatId = requestedCatId;
        if (!finalCatId) {
            finalCatId = await getNextCategoryId(currentUserId);
        } else {
            const [existingRows] = await db.query(
                "SELECT id FROM categories WHERE catId = ? AND user_id = ?",
                [finalCatId, currentUserId]
            );

            if (existingRows.length) {
                finalCatId = await getNextCategoryId(currentUserId);
            }
        }

        const [result] = await db.query(
            "INSERT INTO categories (user_id, catId, name, description, status, catType, subcategory, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [currentUserId, finalCatId, name, description, status || "Active", catType || "Expensive", JSON.stringify(subcategory || []), JSON.stringify(images || [])]
        );

        res.status(201).json({
            message: "Category added successfully",
            id: result.insertId,
            catId: finalCatId,
        });
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
        const { id } = req.params;
        const { catId, name, description, subcategory, images, status, catType } = req.body;
        const currentUserId = req.user?.user_id;
        if (!currentUserId) {
            return res.status(401).json({ message: "Authentication required." });
        }
        const requestedCatId = String(catId || "").trim() || id;

        const [duplicateRows] = await db.query(
            "SELECT id FROM categories WHERE catId = ? AND catId != ? AND user_id = ?",
            [requestedCatId, id, currentUserId]
        );

        const finalCatId = duplicateRows.length ? await getNextCategoryId(currentUserId) : requestedCatId;

        await db.query(
            "UPDATE categories SET catId = ?, name = ?, description = ?, status = ?, catType = ?, subcategory = ?, images = ? WHERE catId = ? AND user_id = ?",
            [finalCatId, name, description, status || "Active", catType || "Expensive", JSON.stringify(subcategory || []), JSON.stringify(images || []), id, currentUserId]
        );
        res.json({ message: "Category updated successfully", catId: finalCatId });
    } catch (err) {
        console.error("Update Category Error:", err);
        res.status(500).json({ message: "Failed to update category", error: err.message });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user?.user_id;

        if (!currentUserId) {
            return res.status(401).json({ message: "Authentication required." });
        }

        await db.query("DELETE FROM categories WHERE catId = ? AND user_id = ?", [id, currentUserId]);
        res.json({ message: "Category deleted successfully" });
    } catch (err) {
        console.error("Delete Category Error:", err);
        res.status(500).json({ message: "Failed to delete category", error: err.message });
    }
};
