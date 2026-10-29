const db = require("../config/db");

const STATUSES = ["Pending", "In Progress", "Completed"];
const PRIORITIES = ["High", "Medium", "Low"];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const REMINDER_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const isValidDate = (value) => {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const rowToTask = (row) => ({
  id: row.id,
  title: row.title,
  description: row.description || "",
  amount: row.amount === null || row.amount === undefined ? "" : String(row.amount),
  status: row.status,
  priority: row.priority,
  dueDate: row.due_date || "",
  reminderAt: row.reminder_at
    ? String(row.reminder_at).replace(" ", "T").slice(0, 16)
    : "",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const parsePayload = (payload, existing = null) => {
  const title = String(payload.title ?? existing?.title ?? "").trim();
  const description = String(payload.description ?? existing?.description ?? "").trim();
  const amount = String(
    Object.prototype.hasOwnProperty.call(payload, "amount")
      ? payload.amount ?? ""
      : existing?.amount ?? ""
  ).trim();
  const status = payload.status ?? existing?.status ?? "Pending";
  const priority = payload.priority ?? existing?.priority ?? "Medium";
  const dueDate = String(payload.dueDate ?? existing?.due_date ?? "").trim();
  const existingReminder = existing?.reminder_at
    ? String(existing.reminder_at).replace(" ", "T").slice(0, 16)
    : "";
  const reminderAt = String(
    Object.prototype.hasOwnProperty.call(payload, "reminderAt")
      ? payload.reminderAt || ""
      : existingReminder
  ).trim();

  if (!title) return { error: "Task title is required." };
  if (title.length > 255) return { error: "Task title must be 255 characters or fewer." };
  if (amount && (!/^\d{1,10}(\.\d{1,2})?$/.test(amount) || !Number.isFinite(Number(amount)))) {
    return { error: "Amount must be a non-negative number with up to 2 decimal places." };
  }
  if (!STATUSES.includes(status)) return { error: "Choose a valid task status." };
  if (!PRIORITIES.includes(priority)) return { error: "Choose a valid task priority." };
  if (dueDate && !isValidDate(dueDate)) return { error: "Enter a valid due date." };
  if (reminderAt) {
    if (!REMINDER_PATTERN.test(reminderAt)) {
      return { error: "Enter a valid reminder date and time." };
    }
    const [reminderDate, reminderTime] = reminderAt.split("T");
    const [hours, minutes] = reminderTime.split(":").map(Number);
    if (
      !isValidDate(reminderDate) ||
      hours > 23 ||
      minutes > 59
    ) {
      return { error: "Enter a valid reminder date and time." };
    }
  }

  return {
    values: [
      title,
      description || null,
      amount || null,
      status,
      priority,
      dueDate || null,
      reminderAt ? `${reminderAt.replace("T", " ")}:00` : null,
    ],
  };
};

exports.getTasks = async (req, res) => {
  const userId = req.user?.user_id;
  if (!userId) return res.status(401).json({ success: false, message: "Authentication required." });

  try {
    const [rows] = await db.query(
      "SELECT * FROM todo_tasks WHERE user_id = ? ORDER BY (status = 'Completed') ASC, due_date IS NULL ASC, due_date ASC, created_at DESC",
      [userId]
    );
    return res.json({ success: true, data: rows.map(rowToTask) });
  } catch (error) {
    console.error("Get todo tasks error:", error);
    return res.status(500).json({ success: false, message: "Unable to fetch tasks." });
  }
};

exports.createTask = async (req, res) => {
  const userId = req.user?.user_id;
  if (!userId) return res.status(401).json({ success: false, message: "Authentication required." });

  const parsed = parsePayload(req.body || {});
  if (parsed.error) return res.status(400).json({ success: false, message: parsed.error });

  try {
    const [result] = await db.query(
      `INSERT INTO todo_tasks (user_id, title, description, amount, status, priority, due_date, reminder_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, ...parsed.values]
    );
    const [rows] = await db.query("SELECT * FROM todo_tasks WHERE id = ? AND user_id = ?", [result.insertId, userId]);
    return res.status(201).json({
      success: true,
      data: rowToTask(rows[0]),
      message: "Task added successfully.",
    });
  } catch (error) {
    console.error("Create todo task error:", error);
    return res.status(500).json({ success: false, message: "Unable to save task." });
  }
};

exports.updateTask = async (req, res) => {
  const userId = req.user?.user_id;
  if (!userId) return res.status(401).json({ success: false, message: "Authentication required." });

  try {
    const [rows] = await db.query("SELECT * FROM todo_tasks WHERE id = ? AND user_id = ?", [req.params.id, userId]);
    const existing = rows[0];
    if (!existing) return res.status(404).json({ success: false, message: "Task not found." });

    const parsed = parsePayload(req.body || {}, existing);
    if (parsed.error) return res.status(400).json({ success: false, message: parsed.error });

    await db.query(
      `UPDATE todo_tasks
       SET title = ?, description = ?, amount = ?, status = ?, priority = ?, due_date = ?, reminder_at = ?, updated_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [...parsed.values, req.params.id, userId]
    );
    const [updatedRows] = await db.query("SELECT * FROM todo_tasks WHERE id = ? AND user_id = ?", [req.params.id, userId]);
    return res.json({
      success: true,
      data: rowToTask(updatedRows[0]),
      message: "Task updated successfully.",
    });
  } catch (error) {
    console.error("Update todo task error:", error);
    return res.status(500).json({ success: false, message: "Unable to update task." });
  }
};

exports.deleteTask = async (req, res) => {
  const userId = req.user?.user_id;
  if (!userId) return res.status(401).json({ success: false, message: "Authentication required." });

  try {
    const [result] = await db.query("DELETE FROM todo_tasks WHERE id = ? AND user_id = ?", [req.params.id, userId]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "Task not found." });
    return res.json({ success: true, message: "Task deleted successfully." });
  } catch (error) {
    console.error("Delete todo task error:", error);
    return res.status(500).json({ success: false, message: "Unable to delete task." });
  }
};
