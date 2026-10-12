import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  ListChecks,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api";
import { formatDateOnly } from "../../utils/date";

const EMPTY_FORM = {
  title: "",
  description: "",
  priority: "Medium",
  status: "Pending",
  dueDate: "",
  reminderAt: "",
};

const STATUS_OPTIONS = ["Pending", "In Progress", "Completed"];
const PRIORITY_OPTIONS = ["High", "Medium", "Low"];
const DATE_FILTERS = ["Any due date", "Overdue", "Due today", "Upcoming", "No due date"];

const formatDate = (value) =>
  value
    ? formatDateOnly(value, "en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "Not set";

const formatDateTime = (value) => {
  if (!value) return "Not set";
  const normalized = typeof value === "string" ? value.replace(" ", "T") : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime())
    ? "Not set"
    : date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const TodoList = () => {
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveInFlight = useRef(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("All");
  const [statusFilter, setStatusFilter] = useState("Any status");
  const [priorityFilter, setPriorityFilter] = useState("Any priority");
  const [dueDateFilter, setDueDateFilter] = useState("Any due date");

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      try {
        const response = await api.get("/todos");
        setTasks(Array.isArray(response.data?.data) ? response.data.data : []);
      } catch (error) {
        console.error("Todo list fetch failed:", error);
        toast.error(error?.response?.data?.message || "Unable to load your tasks.");
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  useEffect(() => {
    if (!formOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !saving) resetForm();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [formOpen, saving]);

  const completedCount = tasks.filter((task) => task.status === "Completed").length;
  const pendingCount = tasks.filter((task) => task.status === "Pending").length;
  const inProgressCount = tasks.filter((task) => task.status === "In Progress").length;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    const today = todayKey();
    return tasks.filter((task) => {
      const matchesSearch =
        !query ||
        `${task.title || ""} ${task.description || ""}`.toLowerCase().includes(query);
      const matchesView =
        view === "All" ||
        (view === "Pending" && task.status !== "Completed") ||
        (view === "Completed" && task.status === "Completed");
      const matchesStatus = statusFilter === "Any status" || task.status === statusFilter;
      const matchesPriority =
        priorityFilter === "Any priority" || task.priority === priorityFilter;
      const matchesDueDate =
        dueDateFilter === "Any due date" ||
        (dueDateFilter === "Overdue" &&
          task.dueDate &&
          task.dueDate < today &&
          task.status !== "Completed") ||
        (dueDateFilter === "Due today" && task.dueDate === today) ||
        (dueDateFilter === "Upcoming" && task.dueDate && task.dueDate > today) ||
        (dueDateFilter === "No due date" && !task.dueDate);
      return matchesSearch && matchesView && matchesStatus && matchesPriority && matchesDueDate;
    });
  }, [tasks, search, view, statusFilter, priorityFilter, dueDateFilter]);

  const pendingTasks = filteredTasks.filter((task) => task.status !== "Completed");
  const completedTasks = filteredTasks.filter((task) => task.status === "Completed");

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormOpen(false);
  };

  const openNewTaskForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormOpen(true);
  };

  const submitTask = async (event) => {
    event.preventDefault();
    if (saveInFlight.current) return;
    if (!form.title.trim()) {
      toast.error("Enter a task title before saving.");
      return;
    }

    saveInFlight.current = true;
    setSaving(true);
    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
      };
      if (editingId !== null) {
        const response = await api.put(`/todos/${editingId}`, payload);
        const updatedTask = response.data?.data;
        setTasks((current) =>
          current.map((task) => (task.id === editingId ? updatedTask : task)),
        );
        toast.success(response.data?.message || "Task updated.");
      } else {
        const response = await api.post("/todos", payload);
        setTasks((current) => [response.data.data, ...current]);
        toast.success(response.data?.message || "Task added.");
      }
      resetForm();
    } catch (error) {
      console.error("Todo task save failed:", error);
      toast.error(error?.response?.data?.message || "Unable to save this task.");
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  };

  const editTask = (task) => {
    setForm({
      title: task.title || "",
      description: task.description || "",
      priority: task.priority || "Medium",
      status: task.status || "Pending",
      dueDate: task.dueDate || "",
      reminderAt: task.reminderAt || "",
    });
    setEditingId(task.id);
    setFormOpen(true);
  };

  const changeTaskStatus = async (task, status) => {
    try {
      const response = await api.put(`/todos/${task.id}`, { ...task, status });
      setTasks((current) =>
        current.map((item) => (item.id === task.id ? response.data.data : item)),
      );
      toast.success(status === "Completed" ? "Task completed." : "Task marked as pending.");
    } catch (error) {
      console.error("Todo task status update failed:", error);
      toast.error(error?.response?.data?.message || "Unable to update task status.");
    }
  };

  const deleteTask = async (task) => {
    if (!window.confirm(`Delete "${task.title}"? This action cannot be undone.`)) return;
    try {
      const response = await api.delete(`/todos/${task.id}`);
      setTasks((current) => current.filter((item) => item.id !== task.id));
      if (editingId === task.id) resetForm();
      toast.success(response.data?.message || "Task deleted.");
    } catch (error) {
      console.error("Todo task delete failed:", error);
      toast.error(error?.response?.data?.message || "Unable to delete this task.");
    }
  };

  const renderTask = (task) => {
    const isCompleted = task.status === "Completed";
    const priorityStyle = {
      High: "bg-rose-50 text-rose-700 ring-rose-200",
      Medium: "bg-amber-50 text-amber-700 ring-amber-200",
      Low: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    }[task.priority] || "bg-slate-50 text-slate-600 ring-slate-200";

    return (
      <article
        key={task.id}
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5"
      >
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() =>
              changeTaskStatus(task, isCompleted ? "Pending" : "Completed")
            }
            aria-label={isCompleted ? `Reopen ${task.title}` : `Complete ${task.title}`}
            className={`mt-0.5 shrink-0 rounded-full ${isCompleted ? "text-emerald-600" : "text-slate-300 hover:text-violet-600"}`}
          >
            {isCompleted ? <CheckCircle2 size={23} /> : <Circle size={23} />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={`break-words text-base font-bold ${isCompleted ? "text-slate-400 line-through" : "text-slate-800"}`}>
                {task.title}
              </h3>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${priorityStyle}`}>
                {task.priority}
              </span>
              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                {task.status}
              </span>
            </div>
            {task.description && (
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                {task.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
              {task.dueDate && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={14} /> Due {formatDate(task.dueDate)}
                </span>
              )}
              {task.reminderAt && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock size={14} /> Reminder {formatDateTime(task.reminderAt)}
                </span>
              )}
              <span>Created {formatDate(task.createdAt)}</span>
              <span>Updated {formatDate(task.updatedAt)}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => editTask(task)}
              aria-label={`Edit ${task.title}`}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-violet-50 hover:text-violet-700"
            >
              <Pencil size={17} />
            </button>
            <button
              type="button"
              onClick={() => deleteTask(task)}
              aria-label={`Delete ${task.title}`}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 size={17} />
            </button>
          </div>
        </div>
      </article>
    );
  };

  const renderTaskGroup = (title, items, Icon, emptyMessage) => (
    <section className="mt-7">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-800">
          <Icon size={19} className="text-violet-600" />
          {title}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
            {items.length}
          </span>
        </h2>
      </div>
      {items.length ? (
        <div className="space-y-3">{items.map(renderTask)}</div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-8 text-center text-sm text-slate-500">
          {emptyMessage}
        </div>
      )}
    </section>
  );

  return (
    <div className="min-h-full bg-slate-50/70 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-violet-600">
              Plan your day
            </p>
            <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">To-Do List</h1>
            <p className="mt-1 text-sm text-slate-500">Keep your tasks, notes, and reminders in one place.</p>
            <button
              type="button"
              onClick={openNewTaskForm}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 py-3 text-sm font-extrabold text-white shadow-md shadow-violet-200 transition hover:bg-violet-800"
            >
              <Plus size={18} /> Add Task
            </button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total Tasks",
              value: tasks.length,
              detail: "All tasks in your list",
              share: tasks.length ? 100 : 0,
              icon: ListChecks,
              gradient: "from-violet-600 to-purple-500",
            },
            {
              label: "Completed",
              value: completedCount,
              detail: `${progress}% of tasks completed`,
              share: progress,
              icon: CheckCircle2,
              gradient: "from-blue-600 to-sky-500",
            },
            {
              label: "Pending",
              value: pendingCount,
              detail: `${tasks.length ? Math.round((pendingCount / tasks.length) * 100) : 0}% of tasks`,
              share: tasks.length ? Math.round((pendingCount / tasks.length) * 100) : 0,
              icon: Circle,
              gradient: "from-emerald-600 to-teal-500",
            },
            {
              label: "In Progress",
              value: inProgressCount,
              detail: `${tasks.length ? Math.round((inProgressCount / tasks.length) * 100) : 0}% of tasks`,
              share: tasks.length ? Math.round((inProgressCount / tasks.length) * 100) : 0,
              icon: Clock3,
              gradient: "from-amber-500 to-yellow-400",
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.label}
                className={`relative isolate min-h-[176px] overflow-hidden rounded-[22px] bg-gradient-to-br ${card.gradient} p-5 text-white shadow-lg shadow-slate-900/10 sm:p-6`}
              >
                <div aria-hidden="true" className="pointer-events-none absolute -right-5 -top-8 z-0 h-36 w-36 rounded-full bg-white/10" />
                <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 right-10 z-0 h-32 w-32 rounded-full bg-white/[0.08]" />
                <div className="relative z-10 flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/25 bg-white/15 shadow-inner">
                    <Icon size={23} strokeWidth={2.2} />
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/20 px-3 py-1.5 text-xs font-extrabold backdrop-blur-sm">
                    ↗ {card.share}%
                  </span>
                </div>
                <p className="relative z-10 mt-4 text-3xl font-black leading-none tracking-tight sm:text-[34px]">
                  {card.value}
                </p>
                <p className="relative z-10 mt-1.5 text-sm font-semibold text-white/85">{card.label}</p>
                <div className="relative z-10 mt-4 border-t border-white/20 pt-3 text-xs font-semibold text-white/75">
                  {card.detail}
                </div>
              </article>
            );
          })}
        </div>

        <div className="mb-6 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-bold text-slate-700">Overall progress</span>
            <span className="font-extrabold text-violet-700">{progress}%</span>
          </div>
          <div
            role="progressbar"
            aria-label="Task completion progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="h-2.5 overflow-hidden rounded-full bg-violet-100"
          >
            <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-emerald-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {tasks.length} {tasks.length === 1 ? "task" : "tasks"} · {completedCount} completed · {pendingCount} pending
          </p>
        </div>

        {formOpen && (
          <div
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !saving) resetForm();
            }}
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="todo-form-title"
              className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-violet-600">
                    To-Do List
                  </p>
                  <h2 id="todo-form-title" className="mt-1 text-xl font-extrabold text-slate-800">
                    {editingId !== null ? "Edit task" : "Add a task"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  aria-label="Close task form"
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={submitTask} className="p-5 sm:p-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-bold text-slate-600">Task title <span className="text-rose-500">*</span></span>
                    <input
                      autoFocus
                      required
                      maxLength={255}
                      value={form.title}
                      onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                      placeholder="What needs to get done?"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    />
                  </label>
                  <label className="sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-bold text-slate-600">Description or notes</span>
                    <textarea
                      rows={3}
                      value={form.description}
                      onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                      placeholder="Add any helpful details..."
                      className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-xs font-bold text-slate-600">Priority</span>
                    <select value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100">
                      {PRIORITY_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="mb-1.5 block text-xs font-bold text-slate-600">Status</span>
                    <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100">
                      {STATUS_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="mb-1.5 block text-xs font-bold text-slate-600">Due date</span>
                    <input type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-xs font-bold text-slate-600">Reminder</span>
                    <input type="datetime-local" value={form.reminderAt} onChange={(event) => setForm((current) => ({ ...current, reminderAt: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
                  </label>
                </div>
                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={saving}
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button disabled={saving} type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 py-3 text-sm font-extrabold text-white shadow-md shadow-violet-200 transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60">
                    {saving ? <Clock3 size={17} className="animate-pulse" /> : editingId !== null ? <Check size={17} /> : <Plus size={18} />}
                    {saving ? "Saving..." : editingId !== null ? "Save changes" : "Add Task"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {["All", "Pending", "Completed"].map((item) => (
                <button key={item} type="button" onClick={() => setView(item)} className={`rounded-xl px-4 py-2 text-sm font-bold transition ${view === item ? "bg-violet-700 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-violet-50 hover:text-violet-700"}`}>
                  {item}
                </button>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <label className="relative sm:col-span-2 lg:col-span-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title or notes" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
              </label>
              <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-violet-400">
                <option>Any status</option>
                {STATUS_OPTIONS.map((option) => <option key={option}>{option}</option>)}
              </select>
              <select aria-label="Filter by priority" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-violet-400">
                <option>Any priority</option>
                {PRIORITY_OPTIONS.map((option) => <option key={option}>{option}</option>)}
              </select>
              <select aria-label="Filter by due date" value={dueDateFilter} onChange={(event) => setDueDateFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-violet-400">
                {DATE_FILTERS.map((option) => <option key={option}>{option}</option>)}
              </select>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="py-14 text-center text-sm font-semibold text-slate-500">Loading your tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="mt-7 rounded-2xl border border-dashed border-violet-200 bg-white px-5 py-14 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              <ListChecks size={28} />
            </div>
            <h2 className="mt-4 text-lg font-extrabold text-slate-800">Your list is clear</h2>
            <p className="mt-1 text-sm text-slate-500">Add your first task above to get started.</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="mt-7 rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-12 text-center text-sm text-slate-500">
            No tasks match these search and filter options.
          </div>
        ) : (
          <>
            {pendingTasks.length > 0 &&
              renderTaskGroup("Pending & in progress", pendingTasks, Circle, "No active tasks match these filters.")}
            {completedTasks.length > 0 &&
              renderTaskGroup("Completed", completedTasks, CheckCircle2, "No completed tasks match these filters.")}
          </>
        )}
      </div>
    </div>
  );
};

export default TodoList;
