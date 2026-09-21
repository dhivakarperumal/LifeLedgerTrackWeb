const db = require("../config/db");

exports.getAllTransfers = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM transfers ORDER BY transfer_date DESC, created_at DESC");
        res.json(rows);
    } catch (error) {
        console.error("Fetch Transfers Error:", error);
        res.status(500).json({ message: "Failed to fetch transfers", error: error.message });
    }
};

exports.createTransfer = async (req, res) => {
    try {
        const { title, amount, category, paymentMethod, date, notes } = req.body;
        if (!title || !amount || !category || !date) {
            return res.status(400).json({ message: "Title, amount, category, and date are required." });
        }
        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({ message: "Transfer amount must be greater than zero." });
        }
        const [result] = await db.query(
            `INSERT INTO transfers
                (title, amount, category, transfer_from, transfer_to, transfer_date, payment_method, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [title.trim(), numericAmount, category, "Account", "Account", date, paymentMethod || "Cash", notes || null]
        );
        const [rows] = await db.query("SELECT * FROM transfers WHERE id = ?", [result.insertId]);
        res.status(201).json({ message: "Transfer saved successfully", transfer: rows[0] });
    } catch (error) {
        console.error("Create Transfer Error:", error);
        res.status(500).json({ message: "Failed to save transfer", error: error.message });
    }
};