import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  LayoutGrid,
  ListChecks,
  List,
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
const PAGE_SIZE = 10;

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
  const [viewMode, setViewMode] = useState("list");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("Any priority");
  const [dueDateFilter, setDueDateFilter] = useState("Any due date");
  const [currentPage, setCurrentPage] = useState(1);

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
      const matchesStatus = statusFilter === "All" || task.status === statusFilter;
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
      return matchesSearch && matchesStatus && matchesPriority && matchesDueDate;
    });
  }, [tasks, search, statusFilter, priorityFilter, dueDateFilter]);

  const orderedTasks = useMemo(
    () => [
      ...filteredTasks.filter((task) => task.status !== "Completed"),
      ...filteredTasks.filter((task) => task.status === "Completed"),
    ],
    [filteredTasks],
  );
  const totalPages = Math.max(1, Math.ceil(orderedTasks.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const pageTasks = orderedTasks.slice(pageStartIndex, pageStartIndex + PAGE_SIZE);
  const pagePendingTasks = pageTasks.filter((task) => task.status !== "Completed");
  const pageCompletedTasks = pageTasks.filter((task) => task.status === "Completed");

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, priorityFilter, dueDateFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

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
        setCurrentPage(1);
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

  const renderTask = (task, serialNumber) => {
    const isCompleted = task.status === "Completed";
    const isGridView = viewMode === "grid";
    const priorityStyle = {
      High: "bg-rose-50 text-rose-700 ring-rose-200",
      Medium: "bg-amber-50 text-amber-700 ring-amber-200",
      Low: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    }[task.priority] || "bg-slate-50 text-slate-600 ring-slate-200";

    if (isGridView) {
      return (
        <article
          key={task.id}
          className={`flex h-full min-h-[240px] flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
            isCompleted ? "border-emerald-100" : "border-slate-200"
          }`}
        >
          <div className={`h-1 w-full ${isCompleted ? "bg-emerald-400" : task.priority === "High" ? "bg-rose-400" : task.priority === "Low" ? "bg-emerald-400" : "bg-amber-400"}`} />
          <div className="flex flex-1 flex-col p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${priorityStyle}`}>
                  {task.priority} priority
                </span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  isCompleted
                    ? "bg-emerald-50 text-emerald-700"
                    : task.status === "In Progress"
                      ? "bg-sky-50 text-sky-700"
                      : "bg-slate-100 text-slate-600"
                }`}>
                  {task.status}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => editTask(task)}
                  aria-label={`Edit ${task.title}`}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-violet-50 hover:text-violet-700"
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => deleteTask(task)}
                  aria-label={`Delete ${task.title}`}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-3">
              <button
                type="button"
                onClick={() =>
                  changeTaskStatus(task, isCompleted ? "Pending" : "Completed")
                }
                aria-label={isCompleted ? `Reopen ${task.title}` : `Complete ${task.title}`}
                className={`mt-0.5 shrink-0 rounded-full transition ${
                  isCompleted ? "text-emerald-600" : "text-slate-300 hover:text-violet-600"
                }`}
              >
                {isCompleted ? <CheckCircle2 size={22} /> : <Circle size={22} />}
              </button>
              <div className="min-w-0">
                <h3 className={`break-words text-base font-bold leading-6 ${
                  isCompleted ? "text-slate-400 line-through" : "text-slate-800"
                }`}>
                  {task.title}
                </h3>
                {task.description ? (
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-5 text-slate-500 line-clamp-3">
                    {task.description}
                  </p>
                ) : (
                  <p className="mt-2 text-sm italic text-slate-400">No notes added</p>
                )}
              </div>
            </div>

            <div className="mt-auto pt-5">
              <div className="space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                {task.dueDate && (
                  <span className="flex items-center gap-2">
                    <CalendarDays size={15} className="shrink-0 text-violet-500" />
                    <span>Due {formatDate(task.dueDate)}</span>
                  </span>
                )}
                {task.reminderAt && (
                  <span className="flex items-center gap-2">
                    <CalendarClock size={15} className="shrink-0 text-violet-500" />
                    <span>Reminder {formatDateTime(task.reminderAt)}</span>
                  </span>
                )}
                {!task.dueDate && !task.reminderAt && (
                  <span className="text-slate-400">No dates scheduled</span>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                <span>Created {formatDate(task.createdAt)}</span>
                <span>Updated {formatDate(task.updatedAt)}</span>
              </div>
            </div>
          </div>
        </article>
      );
    }

    return (
      <tr key={task.id} className="group transition hover:bg-violet-50/40">
        <td className="whitespace-nowrap px-4 py-4 text-xs font-bold text-slate-400">
          {String(serialNumber).padStart(2, "0")}
        </td>
        <td className="px-4 py-4">
          <div className="flex min-w-[240px] items-start gap-3">
            <button
              type="button"
              onClick={() =>
                changeTaskStatus(task, isCompleted ? "Pending" : "Completed")
              }
              aria-label={isCompleted ? `Reopen ${task.title}` : `Complete ${task.title}`}
              className={`mt-0.5 shrink-0 rounded-full transition ${isCompleted ? "text-emerald-600" : "text-slate-300 hover:text-violet-600"}`}
            >
              {isCompleted ? <CheckCircle2 size={21} /> : <Circle size={21} />}
            </button>
            <div className="min-w-0">
              <p className={`break-words text-sm font-bold ${isCompleted ? "text-slate-400 line-through" : "text-slate-800"}`}>
                {task.title}
              </p>
              {task.description ? (
                <p className="mt-1 max-w-md whitespace-pre-wrap break-words text-xs leading-5 text-slate-500 line-clamp-2">
                  {task.description}
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-400">No notes</p>
              )}
            </div>
          </div>
        </td>
        <td className="whitespace-nowrap px-4 py-4">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${priorityStyle}`}>
            {task.priority}
          </span>
        </td>
        <td className="whitespace-nowrap px-4 py-4">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            isCompleted
              ? "bg-emerald-50 text-emerald-700"
              : task.status === "In Progress"
                ? "bg-sky-50 text-sky-700"
                : "bg-slate-100 text-slate-600"
          }`}>
            {task.status}
          </span>
        </td>
        <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">
          {task.dueDate ? (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={14} className="text-violet-500" />
              {formatDate(task.dueDate)}
            </span>
          ) : <span className="text-slate-400">—</span>}
        </td>
        <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">
          {task.reminderAt ? (
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock size={14} className="text-violet-500" />
              {formatDateTime(task.reminderAt)}
            </span>
          ) : <span className="text-slate-400">—</span>}
        </td>
        <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">
          {formatDate(task.updatedAt)}
        </td>
        <td className="whitespace-nowrap px-4 py-4 text-right">
          <div className="flex justify-end gap-1">
            <button
              type="button"
              onClick={() => editTask(task)}
              aria-label={`Edit ${task.title}`}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-violet-700 hover:shadow-sm"
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              onClick={() => deleteTask(task)}
              aria-label={`Delete ${task.title}`}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-rose-600 hover:shadow-sm"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const renderTaskGroup = (title, items, Icon, emptyMessage, serialOffset = 0) => (
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
        viewMode === "grid" ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((task) => renderTask(task))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left">
                <thead className="bg-[#350866] text-xs uppercase tracking-wider text-[#FCD34D]">
                  <tr>
                    <th scope="col" className="px-4 py-4 font-bold">S No</th>
                    <th scope="col" className="px-4 py-4 font-bold">Task</th>
                    <th scope="col" className="px-4 py-4 font-bold">Priority</th>
                    <th scope="col" className="px-4 py-4 font-bold">Status</th>
                    <th scope="col" className="px-4 py-4 font-bold">Due date</th>
                    <th scope="col" className="px-4 py-4 font-bold">Reminder</th>
                    <th scope="col" className="px-4 py-4 font-bold">Updated</th>
                    <th scope="col" className="px-4 py-4 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((task, index) => renderTask(task, serialOffset + index + 1))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-8 text-center text-sm text-slate-500">
          {emptyMessage}
        </div>
      )}
    </section>
  );

  return (
    <div className="min-h-full bg-slate-50/70 px-2 py-5 sm:px-2 lg:px-2">
      <div className="mx-auto max-w-7xl">
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
                className={`relative isolate min-h-[148px] overflow-hidden rounded-[22px] bg-gradient-to-br ${card.gradient} p-4 text-white shadow-lg shadow-slate-900/10 sm:min-h-[156px] sm:p-5`}
              >
                <div aria-hidden="true" className="pointer-events-none absolute -right-5 -top-8 z-0 h-32 w-32 rounded-full bg-white/10" />
                <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 right-10 z-0 h-28 w-28 rounded-full bg-white/[0.08]" />
                <div className="relative z-10 flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/25 bg-white/15 shadow-inner">
                    <Icon size={21} strokeWidth={2.2} />
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/20 px-2.5 py-1 text-[11px] font-extrabold backdrop-blur-sm">
                    ↗ {card.share}%
                  </span>
                </div>
                <p className="relative z-10 mt-3 text-3xl font-black leading-none tracking-tight">
                  {card.value}
                </p>
                <p className="relative z-10 mt-1.5 text-sm font-semibold text-white/85">{card.label}</p>
                <div className="relative z-10 mt-3 border-t border-white/20 pt-2.5 text-xs font-semibold text-white/75">
                  {card.detail}
                </div>
              </article>
            );
          })}
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
              <div className="flex items-center justify-between border-b border-[#350866] bg-[#350866] px-5 py-4 sm:px-6">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-[#FCD34D]">
                    To-Do List
                  </p>
                  <h2 id="todo-form-title" className="mt-1 text-xl font-extrabold text-white">
                    {editingId !== null ? "Edit task" : "Add a task"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  aria-label="Close task form"
                  className="rounded-xl p-2 text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
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

        <section className="mt-7 rounded-[22px] border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center">
            <label className="relative min-w-0 flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search tasks..."
                aria-label="Search tasks"
                className="h-[52px] w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
              />
            </label>
            <select
              aria-label="Filter by priority"
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="h-[52px] rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-semibold text-slate-600 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 xl:w-[180px]"
            >
              <option value="Any priority">All Priorities</option>
              {PRIORITY_OPTIONS.map((option) => <option key={option}>{option}</option>)}
            </select>
            
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-[52px] rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-semibold text-slate-600 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 xl:w-[180px]"
            >
              <option value="All">All</option>
              {STATUS_OPTIONS.map((option) => <option key={option}>{option}</option>)}
            </select>
            <div className="flex h-[52px] shrink-0 items-center rounded-2xl border border-slate-200 bg-slate-100/80 p-1">
              <button
                type="button"
                aria-label="List view"
                aria-pressed={viewMode === "list"}
                onClick={() => setViewMode("list")}
                className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${viewMode === "list" ? "bg-white text-violet-700 shadow-sm" : "text-slate-400 hover:text-slate-700"}`}
              >
                <List size={20} />
              </button>
              <button
                type="button"
                aria-label="Grid view"
                aria-pressed={viewMode === "grid"}
                onClick={() => setViewMode("grid")}
                className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${viewMode === "grid" ? "bg-white text-violet-700 shadow-sm" : "text-slate-400 hover:text-slate-700"}`}
              >
                <LayoutGrid size={19} />
              </button>
            </div>
            <button
              type="button"
              onClick={openNewTaskForm}
              className="inline-flex h-[52px] shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#240046] to-[#7b2cbf] px-6 text-sm font-extrabold text-white shadow-lg shadow-violet-900/15 transition hover:brightness-110"
            >
              <Plus size={19} /> Add Task
            </button>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="px-1 text-xs font-bold text-slate-500">Due date:</span>
            {DATE_FILTERS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setDueDateFilter(option)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${dueDateFilter === option ? "bg-violet-100 text-violet-800" : "bg-slate-100 text-slate-600 hover:bg-violet-50 hover:text-violet-700"}`}
              >
                {option}
              </button>
            ))}
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
            {viewMode === "grid" ? (
              <>
                {pagePendingTasks.length > 0 &&
                  renderTaskGroup(
                    "Pending & in progress",
                    pagePendingTasks,
                    Circle,
                    "No active tasks match these filters.",
                    pageStartIndex,
                  )}
                {pageCompletedTasks.length > 0 &&
                  renderTaskGroup(
                    "Completed",
                    pageCompletedTasks,
                    CheckCircle2,
                    "No completed tasks match these filters.",
                    pageStartIndex + pagePendingTasks.length,
                  )}
              </>
            ) : (
              renderTaskGroup(
                "All tasks",
                pageTasks,
                ListChecks,
                "No tasks match these filters.",
                pageStartIndex,
              )
            )}
          </>
        )}

        {!loading && orderedTasks.length > 0 && (
          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-slate-500">
              Showing <span className="font-bold text-slate-700">{pageStartIndex + 1}–{Math.min(pageStartIndex + PAGE_SIZE, orderedTasks.length)}</span> of{" "}
              <span className="font-bold text-slate-700">{orderedTasks.length}</span> tasks
            </p>
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safeCurrentPage === 1}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span className="min-w-[88px] text-center text-sm font-bold text-slate-600">
                Page {safeCurrentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={safeCurrentPage === totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TodoList;
