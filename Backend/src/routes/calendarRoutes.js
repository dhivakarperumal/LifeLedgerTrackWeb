const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const calendarController = require("../controllers/calendarController");

router.use(requireAuth);

router.get("/events", calendarController.getEvents);
router.get("/events/:id", calendarController.getEventById);
router.post("/events", calendarController.createEvent);
router.put("/events/:id", calendarController.updateEvent);
router.delete("/events/:id", calendarController.deleteEvent);

router.get("/reminders", calendarController.getReminders);
router.get("/reminders/:id", calendarController.getReminderById);
router.post("/reminders", calendarController.createReminder);
router.put("/reminders/:id", calendarController.updateReminder);
router.delete("/reminders/:id", calendarController.deleteReminder);
router.post("/reminders/:id/complete", calendarController.markReminderCompleted);
router.post("/reminders/:id/snooze", calendarController.snoozeReminder);
router.get("/reminders/upcoming", calendarController.getUpcomingReminders);
router.get("/reminders/overdue", calendarController.getOverdueReminders);
router.get("/summary", calendarController.getSummary);

module.exports = router;
