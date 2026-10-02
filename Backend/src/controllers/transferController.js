const db = require("../config/db");

const normalizeMoney = (value) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
};

const applyIncomeBalanceDelta = async (incomeId, executor = db) => {
    if (!incomeId) return;

    const [incomeRows] = await executor.query("SELECT * FROM income WHERE id = ?", [incomeId]);
    if (!incomeRows[0]) return;
    const incomeAmount = Number(incomeRows[0].amount || 0);

    const [[transferSumRows], [adjustmentSumRows], [returnSumRows]] = await Promise.all([
        executor.query(
            `SELECT COALESCE(SUM(t.amount - COALESCE(a.total_added, 0)), 0) AS total_transferred
             FROM transfers t
             LEFT JOIN (
                SELECT transfer_id, SUM(amount) AS total_added
                FROM transfer_adjustments
                GROUP BY transfer_id
             ) a ON a.transfer_id = t.id
             WHERE t.source_income_id = ?`,
            [incomeId]
        ),
        executor.query(
            "SELECT COALESCE(SUM(amount), 0) AS total_adjusted FROM transfer_adjustments WHERE income_id = ?",
            [incomeId]
        ),
        executor.query(
            "SELECT COALESCE(SUM(amount), 0) AS total_returned FROM transfer_returns WHERE income_id = ?",
            [incomeId]
        ),
    ]);
    const totalTransferred = Number(transferSumRows[0].total_transferred || 0)
        + Number(adjustmentSumRows[0].total_adjusted || 0);
    const totalReturned = Number(returnSumRows[0].total_returned || 0);
    const updatedRemaining = Number(Math.max(incomeAmount - totalTransferred + totalReturned, 0).toFixed(2));

    await executor.query("UPDATE income SET remaining_amount = ? WHERE id = ?", [updatedRemaining, incomeId]);
};

exports.getAllTransfers = async (req, res) => {
    try {
        const userId = req.user?.user_id;
        const [rows] = await db.query(`
            SELECT
                t.*,
                COALESCE(e.total_expense, 0) AS total_expense,
                COALESCE(a.total_transferred, 0) AS total_transferred,
                COALESCE(r.total_returned, 0) AS total_returned,
                                COALESCE((
                                        SELECT SUM(group_transfer.amount)
                                        FROM transfers group_transfer
                                        WHERE group_transfer.user_id = t.user_id
                                            AND (group_transfer.id = COALESCE(t.parent_transfer_id, t.id)
                                                     OR group_transfer.parent_transfer_id = COALESCE(t.parent_transfer_id, t.id))
                                ), t.amount) AS group_total_transferred,
                                GREATEST(t.amount - COALESCE(e.total_expense, 0) - COALESCE(a.total_transferred, 0) - COALESCE(r.total_returned, 0), 0) AS computed_remaining,
                i.amount AS source_income_amount,
                i.category AS source_income_category,
                COALESCE(u.name, u.username, t.created_by) AS created_by_name
            FROM transfers t
            LEFT JOIN (
                SELECT transfer_id, SUM(expense_amount) AS total_expense
                FROM expenses
                GROUP BY transfer_id
            ) e ON e.transfer_id = t.id
            LEFT JOIN (
                SELECT transfer_id, SUM(amount) AS total_transferred
                FROM transfer_allocations
                GROUP BY transfer_id
            ) a ON a.transfer_id = t.id
            LEFT JOIN (
                SELECT transfer_id, SUM(amount) AS total_returned
                FROM transfer_returns
                GROUP BY transfer_id
            ) r ON r.transfer_id = t.id
            LEFT JOIN income i ON i.id = t.source_income_id
            LEFT JOIN users u ON u.user_id = t.created_by
            WHERE t.user_id = ?
            ORDER BY t.transfer_date DESC, t.created_at DESC
        `, [userId]);

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
            total_transferred: Number(r.total_transferred || 0),
            total_returned: Number(r.total_returned || 0),
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
        const userId = req.user?.user_id;
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

        const receiptPath = req.file
            ? `/uploads/transfer-receipts/${req.file.filename}`
            : null;

        const [result] = await db.query(
            `INSERT INTO transfers
                (user_id, title, amount, remaining_amount, source_income_id, category, transfer_from, transfer_to, transfer_date, payment_method, notes, receipt, created_by, updated_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId || null,
                title.trim(),
                numericAmount,
                numericAmount,
                sourceIncomeId ? Number(sourceIncomeId) : null,
                category,
                "Account",
                "Account",
                date,
                paymentMethod || "Cash",
                notes || null,
                receiptPath,
                userId || null,
                userId || null,
            ]
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

        const [transferRows] = await db.query("SELECT * FROM transfers WHERE id = ? AND user_id = ?", [id, req.user?.user_id]);
        const existingTransfer = transferRows[0];

        if (!existingTransfer) {
            return res.status(404).json({ message: "Transfer not found." });
        }

        const newAmount = normalizeMoney(amount ?? existingTransfer.amount);
        if (newAmount === null || newAmount <= 0) {
            return res.status(400).json({ message: "Transfer amount must be greater than zero." });
        }

        const [[usageTotals]] = await db.query(
            `SELECT
                (SELECT COALESCE(SUM(expense_amount), 0) FROM expenses WHERE transfer_id = ?) AS total_expenses,
                (SELECT COALESCE(SUM(amount), 0) FROM transfer_allocations WHERE transfer_id = ?) AS total_allocated,
                (SELECT COALESCE(SUM(amount), 0) FROM transfer_returns WHERE transfer_id = ?) AS total_returned,
                (SELECT COALESCE(SUM(amount), 0) FROM transfer_adjustments WHERE transfer_id = ?) AS total_adjustments`,
            [id, id, id, id]
        );
        const totalUsed = Number(usageTotals.total_expenses || 0)
            + Number(usageTotals.total_allocated || 0)
            + Number(usageTotals.total_returned || 0);
        if (newAmount < totalUsed) {
            return res.status(400).json({ message: "Transfer amount cannot be less than amounts already spent or transferred." });
        }
        if (Number(usageTotals.total_adjustments || 0) > 0 && newAmount < Number(existingTransfer.amount)) {
            return res.status(400).json({ message: "A transfer with extra amount history cannot be reduced." });
        }

        const currentSourceIncomeId = existingTransfer.source_income_id ? Number(existingTransfer.source_income_id) : null;
        const targetIncomeId = sourceIncomeId ? Number(sourceIncomeId) : currentSourceIncomeId;
        if (Number(usageTotals.total_returned || 0) > 0 && targetIncomeId !== currentSourceIncomeId) {
            return res.status(400).json({ message: "A transfer returned to income cannot be reassigned to another income record." });
        }
        if (Number(usageTotals.total_adjustments || 0) > 0 && targetIncomeId !== currentSourceIncomeId) {
            return res.status(400).json({ message: "A transfer with extra amount history cannot be reassigned to another income record." });
        }

        // Validation for new amount vs income
        if (targetIncomeId) {
            const [incomeRows] = await db.query("SELECT * FROM income WHERE id = ?", [targetIncomeId]);
            const targetIncome = incomeRows[0];
            if (!targetIncome) {
                return res.status(400).json({ message: "Selected income record was not found." });
            }

            // check if the new transfer will exceed income
            const [[transferSumRow]] = await db.query(
                `SELECT
                    (SELECT COALESCE(SUM(t.amount - COALESCE(a.total_added, 0)), 0)
                     FROM transfers t
                     LEFT JOIN (
                        SELECT transfer_id, SUM(amount) AS total_added
                        FROM transfer_adjustments
                        GROUP BY transfer_id
                     ) a ON a.transfer_id = t.id
                     WHERE t.source_income_id = ? AND t.id != ?) +
                    (SELECT COALESCE(SUM(amount), 0) FROM transfer_adjustments WHERE income_id = ? AND transfer_id != ?) -
                    (SELECT COALESCE(SUM(amount), 0) FROM transfer_returns WHERE income_id = ? AND transfer_id != ?) AS net_transferred`,
                [targetIncomeId, id, targetIncomeId, id, targetIncomeId, id]
            );
            const otherTransfers = Number(transferSumRow.net_transferred || 0);
            const availableAmount = Number(targetIncome.amount || 0) - otherTransfers;
            
            if (newAmount > availableAmount) {
                return res.status(400).json({
                    message: `Insufficient income balance. Available amount for new transfers: ₹${availableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                });
            }
        }

        await db.query(
            `UPDATE transfers
             SET user_id = ?, title = ?, amount = ?, source_income_id = ?, category = ?, transfer_from = ?, transfer_to = ?, transfer_date = ?, payment_method = ?, notes = ?, receipt = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND user_id = ?`,
            [
                req.user?.user_id || existingTransfer.user_id,
                (title || existingTransfer.title).trim(),
                newAmount,
                targetIncomeId || null,
                category || existingTransfer.category,
                existingTransfer.transfer_from || "Account",
                existingTransfer.transfer_to || "Account",
                date || existingTransfer.transfer_date,
                paymentMethod || existingTransfer.payment_method || "Cash",
                notes ?? existingTransfer.notes,
                req.file ? `/uploads/transfer-receipts/${req.file.filename}` : (existingTransfer.receipt || null),
                req.user?.user_id || existingTransfer.user_id,
                id,
                req.user?.user_id,
            ]
        );

        const transferRemaining = Number(Math.max(newAmount - totalUsed, 0).toFixed(2));
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
        const [transferRows] = await db.query("SELECT * FROM transfers WHERE id = ? AND user_id = ?", [id, req.user?.user_id]);
        const transfer = transferRows[0];

        if (!transfer) {
            return res.status(404).json({ message: "Transfer not found." });
        }

        const [[historyCount]] = await db.query(
            `SELECT
                (SELECT COUNT(*) FROM transfer_allocations WHERE transfer_id = ? AND user_id = ?) +
                (SELECT COUNT(*) FROM transfer_returns WHERE transfer_id = ? AND user_id = ?) +
                (SELECT COUNT(*) FROM transfer_adjustments WHERE transfer_id = ? AND user_id = ?) +
                (SELECT COUNT(*) FROM transfers WHERE parent_transfer_id = ? AND user_id = ?) AS total`,
            [id, req.user?.user_id, id, req.user?.user_id, id, req.user?.user_id, id, req.user?.user_id]
        );
        if (Number(historyCount.total) > 0) {
            return res.status(409).json({ message: "This transfer has history and cannot be deleted." });
        }

        await db.query("DELETE FROM transfers WHERE id = ? AND user_id = ?", [id, req.user?.user_id]);

        if (transfer.source_income_id) {
            await applyIncomeBalanceDelta(Number(transfer.source_income_id));
        }

        res.json({ message: "Transfer deleted successfully" });
    } catch (error) {
        console.error("Delete Transfer Error:", error);
        res.status(500).json({ message: "Failed to delete transfer", error: error.message });
    }
};

exports.getTransferHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.user_id;
        const [transferRows] = await db.query(
            "SELECT id FROM transfers WHERE id = ? AND user_id = ?",
            [id, userId]
        );

        if (!transferRows[0]) {
            return res.status(404).json({ message: "Transfer not found." });
        }

        const [rows] = await db.query(
            `SELECT history.*, COALESCE(u.name, u.username, history.created_by) AS created_by_name
             FROM (
                SELECT CONCAT('transfer-', original.id) AS history_key, original.id, original.user_id,
                    original.id AS transfer_id, 0 AS previous_amount,
                    original.amount - COALESCE((
                        SELECT SUM(adjustment.amount) FROM transfer_adjustments adjustment
                        WHERE adjustment.transfer_id = original.id
                    ), 0) AS amount,
                    original.amount - COALESCE((
                        SELECT SUM(adjustment.amount) FROM transfer_adjustments adjustment
                        WHERE adjustment.transfer_id = original.id
                    ), 0) AS remaining_amount,
                    original.title AS purpose,
                    original.notes AS reason, original.transfer_date, original.created_by, original.updated_by,
                    original.created_at, original.updated_at, 'Original Transfer' AS event_type,
                    NULL AS income_title
                FROM transfers original
                WHERE original.id = ? AND original.parent_transfer_id IS NULL AND original.user_id = ?
                UNION ALL
                SELECT CONCAT('transfer-', extra.id) AS history_key, extra.id, extra.user_id,
                    extra.parent_transfer_id AS transfer_id,
                    parent.amount + COALESCE((
                        SELECT SUM(earlier.amount) FROM transfers earlier
                        WHERE earlier.parent_transfer_id = parent.id AND earlier.id < extra.id
                    ), 0) AS previous_amount,
                    extra.amount,
                    parent.amount + COALESCE((
                        SELECT SUM(prior.amount) FROM transfers prior
                        WHERE prior.parent_transfer_id = parent.id AND prior.id <= extra.id
                    ), 0) AS remaining_amount,
                    extra.title AS purpose, extra.notes AS reason, extra.transfer_date,
                    extra.created_by, extra.updated_by, extra.created_at, extra.updated_at,
                    'Extra Transfer' AS event_type, i.title AS income_title
                FROM transfers extra
                INNER JOIN transfers parent ON parent.id = extra.parent_transfer_id
                LEFT JOIN income i ON i.id = extra.source_income_id
                WHERE parent.id = ? AND extra.user_id = ?
                UNION ALL
                SELECT CONCAT('adjustment-', adjustment.id) AS history_key, adjustment.transfer_id AS id,
                    adjustment.user_id, adjustment.transfer_id, adjustment.previous_amount, adjustment.amount,
                    adjustment.total_amount AS remaining_amount, adjustment.purpose, adjustment.reason,
                    adjustment.transfer_date, adjustment.created_by, adjustment.updated_by,
                    adjustment.created_at, adjustment.updated_at, 'Extra Amount Added' AS event_type,
                    i.title AS income_title
                FROM transfer_adjustments adjustment
                LEFT JOIN income i ON i.id = adjustment.income_id
                WHERE adjustment.transfer_id = ? AND adjustment.user_id = ?
             ) history
             LEFT JOIN users u ON u.user_id = history.created_by
             ORDER BY history.id ASC, history.created_at ASC`,
            [id, userId, id, userId, id, userId]
        );

        res.json(rows);
    } catch (error) {
        console.error("Fetch Transfer History Error:", error);
        res.status(500).json({ message: "Failed to fetch transfer history", error: error.message });
    }
};

exports.createTransferHistory = async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.user_id;
    const { amount, purpose, reason, date } = req.body;
    const numericAmount = normalizeMoney(amount);

    if (numericAmount === null || numericAmount <= 0) {
        return res.status(400).json({ message: "Transfer amount must be greater than zero." });
    }
    if (!purpose || !String(purpose).trim() || !date) {
        return res.status(400).json({ message: "Purpose and transfer date are required." });
    }

    let connection;
    let transactionStarted = false;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        transactionStarted = true;

        const [transferRows] = await connection.query(
            "SELECT * FROM transfers WHERE id = ? AND user_id = ? FOR UPDATE",
            [id, userId]
        );
        const transfer = transferRows[0];

        if (!transfer) {
            await connection.rollback();
            transactionStarted = false;
            return res.status(404).json({ message: "Transfer not found." });
        }

        const [[expenseTotals]] = await connection.query(
            "SELECT COALESCE(SUM(expense_amount), 0) AS total FROM expenses WHERE transfer_id = ?",
            [id]
        );
        const [[allocationTotals]] = await connection.query(
            "SELECT COALESCE(SUM(amount), 0) AS total FROM transfer_allocations WHERE transfer_id = ?",
            [id]
        );
        const [[returnTotals]] = await connection.query(
            "SELECT COALESCE(SUM(amount), 0) AS total FROM transfer_returns WHERE transfer_id = ?",
            [id]
        );
        const currentRemaining = Number(Math.max(
            Number(transfer.amount) - Number(expenseTotals.total)
                - Number(allocationTotals.total) - Number(returnTotals.total),
            0
        ).toFixed(2));

        if (numericAmount > currentRemaining) {
            await connection.rollback();
            transactionStarted = false;
            return res.status(400).json({
                message: `Transfer amount exceeds the current remaining amount of ₹${currentRemaining.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
            });
        }

        const remainingAmount = Number((currentRemaining - numericAmount).toFixed(2));
        const [result] = await connection.query(
            `INSERT INTO transfer_allocations
                (user_id, transfer_id, previous_amount, amount, remaining_amount, purpose, reason, transfer_date, created_by, updated_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, id, currentRemaining, numericAmount, remainingAmount, String(purpose).trim(), reason || null, date, userId, userId]
        );

        await connection.query(
            "UPDATE transfers SET remaining_amount = ?, updated_by = ? WHERE id = ? AND user_id = ?",
            [remainingAmount, userId, id, userId]
        );
        await connection.commit();
        transactionStarted = false;

        const [historyRows] = await db.query(
            `SELECT h.*, COALESCE(u.name, u.username, h.created_by) AS created_by_name
             FROM transfer_allocations h
             LEFT JOIN users u ON u.user_id = h.created_by
             WHERE h.id = ? AND h.user_id = ?`,
            [result.insertId, userId]
        );

        res.status(201).json({ message: "Transfer saved successfully", transfer: historyRows[0] });
    } catch (error) {
        if (connection && transactionStarted) await connection.rollback();
        console.error("Create Transfer History Error:", error);
        res.status(500).json({ message: "Failed to save transfer", error: error.message });
    } finally {
        connection?.release();
    }
};

exports.returnTransferRemainingToIncome = async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.user_id;
    let connection;
    let transactionStarted = false;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        transactionStarted = true;

        const [transferRows] = await connection.query(
            "SELECT * FROM transfers WHERE id = ? AND user_id = ? FOR UPDATE",
            [id, userId]
        );
        const transfer = transferRows[0];
        if (!transfer) {
            await connection.rollback();
            transactionStarted = false;
            return res.status(404).json({ message: "Transfer not found." });
        }
        if (!transfer.source_income_id) {
            await connection.rollback();
            transactionStarted = false;
            return res.status(400).json({ message: "This transfer is not linked to a source income." });
        }

        const incomeId = Number(transfer.source_income_id);
        const [incomeRows] = await connection.query(
            "SELECT id FROM income WHERE id = ? AND user_id = ? FOR UPDATE",
            [incomeId, userId]
        );
        if (!incomeRows[0]) {
            await connection.rollback();
            transactionStarted = false;
            return res.status(400).json({ message: "The linked income record is no longer available." });
        }

        const [[usageTotals]] = await connection.query(
            `SELECT
                (SELECT COALESCE(SUM(expense_amount), 0) FROM expenses WHERE transfer_id = ?) AS total_expenses,
                (SELECT COALESCE(SUM(amount), 0) FROM transfer_allocations WHERE transfer_id = ?) AS total_allocated,
                (SELECT COALESCE(SUM(amount), 0) FROM transfer_returns WHERE transfer_id = ?) AS total_returned`,
            [id, id, id]
        );
        const amountToReturn = Number(Math.max(
            Number(transfer.amount) - Number(usageTotals.total_expenses || 0)
                - Number(usageTotals.total_allocated || 0) - Number(usageTotals.total_returned || 0),
            0
        ).toFixed(2));

        if (amountToReturn <= 0) {
            await connection.rollback();
            transactionStarted = false;
            return res.status(400).json({ message: "No remaining amount is available to move to income." });
        }

        await connection.query(
            `INSERT INTO transfer_returns (user_id, transfer_id, income_id, amount, created_by, updated_by)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, id, incomeId, amountToReturn, userId, userId]
        );
        await connection.query(
            "UPDATE transfers SET remaining_amount = 0, updated_by = ? WHERE id = ? AND user_id = ?",
            [userId, id, userId]
        );
        await applyIncomeBalanceDelta(incomeId, connection);
        await connection.commit();
        transactionStarted = false;

        const [[updatedTransfer]] = await db.query(
            "SELECT * FROM transfers WHERE id = ? AND user_id = ?",
            [id, userId]
        );
        const [[updatedIncome]] = await db.query(
            "SELECT remaining_amount FROM income WHERE id = ? AND user_id = ?",
            [incomeId, userId]
        );

        res.json({
            message: `${amountToReturn.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} returned to income successfully.`,
            transfer: updatedTransfer,
            returned_amount: amountToReturn,
            income_remaining_amount: Number(updatedIncome.remaining_amount || 0),
        });
    } catch (error) {
        if (connection && transactionStarted) await connection.rollback();
        console.error("Return Transfer To Income Error:", error);
        res.status(500).json({ message: "Failed to return transfer amount to income", error: error.message });
    } finally {
        connection?.release();
    }
};

exports.createTransferAddition = async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.user_id;
    const { amount, incomeId, purpose, reason, date } = req.body;
    const numericAmount = normalizeMoney(amount);
    const numericIncomeId = Number(incomeId);

    if (numericAmount === null || numericAmount <= 0) {
        return res.status(400).json({ message: "Amount to add must be greater than zero." });
    }
    if (!Number.isInteger(numericIncomeId) || numericIncomeId <= 0 || !purpose || !String(purpose).trim() || !date) {
        return res.status(400).json({ message: "Select an income, purpose, and transfer date." });
    }

    let connection;
    let transactionStarted = false;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        transactionStarted = true;

        const [transferRows] = await connection.query(
            "SELECT * FROM transfers WHERE id = ? AND user_id = ? FOR UPDATE",
            [id, userId]
        );
        const transfer = transferRows[0];
        if (!transfer) {
            await connection.rollback();
            transactionStarted = false;
            return res.status(404).json({ message: "Transfer not found." });
        }
        if (transfer.parent_transfer_id) {
            await connection.rollback();
            transactionStarted = false;
            return res.status(400).json({ message: "Select the original transfer to add another transaction." });
        }

        const [incomeRows] = await connection.query(
            "SELECT * FROM income WHERE id = ? AND user_id = ? FOR UPDATE",
            [numericIncomeId, userId]
        );
        const income = incomeRows[0];
        if (!income) {
            await connection.rollback();
            transactionStarted = false;
            return res.status(404).json({ message: "Selected income record was not found." });
        }

        const incomeAvailable = Number(income.remaining_amount ?? income.amount ?? 0);
        if (numericAmount > incomeAvailable) {
            await connection.rollback();
            transactionStarted = false;
            return res.status(400).json({
                message: `Insufficient income balance. Available: ₹${incomeAvailable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            });
        }

        const [[completedTotal]] = await connection.query(
            "SELECT COALESCE(SUM(amount), 0) AS total FROM transfers WHERE user_id = ? AND (id = ? OR parent_transfer_id = ?)",
            [userId, id, id]
        );
        const previousAmount = Number(completedTotal.total || transfer.amount || 0);
        const totalTransferred = Number((previousAmount + numericAmount).toFixed(2));
        const [[expenseTotals]] = await connection.query(
            "SELECT COALESCE(SUM(expense_amount), 0) AS total FROM expenses WHERE transfer_id = ?",
            [id]
        );
        const [[allocationTotals]] = await connection.query(
            "SELECT COALESCE(SUM(amount), 0) AS total FROM transfer_allocations WHERE transfer_id = ?",
            [id]
        );
        const [[returnTotals]] = await connection.query(
            "SELECT COALESCE(SUM(amount), 0) AS total FROM transfer_returns WHERE transfer_id = ?",
            [id]
        );
        const previousRemaining = Number(Math.max(
            Number(transfer.amount) - Number(expenseTotals.total || 0)
                - Number(allocationTotals.total || 0) - Number(returnTotals.total || 0),
            0
        ).toFixed(2));
        const nextRemaining = Number((previousRemaining + numericAmount).toFixed(2));
        const updatedTransferAmount = Number((Number(transfer.amount) + numericAmount).toFixed(2));

        const [adjustmentResult] = await connection.query(
            `INSERT INTO transfer_adjustments
                (user_id, transfer_id, income_id, previous_amount, amount, total_amount, purpose, reason, transfer_date, created_by, updated_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, id, numericIncomeId, previousAmount, numericAmount, totalTransferred, String(purpose).trim(), reason || null, date, userId, userId]
        );
        await connection.query(
            "UPDATE transfers SET amount = ?, remaining_amount = ?, updated_by = ? WHERE id = ? AND user_id = ?",
            [updatedTransferAmount, nextRemaining, userId, id, userId]
        );
        await applyIncomeBalanceDelta(Number(transfer.source_income_id), connection);
        if (numericIncomeId !== Number(transfer.source_income_id)) {
            await applyIncomeBalanceDelta(numericIncomeId, connection);
        }
        await connection.commit();
        transactionStarted = false;

        const [[updatedTransfer]] = await db.query(
            "SELECT * FROM transfers WHERE id = ? AND user_id = ?",
            [id, userId]
        );
        const [[updatedIncome]] = await db.query(
            "SELECT remaining_amount FROM income WHERE id = ? AND user_id = ?",
            [numericIncomeId, userId]
        );
        const [[adjustment]] = await db.query(
            `SELECT adjustment.*, i.title AS income_title, COALESCE(u.name, u.username, adjustment.created_by) AS created_by_name
             FROM transfer_adjustments adjustment
             LEFT JOIN income i ON i.id = adjustment.income_id
             LEFT JOIN users u ON u.user_id = adjustment.created_by
             WHERE adjustment.id = ? AND adjustment.user_id = ?`,
            [adjustmentResult.insertId, userId]
        );

        res.status(201).json({
            message: "Transfer amount updated successfully.",
            transfer: updatedTransfer,
            adjustment,
            previous_amount: previousAmount,
            total_transferred: totalTransferred,
            income_remaining_amount: Number(updatedIncome.remaining_amount || 0),
        });
    } catch (error) {
        if (connection && transactionStarted) await connection.rollback();
        console.error("Create Extra Transfer Error:", error);
        res.status(500).json({ message: "Failed to add extra transfer", error: error.message });
    } finally {
        connection?.release();
    }
};