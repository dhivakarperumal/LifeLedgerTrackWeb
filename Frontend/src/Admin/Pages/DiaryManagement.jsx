import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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



const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const moodMap = Object.fromEntries(defaultMoodOptions.map((m) => [m.value, m.emoji]));

const isDiaryCategory = (category) => {
  const typeValue = String(category?.catType || category?.type || category?.category_type || "").trim().toLowerCase();
  const nameValue = String(category?.name || "").trim().toLowerCase();
  const diaryAliases = ["diary", "journal", "daily", "journal entry", "diary entry", "dairy"];

  return (
    diaryAliases.includes(typeValue) ||
    diaryAliases.some((keyword) => typeValue.includes(keyword)) ||
    diaryAliases.some((keyword) => nameValue.includes(keyword))
  );
};

const DiaryManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedMood, setSelectedMood] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");
  const [viewMode, setViewMode] = useState("list");
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

  const mergeUniqueFiles = (existingFiles, incomingFiles) => {
    const seen = new Set(existingFiles.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
    const uniqueFiles = incomingFiles.filter((file) => !seen.has(`${file.name}-${file.size}-${file.lastModified}`));
    return [...existingFiles, ...uniqueFiles];
  };

  const getFilePreviewUrl = (file) => {
    if (!file) return "";
    if (typeof file === "string") return file;
    return URL.createObjectURL(file);
  };

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
      const diaryCategories = categoryList.filter(isDiaryCategory);

      setEntries(entriesRes.data || []);
      setCategories(diaryCategories);
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

  const uploadAttachmentFiles = async (entryId, pendingFiles = []) => {
    if (!entryId || !pendingFiles.length) return;

    await Promise.all(
      pendingFiles.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        await api.post(`/diary/${entryId}/attachments`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      })
    );
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

      const savedEntryId = response?.data?.id || editingId;
      if (files.length) {
        await uploadAttachmentFiles(savedEntryId, files);
      }

      localStorage.removeItem("diary-draft-temp");
      setEditingId(savedEntryId);
      setSelectedEntry(response.data || selectedEntry);
      setFiles([]);
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
    const selectedFiles = Array.from(e.target.files || []);
    setFiles((prevFiles) => mergeUniqueFiles(prevFiles, selectedFiles));
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
        setFiles((prevFiles) => mergeUniqueFiles(prevFiles, [file]));
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

  const uploadAttachment = async (entryId, pendingFiles = files) => {
    if (!entryId || !pendingFiles.length) return;

    try {
      await Promise.all(
        pendingFiles.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          await api.post(`/diary/${entryId}/attachments`, formData, { headers: { "Content-Type": "multipart/form-data" } });
        })
      );
      toast.success("Attachment uploaded.");
      setFiles([]);
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Upload failed.");
    }
  };

  const recentEntries = [...entries].sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date)).slice(0, 5);

  return (
    <div className="min-h-screen space-y-5 p-4 pb-20 md:p-2">

        
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Total Diary Entries", value: stats.totalEntries, icon: <FiFileText size={20} />, gradient: "from-[#240046] to-[#7b2cbf]" },
          { label: "This Month", value: stats.thisMonth, icon: <FiCalendar size={18} />, gradient: "from-rose-500 to-pink-500" },
          { label: "This Year", value: stats.thisYear, icon: <FiHeart size={18} />, gradient: "from-amber-400 to-orange-500" },
          { label: "Favorites", value: stats.favorites, icon: <FiStar size={18} />, gradient: "from-emerald-400 to-teal-500" },
          { label: "Drafts", value: stats.drafts, icon: <FiBookmark size={18} />, gradient: "from-cyan-400 to-sky-500" },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${stat.gradient} text-white shadow-md`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400">{stat.label}</p>
              <p className="my-1 text-3xl font-black leading-none text-slate-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative min-w-[220px] flex-1">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-1/2 rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-[#7b2cbf] focus:bg-white"
              placeholder="Search title, mood, category, location, tags..."
            />
          </div>

           <div className="relative">
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 pr-10 text-sm font-medium text-slate-600 outline-none transition-all focus:border-[#7b2cbf] focus:bg-white">
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name} {category.catType ? `(${category.catType})` : ""}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">▾</span>
          </div>
          <div className="relative">
            <select value={selectedMood} onChange={(e) => setSelectedMood(e.target.value)} className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 pr-10 text-sm font-medium text-slate-600 outline-none transition-all focus:border-[#7b2cbf] focus:bg-white">
              <option value="all">All Moods</option>
              {defaultMoodOptions.map((mood) => (
                <option key={mood.value} value={mood.value}>{mood.emoji} {mood.value}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">▾</span>
          </div>

          <div className="relative min-w-[160px]">
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 pr-10 text-sm font-medium text-slate-600 outline-none transition-all focus:border-[#7b2cbf] focus:bg-white"
            >
              {[
                { label: "All Entries", value: "all" },
                { label: "Recent", value: "recent" },
                { label: "Favorites", value: "favorites" },
                { label: "Drafts", value: "drafts" },
                { label: "This Month", value: "month" },
                { label: "This Year", value: "year" },
              ].map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">▾</span>
          </div>

           <div className="flex items-center justify-end gap-2 md:col-span-1">
            <button onClick={() => setViewMode("grid")} className={`rounded-xl p-2 ${viewMode === "grid" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"}`}><FiGrid /></button>
            <button onClick={() => setViewMode("list")} className={`rounded-xl p-2 ${viewMode === "list" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"}`}><FiList /></button>
          </div>

           <button
            onClick={openNewEntry}
            className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-gradient-to-r from-[#240046] to-[#7b2cbf] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-purple-900/20 transition hover:from-[#10002b] hover:to-[#5a189a]"
          >
            <FiPlus size={18} />
            Add New Diary
          </button>
        </div>
      </div>

      <div className="w-full">
        <div className="space-y-4">
          {loading ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-slate-500 shadow-sm">Loading diary entries...</div>
          ) : filteredEntries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-3xl text-violet-600">📖</div>
              <h3 className="mt-5 text-2xl font-bold text-slate-900">Your Diary Is Empty</h3>
              <p className="mt-2 text-slate-500">Start writing about your day, thoughts and special moments.</p>
              <button onClick={openNewEntry} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#240046] to-[#7b2cbf] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-purple-900/20 hover:from-[#10002b] hover:to-[#5a189a]"> <FiPlus /> Add Diary Entry </button>
            </div>
          ) : viewMode === "list" ? (
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-[#1F0A3C] to-[#3c096c]">
                      <th className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider">Date</th>
                      <th className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider">Title & Content</th>
                      <th className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider">Category</th>
                      <th className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider">Mood</th>
                      <th className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-slate-800 font-bold">{formatDate(entry.entry_date)}</div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-bold text-slate-900 max-w-[200px] truncate">{entry.title}</p>
                          <p className="text-xs text-slate-500 max-w-[250px] truncate">{entry.content.replace(/<[^>]+>/g, "")}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span className="rounded-lg bg-violet-50 border border-violet-100 px-2.5 py-1 text-xs font-bold text-violet-700 whitespace-nowrap">
                            {entry.category_name || "General"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="rounded-lg bg-amber-50 border border-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700 whitespace-nowrap">
                            {moodMap[entry.mood] || "😊"} {entry.mood}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => favoriteEntry(entry.id)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${entry.is_favorite ? "bg-rose-50 text-rose-500" : "bg-slate-50 text-slate-400 hover:bg-slate-100"}`} title="Favorite">
                              <FiHeart size={13} className={entry.is_favorite ? "fill-current" : ""} />
                            </button>
                            <button onClick={() => navigate(`/admin/users/diary/${entry.id}`)} className="w-8 h-8 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-all" title="View"><FiEye size={13} /></button>
                            <button onClick={() => openEditEntry(entry)} className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all" title="Edit"><FiEdit2 size={13} /></button>
                            <button onClick={() => deleteEntry(entry.id)} className="w-8 h-8 rounded-lg bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all" title="Delete"><FiTrash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredEntries.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
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
                      <button onClick={() => navigate(`/admin/users/diary/${entry.id}`)} className="rounded-lg bg-slate-100 px-2 py-1.5 hover:bg-slate-200">View</button>
                      <button onClick={() => openEditEntry(entry)} className="rounded-lg bg-slate-100 px-2 py-1.5 hover:bg-slate-200">Edit</button>
                      <button onClick={() => deleteEntry(entry.id)} className="rounded-lg bg-rose-100 px-2 py-1.5 text-rose-600 hover:bg-rose-200">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>


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
                  <input value={formState.title} onChange={(e) => setFormState({ ...formState, title: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-violet-500" placeholder="Enter diary title" />
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
                  <div className="relative">
                    <select value={formState.category_id} onChange={(e) => setFormState({ ...formState, category_id: e.target.value })} className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 outline-none transition-all focus:border-violet-500">
                      <option value="">Select category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>{category.name} {category.catType ? `(${category.catType})` : ""}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">▾</span>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Mood</label>
                  <div className="relative">
                    <select value={formState.mood} onChange={(e) => setFormState({ ...formState, mood: e.target.value })} className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 outline-none transition-all focus:border-violet-500">
                      {defaultMoodOptions.map((mood) => (
                        <option key={mood.value} value={mood.value}>{mood.emoji} {mood.value}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">▾</span>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Tags</label>
                  <input value={formState.tags} onChange={(e) => setFormState({ ...formState, tags: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-violet-500" placeholder="e.g. Family, Travel, Daily" />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Location</label>
                  <input value={formState.location} onChange={(e) => setFormState({ ...formState, location: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-violet-500" placeholder="Add a location or place name" />
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
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {files.map((file, index) => {
                        const fileType = file.type || "application/octet-stream";
                        const previewUrl = getFilePreviewUrl(file);

                        return (
                          <div key={`${file.name}-${file.size}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="max-h-40 overflow-hidden bg-slate-100">
                              {fileType.startsWith("image/") ? (
                                <img src={previewUrl} alt={file.name} className="h-40 w-full object-cover" />
                              ) : fileType.startsWith("video/") ? (
                                <video src={previewUrl} className="h-40 w-full object-cover" controls />
                              ) : fileType.startsWith("audio/") ? (
                                <div className="flex h-40 items-center justify-center bg-gradient-to-br from-violet-500 to-pink-500">
                                  <audio src={previewUrl} controls className="w-full px-2" />
                                </div>
                              ) : (
                                <div className="flex h-40 items-center justify-center bg-slate-200 px-3 text-center text-xs font-medium text-slate-700">
                                  {file.name}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-2 px-3 py-2">
                              <span className="truncate text-[11px] text-slate-600">{file.name}</span>
                              <button
                                type="button"
                                onClick={() => setFiles((prevFiles) => prevFiles.filter((_, itemIndex) => itemIndex !== index))}
                                className="rounded-lg bg-rose-100 px-2 py-1 text-[10px] font-semibold text-rose-600"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        );
                      })}
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
