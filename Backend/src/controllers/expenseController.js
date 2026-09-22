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

const applyTransferBalanceDelta = async (transferId) => {
    if (!transferId) return;

    // Recalculate remaining amount based on total expense amount for this transfer
    const [transferRows] = await db.query("SELECT * FROM transfers WHERE id = ?", [transferId]);
    if (!transferRows[0]) return;
    const transferAmount = Number(transferRows[0].amount || 0);

    const [expenseSumRows] = await db.query(
        "SELECT COALESCE(SUM(expense_amount), 0) as total_expenses FROM expenses WHERE transfer_id = ?",
        [transferId]
    );
    const totalExpenses = Number(expenseSumRows[0].total_expenses || 0);
    const updatedRemaining = Number(Math.max(transferAmount - totalExpenses, 0).toFixed(2));

    await db.query("UPDATE transfers SET remaining_amount = ? WHERE id = ?", [updatedRemaining, transferId]);
};

exports.createExpense = async (req, res) => {
    try {
        const {
            title,
            expense_amount,
            transfer_amount,
            transfer_id,
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
        const validTransferId = transfer_id ? Number(transfer_id) : null;

        if (!Number.isFinite(numericExpense) || numericExpense <= 0) {
            return res.status(400).json({ message: "Expense amount must be a valid positive number." });
        }
        if (numericTransfer !== null && (!Number.isFinite(numericTransfer) || numericTransfer < 0)) {
            return res.status(400).json({ message: "Transfer amount must be a valid non-negative number." });
        }

        let remaining = null;

        if (validTransferId) {
            const [transferRows] = await db.query("SELECT * FROM transfers WHERE id = ?", [validTransferId]);
            const targetTransfer = transferRows[0];
            if (!targetTransfer) {
                return res.status(400).json({ message: "Selected transfer record was not found." });
            }

            const currentRemaining = Number(targetTransfer.remaining_amount ?? targetTransfer.amount ?? 0);
            if (numericExpense > currentRemaining) {
                return res.status(400).json({
                    message: `Expense amount exceeds the remaining transfer amount.`,
                });
            }

            remaining = Number(Math.max(currentRemaining - numericExpense, 0).toFixed(2));
        } else if (numericTransfer !== null) {
            remaining = Number(Math.max(numericTransfer - numericExpense, 0).toFixed(2));
        }

        const attachmentPath = req.file
            ? `/uploads/expense-receipts/${req.file.filename}`
            : null;

        const [result] = await db.query(
            `INSERT INTO expenses
                (title, expense_amount, transfer_amount, transfer_id, remaining_amount, category, payment_method, expense_date, notes, recurring, attachment)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title.trim(),
                numericExpense,
                numericTransfer,
                validTransferId,
                remaining,
                category,
                payment_method || "Cash",
                date,
                notes || null,
                recurring === "Yes" ? "Yes" : "No",
                attachmentPath,
            ]
        );

        if (validTransferId) {
            await applyTransferBalanceDelta(validTransferId);
        }

        const [rows] = await db.query("SELECT * FROM expenses WHERE id = ?", [result.insertId]);
        res.status(201).json({ message: "Expense added successfully", expense: rows[0] });
    } catch (error) {
        console.error("Create Expense Error:", error);
        res.status(500).json({ message: "Failed to add expense", error: error.message });
    }
};

exports.updateExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            expense_amount,
            transfer_amount,
            transfer_id,
            category,
            payment_method,
            date,
            notes,
            recurring,
        } = req.body;

        const [existingRows] = await db.query("SELECT * FROM expenses WHERE id = ?", [id]);
        const existingExpense = existingRows[0];
        
        if (!existingExpense) {
            return res.status(404).json({ message: "Expense not found." });
        }

        const numericExpense = expense_amount ? Number(expense_amount) : Number(existingExpense.expense_amount);
        const numericTransfer = transfer_amount ? Number(transfer_amount) : existingExpense.transfer_amount;
        const currentTransferId = existingExpense.transfer_id ? Number(existingExpense.transfer_id) : null;
        const validTransferId = transfer_id !== undefined ? (transfer_id ? Number(transfer_id) : null) : currentTransferId;

        if (!Number.isFinite(numericExpense) || numericExpense <= 0) {
            return res.status(400).json({ message: "Expense amount must be a valid positive number." });
        }
        if (numericTransfer !== null && (!Number.isFinite(numericTransfer) || numericTransfer < 0)) {
            return res.status(400).json({ message: "Transfer amount must be a valid non-negative number." });
        }

        if (validTransferId) {
            const [transferRows] = await db.query("SELECT * FROM transfers WHERE id = ?", [validTransferId]);
            const targetTransfer = transferRows[0];
            if (!targetTransfer) {
                return res.status(400).json({ message: "Selected transfer record was not found." });
            }

            // Check if the new expense will exceed the transfer's total amount
            const [expenseSumRows] = await db.query(
                "SELECT COALESCE(SUM(expense_amount), 0) as total_expenses FROM expenses WHERE transfer_id = ? AND id != ?",
                [validTransferId, id]
            );
            const otherExpenses = Number(expenseSumRows[0].total_expenses || 0);
            const availableAmount = Number(targetTransfer.amount || 0) - otherExpenses;
            
            if (numericExpense > availableAmount) {
                return res.status(400).json({
                    message: `Expense amount exceeds the remaining transfer amount.`,
                });
            }
        }

        const remaining = numericTransfer !== null ? numericTransfer - numericExpense : null;
        const attachmentPath = req.file ? `/uploads/expense-receipts/${req.file.filename}` : existingExpense.attachment;

        await db.query(
            `UPDATE expenses
             SET title = ?, expense_amount = ?, transfer_amount = ?, transfer_id = ?, remaining_amount = ?, category = ?, payment_method = ?, expense_date = ?, notes = ?, recurring = ?, attachment = ?
             WHERE id = ?`,
            [
                (title || existingExpense.title).trim(),
                numericExpense,
                numericTransfer,
                validTransferId,
                remaining,
                category || existingExpense.category,
                payment_method || existingExpense.payment_method,
                date || existingExpense.expense_date,
                notes !== undefined ? notes : existingExpense.notes,
                recurring === "Yes" ? "Yes" : (recurring === "No" ? "No" : existingExpense.recurring),
                attachmentPath,
                id,
            ]
        );

        if (currentTransferId) await applyTransferBalanceDelta(currentTransferId);
        if (validTransferId && validTransferId !== currentTransferId) await applyTransferBalanceDelta(validTransferId);

        const [rows] = await db.query("SELECT * FROM expenses WHERE id = ?", [id]);
        res.json({ message: "Expense updated successfully", expense: rows[0] });
    } catch (error) {
        console.error("Update Expense Error:", error);
        res.status(500).json({ message: "Failed to update expense", error: error.message });
    }
};

exports.deleteExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const [expenseRows] = await db.query("SELECT * FROM expenses WHERE id = ?", [id]);
        const expense = expenseRows[0];
        
        if (!expense) {
            return res.status(404).json({ message: "Expense not found" });
        }

        await db.query("DELETE FROM expenses WHERE id = ?", [id]);

        if (expense.transfer_id) {
            await applyTransferBalanceDelta(Number(expense.transfer_id));
        }

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
