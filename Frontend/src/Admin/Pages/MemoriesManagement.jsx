import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import Loader from "../../Components/CommenComponents/Loader";
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
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const normalizeDateInput = (value) => {
  if (!value) return new Date().toISOString().slice(0, 10);

  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) {
    return direct.toISOString().slice(0, 10);
  }

  const match = String(value).match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return value;
};

const getMediaUrl = (value) => {
  if (!value) return "";
  if (typeof value !== "string") return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const base = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
  return `${base}${value.startsWith("/") ? value : `/${value}`}`;
};

const getFileTypeFromName = (fileName = "", fallbackType = "application/octet-stream") => {
  const name = String(fileName || "").toLowerCase();
  const extension = name.split(".").pop();

  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(extension)) {
    return `image/${extension === "jpg" ? "jpeg" : extension}`;
  }

  if (["mp4", "webm", "ogg", "mov", "m4v"].includes(extension)) {
    return `video/${extension === "m4v" ? "mp4" : extension}`;
  }

  if (["mp3", "wav", "m4a", "aac", "ogg"].includes(extension)) {
    return `audio/${extension === "m4a" ? "mp4" : extension}`;
  }

  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".doc") || name.endsWith(".docx")) return "application/msword";
  if (name.endsWith(".xls") || name.endsWith(".xlsx")) return "application/vnd.ms-excel";

  return fallbackType || "application/octet-stream";
};

const initialForm = {
  title: "",
  description: "",
  category_id: "",
  memory_date: new Date().toISOString().slice(0, 10),
  location: "",
  mood: "Happy",
  tags: "",
  status: "published",
  is_favorite: false,
  voice_note: "",
};

const MemoriesManagement = () => {
  const navigate = useNavigate();
  const [memories, setMemories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [viewMode, setViewMode] = useState("table");
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [loading, setLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [existingImages, setExistingImages] = useState([]);
  const [existingVideos, setExistingVideos] = useState([]);
  const [existingAudios, setExistingAudios] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [newVideos, setNewVideos] = useState([]);
  const [newAudios, setNewAudios] = useState([]);
  const [removedImageIds, setRemovedImageIds] = useState([]);
  const [removedVideoIds, setRemovedVideoIds] = useState([]);
  const [removedAudioIds, setRemovedAudioIds] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVoiceName, setRecordedVoiceName] = useState("");
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setViewMode("grid");
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleViewModeChange = (nextMode) => {
    if (isMobile) {
      setViewMode("grid");
      return;
    }
    setViewMode(nextMode);
  };

  const mergeUniqueFiles = (existingFiles, incomingFiles) => {
    const seen = new Set(existingFiles.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
    const uniqueFiles = incomingFiles.filter((file) => !seen.has(`${file.name}-${file.size}-${file.lastModified}`));
    return [...existingFiles, ...uniqueFiles];
  };

  const getFilePreviewUrl = (file) => {
    if (!file) return "";
    if (typeof file === "string") return getMediaUrl(file);
    return URL.createObjectURL(file);
  };

  const getAllNewFiles = () => [...newImages, ...newVideos, ...newAudios];

  const normalizeExistingMedia = (memoryItem) => {
    const gallery = Array.isArray(memoryItem?.media_gallery) && memoryItem.media_gallery.length
      ? memoryItem.media_gallery
      : memoryItem?.media_url
        ? [memoryItem.media_url]
        : [];

    return gallery
      .filter(Boolean)
      .map((item, index) => {
        const value = typeof item === "string" ? item : item?.file_url || item?.url || item?.path || item?.src || "";
        const fileName = String(item?.file_name || item?.name || value.split("/").pop() || `media-${index + 1}`);
        const type = getFileTypeFromName(fileName, item?.file_type || item?.type || "application/octet-stream");
        const id = typeof item === "string" ? `existing-${index}-${fileName}` : (item?.id || `existing-${index}-${fileName}`);

        return {
          id,
          name: fileName,
          type,
          previewUrl: getMediaUrl(value),
          isExisting: true,
        };
      });
  };

  const splitExistingMedia = (mediaList = []) => {
    const images = [];
    const videos = [];
    const audios = [];

    mediaList.forEach((item) => {
      const lowerType = String(item?.type || item?.file_type || "").toLowerCase();
      const fileName = String(item?.name || item?.file_name || "").toLowerCase();
      const isImage = lowerType.startsWith("image/") || lowerType.includes("image") || /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(fileName);
      const isVideo = lowerType.startsWith("video/") || lowerType.includes("video") || /\.(mp4|webm|mov|m4v|ogg)$/i.test(fileName);
      const isAudio = lowerType.startsWith("audio/") || lowerType.includes("audio") || /\.(mp3|wav|m4a|aac)$/i.test(fileName);

      if (isImage) images.push(item);
      if (isVideo) videos.push(item);
      if (isAudio) audios.push(item);
    });

    return { images, videos, audios };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [memoriesRes, categoriesRes] = await Promise.all([
        api.get("/memories"),
        api.get("/categories"),
      ]);

      const sharedCategories = Array.isArray(categoriesRes.data) ? categoriesRes.data : [];
      const memoryOnlyCategories = sharedCategories.filter((category) => {
        const typeValue = String(category?.catType || category?.type || category?.category_type || "").trim().toLowerCase();
        return !typeValue || typeValue === "memory" || typeValue === "memories";
      });

      setMemories(Array.isArray(memoriesRes.data) ? memoriesRes.data : []);
      setCategories(memoryOnlyCategories);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load memories.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const memoryCategories = useMemo(() => {
    return categories.filter((category) => {
      const typeValue = String(category?.type || category?.catType || category?.category_type || "").toLowerCase();
      return !typeValue || ["memory", "memories"].includes(typeValue);
    });
  }, [categories]);

  const stats = useMemo(() => ({
    total: memories.length,
    favorites: memories.filter((item) => item.is_favorite).length,
    thisYear: memories.filter((item) => new Date(item.memory_date).getFullYear() === new Date().getFullYear()).length,
    albums: 0,
  }), [memories]);

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
      const matchesFavorite = !favoriteOnly || item.is_favorite;
      return matchesSearch && matchesCategory && matchesFavorite;
    });
  }, [memories, search, selectedCategory, favoriteOnly]);

  const openNewMemory = () => {
    setEditingId(null);
    setSelectedMemory(null);
    setExistingImages([]);
    setExistingVideos([]);
    setExistingAudios([]);
    setNewImages([]);
    setNewVideos([]);
    setNewAudios([]);
    setRemovedImageIds([]);
    setRemovedVideoIds([]);
    setRemovedAudioIds([]);
    setRecordedVoiceName("");
    setForm({
      ...initialForm,
      category_id: memoryCategories[0]?.id || "",
    });
    setIsEditorOpen(true);
  };

  const openEditMemory = (memory) => {
    setEditingId(memory.id);
    setSelectedMemory(memory);
    const normalized = normalizeExistingMedia(memory);
    const { images, videos, audios } = splitExistingMedia(normalized);

    setExistingImages(images);
    setExistingVideos(videos);
    setExistingAudios(audios);
    setNewImages([]);
    setNewVideos([]);
    setNewAudios([]);
    setRemovedImageIds([]);
    setRemovedVideoIds([]);
    setRemovedAudioIds([]);
    setRecordedVoiceName("");
    setForm({
      title: memory.title || "",
      description: memory.description || "",
      category_id: memory.category_id || "",
      memory_date: normalizeDateInput(memory.memory_date),
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
          formData.append(key, value ? "1" : "0");
          return;
        }
        if (key === "category_id") {
          if (value) formData.append(key, value);
          return;
        }
        formData.append(key, value);
      });

      if (removedImageIds.length) formData.append("removed_image_ids", JSON.stringify(removedImageIds));
      if (removedVideoIds.length) formData.append("removed_video_ids", JSON.stringify(removedVideoIds));
      if (removedAudioIds.length) formData.append("removed_audio_ids", JSON.stringify(removedAudioIds));

      getAllNewFiles().forEach((file) => {
        formData.append("media", file);
      });

      if (editingId) {
        await api.put(`/memories/${editingId}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Memory updated successfully.");
      } else {
        await api.post("/memories", formData, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Memory created successfully.");
      }

      setIsEditorOpen(false);
      setForm(initialForm);
      setExistingImages([]);
      setExistingVideos([]);
      setExistingAudios([]);
      setNewImages([]);
      setNewVideos([]);
      setNewAudios([]);
      setRemovedImageIds([]);
      setRemovedVideoIds([]);
      setRemovedAudioIds([]);
      setRecordedVoiceName("");
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

  const startVoiceRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error("Microphone is not supported in this browser.");
      return;
    }

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
        setNewAudios((prevFiles) => mergeUniqueFiles(prevFiles, [file]));
        setRecordedVoiceName((prevName) => (prevName ? `${prevName}, ${file.name}` : file.name));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      toast.success("Voice recording started.");
    } catch (error) {
      console.error("Microphone error:", error);
      toast.error("Microphone access is required to record a voice note.");
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success("Voice note captured.");
    }
  };

  const renderMediaPreviewCard = (item, index, onRemove) => {
    const fileType = item?.type || item?.mimeType || "application/octet-stream";
    const previewUrl = item?.previewUrl || getFilePreviewUrl(item);
    const isImage = fileType.startsWith("image/");
    const isVideo = fileType.startsWith("video/");
    const isAudio = fileType.startsWith("audio/");
    const isPdf = fileType === "application/pdf" || String(item?.name || "").toLowerCase().endsWith(".pdf");

    return (
      <div key={item?.id || `${item?.name || "media"}-${index}`} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        <div className="max-h-44 overflow-hidden bg-slate-100">
          {isImage ? (
            <img src={previewUrl} alt={item?.name || "Preview"} className="h-44 w-full object-cover" />
          ) : isVideo ? (
            <video src={previewUrl} className="h-44 w-full object-cover" controls />
          ) : isAudio ? (
            <div className="flex h-44 items-center justify-center bg-gradient-to-br from-violet-500 to-pink-500 p-3 text-white">
              <audio src={previewUrl} controls className="w-full" />
            </div>
          ) : isPdf ? (
            <iframe src={previewUrl} title={item?.name || "PDF preview"} className="h-44 w-full border-0 bg-white" />
          ) : (
            <div className="flex h-44 flex-col items-center justify-center bg-slate-200 px-3 text-center text-sm font-medium text-slate-700">
              <span className="mb-1 text-xl">📄</span>
              <span className="line-clamp-2">{item?.name || "Document file"}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-3 py-2">
          <span className="truncate text-xs text-slate-600">{item?.name || "Media file"}</span>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="rounded-lg bg-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-600"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Loader
        title="LIFE LEDGER"
        subtitle="Loading memories..."
        fullScreen={false}
      />
    );
  }

  return (
    <div className="min-h-screen space-y-5  p-1 pb-20 md:p-2">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Memories", value: stats.total, sub: "All records", icon: <FiImage size={20} />, gradient: "from-[#240046] to-[#7b2cbf]" },
          { label: "Favorites", value: stats.favorites, sub: "Saved moments", icon: <FiHeart size={18} />, gradient: "from-rose-500 to-pink-500" },
          { label: "This Year", value: stats.thisYear, sub: "Recent memories", icon: <FiCalendar size={18} />, gradient: "from-amber-400 to-orange-500" },
          { label: "Albums", value: stats.albums, sub: "Collections", icon: <FiFolder size={20} />, gradient: "from-emerald-400 to-teal-500" },
        ].map((card, index) => (
          <div key={index} className="flex min-h-[120px] items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:gap-4 sm:p-5">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${card.gradient} text-white shadow-md sm:h-14 sm:w-14`}>
              {card.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium text-gray-400 sm:text-xs">{card.label}</p>
              <p className="my-1 text-2xl font-black leading-none text-slate-800 sm:text-3xl">{card.value}</p>
              <p className="text-[9px] text-gray-400 sm:text-[10px]">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-[20px] border border-gray-200 bg-[#f3f4f6] p-3 shadow-sm md:flex-row md:items-center">
        <div className="relative w-full md:flex-1 md:min-w-[220px]">
          <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search memories..."
            className="w-full rounded-[18px] border border-gray-200 bg-white py-3.5 pl-11 pr-4 text-base font-medium text-slate-700 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-[#7b2cbf]"
          />
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row md:ml-auto md:w-auto md:items-center">
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full appearance-none rounded-[18px] border border-gray-200 bg-white px-4 py-3.5 pr-10 text-sm font-medium text-slate-700 shadow-sm outline-none transition-all focus:border-[#7b2cbf] sm:w-auto"
            >
              <option value="all">All Categories</option>
              {memoryCategories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">▾</span>
          </div>

          <div className="flex overflow-hidden rounded-[18px] border border-gray-200 bg-white shadow-sm self-start sm:self-auto">
            <button
              onClick={() => handleViewModeChange("table")}
              disabled={isMobile}
              className={`flex h-[46px] w-[46px] items-center justify-center transition-all ${viewMode === "table" ? "bg-[#f1e6ff] text-[#7b2cbf]" : "bg-white text-slate-500 hover:bg-slate-50"} ${isMobile ? "cursor-not-allowed opacity-50" : ""}`}
              aria-label="Table view"
            >
              <FiList size={17} />
            </button>
            <button
              onClick={() => handleViewModeChange("grid")}
              className={`flex h-[46px] w-[46px] items-center justify-center border-l border-gray-200 transition-all ${viewMode === "grid" ? "bg-[#f1e6ff] text-[#7b2cbf]" : "bg-white text-slate-500 hover:bg-slate-50"}`}
              aria-label="Grid view"
            >
              <FiGrid size={17} />
            </button>
          </div>

          <button
            onClick={openNewMemory}
            className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-gradient-to-r from-[#240046] to-[#7b2cbf] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-purple-900/20 transition-all hover:from-[#10002b] hover:to-[#5a189a] sm:w-auto"
          >
            <FiPlus size={18} />
            Add Memory
          </button>
        </div>
      </div>

      {viewMode === "table" ? (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-[#1F0A3C] to-[#3c096c] text-[#FCD34D]">
                  {['S No', 'Title', 'Category', 'Date', 'Location', 'Mood', 'Tags', 'Favorite', 'Action'].map((header) => (
                    <th key={header} className="whitespace-nowrap px-4 py-4 text-[11px] font-bold uppercase tracking-wider">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMemories.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm font-medium text-slate-400">
                      No memories found.
                    </td>
                  </tr>
                ) : filteredMemories.map((memory, index) => (
                  <tr key={memory.id} className="bg-white hover:bg-violet-50/40">
                    <td className="px-4 py-4 font-bold text-slate-700">{index + 1}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-14 w-20 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-violet-600">
                          {memory.media_type === "video" ? (
                            <video src={getMediaUrl(memory.media_url)} className="h-full w-full object-cover" controls playsInline muted />
                          ) : memory.media_type === "audio" ? (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-500 to-pink-500 text-white">
                              <FiMusic size={18} />
                              <audio src={getMediaUrl(memory.media_url)} controls className="h-8 w-20" />
                            </div>
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-100 to-pink-100">
                              <FiImage size={18} />
                            </div>
                          )}
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
                        <button onClick={() => navigate(`/admin/users/memories/${memory.id}`)} className="rounded-lg bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200">
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
                    <div className="relative flex flex-col h-full items-center justify-center bg-gradient-to-br from-violet-500 to-pink-500 text-4xl text-white">
                      <FiMusic className="mb-4 text-white/60 drop-shadow-md" />
                      <audio src={getMediaUrl(memory.media_url)} controls className="absolute bottom-2 w-11/12 max-w-[200px] h-8 opacity-90 shadow-sm" />
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
                    <button onClick={() => navigate(`/admin/users/memories/${memory.id}`)} className="rounded-lg bg-slate-100 p-2 text-slate-700"><FiEye size={15} /></button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="mb-0 flex items-center justify-between border-b border-[#3c096c]/20 bg-gradient-to-r from-[#1F0A3C] to-[#3c096c] px-6 py-5 text-white">
              <h2 className="text-2xl font-bold text-white">{editingId ? "Edit Memory" : "Create Memory"}</h2>
              <button onClick={() => setIsEditorOpen(false)} className="rounded-full bg-white/10 p-2 text-white/80 hover:bg-white/15 hover:text-white"><FiX /></button>
            </div>
            <div className="p-6 text-slate-800">

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Title</label>
                  <input name="title" value={form.title} onChange={handleInputChange} placeholder="Enter memory title..." className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none focus:border-violet-500" required />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Description</label>
                  <textarea name="description" value={form.description} onChange={handleInputChange} placeholder="Write about this memory..." rows={4} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none focus:border-violet-500" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Category</label>
                  <select name="category_id" value={form.category_id} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none focus:border-violet-500">
                    <option value="">Select category</option>
                    {memoryCategories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Memory Date</label>
                  <input type="date" name="memory_date" value={form.memory_date} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none focus:border-violet-500" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Mood</label>
                  <input name="mood" value={form.mood} onChange={handleInputChange} placeholder="e.g. Happy, Nostalgic..." className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none focus:border-violet-500" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Location</label>
                  <input name="location" value={form.location} onChange={handleInputChange} placeholder="e.g. Paris, France" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none focus:border-violet-500" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Tags</label>
                  <input name="tags" value={form.tags} onChange={handleInputChange} placeholder="family, travel, wedding" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none focus:border-violet-500" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
                  <select name="status" value={form.status} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none focus:border-violet-500">
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Voice note</label>
                  <div className="flex flex-col gap-2">
                    <textarea name="voice_note" value={form.voice_note} onChange={handleInputChange} rows={3} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none focus:border-violet-500" placeholder="Add a short memory note or voice summary" />
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <button
                        type="button"
                        onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                        className={`rounded-xl px-3 py-2 text-sm font-semibold ${isRecording ? "bg-red-500 text-white hover:bg-red-600" : "bg-violet-500 text-white hover:bg-violet-600"}`}
                      >
                        {isRecording ? "Stop Recording" : "Record Voice"}
                      </button>
                      <span className="text-xs text-slate-500">
                        {recordedVoiceName ? recordedVoiceName : "No voice note recorded"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Upload media</label>
                  <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3">
                    <label className="cursor-pointer rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-600">
                      Choose Files
                      <input
                        type="file"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          const imageFiles = files.filter((file) => file.type.startsWith("image/"));
                          const videoFiles = files.filter((file) => file.type.startsWith("video/"));
                          const audioFiles = files.filter((file) => file.type.startsWith("audio/"));

                          setNewImages((prevFiles) => mergeUniqueFiles(prevFiles, imageFiles));
                          setNewVideos((prevFiles) => mergeUniqueFiles(prevFiles, videoFiles));
                          setNewAudios((prevFiles) => mergeUniqueFiles(prevFiles, audioFiles));

                          if (files.length) {
                            setRecordedVoiceName((prevName) => {
                              const nextNames = files.map((file) => file.name);
                              return prevName ? `${prevName}, ${nextNames.join(", ")}` : nextNames.join(", ");
                            });
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                    <span className="text-sm text-slate-500">
                      {(newImages.length + newVideos.length + newAudios.length) ? `${newImages.length + newVideos.length + newAudios.length} new file(s) selected` : "No file chosen"}
                    </span>
                  </div>

                  {((existingImages.length > 0 || existingVideos.length > 0 || existingAudios.length > 0 || newImages.length > 0 || newVideos.length > 0 || newAudios.length > 0) && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {existingImages.map((item, index) => renderMediaPreviewCard(item, index, () => {
                        setRemovedImageIds((prev) => [...new Set([...prev, item.id])]);
                        setExistingImages((prev) => prev.filter((image) => image.id !== item.id));
                      }))}
                      {existingVideos.map((item, index) => renderMediaPreviewCard(item, index, () => {
                        setRemovedVideoIds((prev) => [...new Set([...prev, item.id])]);
                        setExistingVideos((prev) => prev.filter((video) => video.id !== item.id));
                      }))}
                      {existingAudios.map((item, index) => renderMediaPreviewCard(item, index, () => {
                        setRemovedAudioIds((prev) => [...new Set([...prev, item.id])]);
                        setExistingAudios((prev) => prev.filter((audio) => audio.id !== item.id));
                      }))}
                      {newImages.map((file, index) => renderMediaPreviewCard(file, index, () => setNewImages((prevFiles) => prevFiles.filter((_, itemIndex) => itemIndex !== index))))}
                      {newVideos.map((file, index) => renderMediaPreviewCard(file, index, () => setNewVideos((prevFiles) => prevFiles.filter((_, itemIndex) => itemIndex !== index))))}
                      {newAudios.map((file, index) => renderMediaPreviewCard(file, index, () => setNewAudios((prevFiles) => prevFiles.filter((_, itemIndex) => itemIndex !== index))))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" name="is_favorite" checked={form.is_favorite} onChange={handleInputChange} />
                  Mark as favorite
                </label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsEditorOpen(false)} className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-200">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70">
                    <FiSave /> {isSubmitting ? "Saving..." : editingId ? "Update" : "Create"}
                  </button>
                </div>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MemoriesManagement;
