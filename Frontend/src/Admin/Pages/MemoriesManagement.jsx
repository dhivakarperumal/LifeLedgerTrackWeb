import React, { useEffect, useMemo, useState } from "react";
import api from "../../api";
import { toast } from "react-hot-toast";
import {
  FiImage, FiVideo, FiMusic, FiSearch, FiPlus, FiHeart, FiEdit2, FiTrash2,
  FiFilter, FiCalendar, FiMapPin, FiTag, FiGrid, FiList, FiDownload,
  FiFolder, FiBookOpen, FiSave, FiX, FiStar, FiEye, FiUploadCloud, FiClock
} from "react-icons/fi";

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
  media_url: "",
  voice_note: "",
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const getMediaUrl = (value) => {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  return `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}${value.startsWith("/") ? value : `/${value}`}`;
};

const MemoriesManagement = () => {
  const [memories, setMemories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedAlbum, setSelectedAlbum] = useState("all");
  const [search, setSearch] = useState("");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [viewMode, setViewMode] = useState("grid");
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

  const filteredMemories = useMemo(() => {
    return memories.filter((item) => {
      const matchesSearch = !search || [item.title, item.description, item.location, item.mood, item.category_name, (item.tags || []).join(" ")].join(" ").toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === "all" || String(item.category_id) === String(selectedCategory);
      const matchesAlbum = selectedAlbum === "all" || String(item.album_id) === String(selectedAlbum);
      const matchesFavorite = !favoriteOnly || item.is_favorite;
      return matchesSearch && matchesCategory && matchesAlbum && matchesFavorite;
    });
  }, [memories, search, selectedCategory, selectedAlbum, favoriteOnly]);

  const stats = useMemo(() => ({
    total: memories.length,
    favorites: memories.filter((item) => item.is_favorite).length,
    thisYear: memories.filter((item) => new Date(item.memory_date).getFullYear() === new Date().getFullYear()).length,
    albums: albums.length,
  }), [memories, albums]);

  const openNewMemory = () => {
    setEditingId(null);
    setSelectedMemory(null);
    setUploadFile(null);
    setForm({ ...initialForm, category_id: categories[0]?.id || "", album_id: albums[0]?.id || "" });
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
      tags: Array.isArray(memory.tags) ? memory.tags.join(", ") : (memory.tags || ""),
      status: memory.status || "published",
      is_favorite: Boolean(memory.is_favorite),
      media_url: memory.media_url || "",
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
      const fd = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (key === "tags" || key === "media_url" || key === "voice_note") {
          fd.append(key, value || "");
        }
        if (key === "is_favorite") {
          fd.append(key, value ? "true" : "false");
        }
        if (key === "category_id" || key === "album_id") {
          if (value) fd.append(key, value);
        }
      });

      if (uploadFile) {
        fd.append("media", uploadFile);
      }

      if (editingId) {
        await api.put(`/memories/${editingId}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Memory updated successfully.");
      } else {
        await api.post("/memories", fd, { headers: { "Content-Type": "multipart/form-data" } });
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
      toast.success("Memory deleted.");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed.");
    }
  };

  const toggleFavorite = async (id) => {
    try {
      await api.patch(`/memories/${id}/favorite`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update favorite.");
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
    return <div className="p-6 text-white">Loading memories...</div>;
  }

  return (
    <div className="min-h-screen bg-[#0F172A] p-4 text-white md:p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-violet-300">Life Ledger</p>
          <h1 className="text-3xl font-bold">Memories Management</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={addSampleAlbum} className="rounded-xl border border-violet-400/50 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-200">+ Album</button>
          <button onClick={addSampleCategory} className="rounded-xl border border-cyan-400/50 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200">+ Category</button>
          <button onClick={openNewMemory} className="rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25">New Memory</button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Memories", value: stats.total, icon: <FiImage className="text-violet-300" /> },
          { label: "Favorites", value: stats.favorites, icon: <FiHeart className="text-pink-300" /> },
          { label: "This Year", value: stats.thisYear, icon: <FiCalendar className="text-cyan-300" /> },
          { label: "Albums", value: stats.albums, icon: <FiFolder className="text-emerald-300" /> },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-slate-300">{card.label}</span>
              <span className="rounded-full bg-white/5 p-2">{card.icon}</span>
            </div>
            <div className="text-3xl font-bold">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <FiSearch className="pointer-events-none absolute left-3 top-3.5 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search memories, tags, locations..." className="w-full rounded-xl border border-white/10 bg-slate-950/50 py-2.5 pl-10 pr-3 text-sm text-white outline-none ring-0 placeholder:text-slate-400" />
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-white">
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <select value={selectedAlbum} onChange={(e) => setSelectedAlbum(e.target.value)} className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-white">
              <option value="all">All Albums</option>
              {albums.map((album) => (
                <option key={album.id} value={album.id}>{album.name}</option>
              ))}
            </select>
            <button onClick={() => setFavoriteOnly((prev) => !prev)} className={`rounded-xl border px-3 py-2.5 text-sm ${favoriteOnly ? "border-pink-400 bg-pink-500/20 text-pink-200" : "border-white/10 bg-slate-950/50 text-slate-300"}`}>
              <span className="inline-flex items-center gap-2"><FiHeart /> Favorites</span>
            </button>
            <div className="flex rounded-xl border border-white/10 bg-slate-950/50 p-1">
              <button onClick={() => setViewMode("grid")} className={`rounded-lg px-3 py-2 ${viewMode === "grid" ? "bg-violet-500 text-white" : "text-slate-300"}`}><FiGrid /></button>
              <button onClick={() => setViewMode("list")} className={`rounded-lg px-3 py-2 ${viewMode === "list" ? "bg-violet-500 text-white" : "text-slate-300"}`}><FiList /></button>
            </div>
          </div>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredMemories.map((memory) => (
            <div key={memory.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-xl shadow-slate-950/20">
              <div className="relative h-52 overflow-hidden bg-slate-900">
                {memory.media_url ? (
                  memory.media_type === "video" ? (
                    <video src={getMediaUrl(memory.media_url)} className="h-full w-full object-cover" controls />
                  ) : memory.media_type === "audio" ? (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500">
                      <FiMusic size={42} className="text-white" />
                    </div>
                  ) : (
                    <img src={getMediaUrl(memory.media_url)} alt={memory.title} className="h-full w-full object-cover" />
                  )
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-violet-500/80 to-cyan-500/80 text-4xl">
                    <FiBookOpen />
                  </div>
                )}
                <button onClick={() => toggleFavorite(memory.id)} className="absolute right-3 top-3 rounded-full bg-slate-950/70 p-2 text-white">
                  <FiHeart className={memory.is_favorite ? "fill-pink-500 text-pink-400" : "text-white"} />
                </button>
              </div>
              <div className="p-4">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{memory.title}</h3>
                    <p className="text-xs uppercase tracking-[0.2em] text-violet-300">{memory.category_name || "Uncategorized"}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-slate-300">{memory.status || "published"}</span>
                </div>
                <p className="mb-4 line-clamp-3 text-sm text-slate-300">{memory.description || "No description added yet."}</p>
                <div className="mb-4 flex flex-wrap gap-2 text-[11px] text-slate-300">
                  {memory.location && <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1"><FiMapPin /> {memory.location}</span>}
                  {memory.memory_date && <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1"><FiCalendar /> {formatDate(memory.memory_date)}</span>}
                </div>
                <div className="mb-4 flex flex-wrap gap-2">
                  {(memory.tags || []).slice(0, 3).map((tag, index) => (
                    <span key={`${tag}-${index}`} className="rounded-full bg-violet-500/10 px-2 py-1 text-[10px] text-violet-200">#{tag}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <button onClick={() => openEditMemory(memory)} className="rounded-lg bg-violet-500/20 p-2 text-violet-200"><FiEdit2 /></button>
                    <button onClick={() => handleDelete(memory.id)} className="rounded-lg bg-rose-500/20 p-2 text-rose-200"><FiTrash2 /></button>
                  </div>
                  <button onClick={() => setSelectedMemory(memory)} className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm text-white"><FiEye /> View</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMemories.map((memory) => (
            <div key={memory.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-slate-800 text-white">
                  {memory.media_url ? (
                    memory.media_type === "video" ? <FiVideo /> : memory.media_type === "audio" ? <FiMusic /> : <FiImage />
                  ) : <FiBookOpen />}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{memory.title}</h3>
                  <p className="text-sm text-slate-300">{memory.category_name || "Uncategorized"} • {formatDate(memory.memory_date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedMemory(memory)} className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white">View</button>
                <button onClick={() => openEditMemory(memory)} className="rounded-lg bg-violet-500/20 px-3 py-2 text-sm text-violet-200">Edit</button>
                <button onClick={() => handleDelete(memory.id)} className="rounded-lg bg-rose-500/20 px-3 py-2 text-sm text-rose-200">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-[#111827] p-6 text-white shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold">{editingId ? "Edit Memory" : "Create New Memory"}</h2>
              <button onClick={() => setIsEditorOpen(false)} className="rounded-full bg-slate-800 p-2"><FiX /></button>
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
                  <label className="mb-2 block text-sm text-slate-300">Memory date</label>
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
                  <input name="tags" value={form.tags} onChange={handleInputChange} className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-white outline-none" placeholder="family, holiday, trip" />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-slate-300">Status</label>
                  <select name="status" value={form.status} onChange={handleInputChange} className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-white outline-none">
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm text-slate-300">Voice note / note</label>
                  <textarea name="voice_note" value={form.voice_note} onChange={handleInputChange} rows={3} className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-white outline-none" placeholder="Voice memory note" />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm text-slate-300">Upload media</label>
                  <input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} className="w-full rounded-xl border border-dashed border-white/15 bg-slate-900 px-3 py-3 text-sm text-slate-300 file:mr-4 file:rounded file:border-0 file:bg-violet-500 file:px-3 file:py-2 file:text-white" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" name="is_favorite" checked={form.is_favorite} onChange={handleInputChange} /> Favorite
                </label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsEditorOpen(false)} className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm">Cancel</button>
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
              <button onClick={() => setSelectedMemory(null)} className="rounded-full bg-slate-800 p-2"><FiX /></button>
            </div>
            <div className="mb-4 overflow-hidden rounded-2xl bg-slate-900">
              {selectedMemory.media_url ? (
                selectedMemory.media_type === "video" ? (
                  <video src={getMediaUrl(selectedMemory.media_url)} controls className="w-full" />
                ) : selectedMemory.media_type === "audio" ? (
                  <div className="flex h-32 items-center justify-center text-4xl"><FiMusic /></div>
                ) : (
                  <img src={getMediaUrl(selectedMemory.media_url)} alt={selectedMemory.title} className="w-full" />
                )
              ) : <div className="flex h-40 items-center justify-center text-3xl"><FiBookOpen /></div>}
            </div>
            <div className="space-y-3 text-sm text-slate-200">
              <p>{selectedMemory.description || "No description."}</p>
              <div className="flex flex-wrap gap-2">
                {selectedMemory.location && <span className="rounded-full bg-white/5 px-2 py-1"><FiMapPin className="mr-1 inline" />{selectedMemory.location}</span>}
                {selectedMemory.memory_date && <span className="rounded-full bg-white/5 px-2 py-1"><FiCalendar className="mr-1 inline" />{formatDate(selectedMemory.memory_date)}</span>}
              </div>
              {selectedMemory.voice_note && <p className="rounded-xl border border-white/10 bg-slate-900 p-3 text-slate-100">Voice note: {selectedMemory.voice_note}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoriesManagement;
