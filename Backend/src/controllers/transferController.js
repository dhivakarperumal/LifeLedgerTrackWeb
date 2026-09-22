const db = require("../config/db");

const normalizeMoney = (value) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
};

const applyIncomeBalanceDelta = async (incomeId) => {
    if (!incomeId) return;

    // Recalculate remaining amount based on total transferred amount
    const [incomeRows] = await db.query("SELECT * FROM income WHERE id = ?", [incomeId]);
    if (!incomeRows[0]) return;
    const incomeAmount = Number(incomeRows[0].amount || 0);

    const [transferSumRows] = await db.query(
        "SELECT COALESCE(SUM(amount), 0) as total_transferred FROM transfers WHERE source_income_id = ?",
        [incomeId]
    );
    const totalTransferred = Number(transferSumRows[0].total_transferred || 0);
    const updatedRemaining = Number(Math.max(incomeAmount - totalTransferred, 0).toFixed(2));

    await db.query("UPDATE income SET remaining_amount = ? WHERE id = ?", [updatedRemaining, incomeId]);
};

exports.getAllTransfers = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                t.*,
                COALESCE(SUM(e.expense_amount), 0) AS total_expense,
                (t.amount - COALESCE(SUM(e.expense_amount), 0)) AS computed_remaining
            FROM transfers t
            LEFT JOIN expenses e ON e.transfer_id = t.id
            GROUP BY t.id
            ORDER BY t.transfer_date DESC, t.created_at DESC
        `);

        /* Also keep remaining_amount in sync with computed value */
        const updates = rows
            .filter(r => Number(r.computed_remaining) !== Number(r.remaining_amount))
            .map(r =>
                db.query("UPDATE transfers SET remaining_amount = ? WHERE id = ?", [
                    Math.max(Number(r.computed_remaining), 0).toFixed(2),
                    r.id,
                ])
            );
        if (updates.length) await Promise.all(updates);

        /* Return normalised rows */
        const normalised = rows.map(r => ({
            ...r,
            remaining_amount: Math.max(Number(r.computed_remaining), 0),
            total_expense: Number(r.total_expense || 0),
        }));

        res.json(normalised);
    } catch (error) {
        console.error("Fetch Transfers Error:", error);
        res.status(500).json({ message: "Failed to fetch transfers", error: error.message });
    }
};

exports.createTransfer = async (req, res) => {
    try {
        const { title, amount, category, paymentMethod, date, notes, sourceIncomeId } = req.body;
        if (!title || !amount || !category || !date) {
            return res.status(400).json({ message: "Title, amount, category, and date are required." });
        }

        const numericAmount = normalizeMoney(amount);
        if (numericAmount === null || numericAmount <= 0) {
            return res.status(400).json({ message: "Transfer amount must be greater than zero." });
        }

        let selectedIncome = null;
        if (sourceIncomeId) {
            const [incomeRows] = await db.query("SELECT * FROM income WHERE id = ?", [sourceIncomeId]);
            selectedIncome = incomeRows[0];

            if (!selectedIncome) {
                return res.status(400).json({ message: "Selected income record was not found." });
            }

            const availableAmount = Number(selectedIncome.remaining_amount ?? selectedIncome.amount ?? 0);
            if (numericAmount > availableAmount) {
                return res.status(400).json({
                    message: `Insufficient income balance. Available amount: ₹${availableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                });
            }
        }

        const [result] = await db.query(
            `INSERT INTO transfers
                (title, amount, remaining_amount, source_income_id, category, transfer_from, transfer_to, transfer_date, payment_method, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [title.trim(), numericAmount, numericAmount, sourceIncomeId ? Number(sourceIncomeId) : null, category, "Account", "Account", date, paymentMethod || "Cash", notes || null]
        );

        if (selectedIncome) {
            await applyIncomeBalanceDelta(Number(sourceIncomeId));
        }

        const [rows] = await db.query("SELECT * FROM transfers WHERE id = ?", [result.insertId]);
        res.status(201).json({ message: "Transfer saved successfully", transfer: rows[0] });
    } catch (error) {
        console.error("Create Transfer Error:", error);
        res.status(500).json({ message: "Failed to save transfer", error: error.message });
    }
};

exports.updateTransfer = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, amount, category, paymentMethod, date, notes, sourceIncomeId } = req.body;

        const [transferRows] = await db.query("SELECT * FROM transfers WHERE id = ?", [id]);
        const existingTransfer = transferRows[0];

        if (!existingTransfer) {
            return res.status(404).json({ message: "Transfer not found." });
        }

        const newAmount = normalizeMoney(amount ?? existingTransfer.amount);
        if (newAmount === null || newAmount <= 0) {
            return res.status(400).json({ message: "Transfer amount must be greater than zero." });
        }

        const currentSourceIncomeId = existingTransfer.source_income_id ? Number(existingTransfer.source_income_id) : null;
        const targetIncomeId = sourceIncomeId ? Number(sourceIncomeId) : currentSourceIncomeId;

        // Validation for new amount vs income
        if (targetIncomeId) {
            const [incomeRows] = await db.query("SELECT * FROM income WHERE id = ?", [targetIncomeId]);
            const targetIncome = incomeRows[0];
            if (!targetIncome) {
                return res.status(400).json({ message: "Selected income record was not found." });
            }

            // check if the new transfer will exceed income
            const [transferSumRows] = await db.query(
                "SELECT COALESCE(SUM(amount), 0) as total_transferred FROM transfers WHERE source_income_id = ? AND id != ?",
                [targetIncomeId, id]
            );
            const otherTransfers = Number(transferSumRows[0].total_transferred || 0);
            const availableAmount = Number(targetIncome.amount || 0) - otherTransfers;
            
            if (newAmount > availableAmount) {
                return res.status(400).json({
                    message: `Insufficient income balance. Available amount for new transfers: ₹${availableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                });
            }
        }

        await db.query(
            `UPDATE transfers
             SET title = ?, amount = ?, source_income_id = ?, category = ?, transfer_from = ?, transfer_to = ?, transfer_date = ?, payment_method = ?, notes = ?
             WHERE id = ?`,
            [
                (title || existingTransfer.title).trim(),
                newAmount,
                targetIncomeId || null,
                category || existingTransfer.category,
                existingTransfer.transfer_from || "Account",
                existingTransfer.transfer_to || "Account",
                date || existingTransfer.transfer_date,
                paymentMethod || existingTransfer.payment_method || "Cash",
                notes ?? existingTransfer.notes,
                id,
            ]
        );

        // recalculate remaining_amount of transfer
        const [expenseSumRows] = await db.query(
            "SELECT COALESCE(SUM(expense_amount), 0) as total_expenses FROM expenses WHERE transfer_id = ?",
            [id]
        );
        const totalExpenses = Number(expenseSumRows[0].total_expenses || 0);
        const transferRemaining = Number(Math.max(newAmount - totalExpenses, 0).toFixed(2));
        await db.query("UPDATE transfers SET remaining_amount = ? WHERE id = ?", [transferRemaining, id]);

        if (currentSourceIncomeId) await applyIncomeBalanceDelta(currentSourceIncomeId);
        if (targetIncomeId && targetIncomeId !== currentSourceIncomeId) await applyIncomeBalanceDelta(targetIncomeId);

        const [updatedRows] = await db.query("SELECT * FROM transfers WHERE id = ?", [id]);
        res.json({ message: "Transfer updated successfully", transfer: updatedRows[0] });
    } catch (error) {
        console.error("Update Transfer Error:", error);
        res.status(500).json({ message: "Failed to update transfer", error: error.message });
    }
};

exports.deleteTransfer = async (req, res) => {
    try {
        const { id } = req.params;
        const [transferRows] = await db.query("SELECT * FROM transfers WHERE id = ?", [id]);
        const transfer = transferRows[0];

        if (!transfer) {
            return res.status(404).json({ message: "Transfer not found." });
        }

        await db.query("DELETE FROM transfers WHERE id = ?", [id]);

        if (transfer.source_income_id) {
            await applyIncomeBalanceDelta(Number(transfer.source_income_id));
        }

        res.json({ message: "Transfer deleted successfully" });
    } catch (error) {
        console.error("Delete Transfer Error:", error);
        res.status(500).json({ message: "Failed to delete transfer", error: error.message });
    }
};