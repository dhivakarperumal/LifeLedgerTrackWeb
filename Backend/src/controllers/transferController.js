const db = require("../config/db");

const normalizeMoney = (value) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
};

const applyIncomeBalanceDelta = async (incomeId, deltaAmount) => {
    if (!incomeId) return;

    const [incomeRows] = await db.query("SELECT * FROM income WHERE id = ?", [incomeId]);
    if (!incomeRows[0]) return;

    const currentRemaining = Number(incomeRows[0].remaining_amount ?? incomeRows[0].amount ?? 0);
    const updatedRemaining = Number(Math.max(currentRemaining + Number(deltaAmount || 0), 0).toFixed(2));

    await db.query("UPDATE income SET remaining_amount = ? WHERE id = ?", [updatedRemaining, incomeId]);
};

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
                (title, amount, source_income_id, category, transfer_from, transfer_to, transfer_date, payment_method, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [title.trim(), numericAmount, sourceIncomeId ? Number(sourceIncomeId) : null, category, "Account", "Account", date, paymentMethod || "Cash", notes || null]
        );

        if (selectedIncome) {
            await applyIncomeBalanceDelta(Number(sourceIncomeId), -numericAmount);
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

        if (currentSourceIncomeId) {
            const [incomeRows] = await db.query("SELECT * FROM income WHERE id = ?", [currentSourceIncomeId]);
            const currentIncome = incomeRows[0];
            if (currentIncome) {
                const currentRemaining = Number(currentIncome.remaining_amount ?? currentIncome.amount ?? 0);
                await db.query(
                    "UPDATE income SET remaining_amount = ? WHERE id = ?",
                    [Number((currentRemaining + Number(existingTransfer.amount || 0)).toFixed(2)), currentSourceIncomeId]
                );
            }
        }

        if (targetIncomeId) {
            const [incomeRows] = await db.query("SELECT * FROM income WHERE id = ?", [targetIncomeId]);
            const targetIncome = incomeRows[0];
            if (!targetIncome) {
                return res.status(400).json({ message: "Selected income record was not found." });
            }

            const availableAmount = Number(targetIncome.remaining_amount ?? targetIncome.amount ?? 0);
            if (newAmount > availableAmount) {
                return res.status(400).json({
                    message: `Insufficient income balance. Available amount: ₹${availableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                });
            }

            await db.query(
                "UPDATE income SET remaining_amount = ? WHERE id = ?",
                [Number((availableAmount - newAmount).toFixed(2)), targetIncomeId]
            );
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

        if (transfer.source_income_id) {
            const [incomeRows] = await db.query("SELECT * FROM income WHERE id = ?", [transfer.source_income_id]);
            const income = incomeRows[0];
            if (income) {
                const currentRemaining = Number(income.remaining_amount ?? income.amount ?? 0);
                await db.query(
                    "UPDATE income SET remaining_amount = ? WHERE id = ?",
                    [Number((currentRemaining + Number(transfer.amount || 0)).toFixed(2)), transfer.source_income_id]
                );
            }
        }

        await db.query("DELETE FROM transfers WHERE id = ?", [id]);
        res.json({ message: "Transfer deleted successfully" });
    } catch (error) {
        console.error("Delete Transfer Error:", error);
        res.status(500).json({ message: "Failed to delete transfer", error: error.message });
    }
};