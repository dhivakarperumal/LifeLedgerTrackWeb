const db = require("../config/db");

exports.getAllExpenses = async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT * FROM expenses ORDER BY expense_date DESC, created_at DESC"
        );
        res.json(rows);
    } catch (error) {
        console.error("Fetch Expenses Error:", error);
        res.status(500).json({ message: "Failed to fetch expenses", error: error.message });
    }
};

exports.createExpense = async (req, res) => {
    try {
        const {
            title,
            expense_amount,
            transfer_amount,
            category,
            payment_method,
            date,
            notes,
            recurring,
        } = req.body;

        if (!title || !expense_amount || !category || !date) {
            return res.status(400).json({
                message: "Title, expense amount, category, and date are required.",
            });
        }

        const numericExpense = Number(expense_amount);
        const numericTransfer = transfer_amount ? Number(transfer_amount) : null;

        if (!Number.isFinite(numericExpense) || numericExpense <= 0) {
            return res.status(400).json({ message: "Expense amount must be a valid positive number." });
        }
        if (numericTransfer !== null && (!Number.isFinite(numericTransfer) || numericTransfer < 0)) {
            return res.status(400).json({ message: "Transfer amount must be a valid non-negative number." });
        }

        // remaining = transfer_amount - expense_amount (null if no transfer amount)
        const remaining =
            numericTransfer !== null ? numericTransfer - numericExpense : null;

        const attachmentPath = req.file
            ? `/uploads/expense-receipts/${req.file.filename}`
            : null;

        const [result] = await db.query(
            `INSERT INTO expenses
                (title, expense_amount, transfer_amount, remaining_amount, category, payment_method, expense_date, notes, recurring, attachment)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title.trim(),
                numericExpense,
                numericTransfer,
                remaining,
                category,
                payment_method || "Cash",
                date,
                notes || null,
                recurring === "Yes" ? "Yes" : "No",
                attachmentPath,
            ]
        );

        const [rows] = await db.query("SELECT * FROM expenses WHERE id = ?", [result.insertId]);
        res.status(201).json({ message: "Expense added successfully", expense: rows[0] });
    } catch (error) {
        console.error("Create Expense Error:", error);
        res.status(500).json({ message: "Failed to add expense", error: error.message });
    }
};

exports.deleteExpense = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query("DELETE FROM expenses WHERE id = ?", [id]);
        res.json({ message: "Expense deleted successfully" });
    } catch (error) {
        console.error("Delete Expense Error:", error);
        res.status(500).json({ message: "Failed to delete expense", error: error.message });
    }
};

exports.getExpenseStats = async (req, res) => {
    try {
        const [[totalRow]] = await db.query("SELECT COUNT(*) AS total, COALESCE(SUM(expense_amount), 0) AS totalAmount FROM expenses");
        const [[transferRow]] = await db.query("SELECT COALESCE(SUM(transfer_amount), 0) AS totalTransfer FROM expenses WHERE transfer_amount IS NOT NULL");
        const [[recurringRow]] = await db.query("SELECT COUNT(*) AS recurring FROM expenses WHERE recurring = 'Yes'");

        res.json({
            total: totalRow.total,
            totalAmount: totalRow.totalAmount,
            totalTransfer: transferRow.totalTransfer,
            recurring: recurringRow.recurring,
        });
    } catch (error) {
        console.error("Expense Stats Error:", error);
        res.status(500).json({ message: "Failed to fetch stats", error: error.message });
    }
};
