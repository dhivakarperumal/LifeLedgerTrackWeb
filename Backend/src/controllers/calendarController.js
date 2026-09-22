const crypto = require("crypto");

const state = {
  events: [
    {
      id: "evt_1",
      title: "Team Sync",
      category: "Work",
      startDate: new Date().toISOString().slice(0, 10),
      startTime: "09:30",
      endDate: new Date().toISOString().slice(0, 10),
      endTime: "10:00",
      allDay: false,
      location: "Office",
      description: "Weekly project sync and milestone review.",
      priority: "High",
      color: "#8B5CF6",
      reminder: "15 minutes before",
      repeat: "Weekly",
      attachment: "",
      status: "Upcoming",
      createdAt: new Date().toISOString(),
    },
    {
      id: "evt_2",
      title: "Family Dinner",
      category: "Family",
      startDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      startTime: "19:00",
      endDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      endTime: "21:00",
      allDay: false,
      location: "Home",
      description: "Dinner with family members.",
      priority: "Medium",
      color: "#F59E0B",
      reminder: "1 hour before",
      repeat: "None",
      attachment: "",
      status: "Upcoming",
      createdAt: new Date().toISOString(),
    },
  ],
  reminders: [
    {
      id: "rem_1",
      title: "Pay Electricity Bill",
      category: "Bill Due",
      reminderDate: new Date().toISOString().slice(0, 10),
      reminderTime: "18:30",
      priority: "High",
      notes: "Pay before 8:30 PM.",
      relatedEvent: "evt_1",
      notificationEnabled: true,
      repeat: "None",
      status: "Pending",
      createdAt: new Date().toISOString(),
    },
    {
      id: "rem_2",
      title: "Doctor Appointment Follow-up",
      category: "Health",
      reminderDate: new Date(Date.now() + 172800000).toISOString().slice(0, 10),
      reminderTime: "08:00",
      priority: "Medium",
      notes: "Bring test reports.",
      relatedEvent: null,
      notificationEnabled: true,
      repeat: "None",
      status: "Pending",
      createdAt: new Date().toISOString(),
    },
  ],
};

const formatDate = (date) => new Date(date).toISOString().slice(0, 10);
const makeId = (prefix) => `${prefix}_${crypto.randomBytes(4).toString("hex")}`;

const safeNumber = (value) => Number(value || 0);

const parseReminderTime = (reminderDate, reminderTime) => {
  if (!reminderDate) return new Date(0);
  const base = `${reminderDate}T${reminderTime || "00:00"}:00`;
  return new Date(base);
};

const sortByDate = (items, field) => [...items].sort((a, b) => new Date(a[field]) - new Date(b[field]));

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const getUpcomingEvents = () => state.events.filter((event) => event.status !== "Completed" && event.status !== "Cancelled");

exports.getEvents = (req, res) => {
  res.json({ success: true, data: sortByDate(state.events, "startDate") });
};

exports.getEventById = (req, res) => {
  const event = state.events.find((item) => item.id === req.params.id);
  if (!event) return res.status(404).json({ success: false, message: "Event not found." });
  return res.json({ success: true, data: event });
};

exports.createEvent = (req, res) => {
  const payload = req.body || {};
  const title = String(payload.title || "").trim();
  const category = String(payload.category || "").trim();
  const startDate = String(payload.startDate || "").trim();

  if (!title || !category || !startDate) {
    return res.status(400).json({ success: false, message: "Title, category and start date are required." });
  }

  const endDate = payload.endDate || startDate;
  const event = {
    id: makeId("evt"),
    title,
    category,
    startDate,
    startTime: payload.startTime || "",
    endDate,
    endTime: payload.endTime || "",
    allDay: Boolean(payload.allDay),
    location: payload.location || "",
    description: payload.description || "",
    priority: payload.priority || "Medium",
    color: payload.color || "#7C3AED",
    reminder: payload.reminder || "15 minutes before",
    repeat: payload.repeat || "None",
    attachment: payload.attachment || "",
    status: payload.status || "Upcoming",
    createdAt: new Date().toISOString(),
  };

  state.events.unshift(event);
  return res.status(201).json({ success: true, data: event, message: "Event created successfully." });
};

exports.updateEvent = (req, res) => {
  const event = state.events.find((item) => item.id === req.params.id);
  if (!event) return res.status(404).json({ success: false, message: "Event not found." });

  const payload = req.body || {};
  Object.assign(event, {
    ...event,
    ...payload,
    title: String(payload.title || event.title).trim(),
    category: String(payload.category || event.category).trim(),
    startDate: payload.startDate || event.startDate,
    endDate: payload.endDate || event.endDate || event.startDate,
    updatedAt: new Date().toISOString(),
  });

  return res.json({ success: true, data: event, message: "Event updated successfully." });
};

exports.deleteEvent = (req, res) => {
  const before = state.events.length;
  state.events = state.events.filter((item) => item.id !== req.params.id);
  if (state.events.length === before) {
    return res.status(404).json({ success: false, message: "Event not found." });
  }
  return res.json({ success: true, message: "Event deleted successfully." });
};

exports.getReminders = (req, res) => {
  res.json({ success: true, data: sortByDate(state.reminders, "reminderDate") });
};

exports.getReminderById = (req, res) => {
  const reminder = state.reminders.find((item) => item.id === req.params.id);
  if (!reminder) return res.status(404).json({ success: false, message: "Reminder not found." });
  return res.json({ success: true, data: reminder });
};

exports.createReminder = (req, res) => {
  const payload = req.body || {};
  const title = String(payload.title || "").trim();
  const category = String(payload.category || "").trim();
  const reminderDate = String(payload.reminderDate || "").trim();

  if (!title || !category || !reminderDate) {
    return res.status(400).json({ success: false, message: "Title, category and reminder date are required." });
  }

  const reminder = {
    id: makeId("rem"),
    title,
    category,
    reminderDate,
    reminderTime: payload.reminderTime || "09:00",
    priority: payload.priority || "Medium",
    notes: payload.notes || "",
    relatedEvent: payload.relatedEvent || null,
    notificationEnabled: payload.notificationEnabled !== false,
    repeat: payload.repeat || "None",
    status: payload.status || "Pending",
    createdAt: new Date().toISOString(),
  };

  state.reminders.unshift(reminder);
  return res.status(201).json({ success: true, data: reminder, message: "Reminder created successfully." });
};

exports.updateReminder = (req, res) => {
  const reminder = state.reminders.find((item) => item.id === req.params.id);
  if (!reminder) return res.status(404).json({ success: false, message: "Reminder not found." });

  const payload = req.body || {};
  Object.assign(reminder, {
    ...reminder,
    ...payload,
    title: String(payload.title || reminder.title).trim(),
    category: String(payload.category || reminder.category).trim(),
    reminderDate: payload.reminderDate || reminder.reminderDate,
    updatedAt: new Date().toISOString(),
  });

  return res.json({ success: true, data: reminder, message: "Reminder updated successfully." });
};

exports.deleteReminder = (req, res) => {
  const before = state.reminders.length;
  state.reminders = state.reminders.filter((item) => item.id !== req.params.id);
  if (state.reminders.length === before) {
    return res.status(404).json({ success: false, message: "Reminder not found." });
  }
  return res.json({ success: true, message: "Reminder deleted successfully." });
};

exports.markReminderCompleted = (req, res) => {
  const reminder = state.reminders.find((item) => item.id === req.params.id);
  if (!reminder) return res.status(404).json({ success: false, message: "Reminder not found." });
  reminder.status = "Completed";
  reminder.completedAt = new Date().toISOString();
  return res.json({ success: true, data: reminder, message: "Reminder marked as completed." });
};

exports.snoozeReminder = (req, res) => {
  const reminder = state.reminders.find((item) => item.id === req.params.id);
  if (!reminder) return res.status(404).json({ success: false, message: "Reminder not found." });
  const minutes = safeNumber(req.body?.minutes || 10);
  const current = parseReminderTime(reminder.reminderDate, reminder.reminderTime);
  const snoozed = new Date(current.getTime() + minutes * 60000);
  reminder.status = "Snoozed";
  reminder.reminderDate = formatDate(snoozed);
  reminder.reminderTime = snoozed.toISOString().slice(11, 16);
  return res.json({ success: true, data: reminder, message: "Reminder snoozed successfully." });
};

exports.getUpcomingReminders = (req, res) => {
  const now = new Date();
  const items = state.reminders.filter((item) => item.status !== "Completed" && item.status !== "Cancelled");
  const upcoming = items.filter((item) => parseReminderTime(item.reminderDate, item.reminderTime) >= now);
  res.json({ success: true, data: sortByDate(upcoming, "reminderDate") });
};

exports.getOverdueReminders = (req, res) => {
  const now = new Date();
  const overdue = state.reminders.filter((item) =>
    (item.status === "Pending" || item.status === "Overdue") &&
    parseReminderTime(item.reminderDate, item.reminderTime) < now
  );
  res.json({ success: true, data: sortByDate(overdue, "reminderDate") });
};

exports.getSummary = (req, res) => {
  const todayKey = getTodayKey();
  const todayEvents = state.events.filter((event) => event.startDate === todayKey);
  const todayReminders = state.reminders.filter((reminder) => reminder.reminderDate === todayKey);
  const upcomingEvents = getUpcomingEvents().filter((event) => new Date(event.startDate) >= new Date(todayKey));
  const upcomingReminders = state.reminders.filter((rem) => rem.status !== "Completed" && rem.status !== "Cancelled" && new Date(rem.reminderDate) >= new Date(todayKey));
  const overdueReminders = state.reminders.filter((rem) => (rem.status === "Pending" || rem.status === "Overdue") && new Date(rem.reminderDate) < new Date(todayKey));
  const completedEvents = state.events.filter((event) => event.status === "Completed");
  const thisMonthEvents = state.events.filter((event) => {
    const date = new Date(event.startDate);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });
  const importantEvents = state.events.filter((event) => event.priority === "High" || event.category === "Important");

  res.json({
    success: true,
    data: {
      todayEvents: todayEvents.length,
      todayReminders: todayReminders.length,
      upcomingEvents: upcomingEvents.length,
      upcomingReminders: upcomingReminders.length,
      overdueReminders: overdueReminders.length,
      completedEvents: completedEvents.length,
      thisMonthEvents: thisMonthEvents.length,
      importantEvents: importantEvents.length,
    },
  });
};
