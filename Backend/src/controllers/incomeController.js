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