const db = require("../config/db");

exports.getMonthlyBudget = async (req, res) => {
    try {
        const userId = req.user?.user_id;

        if (!userId) {
            return res.json({ monthly_budget: 0 });
        }

        const [userRows] = await db.query(
            "SELECT monthly_budget FROM users WHERE user_id = ? OR id = ? ORDER BY CASE WHEN user_id = ? THEN 0 ELSE 1 END LIMIT 1",
            [userId, req.user?.id, userId]
        );

        if (userRows.length > 0) {
            return res.json({ monthly_budget: Number(userRows[0].monthly_budget || 0) });
        }

        const [incomeRows] = await db.query(
            "SELECT monthly_budget FROM income WHERE user_id = ? OR id = ? ORDER BY id DESC LIMIT 1",
            [userId, req.user?.id]
        );

        return res.json({ monthly_budget: Number(incomeRows[0]?.monthly_budget || 0) });
    } catch (error) {
        console.error("Fetch Monthly Budget Error:", error);
        res.status(500).json({ message: "Failed to fetch monthly budget", error: error.message });
    }
};

exports.saveMonthlyBudget = async (req, res) => {
    try {
        const userId = req.user?.user_id;
        const value = Number(req.body?.monthly_budget ?? req.body?.monthlyBudget ?? 0);

        if (!userId) {
            return res.status(401).json({ message: "User not authenticated." });
        }

        if (!Number.isFinite(value) || value < 0) {
            return res.status(400).json({ message: "Monthly budget must be a valid non-negative amount." });
        }

        await db.query(
            "UPDATE users SET monthly_budget = ? WHERE user_id = ? OR id = ?",
            [value, userId, req.user?.id]
        );

        await db.query(
            "UPDATE income SET monthly_budget = ? WHERE user_id = ? OR id = ? ORDER BY id DESC LIMIT 1",
            [value, userId, req.user?.id]
        );

        res.json({ message: "Monthly budget updated successfully", monthly_budget: value });
    } catch (error) {
        console.error("Save Monthly Budget Error:", error);
        res.status(500).json({ message: "Failed to save monthly budget", error: error.message });
    }
};

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
const { title, amount, category, date, paymentMethod, notes, recurring, monthly_budget } = req.body;
    const userId = req.user?.user_id;

    if (!title || !amount || !category || !date) {
        return res.status(400).json({ message: "Title, amount, category, and date are required." });
    }

    const numericAmount = Number(amount);
    const numericMonthlyBudget = Number(monthly_budget ?? 0);
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
        return res.status(400).json({ message: "Amount must be a valid positive number." });
    }
    if (!Number.isFinite(numericMonthlyBudget) || numericMonthlyBudget < 0) {
        return res.status(400).json({ message: "Monthly budget must be a valid non-negative number." });
    }

    const [result] = await db.query(
        `INSERT INTO income
                (user_id, title, amount, remaining_amount, monthly_budget, category, income_date, payment_method, notes, recurring, attachment, created_by, updated_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            userId || null,
            title.trim(),
            numericAmount,
            numericAmount,
            numericMonthlyBudget,
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
        const { title, amount, category, date, paymentMethod, notes, recurring, monthly_budget } = req.body;
        const userId = req.user?.user_id;

        const [existingRows] = await db.query("SELECT * FROM income WHERE id = ? AND user_id = ?", [id, userId]);
        const existingIncome = existingRows[0];

        if (!existingIncome) {
            return res.status(404).json({ message: "Income record not found." });
        }

        const numericAmount = amount !== undefined ? Number(amount) : Number(existingIncome.amount);
        const numericMonthlyBudget = monthly_budget !== undefined ? Number(monthly_budget) : Number(existingIncome.monthly_budget ?? 0);
        if (!Number.isFinite(numericAmount) || numericAmount < 0) {
            return res.status(400).json({ message: "Amount must be a valid positive number." });
        }
        if (!Number.isFinite(numericMonthlyBudget) || numericMonthlyBudget < 0) {
            return res.status(400).json({ message: "Monthly budget must be a valid non-negative number." });
        }

        const attachmentPath = req.file ? `/uploads/income-receipts/${req.file.filename}` : existingIncome.attachment;

        await db.query(
            `UPDATE income
             SET user_id = ?, title = ?, amount = ?, remaining_amount = ?, monthly_budget = ?, category = ?, income_date = ?, payment_method = ?, notes = ?, recurring = ?, attachment = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND user_id = ?`,
            [
                userId || existingIncome.user_id,
                (title || existingIncome.title).trim(),
                numericAmount,
                numericAmount,
                numericMonthlyBudget,
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