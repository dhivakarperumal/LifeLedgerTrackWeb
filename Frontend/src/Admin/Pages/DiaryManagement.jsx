import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api";
import { useAuth } from "../../PrivateRouter/AuthContext";
import { toast } from "react-hot-toast";
import {
  FiPlus, FiSearch, FiCalendar, FiHeart, FiEdit2, FiTrash2, FiStar, FiClock,
  FiFileText, FiImage, FiVideo, FiPaperclip, FiBookmark, FiCheck, FiX,
  FiArrowLeft, FiArrowRight, FiFilter, FiTag, FiMapPin, FiSmile, FiEye,
  FiSave, FiPenTool, FiUploadCloud, FiDownload, FiLock, FiUnlock, FiUsers,
  FiGrid, FiList,
} from "react-icons/fi";

const defaultMoodOptions = [
  { value: "Happy", emoji: "😊" },
  { value: "Excited", emoji: "😍" },
  { value: "Calm", emoji: "😌" },
  { value: "Normal", emoji: "😐" },
  { value: "Sad", emoji: "😔" },
  { value: "Angry", emoji: "😡" },
  { value: "Tired", emoji: "😴" },
  { value: "Thoughtful", emoji: "🤔" },
  { value: "Confident", emoji: "😎" },
  { value: "Loved", emoji: "❤️" },
];

const defaultCategories = [
  "Personal", "Family", "Friends", "Work", "College", "Travel", "Birthday", "Wedding", "Goals", "Memories", "Ideas", "Important", "Other",
];

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const moodMap = Object.fromEntries(defaultMoodOptions.map((m) => [m.value, m.emoji]));

const DiaryManagement = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedMood, setSelectedMood] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draftSaved, setDraftSaved] = useState(true);
  const [autoSaveTimer, setAutoSaveTimer] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [files, setFiles] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [formState, setFormState] = useState({
    title: "",
    content: "",
    category_id: "",
    mood: "Happy",
    tags: "",
    location: "",
    entry_date: new Date().toISOString().slice(0, 10),
    entry_time: "",
    status: "published",
    is_favorite: false,
    is_private: false,
    is_locked: false,
  });
  const editorRef = useRef(null);

  const fetchData = async () => {
    try {
      setIsFetching(true);
      const [entriesRes, categoriesRes] = await Promise.all([
        api.get("/diary"),
        api.get("/categories"),
      ]);
      const categoryList = Array.isArray(categoriesRes.data) ? categoriesRes.data : [];
      setEntries(entriesRes.data || []);
      setCategories(categoryList);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load diary data.");
    } finally {
      setIsFetching(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!isEditorOpen || !formState.title && !formState.content) return;
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    setDraftSaved(false);
    const timer = setTimeout(() => {
      if (editingId) {
        // live draft autosave via localStorage only when editing
        localStorage.setItem(`diary-draft-${editingId}`, JSON.stringify(formState));
      } else {
        localStorage.setItem("diary-draft-temp", JSON.stringify(formState));
      }
      setDraftSaved(true);
    }, 800);
    setAutoSaveTimer(timer);
    return () => clearTimeout(timer);
  }, [formState, editingId, isEditorOpen]);

  useEffect(() => {
    const savedDraft = localStorage.getItem("diary-draft-temp");
    if (savedDraft && !editingId) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.title || draft.content) {
          setFormState((prev) => ({ ...prev, ...draft }));
        }
      } catch (error) {
        // ignore invalid draft
      }
    }
  }, [editingId]);

  const stats = useMemo(() => {
    const totalEntries = entries.length;
    const month = new Date().getMonth();
    const year = new Date().getFullYear();
    const thisMonth = entries.filter((entry) => {
      const date = new Date(entry.entry_date);
      return date.getMonth() === month && date.getFullYear() === year;
    }).length;
    const thisYear = entries.filter((entry) => {
      const date = new Date(entry.entry_date);
      return date.getFullYear() === year;
    }).length;
    const favorites = entries.filter((entry) => entry.is_favorite).length;
    const drafts = entries.filter((entry) => entry.status === "draft").length;
    return { totalEntries, thisMonth, thisYear, favorites, drafts };
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const term = search.toLowerCase();
    return entries.filter((entry) => {
      const matchesFilter = (() => {
        if (selectedFilter === "favorites") return entry.is_favorite;
        if (selectedFilter === "drafts") return entry.status === "draft";
        if (selectedFilter === "recent") return true;
        if (selectedFilter === "month") {
          const date = new Date(entry.entry_date);
          const now = new Date();
          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        }
        if (selectedFilter === "year") {
          const date = new Date(entry.entry_date);
          return date.getFullYear() === new Date().getFullYear();
        }
        return true;
      })();

      const categoryMatch = selectedCategory === "all" || String(entry.category_id) === String(selectedCategory) || (entry.category_name || "") === selectedCategory;
      const moodMatch = selectedMood === "all" || entry.mood === selectedMood;
      const dateMatch = !selectedDate || entry.entry_date === selectedDate;
      const searchMatch = !term || [
        entry.title,
        entry.content,
        entry.location,
        entry.mood,
        entry.category_name,
        (entry.tags || []).join(" "),
      ].join(" ").toLowerCase().includes(term);
      return matchesFilter && categoryMatch && moodMatch && dateMatch && searchMatch;
    });
  }, [entries, search, selectedFilter, selectedMood, selectedCategory, selectedDate]);

  const applyFormat = (command, value = null) => {
    document.execCommand(command, false, value);
  };

  const openNewEntry = () => {
    setEditingId(null);
    setSelectedEntry(null);
    setFiles([]);
    setFormState({
      title: "",
      content: "",
      category_id: categories[0]?.id || "",
      mood: "Happy",
      tags: "",
      location: "",
      entry_date: new Date().toISOString().slice(0, 10),
      entry_time: "",
      status: "published",
      is_favorite: false,
      is_private: false,
      is_locked: false,
    });
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = "";
      }
    }, 10);
    setIsEditorOpen(true);
  };

  const openEditEntry = (entry) => {
    setEditingId(entry.id);
    setSelectedEntry(entry);
    setFormState({
      title: entry.title || "",
      content: entry.content || "",
      category_id: entry.category_id || "",
      mood: entry.mood || "Happy",
      tags: (entry.tags || []).join(", "),
      location: entry.location || "",
      entry_date: entry.entry_date || new Date().toISOString().slice(0, 10),
      entry_time: entry.entry_time || "",
      status: entry.status || "published",
      is_favorite: Boolean(entry.is_favorite),
      is_private: Boolean(entry.is_private),
      is_locked: Boolean(entry.is_locked),
    });

    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = entry.content || "";
      }
    }, 50);

    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingId(null);
    setFiles([]);
    setSelectedEntry(null);
    setDraftSaved(true);
    localStorage.removeItem("diary-draft-temp");
  };

  const handleEditorInput = () => {
    setFormState((prev) => ({ ...prev, content: editorRef.current?.innerHTML || "" }));
  };

  const handleSubmit = async (saveStatus = "published") => {
    if (!formState.title.trim() || !formState.content.trim()) {
      toast.error("Title and diary content are required.");
      return;
    }

    const payload = {
      ...formState,
      content: formState.content,
      status: saveStatus,
      tags: formState.tags ? formState.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : [],
      category_id: formState.category_id || null,
      mood: formState.mood || "Happy",
    };

    try {
      const config = { headers: { "Content-Type": "application/json" } };
      let response;
      if (editingId) {
        response = await api.put(`/diary/${editingId}`, payload, config);
        toast.success("Diary updated successfully.");
      } else {
        response = await api.post("/diary", payload, config);
        toast.success("Diary saved successfully.");
      }

      localStorage.removeItem("diary-draft-temp");
      setEditingId(response?.data?.id || editingId);
      setSelectedEntry(response.data || selectedEntry);
      setDraftSaved(true);
      await fetchData();
      closeEditor();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save diary entry.");
    }
  };

  const deleteEntry = async (id) => {
    if (!window.confirm("Delete this diary entry permanently?")) return;
    try {
      await api.delete(`/diary/${id}`);
      toast.success("Diary deleted.");
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    }
  };

  const favoriteEntry = async (id) => {
    try {
      await api.patch(`/diary/${id}/favorite`);
      await fetchData();
      toast.success("Favorite updated.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Favorite update failed.");
    }
  };

  const handleFiles = (e) => {
    setFiles(Array.from(e.target.files || []));
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: "audio/webm" });
        setFiles((prev) => [...prev, file]);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      toast.success("Voice recording started.");
    } catch (error) {
      console.error("Microphone error:", error);
      toast.error("Microphone access is required for voice notes.");
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success("Voice note captured.");
    }
  };

  const uploadAttachment = async (entryId) => {
    if (!files.length) return;
    const file = files[0];
    const formData = new FormData();
    formData.append("file", file);
    try {
      await api.post(`/diary/${entryId}/attachments`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Attachment uploaded.");
      setFiles([]);
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Upload failed.");
    }
  };

  const recentEntries = [...entries].sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date)).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-600">Life Ledger</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Diary Management</h1>
        </div>
        <button
          onClick={openNewEntry}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700"
        >
          <FiPlus className="text-lg" />
          Add Diary Entry
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[{ label: "Total Diary Entries", value: stats.totalEntries }, { label: "This Month Entries", value: stats.thisMonth }, { label: "This Year Entries", value: stats.thisYear }, { label: "Favorite Entries", value: stats.favorites }, { label: "Draft Entries", value: stats.drafts }].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{stat.label}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-2xl font-bold text-slate-900">{stat.value}</span>
              <div className="rounded-xl bg-violet-100 p-2 text-violet-600"><FiFileText /></div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
            <FiSearch className="text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              placeholder="Search title, mood, category, location, tags..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: "All", value: "all" },
              { label: "Recent", value: "recent" },
              { label: "Favorites", value: "favorites" },
              { label: "Drafts", value: "drafts" },
              { label: "This Month", value: "month" },
              { label: "This Year", value: "year" },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setSelectedFilter(filter.value)}
                className={`rounded-full px-3 py-2 text-xs font-semibold transition ${selectedFilter === filter.value ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none">
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name} {category.catType ? `(${category.catType})` : ""}</option>
            ))}
          </select>

          <select value={selectedMood} onChange={(e) => setSelectedMood(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none">
            <option value="all">All Moods</option>
            {defaultMoodOptions.map((mood) => (
              <option key={mood.value} value={mood.value}>{mood.emoji} {mood.value}</option>
            ))}
          </select>

          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none" />

          <div className="flex items-center justify-end gap-2 md:col-span-1">
            <button onClick={() => setViewMode("grid")} className={`rounded-xl p-2 ${viewMode === "grid" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"}`}><FiGrid /></button>
            <button onClick={() => setViewMode("list")} className={`rounded-xl p-2 ${viewMode === "list" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"}`}><FiList /></button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.8fr]">
        <div className="space-y-4">
          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading diary entries...</div>
          ) : filteredEntries.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-3xl text-violet-600">📖</div>
              <h3 className="mt-5 text-2xl font-bold text-slate-900">Your Diary Is Empty</h3>
              <p className="mt-2 text-slate-500">Start writing about your day, thoughts and special moments.</p>
              <button onClick={openNewEntry} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 hover:bg-violet-700"> <FiPlus /> Add Diary Entry </button>
            </div>
          ) : (
            <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2" : "space-y-4"}>
              {filteredEntries.map((entry) => (
                <div key={entry.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span>{moodMap[entry.mood] || "😊"}</span>
                      <span>{formatDate(entry.entry_date)}</span>
                    </div>
                    <button onClick={() => favoriteEntry(entry.id)} className={`rounded-full p-2 ${entry.is_favorite ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-500"}`}>
                      <FiHeart className={entry.is_favorite ? "fill-current" : ""} />
                    </button>
                  </div>

                  <div className="mt-4 space-y-2">
                    <h3 className="text-xl font-bold text-slate-900">{entry.title}</h3>
                    <p className="line-clamp-3 text-sm leading-6 text-slate-600">{entry.content.replace(/<[^>]+>/g, "")}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-violet-700">
                      <span className="rounded-full bg-violet-100 px-2.5 py-1">{entry.category_name || "General"}</span>
                      <span className="rounded-full bg-amber-100 px-2.5 py-1">{entry.mood}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                      {(entry.tags || []).slice(0, 3).map((tag) => (
                        <span key={tag}>#{tag}</span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      {entry.attachment_count > 0 && <span className="inline-flex items-center gap-1"><FiPaperclip /> {entry.attachment_count}</span>}
                      {entry.status === "draft" && <span className="inline-flex items-center gap-1 text-amber-600"><FiBookmark /> Draft</span>}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                      <button onClick={() => setSelectedEntry(entry)} className="rounded-lg bg-slate-100 px-2 py-1.5 hover:bg-slate-200">View</button>
                      <button onClick={() => openEditEntry(entry)} className="rounded-lg bg-slate-100 px-2 py-1.5 hover:bg-slate-200">Edit</button>
                      <button onClick={() => deleteEntry(entry.id)} className="rounded-lg bg-rose-100 px-2 py-1.5 text-rose-600 hover:bg-rose-200">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Recent Entries</h3>
            <div className="mt-4 space-y-3">
              {recentEntries.map((entry) => (
                <button key={entry.id} onClick={() => setSelectedEntry(entry)} className="block w-full rounded-2xl bg-slate-50 p-3 text-left transition hover:bg-slate-100">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-800">{entry.title}</p>
                    <span className="text-xs text-slate-500">{formatDate(entry.entry_date)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{entry.category_name || "General"} • {entry.mood}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Categories</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {categories.length ? categories.map((category) => (
                <span key={category.id} className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700">
                  {category.name} {category.catType ? `• ${category.catType}` : ""}
                </span>
              )) : <span className="text-xs text-slate-500">No categories yet</span>}
            </div>
          </div>
        </aside>
      </div>

      {selectedEntry && (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500"><FiCalendar /> {formatDate(selectedEntry.entry_date)}</div>
              <h3 className="mt-2 text-2xl font-bold text-slate-900">{selectedEntry.title}</h3>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEditEntry(selectedEntry)} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200">Edit</button>
              <button onClick={() => favoriteEntry(selectedEntry.id)} className="rounded-xl bg-rose-100 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-200">Favorite</button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="rounded-full bg-violet-100 px-2.5 py-1">{selectedEntry.category_name || "General"}</span>
            <span className="rounded-full bg-amber-100 px-2.5 py-1">{selectedEntry.mood}</span>
            {selectedEntry.location && <span className="rounded-full bg-sky-100 px-2.5 py-1">{selectedEntry.location}</span>}
          </div>

          <div className="mt-5 prose max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: selectedEntry.content }} />
          {selectedEntry.attachments?.length ? (
            <div className="mt-6">
              <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Attachments</h4>
              <div className="mt-3 flex flex-wrap gap-3">
                {selectedEntry.attachments.map((att) => (
                  <a key={att.id} href={att.file_url} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{att.file_name}</a>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h2 className="text-xl font-bold text-slate-900">{editingId ? "Edit Diary" : "Add Diary Entry"}</h2>
              <button onClick={closeEditor} className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"><FiX /></button>
            </div>

            <div className="p-4 md:p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Diary Title *</label>
                  <input value={formState.title} onChange={(e) => setFormState({ ...formState, title: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-violet-500" placeholder="Title of your diary entry" />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Date *</label>
                  <input type="date" value={formState.entry_date} onChange={(e) => setFormState({ ...formState, entry_date: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-violet-500" />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Time</label>
                  <input type="time" value={formState.entry_time} onChange={(e) => setFormState({ ...formState, entry_time: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-violet-500" />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
                  <select value={formState.category_id} onChange={(e) => setFormState({ ...formState, category_id: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-violet-500">
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name} {category.catType ? `(${category.catType})` : ""}</option>
                    ))}
                    {!categories.length && defaultCategories.map((name, index) => (
                      <option key={`${name}-${index}`} value={index + 1}>{name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Mood</label>
                  <select value={formState.mood} onChange={(e) => setFormState({ ...formState, mood: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-violet-500">
                    {defaultMoodOptions.map((mood) => (
                      <option key={mood.value} value={mood.value}>{mood.emoji} {mood.value}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Tags</label>
                  <input value={formState.tags} onChange={(e) => setFormState({ ...formState, tags: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-violet-500" placeholder="Family, Travel, Daily" />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Location</label>
                  <input value={formState.location} onChange={(e) => setFormState({ ...formState, location: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-violet-500" placeholder="Current city or place" />
                </div>

                <div className="md:col-span-2 flex flex-wrap gap-3">
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={formState.is_favorite} onChange={(e) => setFormState({ ...formState, is_favorite: e.target.checked })} /> Favorite</label>
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={formState.is_private} onChange={(e) => setFormState({ ...formState, is_private: e.target.checked })} /> Private</label>
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={formState.is_locked} onChange={(e) => setFormState({ ...formState, is_locked: e.target.checked })} /> Locked</label>
                </div>

                <div className="md:col-span-2">
                  <div className="mb-2 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 text-sm">
                    <button type="button" onClick={() => applyFormat("bold")} className="rounded-lg bg-white px-2 py-1.5 font-bold">B</button>
                    <button type="button" onClick={() => applyFormat("italic")} className="rounded-lg bg-white px-2 py-1.5 italic">I</button>
                    <button type="button" onClick={() => applyFormat("underline")} className="rounded-lg bg-white px-2 py-1.5 underline">U</button>
                    <button type="button" onClick={() => applyFormat("formatBlock", "h2")} className="rounded-lg bg-white px-2 py-1.5">H</button>
                    <button type="button" onClick={() => applyFormat("insertUnorderedList")} className="rounded-lg bg-white px-2 py-1.5">• List</button>
                    <button type="button" onClick={() => applyFormat("insertOrderedList")} className="rounded-lg bg-white px-2 py-1.5">1. List</button>
                    <button type="button" onClick={() => applyFormat("justifyLeft")} className="rounded-lg bg-white px-2 py-1.5">Align Left</button>
                    <button type="button" onClick={() => applyFormat("justifyCenter")} className="rounded-lg bg-white px-2 py-1.5">Center</button>
                    <button type="button" onClick={() => applyFormat("formatBlock", "blockquote")} className="rounded-lg bg-white px-2 py-1.5">Quote</button>
                    <button type="button" onClick={() => applyFormat("undo")} className="rounded-lg bg-white px-2 py-1.5">Undo</button>
                    <button type="button" onClick={() => applyFormat("redo")} className="rounded-lg bg-white px-2 py-1.5">Redo</button>
                  </div>

                  <div
                    ref={editorRef}
                    contentEditable
                    className="min-h-[220px] rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-800 outline-none focus:border-violet-500"
                    onInput={handleEditorInput}
                    dangerouslySetInnerHTML={{ __html: formState.content }}
                  />

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>{(formState.content || "").replace(/<[^>]+>/g, "").trim().split(/\s+/).filter(Boolean).length} words</span>
                    <span>{draftSaved ? "Saved just now" : "Saving..."}</span>
                  </div>
                </div>

                <div className="md:col-span-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Attach media</p>
                      <p className="text-xs text-slate-500">Images, videos and files</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                        className={`rounded-xl px-3 py-2 text-sm font-medium ${isRecording ? "bg-rose-500 text-white hover:bg-rose-600" : "bg-amber-500 text-white hover:bg-amber-600"}`}
                      >
                        {isRecording ? "Stop Recording" : "Record Voice"}
                      </button>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700">
                        <FiUploadCloud /> Upload
                        <input type="file" className="hidden" multiple accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" onChange={handleFiles} />
                      </label>
                    </div>
                  </div>
                  {files.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {files.map((file, index) => (
                        <span key={`${file.name}-${index}`} className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-600 shadow-sm">{file.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button onClick={() => handleSubmit("draft")} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">Save Draft</button>
                <button onClick={() => handleSubmit("published")} className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700">Save Entry</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiaryManagement;
