const db = require("../config/db");

exports.getAllIncome = async (req, res) => {
    try {
        const userId = req.user?.user_id;
        const [rows] = await db.query(
            "SELECT * FROM income WHERE user_id = ? ORDER BY income_date DESC, created_at DESC",
            [userId]
        );
        res.json(rows);
    } catch (error) {
        console.error("Fetch Income Error:", error);
        res.status(500).json({ message: "Failed to fetch income", error: error.message });
    }
};

exports.createIncome = async (req, res) => {
    try {
        const { title, amount, category, date, paymentMethod, notes, recurring } = req.body;
        const userId = req.user?.user_id;

        if (!title || !amount || !category || !date) {
            return res.status(400).json({ message: "Title, amount, category, and date are required." });
        }

        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount) || numericAmount < 0) {
            return res.status(400).json({ message: "Amount must be a valid positive number." });
        }

        const [result] = await db.query(
            `INSERT INTO income
                (user_id, title, amount, remaining_amount, category, income_date, payment_method, notes, recurring, attachment, created_by, updated_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId || null,
                title.trim(),
                numericAmount,
                numericAmount,
                category,
                date,
                paymentMethod || null,
                notes || null,
                recurring === "Yes" ? "Yes" : "No",
                req.file ? `/uploads/income-receipts/${req.file.filename}` : null,
                userId || null,
                userId || null,
            ]
        );

        const [rows] = await db.query("SELECT * FROM income WHERE id = ? AND user_id = ?", [result.insertId, userId]);
        res.status(201).json({ message: "Income added successfully", income: rows[0] });
    } catch (error) {
        console.error("Create Income Error:", error);
        res.status(500).json({ message: "Failed to add income", error: error.message });
    }
};

exports.updateIncome = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, amount, category, date, paymentMethod, notes, recurring } = req.body;
        const userId = req.user?.user_id;

        const [existingRows] = await db.query("SELECT * FROM income WHERE id = ? AND user_id = ?", [id, userId]);
        const existingIncome = existingRows[0];

        if (!existingIncome) {
            return res.status(404).json({ message: "Income record not found." });
        }

        const numericAmount = amount !== undefined ? Number(amount) : Number(existingIncome.amount);
        if (!Number.isFinite(numericAmount) || numericAmount < 0) {
            return res.status(400).json({ message: "Amount must be a valid positive number." });
        }

        const attachmentPath = req.file ? `/uploads/income-receipts/${req.file.filename}` : existingIncome.attachment;

        await db.query(
            `UPDATE income
             SET user_id = ?, title = ?, amount = ?, remaining_amount = ?, category = ?, income_date = ?, payment_method = ?, notes = ?, recurring = ?, attachment = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND user_id = ?`,
            [
                userId || existingIncome.user_id,
                (title || existingIncome.title).trim(),
                numericAmount,
                numericAmount,
                category || existingIncome.category,
                date || existingIncome.income_date,
                paymentMethod || existingIncome.payment_method,
                notes !== undefined ? notes : existingIncome.notes,
                recurring === "Yes" ? "Yes" : recurring === "No" ? "No" : existingIncome.recurring,
                attachmentPath,
                userId || existingIncome.user_id,
                id,
                userId,
            ]
        );

        const [rows] = await db.query("SELECT * FROM income WHERE id = ? AND user_id = ?", [id, userId]);
        res.json({ message: "Income updated successfully", income: rows[0] });
    } catch (error) {
        console.error("Update Income Error:", error);
        res.status(500).json({ message: "Failed to update income", error: error.message });
    }
};

exports.deleteIncome = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.user_id;

        const [existingRows] = await db.query("SELECT * FROM income WHERE id = ? AND user_id = ?", [id, userId]);
        if (!existingRows[0]) {
            return res.status(404).json({ message: "Income record not found." });
        }

        await db.query("DELETE FROM income WHERE id = ? AND user_id = ?", [id, userId]);
        res.json({ message: "Income deleted successfully" });
    } catch (error) {
        console.error("Delete Income Error:", error);
        res.status(500).json({ message: "Failed to delete income", error: error.message });
    }
};