import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  CalendarDays,
  BellRing,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Sparkles,
  CheckCircle2,
  Trash2,
  PencilLine,
  X,
  NotebookPen,
} from "lucide-react";
import api from "../../api";

const VIEW_MODES = ["month", "week", "day", "agenda"];
const HOURS = Array.from({ length: 24 }, (_, idx) => idx);

const formatDate = (value, opts = {}) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...opts,
  }).format(date);
};

const toDateInput = (date = new Date()) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toMonthLabel = (date) =>
  new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(
    date,
  );

const startOfMonth = (currentDate) => {
  const date = new Date(currentDate);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
};

const addMonths = (date, months) => {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
};

const getDaysInMonthGrid = (monthDate) => {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startWeekDay = firstDay.getDay();
  const firstGridDay = new Date(firstDay);
  firstGridDay.setDate(firstDay.getDate() - startWeekDay);

  const days = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(firstGridDay);
    date.setDate(firstGridDay.getDate() + i);
    days.push(date);
  }
  return days;
};

const isSameDay = (a, b) => {
  if (!a || !b) return false;

  const format = (val) => {
    if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    return toDateInput(val);
  };

  return format(a) === format(b);
};

const sortItems = (items, key) =>
  [...items].sort((a, b) => {
    const valA = typeof key === "function" ? key(a) : a[key];
    const valB = typeof key === "function" ? key(b) : b[key];
    return new Date(valA) - new Date(valB);
  });

const defaultEventForm = {
  title: "",
  category: "Personal",
  startDate: toDateInput(),
  startTime: "09:00",
  endTime: "10:00",
  location: "",
  description: "",
  priority: "Medium",
  color: "#8B5CF6",
  reminder: "15 minutes before",
  repeat: "None",
};

const defaultReminderForm = {
  title: "",
  category: "Personal",
  reminderDate: toDateInput(),
  reminderTime: "09:00",
  priority: "Medium",
  notes: "",
  notificationEnabled: true,
  repeat: "",
};

const CalendarReminder = () => {
  const [viewMode, setViewMode] = useState("month");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()));
  const [events, setEvents] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [calendarCategoryOptions, setCalendarCategoryOptions] = useState([]);
  const [summary, setSummary] = useState({
    todayEvents: 0,
    todayReminders: 0,
    upcomingEvents: 0,
    upcomingReminders: 0,
    overdueReminders: 0,
    completedEvents: 0,
  });
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelType, setPanelType] = useState("event");
  const [eventForm, setEventForm] = useState(defaultEventForm);
  const [reminderForm, setReminderForm] = useState(defaultReminderForm);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const [eventsRes, remindersRes, summaryRes, categoriesRes] =
        await Promise.all([
          api.get("/calendar/events").catch(() => ({ data: { data: [] } })),
          api.get("/calendar/reminders").catch(() => ({ data: { data: [] } })),
          api
            .get("/calendar/summary")
            .catch(() => ({
              data: {
                data: {
                  todayEvents: 0,
                  todayReminders: 0,
                  upcomingEvents: 0,
                  overdueReminders: 0,
                },
              },
            })),
          api.get("/categories").catch(() => ({ data: [] })),
        ]);

      const eventList = Array.isArray(eventsRes?.data?.data)
        ? eventsRes.data.data
        : [];
      const reminderList = Array.isArray(remindersRes?.data?.data)
        ? remindersRes.data.data
        : [];
      const summaryData = summaryRes?.data?.data || {};
      const categoryList = Array.isArray(categoriesRes?.data)
        ? categoriesRes.data
        : Array.isArray(categoriesRes?.data?.data)
          ? categoriesRes.data.data
          : [];

      const mappedCategories = categoryList
        .map((category) => category?.name)
        .filter(Boolean)
        .filter((name, index, arr) => arr.indexOf(name) === index);

      setEvents(eventList);
      setReminders(reminderList);
      setCalendarCategoryOptions(mappedCategories);
      setSummary({
        todayEvents: Number(summaryData.todayEvents || 0),
        todayReminders: Number(summaryData.todayReminders || 0),
        upcomingEvents: Number(summaryData.upcomingEvents || 0),
        upcomingReminders: Number(summaryData.upcomingReminders || 0),
        overdueReminders: Number(summaryData.overdueReminders || 0),
        completedEvents: Number(summaryData.completedEvents || 0),
      });
    } catch (error) {
      console.error("Calendar fetch failed", error);
      setCalendarCategoryOptions([]);
      setEvents([]);
      setReminders([]);
      setSummary({
        todayEvents: 0,
        todayReminders: 0,
        upcomingEvents: 0,
        upcomingReminders: 0,
        overdueReminders: 0,
        completedEvents: 0,
      });
      toast.error(
        error?.response?.data?.message || "Failed to load calendar data.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, []);

  useEffect(() => {
    if (!calendarCategoryOptions.length) return;

    if (!calendarCategoryOptions.includes(eventForm.category)) {
      setEventForm((prev) => ({ ...prev, category: calendarCategoryOptions[0] }));
    }

    if (!calendarCategoryOptions.includes(reminderForm.category)) {
      setReminderForm((prev) => ({ ...prev, category: calendarCategoryOptions[0] }));
    }
  }, [calendarCategoryOptions]);

  const monthDays = useMemo(
    () => getDaysInMonthGrid(calendarMonth),
    [calendarMonth],
  );

  const onChangeEventForm = (field, value) =>
    setEventForm((prev) => ({ ...prev, [field]: value }));
  const onChangeReminderForm = (field, value) =>
    setReminderForm((prev) => ({ ...prev, [field]: value }));

  const openPanel = (type) => {
    setPanelType(type);
    setEditingItem(null);
    setPanelOpen(true);
  };

  const openEditItem = (type, item) => {
    setPanelType(type);
    setEditingItem(item);
    if (type === "event") {
      setEventForm({
        ...defaultEventForm,
        ...item,
        title: item.title || "",
        category: item.category || "Personal",
        startDate: item.startDate || toDateInput(),
        startTime: item.startTime || "09:00",
        endTime: item.endTime || "10:00",
        location: item.location || "",
        description: item.description || "",
        priority: item.priority || "Medium",
        color: item.color || "#8B5CF6",
        reminder: item.reminder || "15 minutes before",
        repeat: item.repeat || "None",
      });
    } else {
      setReminderForm({
        ...defaultReminderForm,
        ...item,
        title: item.title || "",
        category: item.category || "Personal",
        reminderDate: item.reminderDate || toDateInput(),
        reminderTime: item.reminderTime || "09:00",
        priority: item.priority || "Medium",
        notes: item.notes || "",
        notificationEnabled: item.notificationEnabled !== false,
        repeat: item.repeat || "",
      });
    }
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setEditingItem(null);
    setEventForm(defaultEventForm);
    setReminderForm(defaultReminderForm);
  };

  const handleCreateEvent = async () => {
    if (
      !eventForm.title.trim() ||
      !eventForm.category.trim() ||
      !eventForm.startDate
    ) {
      toast.error("Title, category and start date are required.");
      return;
    }

    try {
      const payload = {
        ...eventForm,
        title: eventForm.title.trim(),
        category: eventForm.category.trim(),
        description: eventForm.description?.trim() || "",
        allDay: Boolean(eventForm.allDay),
      };

      if (editingItem?.id) {
        await api.put(`/calendar/events/${editingItem.id}`, payload);
        toast.success("Event updated successfully.");
      } else {
        await api.post("/calendar/events", payload);
        toast.success("Event added successfully.");
      }

      closePanel();
      fetchCalendar();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to save event.");
    }
  };

  const handleCreateReminder = async () => {
    if (
      !reminderForm.title.trim() ||
      !reminderForm.category.trim() ||
      !reminderForm.reminderDate
    ) {
      toast.error("Title, category and reminder date are required.");
      return;
    }

    try {
      const payload = {
        ...reminderForm,
        title: reminderForm.title.trim(),
        category: reminderForm.category.trim(),
        notes: reminderForm.notes?.trim() || "",
      };

      if (editingItem?.id) {
        await api.put(`/calendar/reminders/${editingItem.id}`, payload);
        toast.success("Reminder updated successfully.");
      } else {
        await api.post("/calendar/reminders", payload);
        toast.success("Reminder added successfully.");
      }

      closePanel();
      fetchCalendar();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to save reminder.");
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await api.delete(`/calendar/events/${eventId}`);
      toast.success("Event removed.");
      fetchCalendar();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to delete event.");
    }
  };

  const handleDeleteReminder = async (reminderId) => {
    try {
      await api.delete(`/calendar/reminders/${reminderId}`);
      toast.success("Reminder removed.");
      fetchCalendar();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Unable to delete reminder.",
      );
    }
  };

  const handleCompleteReminder = async (reminderId) => {
    try {
      await api.post(`/calendar/reminders/${reminderId}/complete`);
      toast.success("Reminder marked complete.");
      fetchCalendar();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Unable to update reminder.",
      );
    }
  };

  const monthEvents = useMemo(() => {
    const list = [];
    events.forEach((event) => {
      const date = new Date(event.startDate);
      if (
        date.getMonth() === calendarMonth.getMonth() &&
        date.getFullYear() === calendarMonth.getFullYear()
      ) {
        list.push(event);
      }
    });
    return list;
  }, [events, calendarMonth]);

  const agendaItems = useMemo(() => {
    const all = [
      ...events.map((event) => ({ ...event, type: "event" })),
      ...reminders.map((reminder) => ({ ...reminder, type: "reminder" })),
    ];
    return sortItems(
      all,
      viewMode === "agenda"
        ? (item) => item.startDate || item.reminderDate
        : "startDate",
    );
  }, [events, reminders, viewMode]);

  const selectedDayEvents = events.filter((event) =>
    isSameDay(event.startDate, selectedDate),
  );
  const selectedDayReminders = reminders.filter((reminder) =>
    isSameDay(reminder.reminderDate, selectedDate),
  );

  const summaryCards = [
    {
      title: "Today events",
      value: summary.todayEvents || 0,
      icon: CalendarDays,
      accent: "from-violet-500 to-purple-600",
    },
    {
      title: "Today reminders",
      value: summary.todayReminders || 0,
      icon: BellRing,
      accent: "from-emerald-500 to-emerald-600",
    },
    {
      title: "Upcoming events",
      value: summary.upcomingEvents || 0,
      icon: Sparkles,
      accent: "from-sky-500 to-blue-600",
    },
    {
      title: "Overdue",
      value: summary.overdueReminders || 0,
      icon: Clock3,
      accent: "from-rose-500 to-red-600",
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
          <p className="text-sm font-semibold">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {summaryCards.map(({ title, value, icon: Icon, accent }) => (
          <div
            key={title}
            className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
                  {title}
                </p>
                <p className="mt-3 text-3xl font-bold text-slate-900">
                  {value}
                </p>
              </div>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white`}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        className="grid grid-cols-1 gap-4"
        style={{ gridTemplateColumns: "minmax(0, 1.85fr) minmax(0, 0.75fr)" }}
      >
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCalendarMonth((prev) => addMonths(prev, -1))}
                className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="min-w-[180px] text-center text-xl font-bold text-slate-900">
                {toMonthLabel(calendarMonth)}
              </div>
              <button
                onClick={() => setCalendarMonth((prev) => addMonths(prev, 1))}
                className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  setCalendarMonth(startOfMonth(today));
                  setSelectedDate(today);
                }}
                className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
              >
                Today
              </button>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1">
              {VIEW_MODES.map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold capitalize transition ${
                    viewMode === mode
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => openPanel("event")}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" /> Add Event
              </button>
            </div>
          </div>

          {viewMode === "month" && (
            <div className="grid grid-cols-7 gap-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="px-2 py-3 text-center text-xs font-bold uppercase tracking-[0.14em] text-slate-500"
                >
                  {day}
                </div>
              ))}

              {monthDays.map((date) => {
                const dayEvents = events.filter((event) =>
                  isSameDay(event.startDate, date),
                );
                const isCurrentMonth =
                  date.getMonth() === calendarMonth.getMonth();
                const isSelected = isSameDay(date, selectedDate);
                const isToday = isSameDay(date, new Date());

                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(date)}
                    className={`min-h-[120px] rounded-2xl border p-2 text-left transition ${
                      isSelected
                        ? "border-violet-500 bg-violet-50"
                        : "border-slate-200 bg-slate-50/50 hover:bg-white"
                    } ${!isCurrentMonth ? "opacity-40" : ""}`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                          isToday ? "bg-slate-900 text-white" : "text-slate-700"
                        }`}
                      >
                        {date.getDate()}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem({ type: "event", data: event });
                          }}
                          className="truncate rounded-md px-1.5 py-1 text-[10px] font-semibold text-white cursor-pointer hover:opacity-90 transition"
                          style={{ backgroundColor: event.color || "#8B5CF6" }}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[10px] font-medium text-slate-500">
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {viewMode === "week" && (
            <div className="grid gap-3 md:grid-cols-7">
              {Array.from({ length: 7 }, (_, idx) => {
                const current = new Date(selectedDate);
                current.setDate(
                  selectedDate.getDate() - selectedDate.getDay() + idx,
                );
                const dayEvents = events.filter((event) =>
                  isSameDay(event.startDate, current),
                );
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="mb-3 text-center text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      {new Intl.DateTimeFormat("en-IN", {
                        weekday: "short",
                      }).format(current)}
                    </div>
                    <div className="space-y-2">
                      {dayEvents.length > 0 ? (
                        dayEvents.map((event) => (
                          <div
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItem({ type: "event", data: event });
                            }}
                            className="rounded-xl px-2 py-2 text-xs text-white cursor-pointer hover:opacity-90 transition"
                            style={{
                              backgroundColor: event.color || "#8B5CF6",
                            }}
                          >
                            <div className="font-semibold">{event.title}</div>
                            <div className="mt-1 opacity-90">
                              {event.startTime || "All day"}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-xs text-slate-400">
                          No events
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === "day" && (
            <div className="grid gap-2">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="grid grid-cols-[72px_1fr] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2"
                >
                  <div className="text-xs font-semibold text-slate-500">
                    {String(hour).padStart(2, "0")}:00
                  </div>
                  <div className="min-h-[42px] rounded-lg bg-white p-2">
                    {events
                      .filter((event) => {
                        const sameDay = isSameDay(
                          event.startDate,
                          selectedDate,
                        );
                        const hourValue = Number(
                          (event.startTime || "00:00").split(":")[0],
                        );
                        return sameDay && hourValue === hour;
                      })
                      .map((event) => (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem({ type: "event", data: event });
                          }}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-white cursor-pointer hover:opacity-90 transition"
                          style={{ backgroundColor: event.color || "#8B5CF6" }}
                        >
                          {event.title}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === "agenda" && (
            <div className="space-y-3">
              {agendaItems.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() =>
                    setSelectedItem({ type: item.type, data: item })
                  }
                  className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 cursor-pointer hover:border-slate-300 transition"
                >
                  <div
                    className={`mt-0.5 flex h-11 w-11 items-center justify-center rounded-xl ${item.type === "event" ? "bg-violet-100 text-violet-700" : "bg-emerald-100 text-emerald-700"}`}
                  >
                    {item.type === "event" ? (
                      <CalendarDays className="h-5 w-5" />
                    ) : (
                      <BellRing className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-base font-bold text-slate-900">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                          {item.type} · {item.category}
                        </p>
                      </div>
                      <div className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600 shadow-sm">
                        {item.priority || "Medium"}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-4 w-4" />{" "}
                        {formatDate(item.startDate || item.reminderDate)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="h-4 w-4" />{" "}
                        {item.startTime || item.reminderTime || "All day"}
                      </span>
                      {item.location && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-4 w-4" /> {item.location}
                        </span>
                      )}
                    </div>
                  </div>
                  {item.type === "event" ? (
                    <div className="flex items-center gap-2 z-10 relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditItem("event", item);
                        }}
                        className="rounded-xl border border-violet-200 bg-violet-50 p-2 text-violet-600 transition hover:bg-violet-100"
                      >
                        <PencilLine className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEvent(item.id);
                        }}
                        className="rounded-xl border border-red-200 bg-red-50 p-2 text-red-600 transition hover:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 z-10 relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditItem("reminder", item);
                        }}
                        className="rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-emerald-600 transition hover:bg-emerald-100"
                      >
                        <PencilLine className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCompleteReminder(item.id);
                        }}
                        className="rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-emerald-600 transition hover:bg-emerald-100"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm text-slate-700">
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={() => setCalendarMonth((prev) => addMonths(prev, -1))}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-700 transition hover:bg-slate-200"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-xl font-bold text-slate-800">
              {toMonthLabel(calendarMonth)}
            </div>
            <button
              onClick={() => setCalendarMonth((prev) => addMonths(prev, 1))}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-700 transition hover:bg-slate-200"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-slate-600">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}

            {monthDays.map((date) => {
              const isCurrentMonth =
                date.getMonth() === calendarMonth.getMonth();
              const isSelected = isSameDay(date, selectedDate);
              const isToday = isSameDay(date, new Date());

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => setSelectedDate(date)}
                  className={`flex h-9 items-center justify-center rounded-full text-sm transition ${
                    isSelected
                      ? "bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-lg shadow-orange-500/30"
                      : isToday
                        ? "bg-blue-100 text-blue-700 ring-1 ring-blue-200"
                        : isCurrentMonth
                          ? "text-slate-700 hover:bg-slate-100"
                          : "text-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            <h3 className="text-2xl font-bold text-slate-900">
              Today's Events
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              {formatDate(selectedDate, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>

            <div className="mt-4 rounded-2xl bg-slate-100">
              {selectedDayEvents.length === 0 &&
              selectedDayReminders.length === 0 ? (
                <div className="flex items-center justify-center gap-3 rounded-xl border border-dashed border-blue-200 bg-blue-50 px-3 py-6 text-sm font-medium text-slate-700">
                  <CalendarDays className="h-5 w-5 text-blue-600" />
                  No events today
                </div>
              ) : (
                <div className="space-y-2">
                  {[
                    ...selectedDayEvents.map((event) => ({
                      ...event,
                      kind: "event",
                    })),
                    ...selectedDayReminders.map((reminder) => ({
                      ...reminder,
                      kind: "reminder",
                    })),
                  ]
                    .slice(0, 3)
                    .map((item) => (
                      <div
                        key={`${item.kind}-${item.id}`}
                        className="rounded-xl border border-slate-200 bg-slate-200/40 p-2 text-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${item.kind === "event" ? "bg-violet-100 text-violet-700" : "bg-emerald-100 text-emerald-700"}`}
                          >
                            {item.kind}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {item.priority || "Medium"}
                          </span>
                        </div>
                        <p className="mt-2 font-semibold text-slate-100">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs text-gray-600">
                          {item.startTime || item.reminderTime || "All day"}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setViewMode("agenda")}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-700"
            >
              View All Events
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6">
            <h3 className="text-2xl font-bold text-slate-900">Quick Actions</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => openPanel("event")}
                className="rounded-2xl border border-slate-200 bg-[#1f2937] p-4 text-left text-slate-100 transition hover:bg-[#243244]"
              >
                <div className="mb-3 flex h-12 w-12 text-white items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold">
                  <Plus className="h-5 w-5" />
                </div>
                <div className="text-base font-semibold text-slate-100">
                  Add Event
                </div>
              </button>

         

              

              <button
                onClick={() => openPanel("reminder")}
                className="rounded-2xl border border-slate-200 bg-[#1f2937] p-4 text-left text-slate-100 transition hover:bg-[#243244]"
              >
                <div className="mb-3 flex h-12 text-white w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-500 text-lg font-bold">
                  <BellRing className="h-5 w-5" />
                </div>
                <div className="text-base font-semibold text-slate-100">
                  Add Reminder
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
                Selected day
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">
                {formatDate(selectedDate, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </h2>
            </div>
            <button
              onClick={() => openPanel("event")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <Plus className="h-4 w-4" /> New
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-violet-600">
                Events
              </p>
              {selectedDayEvents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  No events on this date.
                </div>
              ) : (
                selectedDayEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() =>
                      setSelectedItem({ type: "event", data: event })
                    }
                    className="mb-3 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 cursor-pointer hover:border-slate-300 transition"
                  >
                    <div
                      className="mt-1 h-3.5 w-3.5 rounded-full"
                      style={{ backgroundColor: event.color || "#8B5CF6" }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-bold text-slate-900">
                          {event.title}
                        </p>
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-700">
                          {event.category}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                        <span>{event.startTime || "All day"}</span>
                        <span>{event.location || "No location"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 z-10 relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditItem("event", event);
                        }}
                        className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-violet-600"
                      >
                        <PencilLine className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEvent(event.id);
                        }}
                        className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-emerald-600">
                Reminders
              </p>
              {selectedDayReminders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  No reminders on this date.
                </div>
              ) : (
                selectedDayReminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    onClick={() =>
                      setSelectedItem({ type: "reminder", data: reminder })
                    }
                    className="mb-3 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 cursor-pointer hover:border-slate-300 transition"
                  >
                    <div className="mt-1 rounded-full bg-emerald-100 p-1.5 text-emerald-700">
                      <BellRing className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-bold text-slate-900">
                          {reminder.title}
                        </p>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                          {reminder.status || "Pending"}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-slate-600">
                        {reminder.notes || "No notes"}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 z-10 relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditItem("reminder", reminder);
                        }}
                        className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-emerald-600"
                      >
                        <PencilLine className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteReminder(reminder.id);
                        }}
                        className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
                Priority queue
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Upcoming items
              </h2>
            </div>
          </div>

          <div className="space-y-3">
            {sortItems(
              [
                ...events.map((e) => ({ ...e, type: "event" })),
                ...reminders.map((r) => ({ ...r, type: "reminder" })),
              ],
              (item) => item.startDate || item.reminderDate,
            )
              .slice(0, 6)
              .map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() =>
                    setSelectedItem({ type: item.type, data: item })
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 cursor-pointer hover:border-slate-300 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2.5 w-2.5 rounded-full ${item.type === "event" ? "bg-violet-500" : "bg-emerald-500"}`}
                      />
                      <p className="font-semibold text-slate-900">
                        {item.title}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      {item.type}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">
                    {formatDate(item.startDate || item.reminderDate)} ·{" "}
                    {item.startTime || item.reminderTime || "All day"}
                  </p>
                </div>
              ))}
          </div>
        </div>
      </div>

      {panelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="shrink-0 border-b border-violet-500 bg-gradient-to-r from-[#240046] to-[#7b2cbf] px-5 py-4 text-white">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FCD34D]">
                    {panelType === "event"
                      ? editingItem
                        ? "Edit event"
                        : "Add event"
                      : editingItem
                        ? "Edit reminder"
                        : "Add reminder"}
                  </p>
                  <h3 className="mt-2 text-2xl font-bold text-white">
                    {panelType === "event"
                      ? editingItem
                        ? "Update Calendar Event"
                        : "New Calendar Event"
                      : editingItem
                        ? "Update Reminder"
                        : "New Reminder"}
                  </h3>
                </div>
                <button
                  onClick={closePanel}
                  className="rounded-xl border border-white/20 bg-white/10 p-2 text-white transition hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {panelType === "event" ? (
              <div className="flex-1 overflow-y-auto space-y-4 p-5">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Title
                  </label>
                  <input
                    value={eventForm.title}
                    onChange={(e) => onChangeEventForm("title", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none ring-0 transition focus:border-violet-400 focus:bg-white"
                    placeholder="Team meeting"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Category
                    </label>
                    <select
                      value={eventForm.category}
                      onChange={(e) =>
                        onChangeEventForm("category", e.target.value)
                      }
                      disabled={!calendarCategoryOptions.length}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {calendarCategoryOptions.length ? (
                        calendarCategoryOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))
                      ) : (
                        <option value="">No categories available</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Priority
                    </label>
                    <select
                      value={eventForm.priority}
                      onChange={(e) =>
                        onChangeEventForm("priority", e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:bg-white"
                    >
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Date
                    </label>
                    <input
                      type="date"
                      value={eventForm.startDate}
                      onChange={(e) =>
                        onChangeEventForm("startDate", e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Time
                    </label>
                    <input
                      type="time"
                      value={eventForm.startTime}
                      onChange={(e) =>
                        onChangeEventForm("startTime", e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Location
                  </label>
                  <input
                    value={eventForm.location}
                    onChange={(e) =>
                      onChangeEventForm("location", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:bg-white"
                    placeholder="Office, home, online"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Description
                  </label>
                  <textarea
                    value={eventForm.description}
                    onChange={(e) =>
                      onChangeEventForm("description", e.target.value)
                    }
                    rows={4}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:bg-white"
                    placeholder="Add event notes"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Repeat
                  </label>
                  <select
                    value={eventForm.repeat}
                    onChange={(e) =>
                      onChangeEventForm("repeat", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:bg-white"
                  >
                    <option value="">Select Repeat</option>
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Yearly">Yearly</option>
                    <option value="None">None</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <input
                    id="event-all-day"
                    type="checkbox"
                    checked={eventForm.allDay}
                    onChange={(e) =>
                      onChangeEventForm("allDay", e.target.checked)
                    }
                    className="h-4 w-4"
                  />
                  <label
                    htmlFor="event-all-day"
                    className="text-sm font-semibold text-slate-700"
                  >
                    All Day Event
                  </label>
                </div>
                <div className="sticky bottom-[-10px] w-full mt-10 border-t border-slate-200 bg-white pt-4">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={closePanel}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateEvent}
                      className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      {editingItem ? "Update Event" : "Save Event"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-4 p-5">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Title
                  </label>
                  <input
                    value={reminderForm.title}
                    onChange={(e) =>
                      onChangeReminderForm("title", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:bg-white"
                    placeholder="Pay electricity bill"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Category
                    </label>
                    <select
                      value={reminderForm.category}
                      onChange={(e) =>
                        onChangeReminderForm("category", e.target.value)
                      }
                      disabled={!calendarCategoryOptions.length}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {calendarCategoryOptions.length ? (
                        calendarCategoryOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))
                      ) : (
                        <option value="">No categories available</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Priority
                    </label>
                    <select
                      value={reminderForm.priority}
                      onChange={(e) =>
                        onChangeReminderForm("priority", e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:bg-white"
                    >
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Reminder date
                    </label>
                    <input
                      type="date"
                      value={reminderForm.reminderDate}
                      onChange={(e) =>
                        onChangeReminderForm("reminderDate", e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Reminder time
                    </label>
                    <input
                      type="time"
                      value={reminderForm.reminderTime}
                      onChange={(e) =>
                        onChangeReminderForm("reminderTime", e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Repeat
                  </label>
                  <select
                    value={reminderForm.repeat}
                    onChange={(e) =>
                      onChangeReminderForm("repeat", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:bg-white"
                  >
                    <option value="">Select Repeat</option>
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Yearly">Yearly</option>
                    <option value="None">None</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Notes
                  </label>
                  <textarea
                    value={reminderForm.notes}
                    onChange={(e) =>
                      onChangeReminderForm("notes", e.target.value)
                    }
                    rows={4}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:bg-white"
                    placeholder="Add reminder details"
                  />
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <input
                    id="notify"
                    type="checkbox"
                    checked={reminderForm.notificationEnabled}
                    onChange={(e) =>
                      onChangeReminderForm(
                        "notificationEnabled",
                        e.target.checked,
                      )
                    }
                    className="h-4 w-4"
                  />
                  <label
                    htmlFor="notify"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Send notification
                  </label>
                </div>
                <div className="sticky bottom-0 mt-4 border-t border-slate-200 bg-white pt-4">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={closePanel}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateReminder}
                      className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
                    >
                      {editingItem ? "Update Reminder" : "Save Reminder"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            {/* Header with color banner */}
            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{
                backgroundColor:
                  selectedItem.data.color ||
                  (selectedItem.type === "event" ? "#8B5CF6" : "#10B981"),
              }}
            >
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {selectedItem.type === "event" ? (
                  <CalendarDays className="h-5 w-5" />
                ) : (
                  <BellRing className="h-5 w-5" />
                )}
                {selectedItem.data.title}
              </h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="rounded-xl bg-black/10 p-1.5 text-white hover:bg-black/20 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
                    selectedItem.type === "event"
                      ? "bg-violet-100 text-violet-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {selectedItem.data.category}
                </span>
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase text-slate-600">
                  {selectedItem.data.priority || "Medium"} Priority
                </span>
              </div>

              <div className="space-y-2.5 text-sm text-slate-700">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-4 w-4 text-slate-400" />
                  <span>
                    {formatDate(
                      selectedItem.type === "event"
                        ? selectedItem.data.startDate
                        : selectedItem.data.reminderDate,
                    )}
                    {selectedItem.data.allDay ? " (All day)" : ""}
                  </span>
                </div>

                {!selectedItem.data.allDay &&
                  (selectedItem.data.startTime ||
                    selectedItem.data.reminderTime) && (
                    <div className="flex items-center gap-3">
                      <Clock3 className="h-4 w-4 text-slate-400" />
                      <span>
                        {selectedItem.data.startTime ||
                          selectedItem.data.reminderTime}
                        {selectedItem.data.endTime
                          ? ` - ${selectedItem.data.endTime}`
                          : ""}
                      </span>
                    </div>
                  )}

                {selectedItem.data.location && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <span>{selectedItem.data.location}</span>
                  </div>
                )}

                {selectedItem.data.repeat &&
                  selectedItem.data.repeat !== "None" && (
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-4 w-4 text-slate-400" />
                      <span>Repeats {selectedItem.data.repeat}</span>
                    </div>
                  )}
              </div>

              {(selectedItem.data.description || selectedItem.data.notes) && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Details
                  </p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {selectedItem.data.description || selectedItem.data.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  if (selectedItem.type === "event") {
                    handleDeleteEvent(selectedItem.data.id);
                  } else {
                    handleDeleteReminder(selectedItem.data.id);
                  }
                  setSelectedItem(null);
                }}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 transition"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  setSelectedItem(null);
                  openEditItem(selectedItem.type, selectedItem.data);
                }}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
              >
                Edit
              </button>
              {selectedItem.type === "reminder" &&
                selectedItem.data.status !== "Completed" && (
                  <button
                    onClick={() => {
                      handleCompleteReminder(selectedItem.data.id);
                      setSelectedItem(null);
                    }}
                    className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 transition"
                  >
                    Mark Complete
                  </button>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarReminder;
