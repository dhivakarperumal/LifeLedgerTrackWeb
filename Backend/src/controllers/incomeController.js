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

exports.getIncomeDetails = async (req, res) => {
    try {
        const userId = req.user?.user_id;
        const { id } = req.params;
        const [incomeRows] = await db.query(
            "SELECT * FROM income WHERE id = ? AND user_id = ?",
            [id, userId]
        );
        const income = incomeRows[0];

        if (!income) {
            return res.status(404).json({ message: "Income record not found." });
        }

        const [transfers] = await db.query(
            `SELECT t.*,
                COALESCE(e.total_expense, 0) AS total_expense,
                COALESCE(a.total_allocated, 0) AS total_allocated,
                COALESCE(r.total_returned, 0) AS total_returned,
                COALESCE(g.total_transferred, t.amount) AS group_total_transferred,
                GREATEST(
                    COALESCE(g.total_transferred, t.amount)
                    - COALESCE(e.total_expense, 0)
                    - COALESCE(a.total_allocated, 0)
                    - COALESCE(r.total_returned, 0),
                    0
                ) AS remaining_amount
             FROM transfers t
             LEFT JOIN (
                SELECT COALESCE(member.parent_transfer_id, member.id) AS transfer_id,
                    SUM(expense.expense_amount) AS total_expense
                FROM expenses expense
                INNER JOIN transfers member
                    ON member.id = expense.transfer_id AND member.user_id = expense.user_id
                WHERE expense.user_id = ?
                GROUP BY COALESCE(member.parent_transfer_id, member.id)
             ) e ON e.transfer_id = t.id
             LEFT JOIN (
                SELECT transfer_id, SUM(amount) AS total_allocated
                FROM transfer_allocations
                WHERE user_id = ?
                GROUP BY transfer_id
             ) a ON a.transfer_id = t.id
             LEFT JOIN (
                SELECT transfer_id, SUM(amount) AS total_returned
                FROM transfer_returns
                WHERE user_id = ?
                GROUP BY transfer_id
             ) r ON r.transfer_id = t.id
             LEFT JOIN (
                SELECT COALESCE(parent_transfer_id, id) AS transfer_id, SUM(amount) AS total_transferred
                FROM transfers
                WHERE user_id = ?
                GROUP BY COALESCE(parent_transfer_id, id)
             ) g ON g.transfer_id = t.id
             WHERE t.user_id = ? AND t.parent_transfer_id IS NULL
                AND (
                    t.source_income_id = ?
                    OR EXISTS (
                        SELECT 1 FROM transfer_adjustments adjustment
                        WHERE adjustment.transfer_id = t.id
                            AND adjustment.income_id = ? AND adjustment.user_id = ?
                    )
                    OR EXISTS (
                        SELECT 1 FROM transfers child
                        WHERE child.parent_transfer_id = t.id
                            AND child.source_income_id = ? AND child.user_id = ?
                    )
                )
             ORDER BY t.transfer_date DESC, t.created_at DESC`,
            [userId, userId, userId, userId, userId, id, id, userId, id, userId]
        );

        const [expenses] = await db.query(
            `SELECT expense.*, root.id AS linked_transfer_id, root.title AS linked_transfer_title
             FROM expenses expense
             INNER JOIN transfers member
                ON member.id = expense.transfer_id AND member.user_id = expense.user_id
             INNER JOIN transfers root
                ON root.id = COALESCE(member.parent_transfer_id, member.id)
                    AND root.user_id = expense.user_id
             WHERE expense.user_id = ? AND root.parent_transfer_id IS NULL
                AND (
                    root.source_income_id = ?
                    OR EXISTS (
                        SELECT 1 FROM transfer_adjustments adjustment
                        WHERE adjustment.transfer_id = root.id
                            AND adjustment.income_id = ? AND adjustment.user_id = ?
                    )
                    OR EXISTS (
                        SELECT 1 FROM transfers child
                        WHERE child.parent_transfer_id = root.id
                            AND child.source_income_id = ? AND child.user_id = ?
                    )
                )
             ORDER BY expense.expense_date DESC, expense.created_at DESC`,
            [userId, id, id, userId, id, userId]
        );

        res.json({ income, transfers, expenses });
    } catch (error) {
        console.error("Fetch Income Details Error:", error);
        res.status(500).json({ message: "Failed to fetch income details", error: error.message });
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