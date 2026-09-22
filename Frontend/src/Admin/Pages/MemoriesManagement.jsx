import React, { useEffect, useMemo, useState } from "react";
import api from "../../api";
import { toast } from "react-hot-toast";
import {
  FiImage,
  FiVideo,
  FiMusic,
  FiSearch,
  FiPlus,
  FiHeart,
  FiEdit2,
  FiTrash2,
  FiCalendar,
  FiMapPin,
  FiGrid,
  FiList,
  FiFolder,
  FiBookOpen,
  FiSave,
  FiX,
  FiEye,
  FiTag,
  FiClock,
} from "react-icons/fi";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const getMediaUrl = (value) => {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  const base = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
  return `${base}${value.startsWith("/") ? value : `/${value}`}`;
};

const initialForm = {
  title: "",
  description: "",
  category_id: "",
  album_id: "",
  memory_date: new Date().toISOString().slice(0, 10),
  location: "",
  mood: "Happy",
  tags: "",
  status: "published",
  is_favorite: false,
  voice_note: "",
};

const MemoriesManagement = () => {
  const [memories, setMemories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedAlbum, setSelectedAlbum] = useState("all");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [viewMode, setViewMode] = useState("table");
  const [loading, setLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [uploadFile, setUploadFile] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [memoriesRes, categoriesRes, albumsRes] = await Promise.all([
        api.get("/memories"),
        api.get("/memories/categories"),
        api.get("/memories/albums"),
      ]);
      setMemories(Array.isArray(memoriesRes.data) ? memoriesRes.data : []);
      setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : []);
      setAlbums(Array.isArray(albumsRes.data) ? albumsRes.data : []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load memories.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = useMemo(() => ({
    total: memories.length,
    favorites: memories.filter((item) => item.is_favorite).length,
    thisYear: memories.filter((item) => new Date(item.memory_date).getFullYear() === new Date().getFullYear()).length,
    albums: albums.length,
  }), [memories, albums]);

  const filteredMemories = useMemo(() => {
    return memories.filter((item) => {
      const haystack = [
        item.title,
        item.description,
        item.location,
        item.mood,
        item.category_name,
        (item.tags || []).join(" "),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !search || haystack.includes(search.toLowerCase());
      const matchesCategory = selectedCategory === "all" || String(item.category_id) === String(selectedCategory);
      const matchesAlbum = selectedAlbum === "all" || String(item.album_id) === String(selectedAlbum);
      const matchesFavorite = !favoriteOnly || item.is_favorite;
      return matchesSearch && matchesCategory && matchesAlbum && matchesFavorite;
    });
  }, [memories, search, selectedCategory, selectedAlbum, favoriteOnly]);

  const openNewMemory = () => {
    setEditingId(null);
    setSelectedMemory(null);
    setUploadFile(null);
    setForm({
      ...initialForm,
      category_id: categories[0]?.id || "",
      album_id: albums[0]?.id || "",
    });
    setIsEditorOpen(true);
  };

  const openEditMemory = (memory) => {
    setEditingId(memory.id);
    setSelectedMemory(memory);
    setForm({
      title: memory.title || "",
      description: memory.description || "",
      category_id: memory.category_id || "",
      album_id: memory.album_id || "",
      memory_date: memory.memory_date || new Date().toISOString().slice(0, 10),
      location: memory.location || "",
      mood: memory.mood || "Happy",
      tags: Array.isArray(memory.tags) ? memory.tags.join(", ") : memory.tags || "",
      status: memory.status || "published",
      is_favorite: Boolean(memory.is_favorite),
      voice_note: memory.voice_note || "",
    });
    setIsEditorOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Memory title is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        if (key === "is_favorite") {
          formData.append(key, value ? "true" : "false");
          return;
        }
        if (key === "category_id" || key === "album_id") {
          if (value) formData.append(key, value);
          return;
        }
        formData.append(key, value);
      });

      if (uploadFile) {
        formData.append("media", uploadFile);
      }

      if (editingId) {
        await api.put(`/memories/${editingId}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Memory updated successfully.");
      } else {
        await api.post("/memories", formData, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Memory created successfully.");
      }

      setIsEditorOpen(false);
      setForm(initialForm);
      setUploadFile(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this memory?")) return;
    try {
      await api.delete(`/memories/${id}`);
      toast.success("Memory deleted successfully.");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete memory.");
    }
  };

  const toggleFavorite = async (id) => {
    try {
      await api.patch(`/memories/${id}/favorite`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to toggle favorite.");
    }
  };

  const addSampleAlbum = async () => {
    const name = window.prompt("Album name");
    if (!name) return;
    try {
      await api.post("/memories/albums", { name, description: "Created from memories manager" });
      toast.success("Album created.");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create album.");
    }
  };

  const addSampleCategory = async () => {
    const name = window.prompt("Category name");
    if (!name) return;
    try {
      await api.post("/memories/categories", { name, description: "Life memory category" });
      toast.success("Category created.");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create category.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-5">
        <div className="flex min-h-[60vh] items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#7b2cbf]/20 border-t-[#7b2cbf]" />
            <p className="text-sm font-bold text-gray-500">Loading memories...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-5 bg-[#f3f4f6] p-4 pb-20 md:p-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Total Memories", value: stats.total, sub: "All records", icon: <FiImage size={20} />, gradient: "from-[#240046] to-[#7b2cbf]" },
          { label: "Favorites", value: stats.favorites, sub: "Saved moments", icon: <FiHeart size={18} />, gradient: "from-rose-500 to-pink-500" },
          { label: "This Year", value: stats.thisYear, sub: "Recent memories", icon: <FiCalendar size={18} />, gradient: "from-amber-400 to-orange-500" },
          { label: "Albums", value: stats.albums, sub: "Collections", icon: <FiFolder size={20} />, gradient: "from-emerald-400 to-teal-500" },
        ].map((card, index) => (
          <div key={index} className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${card.gradient} text-white shadow-md`}>
              {card.icon}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400">{card.label}</p>
              <p className="my-1 text-3xl font-black leading-none text-slate-800">{card.value}</p>
              <p className="text-[10px] text-gray-400">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="relative min-w-[220px] flex-1">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search memories..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-[#7b2cbf] focus:bg-white"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-slate-600 outline-none transition-all focus:border-[#7b2cbf]"
        >
          <option value="all">All Categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>

        <select
          value={selectedAlbum}
          onChange={(e) => setSelectedAlbum(e.target.value)}
          className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-slate-600 outline-none transition-all focus:border-[#7b2cbf]"
        >
          <option value="all">All Albums</option>
          {albums.map((album) => (
            <option key={album.id} value={album.id}>{album.name}</option>
          ))}
        </select>

        <button
          onClick={() => setFavoriteOnly((prev) => !prev)}
          className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${favoriteOnly ? "border-pink-300 bg-pink-50 text-pink-600" : "border-gray-200 bg-gray-50 text-slate-600"}`}
        >
          Favorites
        </button>

        <div className="ml-auto flex items-center gap-3">
          <div className="flex rounded-xl border border-gray-200 bg-gray-100 p-1">
            <button onClick={() => setViewMode("table")} className={`rounded-lg p-2 transition-all ${viewMode === "table" ? "bg-white text-[#7b2cbf] shadow-sm" : "text-gray-500"}`}>
              <FiList size={17} />
            </button>
            <button onClick={() => setViewMode("grid")} className={`rounded-lg p-2 transition-all ${viewMode === "grid" ? "bg-white text-[#7b2cbf] shadow-sm" : "text-gray-500"}`}>
              <FiGrid size={17} />
            </button>
          </div>

          <button
            onClick={openNewMemory}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#240046] to-[#7b2cbf] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-purple-900/20 transition-all hover:from-[#10002b] hover:to-[#5a189a]"
          >
            <FiPlus size={16} /> Add Memory
          </button>
        </div>
      </div>

      {viewMode === "table" ? (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-[#1F0A3C] to-[#3c096c] text-[#FCD34D]">
                  {['#', 'Title', 'Category', 'Date', 'Location', 'Mood', 'Tags', 'Favorite', 'Action'].map((header) => (
                    <th key={header} className="whitespace-nowrap px-4 py-4 text-[11px] font-bold uppercase tracking-wider">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMemories.map((memory, index) => (
                  <tr key={memory.id} className="bg-white hover:bg-violet-50/40">
                    <td className="px-4 py-4 font-bold text-slate-700">{index + 1}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-100 to-pink-100 text-violet-600">
                          {memory.media_type === "video" ? <FiVideo size={18} /> : memory.media_type === "audio" ? <FiMusic size={18} /> : <FiImage size={18} />}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{memory.title}</p>
                          <p className="text-xs text-gray-400">{memory.status || "published"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
                        {memory.category_name || "General"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-700">{formatDate(memory.memory_date)}</td>
                    <td className="px-4 py-4 text-slate-700">{memory.location || "—"}</td>
                    <td className="px-4 py-4 text-slate-700">{memory.mood || "Happy"}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(memory.tags || []).slice(0, 2).map((tag, idx) => (
                          <span key={`${tag}-${idx}`} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">#{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <button onClick={() => toggleFavorite(memory.id)} className={`rounded-full p-2 ${memory.is_favorite ? "bg-pink-100 text-pink-600" : "bg-slate-100 text-slate-500"}`}>
                        <FiHeart className={memory.is_favorite ? "fill-pink-500 text-pink-500" : ""} size={15} />
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSelectedMemory(memory)} className="rounded-lg bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200">
                          <FiEye size={15} />
                        </button>
                        <button onClick={() => openEditMemory(memory)} className="rounded-lg bg-violet-100 p-2 text-violet-700 transition hover:bg-violet-200">
                          <FiEdit2 size={15} />
                        </button>
                        <button onClick={() => handleDelete(memory.id)} className="rounded-lg bg-rose-100 p-2 text-rose-600 transition hover:bg-rose-200">
                          <FiTrash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredMemories.map((memory) => (
            <div key={memory.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="relative h-52 overflow-hidden bg-slate-100">
                {memory.media_url ? (
                  memory.media_type === "video" ? (
                    <video src={getMediaUrl(memory.media_url)} className="h-full w-full object-cover" controls />
                  ) : memory.media_type === "audio" ? (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-violet-500 to-pink-500 text-4xl text-white">
                      <FiMusic />
                    </div>
                  ) : (
                    <img src={getMediaUrl(memory.media_url)} alt={memory.title} className="h-full w-full object-cover" />
                  )
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-violet-500/90 to-pink-500/90 text-4xl text-white">
                    <FiBookOpen />
                  </div>
                )}

                <button onClick={() => toggleFavorite(memory.id)} className="absolute right-3 top-3 rounded-full bg-slate-950/70 p-2 text-white">
                  <FiHeart className={memory.is_favorite ? "fill-pink-500 text-pink-500" : ""} />
                </button>
              </div>

              <div className="p-4">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{memory.title}</h3>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-600">{memory.category_name || "General"}</p>
                  </div>
                  <span className="rounded-full bg-violet-100 px-2 py-1 text-[10px] font-semibold text-violet-700">{memory.status || "published"}</span>
                </div>

                <p className="mb-3 text-sm text-slate-600">{memory.description || "No description added yet."}</p>

                <div className="mb-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                  {memory.location && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1"><FiMapPin size={11} /> {memory.location}</span>}
                  {memory.memory_date && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1"><FiCalendar size={11} /> {formatDate(memory.memory_date)}</span>}
                </div>

                <div className="mb-4 flex flex-wrap gap-1">
                  {(memory.tags || []).slice(0, 3).map((tag, index) => (
                    <span key={`${tag}-${index}`} className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-medium text-violet-700">#{tag}</span>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedMemory(memory)} className="rounded-lg bg-slate-100 p-2 text-slate-700"><FiEye size={15} /></button>
                    <button onClick={() => openEditMemory(memory)} className="rounded-lg bg-violet-100 p-2 text-violet-700"><FiEdit2 size={15} /></button>
                    <button onClick={() => handleDelete(memory.id)} className="rounded-lg bg-rose-100 p-2 text-rose-600"><FiTrash2 size={15} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-[#111827] p-6 text-white shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold">{editingId ? "Edit Memory" : "Create Memory"}</h2>
              <button onClick={() => setIsEditorOpen(false)} className="rounded-full bg-slate-800 p-2 text-white"><FiX /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm text-slate-300">Title</label>
                  <input name="title" value={form.title} onChange={handleInputChange} className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-white outline-none" required />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm text-slate-300">Description</label>
                  <textarea name="description" value={form.description} onChange={handleInputChange} rows={4} className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-white outline-none" />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">Category</label>
                  <select name="category_id" value={form.category_id} onChange={handleInputChange} className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-white outline-none">
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">Album</label>
                  <select name="album_id" value={form.album_id} onChange={handleInputChange} className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-white outline-none">
                    <option value="">Select album</option>
                    {albums.map((album) => (
                      <option key={album.id} value={album.id}>{album.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">Memory Date</label>
                  <input type="date" name="memory_date" value={form.memory_date} onChange={handleInputChange} className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-white outline-none" />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">Mood</label>
                  <input name="mood" value={form.mood} onChange={handleInputChange} className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-white outline-none" />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">Location</label>
                  <input name="location" value={form.location} onChange={handleInputChange} className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-white outline-none" />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">Tags</label>
                  <input name="tags" value={form.tags} onChange={handleInputChange} placeholder="family, travel, wedding" className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-white outline-none" />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">Status</label>
                  <select name="status" value={form.status} onChange={handleInputChange} className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-white outline-none">
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm text-slate-300">Voice note</label>
                  <textarea name="voice_note" value={form.voice_note} onChange={handleInputChange} rows={3} className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-white outline-none" placeholder="Add a short memory note or voice summary" />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm text-slate-300">Upload media</label>
                  <input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} className="w-full rounded-xl border border-dashed border-white/10 bg-slate-900 px-3 py-3 text-sm text-slate-300 file:mr-4 file:rounded file:border-0 file:bg-violet-500 file:px-3 file:py-2 file:text-white" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" name="is_favorite" checked={form.is_favorite} onChange={handleInputChange} />
                  Mark as favorite
                </label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsEditorOpen(false)} className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm text-white">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70">
                    <FiSave /> {isSubmitting ? "Saving..." : editingId ? "Update" : "Create"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedMemory && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#111827] p-5 text-white shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold">{selectedMemory.title}</h3>
              <button onClick={() => setSelectedMemory(null)} className="rounded-full bg-slate-800 p-2 text-white"><FiX /></button>
            </div>

            <div className="mb-4 overflow-hidden rounded-2xl bg-slate-900">
              {selectedMemory.media_url ? (
                selectedMemory.media_type === "video" ? (
                  <video src={getMediaUrl(selectedMemory.media_url)} controls className="w-full" />
                ) : selectedMemory.media_type === "audio" ? (
                  <div className="flex h-36 items-center justify-center text-4xl text-white"><FiMusic /></div>
                ) : (
                  <img src={getMediaUrl(selectedMemory.media_url)} alt={selectedMemory.title} className="w-full" />
                )
              ) : (
                <div className="flex h-40 items-center justify-center text-4xl text-white"><FiBookOpen /></div>
              )}
            </div>

            <div className="space-y-3 text-sm text-slate-200">
              <p>{selectedMemory.description || "No description added."}</p>

              <div className="flex flex-wrap gap-2">
                {selectedMemory.location && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1"><FiMapPin size={12} /> {selectedMemory.location}</span>
                )}
                {selectedMemory.memory_date && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1"><FiCalendar size={12} /> {formatDate(selectedMemory.memory_date)}</span>
                )}
                {selectedMemory.mood && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1"><FiClock size={12} /> {selectedMemory.mood}</span>
                )}
              </div>

              {selectedMemory.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedMemory.tags.map((tag, idx) => (
                    <span key={`${tag}-${idx}`} className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-1 text-xs text-violet-200"><FiTag size={10} /> {tag}</span>
                  ))}
                </div>
              )}

              {selectedMemory.voice_note && (
                <div className="rounded-xl border border-white/10 bg-slate-900 p-3 text-slate-100">
                  <p className="mb-1 text-xs uppercase tracking-[0.2em] text-slate-400">Voice note</p>
                  <p>{selectedMemory.voice_note}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoriesManagement;
