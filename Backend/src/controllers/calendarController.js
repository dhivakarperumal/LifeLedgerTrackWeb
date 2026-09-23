const crypto = require("crypto");
const db = require("../config/db");

const formatLocalDate = (date) => {
  const current = new Date(date);
  const year = current.getFullYear();
  const month = String(current.getMonth() + 1).padStart(2, "0");
  const day = String(current.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatLocalTime = (date) => {
  const current = new Date(date);
  const hours = String(current.getHours()).padStart(2, "0");
  const minutes = String(current.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const formatDate = (date) => formatLocalDate(date);
const makeId = (prefix) => `${prefix}_${crypto.randomBytes(4).toString("hex")}`;
const safeNumber = (value) => Number(value || 0);

const rowToEvent = (row) => ({
  id: row.id,
  userId: row.user_id || null,
  createdBy: row.created_by || null,
  updatedBy: row.updated_by || null,
  title: row.title,
  category: row.category,
  startDate: formatLocalDate(row.start_date),
  startTime: row.start_time || "",
  endDate: formatLocalDate(row.end_date || row.start_date),
  endTime: row.end_time || "",
  allDay: Boolean(row.all_day),
  location: row.location || "",
  description: row.description || "",
  priority: row.priority || "Medium",
  color: row.color || "#7C3AED",
  reminder: row.reminder || "15 minutes before",
  repeat: row.repeat_option || "None",
  attachment: row.attachment || "",
  status: row.status || "Upcoming",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const rowToReminder = (row) => ({
  id: row.id,
  userId: row.user_id || null,
  createdBy: row.created_by || null,
  updatedBy: row.updated_by || null,
  title: row.title,
  category: row.category,
  reminderDate: formatLocalDate(row.reminder_date),
  reminderTime: row.reminder_time || "",
  priority: row.priority || "Medium",
  notes: row.notes || "",
  relatedEvent: row.related_event || null,
  notificationEnabled: row.notification_enabled !== false,
  repeat: row.repeat_option || "None",
  status: row.status || "Pending",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  completedAt: row.completed_at,
  snoozedAt: row.snoozed_at,
});

const parseReminderTime = (reminderDate, reminderTime) => {
  if (!reminderDate) return new Date(0);
  const base = `${reminderDate}T${reminderTime || "00:00"}:00`;
  return new Date(base);
};

const sortByDate = (items, field) => [...items].sort((a, b) => new Date(a[field]) - new Date(b[field]));

const getTodayKey = () => formatLocalDate(new Date());

const getUpcomingEvents = (events) => events.filter((event) => event.status !== "Completed" && event.status !== "Cancelled");

exports.getEvents = async (req, res) => {
  try {
    const currentUserId = req.user?.user_id || null;
    if (!currentUserId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const [rows] = await db.query(
      "SELECT * FROM calendar_events WHERE user_id = ? ORDER BY start_date ASC, start_time ASC",
      [currentUserId]
    );
    return res.json({ success: true, data: rows.map(rowToEvent) });
  } catch (error) {
    console.error("Get events error:", error);
    return res.status(500).json({ success: false, message: "Unable to fetch events.", error: error.message });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const currentUserId = req.user?.user_id || null;
    if (!currentUserId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const [rows] = await db.query("SELECT * FROM calendar_events WHERE id = ? AND user_id = ?", [req.params.id, currentUserId]);
    if (!rows[0]) return res.status(404).json({ success: false, message: "Event not found." });
    return res.json({ success: true, data: rowToEvent(rows[0]) });
  } catch (error) {
    console.error("Get event by id error:", error);
    return res.status(500).json({ success: false, message: "Unable to fetch event.", error: error.message });
  }
};

exports.createEvent = async (req, res) => {
  const payload = req.body || {};
  const title = String(payload.title || "").trim();
  const category = String(payload.category || "").trim();
  const startDate = String(payload.startDate || "").trim();
  const currentUserId = req.user?.user_id || payload.user_id || null;

  if (!title || !category || !startDate) {
    return res.status(400).json({ success: false, message: "Title, category and start date are required." });
  }

  try {
    const eventId = makeId("evt");
    const endDate = payload.endDate || startDate;
    const insertValues = [
      eventId,
      currentUserId,
      title,
      category,
      startDate,
      payload.startTime || null,
      endDate,
      payload.endTime || null,
      Boolean(payload.allDay),
      payload.location || "",
      payload.description || "",
      payload.priority || "Medium",
      payload.color || "#7C3AED",
      payload.reminder || "15 minutes before",
      payload.repeat || "None",
      payload.attachment || "",
      payload.status || "Upcoming",
      currentUserId,
      currentUserId,
    ];

    await db.query(
      `INSERT INTO calendar_events
        (id, user_id, title, category, start_date, start_time, end_date, end_time, all_day, location, description, priority, color, reminder, repeat_option, attachment, status, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      insertValues
    );

    const [rows] = await db.query("SELECT * FROM calendar_events WHERE id = ?", [eventId]);
    return res.status(201).json({ success: true, data: rowToEvent(rows[0]), message: "Event created successfully." });
  } catch (error) {
    console.error("Create event error:", error);
    return res.status(500).json({ success: false, message: "Unable to create event.", error: error.message });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const currentUserId = req.user?.user_id || null;
    const [rows] = await db.query("SELECT * FROM calendar_events WHERE id = ? AND user_id = ?", [req.params.id, currentUserId]);
    const existing = rows[0];
    if (!existing) return res.status(404).json({ success: false, message: "Event not found." });

    const payload = req.body || {};
    const updated = {
      user_id: currentUserId || payload.user_id || existing.user_id,
      title: String(payload.title || existing.title).trim(),
      category: String(payload.category || existing.category).trim(),
      start_date: payload.startDate || existing.start_date,
      start_time: payload.startTime ?? existing.start_time,
      end_date: payload.endDate || existing.end_date || existing.start_date,
      end_time: payload.endTime ?? existing.end_time,
      all_day: payload.allDay !== undefined ? Boolean(payload.allDay) : Boolean(existing.all_day),
      location: payload.location ?? existing.location,
      description: payload.description ?? existing.description,
      priority: payload.priority || existing.priority,
      color: payload.color || existing.color,
      reminder: payload.reminder || existing.reminder,
      repeat_option: payload.repeat || existing.repeat_option,
      attachment: payload.attachment ?? existing.attachment,
      status: payload.status || existing.status,
    };

    await db.query(
      `UPDATE calendar_events
       SET user_id = ?, title = ?, category = ?, start_date = ?, start_time = ?, end_date = ?, end_time = ?, all_day = ?, location = ?, description = ?, priority = ?, color = ?, reminder = ?, repeat_option = ?, attachment = ?, status = ?, updated_by = ?, updated_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [
        updated.user_id,
        updated.title,
        updated.category,
        updated.start_date,
        updated.start_time,
        updated.end_date,
        updated.end_time,
        updated.all_day ? 1 : 0,
        updated.location,
        updated.description,
        updated.priority,
        updated.color,
        updated.reminder,
        updated.repeat_option,
        updated.attachment,
        updated.status,
        currentUserId || updated.user_id,
        req.params.id,
        existing.user_id,
      ]
    );

    const [updatedRows] = await db.query("SELECT * FROM calendar_events WHERE id = ?", [req.params.id]);
    return res.json({ success: true, data: rowToEvent(updatedRows[0]), message: "Event updated successfully." });
  } catch (error) {
    console.error("Update event error:", error);
    return res.status(500).json({ success: false, message: "Unable to update event.", error: error.message });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const currentUserId = req.user?.user_id || null;
    const [result] = await db.query("DELETE FROM calendar_events WHERE id = ? AND user_id = ?", [req.params.id, currentUserId]);
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Event not found." });
    }
    return res.json({ success: true, message: "Event deleted successfully." });
  } catch (error) {
    console.error("Delete event error:", error);
    return res.status(500).json({ success: false, message: "Unable to delete event.", error: error.message });
  }
};

exports.getReminders = async (req, res) => {
  try {
    const currentUserId = req.user?.user_id || null;
    if (!currentUserId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const [rows] = await db.query(
      "SELECT * FROM calendar_reminders WHERE user_id = ? ORDER BY reminder_date ASC, reminder_time ASC",
      [currentUserId]
    );
    return res.json({ success: true, data: rows.map(rowToReminder) });
  } catch (error) {
    console.error("Get reminders error:", error);
    return res.status(500).json({ success: false, message: "Unable to fetch reminders.", error: error.message });
  }
};

exports.getReminderById = async (req, res) => {
  try {
    const currentUserId = req.user?.user_id || null;
    if (!currentUserId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const [rows] = await db.query("SELECT * FROM calendar_reminders WHERE id = ? AND user_id = ?", [req.params.id, currentUserId]);
    if (!rows[0]) return res.status(404).json({ success: false, message: "Reminder not found." });
    return res.json({ success: true, data: rowToReminder(rows[0]) });
  } catch (error) {
    console.error("Get reminder by id error:", error);
    return res.status(500).json({ success: false, message: "Unable to fetch reminder.", error: error.message });
  }
};

exports.createReminder = async (req, res) => {
  const payload = req.body || {};
  const title = String(payload.title || "").trim();
  const category = String(payload.category || "").trim();
  const reminderDate = String(payload.reminderDate || "").trim();
  const currentUserId = req.user?.user_id || payload.user_id || null;

  if (!title || !category || !reminderDate) {
    return res.status(400).json({ success: false, message: "Title, category and reminder date are required." });
  }

  try {
    const reminderId = makeId("rem");
    await db.query(
      `INSERT INTO calendar_reminders
        (id, user_id, title, category, reminder_date, reminder_time, priority, notes, related_event, notification_enabled, repeat_option, status, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reminderId,
        currentUserId,
        title,
        category,
        reminderDate,
        payload.reminderTime || "09:00",
        payload.priority || "Medium",
        payload.notes || "",
        payload.relatedEvent || null,
        payload.notificationEnabled !== false ? 1 : 0,
        payload.repeat || "None",
        payload.status || "Pending",
        currentUserId,
        currentUserId,
      ]
    );

    const [rows] = await db.query("SELECT * FROM calendar_reminders WHERE id = ?", [reminderId]);
    return res.status(201).json({ success: true, data: rowToReminder(rows[0]), message: "Reminder created successfully." });
  } catch (error) {
    console.error("Create reminder error:", error);
    return res.status(500).json({ success: false, message: "Unable to create reminder.", error: error.message });
  }
};

exports.updateReminder = async (req, res) => {
  try {
    const currentUserId = req.user?.user_id || null;
    const [rows] = await db.query("SELECT * FROM calendar_reminders WHERE id = ? AND user_id = ?", [req.params.id, currentUserId]);
    const existing = rows[0];
    if (!existing) return res.status(404).json({ success: false, message: "Reminder not found." });

    const payload = req.body || {};
    const updated = {
      user_id: currentUserId || payload.user_id || existing.user_id,
      title: String(payload.title || existing.title).trim(),
      category: String(payload.category || existing.category).trim(),
      reminder_date: payload.reminderDate || existing.reminder_date,
      reminder_time: payload.reminderTime ?? existing.reminder_time,
      priority: payload.priority || existing.priority,
      notes: payload.notes ?? existing.notes,
      related_event: payload.relatedEvent ?? existing.related_event,
      notification_enabled: payload.notificationEnabled !== undefined ? Boolean(payload.notificationEnabled) : existing.notification_enabled,
      repeat_option: payload.repeat || existing.repeat_option,
      status: payload.status || existing.status,
    };

    await db.query(
      `UPDATE calendar_reminders
       SET user_id = ?, title = ?, category = ?, reminder_date = ?, reminder_time = ?, priority = ?, notes = ?, related_event = ?, notification_enabled = ?, repeat_option = ?, status = ?, updated_by = ?, updated_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [
        updated.user_id,
        updated.title,
        updated.category,
        updated.reminder_date,
        updated.reminder_time,
        updated.priority,
        updated.notes,
        updated.related_event,
        updated.notification_enabled ? 1 : 0,
        updated.repeat_option,
        updated.status,
        currentUserId || updated.user_id,
        req.params.id,
        existing.user_id,
      ]
    );

    const [updatedRows] = await db.query("SELECT * FROM calendar_reminders WHERE id = ?", [req.params.id]);
    return res.json({ success: true, data: rowToReminder(updatedRows[0]), message: "Reminder updated successfully." });
  } catch (error) {
    console.error("Update reminder error:", error);
    return res.status(500).json({ success: false, message: "Unable to update reminder.", error: error.message });
  }
};

exports.deleteReminder = async (req, res) => {
  try {
    const currentUserId = req.user?.user_id || null;
    const [result] = await db.query("DELETE FROM calendar_reminders WHERE id = ? AND user_id = ?", [req.params.id, currentUserId]);
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Reminder not found." });
    }
    return res.json({ success: true, message: "Reminder deleted successfully." });
  } catch (error) {
    console.error("Delete reminder error:", error);
    return res.status(500).json({ success: false, message: "Unable to delete reminder.", error: error.message });
  }
};

exports.markReminderCompleted = async (req, res) => {
  try {
    const currentUserId = req.user?.user_id || null;
    const [rows] = await db.query("SELECT * FROM calendar_reminders WHERE id = ? AND user_id = ?", [req.params.id, currentUserId]);
    if (!rows[0]) return res.status(404).json({ success: false, message: "Reminder not found." });

    await db.query(
      "UPDATE calendar_reminders SET status = ?, completed_at = NOW(), updated_by = ?, updated_at = NOW() WHERE id = ? AND user_id = ?",
      ["Completed", currentUserId, req.params.id, currentUserId]
    );

    const [updatedRows] = await db.query("SELECT * FROM calendar_reminders WHERE id = ? AND user_id = ?", [req.params.id, currentUserId]);
    return res.json({ success: true, data: rowToReminder(updatedRows[0]), message: "Reminder marked as completed." });
  } catch (error) {
    console.error("Mark reminder complete error:", error);
    return res.status(500).json({ success: false, message: "Unable to update reminder.", error: error.message });
  }
};

exports.snoozeReminder = async (req, res) => {
  try {
    const currentUserId = req.user?.user_id || null;
    const [rows] = await db.query("SELECT * FROM calendar_reminders WHERE id = ? AND user_id = ?", [req.params.id, currentUserId]);
    const reminder = rows[0];
    if (!reminder) return res.status(404).json({ success: false, message: "Reminder not found." });

    const minutes = safeNumber(req.body?.minutes || 10);
    const current = parseReminderTime(reminder.reminder_date, reminder.reminder_time);
    const snoozed = new Date(current.getTime() + minutes * 60000);
    const nextDate = formatDate(snoozed);
    const nextTime = formatLocalTime(snoozed);

    await db.query(
      "UPDATE calendar_reminders SET status = ?, reminder_date = ?, reminder_time = ?, snoozed_at = NOW(), updated_by = ?, updated_at = NOW() WHERE id = ? AND user_id = ?",
      ["Snoozed", nextDate, nextTime, currentUserId, req.params.id, currentUserId]
    );

    const [updatedRows] = await db.query("SELECT * FROM calendar_reminders WHERE id = ? AND user_id = ?", [req.params.id, currentUserId]);
    return res.json({ success: true, data: rowToReminder(updatedRows[0]), message: "Reminder snoozed successfully." });
  } catch (error) {
    console.error("Snooze reminder error:", error);
    return res.status(500).json({ success: false, message: "Unable to snooze reminder.", error: error.message });
  }
};

exports.getUpcomingReminders = async (req, res) => {
  try {
    const currentUserId = req.user?.user_id || null;
    if (!currentUserId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const [rows] = await db.query(
      "SELECT * FROM calendar_reminders WHERE user_id = ? AND status NOT IN ('Completed', 'Cancelled') AND reminder_date >= CURDATE() ORDER BY reminder_date ASC, reminder_time ASC",
      [currentUserId]
    );
    return res.json({ success: true, data: rows.map(rowToReminder) });
  } catch (error) {
    console.error("Get upcoming reminders error:", error);
    return res.status(500).json({ success: false, message: "Unable to fetch upcoming reminders.", error: error.message });
  }
};

exports.getOverdueReminders = async (req, res) => {
  try {
    const currentUserId = req.user?.user_id || null;
    if (!currentUserId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const [rows] = await db.query(
      "SELECT * FROM calendar_reminders WHERE user_id = ? AND (status = 'Pending' OR status = 'Overdue') AND reminder_date < CURDATE() ORDER BY reminder_date ASC, reminder_time ASC",
      [currentUserId]
    );
    return res.json({ success: true, data: rows.map(rowToReminder) });
  } catch (error) {
    console.error("Get overdue reminders error:", error);
    return res.status(500).json({ success: false, message: "Unable to fetch overdue reminders.", error: error.message });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const currentUserId = req.user?.user_id || null;
    if (!currentUserId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const [todayEventRows] = await db.query("SELECT COUNT(*) AS total FROM calendar_events WHERE user_id = ? AND start_date = CURDATE() ", [currentUserId]);
    const [todayReminderRows] = await db.query("SELECT COUNT(*) AS total FROM calendar_reminders WHERE user_id = ? AND reminder_date = CURDATE() ", [currentUserId]);
    const [upcomingEventRows] = await db.query(
      "SELECT COUNT(*) AS total FROM calendar_events WHERE user_id = ? AND status NOT IN ('Completed', 'Cancelled') AND start_date >= CURDATE()",
      [currentUserId]
    );
    const [upcomingReminderRows] = await db.query(
      "SELECT COUNT(*) AS total FROM calendar_reminders WHERE user_id = ? AND status NOT IN ('Completed', 'Cancelled') AND reminder_date >= CURDATE()",
      [currentUserId]
    );
    const [overdueReminderRows] = await db.query(
      "SELECT COUNT(*) AS total FROM calendar_reminders WHERE user_id = ? AND (status = 'Pending' OR status = 'Overdue') AND reminder_date < CURDATE()",
      [currentUserId]
    );
    const [completedEventRows] = await db.query("SELECT COUNT(*) AS total FROM calendar_events WHERE user_id = ? AND status = 'Completed' ", [currentUserId]);
    const [monthEventRows] = await db.query(
      "SELECT COUNT(*) AS total FROM calendar_events WHERE user_id = ? AND MONTH(start_date) = MONTH(CURDATE()) AND YEAR(start_date) = YEAR(CURDATE())",
      [currentUserId]
    );
    const [importantEventRows] = await db.query(
      "SELECT COUNT(*) AS total FROM calendar_events WHERE user_id = ? AND (priority = 'High' OR category = 'Important')",
      [currentUserId]
    );

    return res.json({
      success: true,
      data: {
        todayEvents: Number(todayEventRows[0]?.total || 0),
        todayReminders: Number(todayReminderRows[0]?.total || 0),
        upcomingEvents: Number(upcomingEventRows[0]?.total || 0),
        upcomingReminders: Number(upcomingReminderRows[0]?.total || 0),
        overdueReminders: Number(overdueReminderRows[0]?.total || 0),
        completedEvents: Number(completedEventRows[0]?.total || 0),
        thisMonthEvents: Number(monthEventRows[0]?.total || 0),
        importantEvents: Number(importantEventRows[0]?.total || 0),
      },
    });
  } catch (error) {
    console.error("Get summary error:", error);
    return res.status(500).json({ success: false, message: "Unable to fetch summary.", error: error.message });
  }
};
