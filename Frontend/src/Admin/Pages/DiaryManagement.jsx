import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api";
import { useAuth } from "../../PrivateRouter/AuthContext";
import { toast } from "react-hot-toast";
import { DATE_FILTER_OPTIONS, matchesDateRange, resolveDateRange } from "../../utils/dateRange";
import { formatDateOnly, parseDateOnly, toLocalDateKey } from "../../utils/date";
import {
  FiPlus, FiSearch, FiCalendar, FiHeart, FiEdit2, FiTrash2, FiStar, FiClock,
  FiFileText, FiImage, FiVideo, FiPaperclip, FiBookmark, FiCheck, FiX,
  FiArrowLeft, FiArrowRight, FiFilter, FiTag, FiMapPin, FiSmile, FiEye,
  FiSave, FiPenTool, FiUploadCloud, FiDownload, FiLock, FiUnlock, FiUsers,
  FiGrid, FiList, FiChevronLeft, FiChevronRight,
} from "react-icons/fi";

const MAX_ATTACHMENT_FILE_SIZE = 100 * 1024 * 1024;

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
  return formatDateOnly(value, "en-US", { month: "short", day: "numeric", year: "numeric" });
};

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getCalendarDays = (monthDate) => {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
};

const normalizeDateInput = (value) => {
  return toLocalDateKey(value) || toLocalDateKey();
};

const normalizeTimeInput = (value) => {
  if (!value) return "";

  const trimmed = String(value).trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed.slice(0, 5);

  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (match) {
    let [, hour, minute, meridiem] = match;
    let hours = Number(hour);

    if (meridiem) {
      const period = meridiem.toUpperCase();
      if (period === "PM" && hours < 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;
    }

    return `${String(hours).padStart(2, "0")}:${minute}`;
  }

  return trimmed;
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [entries, setEntries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedMood, setSelectedMood] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");
  const [dateRangeFilter, setDateRangeFilter] = useState("All");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState("list");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [isUploadFinalizing, setIsUploadFinalizing] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draftSaved, setDraftSaved] = useState(true);
  const [autoSaveTimer, setAutoSaveTimer] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [files, setFiles] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [existingVideos, setExistingVideos] = useState([]);
  const [existingAudios, setExistingAudios] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [newVideos, setNewVideos] = useState([]);
  const [newAudios, setNewAudios] = useState([]);
  const [removedImageIds, setRemovedImageIds] = useState([]);
  const [removedVideoIds, setRemovedVideoIds] = useState([]);
  const [removedAudioIds, setRemovedAudioIds] = useState([]);
  const [existingZips, setExistingZips] = useState([]);
  const [newZips, setNewZips] = useState([]);
  const [removedZipIds, setRemovedZipIds] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const mergeUniqueFiles = (existingFiles, incomingFiles) => {
    const seen = new Set(existingFiles.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
    const uniqueFiles = incomingFiles.filter((file) => {
      const key = `${file.name}-${file.size}-${file.lastModified}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return [...existingFiles, ...uniqueFiles];
  };

  const getFilePreviewUrl = (file) => {
    if (!file) return "";
    if (typeof file === "string") return file;
    if (file.previewUrl || file.file_url || file.url || file.src || file.path) {
      return file.previewUrl || file.file_url || file.url || file.src || file.path;
    }
    if (file instanceof Blob || file instanceof File) {
      return URL.createObjectURL(file);
    }
    return "";
  };

  const resetDiaryMediaState = () => {
    setFiles([]);
    setExistingFiles([]);
    setExistingImages([]);
    setExistingVideos([]);
    setExistingAudios([]);
    setExistingZips([]);
    setNewImages([]);
    setNewVideos([]);
    setNewAudios([]);
    setNewZips([]);
    setRemovedImageIds([]);
    setRemovedVideoIds([]);
    setRemovedAudioIds([]);
    setRemovedZipIds([]);
  };

  const normalizeExistingDiaryMedia = (entry) => {
    if (!entry) return [];

    const sources = [];
    if (Array.isArray(entry.media_files) && entry.media_files.length) sources.push(...entry.media_files);
    if (Array.isArray(entry.attachments) && entry.attachments.length) sources.push(...entry.attachments);

    const fallbackEntries = [];
    ["image_path", "video_path", "audio_path", "file_path"].forEach((key) => {
      if (entry?.[key]) {
        fallbackEntries.push({
          id: `${key}-${entry.id || Date.now()}`,
          file_name: entry[key].split("/").pop() || key,
          file_url: entry[key],
          file_type: key.includes("image") ? "image" : key.includes("video") ? "video" : key.includes("audio") ? "audio" : "file",
        });
      }
    });

    const combined = [...fallbackEntries, ...sources].filter(Boolean);
    const uniqueByKey = new Map();

    combined.forEach((item, index) => {
      const fileUrl = item?.file_url || item?.url || item?.src || item?.path || item || "";
      const fileName = item?.file_name || item?.name || item?.filename || `attachment-${index + 1}`;
      const type = String(item?.file_type || item?.type || "application/octet-stream");
      const key = `${fileName}-${type}-${String(fileUrl)}`;

      if (!uniqueByKey.has(key)) {
        uniqueByKey.set(key, {
          id: String(item?.id || `${fileName}-${index}`),
          name: fileName,
          type,
          previewUrl: fileUrl,
        });
      }
    });

    return Array.from(uniqueByKey.values());
  };

  const splitExistingDiaryMedia = (mediaList = []) => {
    const images = [];
    const videos = [];
    const audios = [];
    const zips = [];

    mediaList.forEach((item) => {
      const type = String(item?.type || item?.file_type || "").toLowerCase();
      const name = String(item?.name || item?.file_name || "").toLowerCase();

      const isImage = type.startsWith("image/") || type === "image" || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name);
      const isVideo = type.startsWith("video/") || type === "video" || /\.(mp4|webm|mov|m4v|ogg)$/i.test(name);
      const isAudio = type.startsWith("audio/") || type === "audio" || /\.(mp3|wav|m4a|aac)$/i.test(name);
      const isZip = type.includes("zip") || type.includes("compressed") || /\.(zip|rar|7z)$/i.test(name);

      if (isImage) images.push(item);
      else if (isVideo) videos.push(item);
      else if (isAudio) audios.push(item);
      else if (isZip) zips.push(item);
    });

    return { images, videos, audios, zips };
  };

  const [formState, setFormState] = useState({
    title: "",
    content: "",
    category_id: "",
    mood: "Happy",
    tags: "",
    location: "",
    entry_date: toLocalDateKey(),
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
    const editId = searchParams.get("edit");
    if (!editId || !entries.length) return;

    const matchingEntry = entries.find((entry) => String(entry.id) === String(editId));
    if (matchingEntry) {
      openEditEntry(matchingEntry);
    }
  }, [entries, searchParams]);

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
      const date = parseDateOnly(entry.entry_date);
      return date.getMonth() === month && date.getFullYear() === year;
    }).length;
    const thisYear = entries.filter((entry) => {
      const date = parseDateOnly(entry.entry_date);
      return date.getFullYear() === year;
    }).length;
    const favorites = entries.filter((entry) => entry.is_favorite).length;
    const drafts = entries.filter((entry) => entry.status === "draft").length;
    return { totalEntries, thisMonth, thisYear, favorites, drafts };
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const term = search.toLowerCase();
    const dateRange = resolveDateRange(dateRangeFilter, customStartDate, customEndDate);
    return entries.filter((entry) => {
      const matchesFilter = (() => {
        if (selectedFilter === "favorites") return entry.is_favorite;
        if (selectedFilter === "drafts") return entry.status === "draft";
        if (selectedFilter === "recent") return true;
        if (selectedFilter === "month") {
          const date = parseDateOnly(entry.entry_date);
          const now = new Date();
          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        }
        if (selectedFilter === "year") {
          const date = parseDateOnly(entry.entry_date);
          return date.getFullYear() === new Date().getFullYear();
        }
        return true;
      })();

      const categoryMatch = selectedCategory === "all" || String(entry.category_id) === String(selectedCategory) || (entry.category_name || "") === selectedCategory;
      const moodMatch = selectedMood === "all" || entry.mood === selectedMood;
      const dateMatch = !selectedDate || entry.entry_date === selectedDate;
      const dateRangeMatch = matchesDateRange(entry.entry_date, dateRange);
      const searchMatch = !term || [
        entry.title,
        entry.content,
        entry.location,
        entry.mood,
        entry.category_name,
        (entry.tags || []).join(" "),
      ].join(" ").toLowerCase().includes(term);
      return matchesFilter && categoryMatch && moodMatch && dateMatch && dateRangeMatch && searchMatch;
    });
  }, [entries, search, selectedFilter, selectedMood, selectedCategory, selectedDate, dateRangeFilter, customStartDate, customEndDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedFilter, selectedMood, selectedCategory, selectedDate, dateRangeFilter, customStartDate, customEndDate]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedEntries = filteredEntries.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize,
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const applyFormat = (command, value = null) => {
    document.execCommand(command, false, value);
  };

  const openNewEntry = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("edit");
    setSearchParams(nextParams, { replace: true });

    setEditingId(null);
    setSelectedEntry(null);
    resetDiaryMediaState();
    setFormState({
      title: "",
      content: "",
      category_id: categories[0]?.id || "",
      mood: "Happy",
      tags: "",
      location: "",
      entry_date: toLocalDateKey(),
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
    const normalizedMedia = normalizeExistingDiaryMedia(entry);
    const { images, videos, audios, zips } = splitExistingDiaryMedia(normalizedMedia);

    resetDiaryMediaState();
    setEditingId(entry.id);
    setSelectedEntry(entry);
    setExistingFiles(normalizedMedia);
    setExistingImages(images);
    setExistingVideos(videos);
    setExistingAudios(audios);
    setExistingZips(zips);
    setFormState({
      title: entry.title || "",
      content: entry.content || "",
      category_id: entry.category_id || "",
      mood: entry.mood || "Happy",
      tags: (entry.tags || []).join(", "),
      location: entry.location || "",
      entry_date: normalizeDateInput(entry.entry_date),
      entry_time: normalizeTimeInput(entry.entry_time),
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
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("edit");
    setSearchParams(nextParams, { replace: true });

    setIsEditorOpen(false);
    setEditingId(null);
    resetDiaryMediaState();
    setSelectedEntry(null);
    setDraftSaved(true);
    localStorage.removeItem("diary-draft-temp");
  };

  const handleEditorInput = () => {
    setFormState((prev) => ({ ...prev, content: editorRef.current?.innerHTML || "" }));
  };

  const uploadAttachmentFiles = async (entryId, pendingFiles = [], toastId) => {
    const validFiles = (pendingFiles || []).filter((file) => file instanceof File || file instanceof Blob);
    if (!entryId || !validFiles.length) return;

    const totalBytes = validFiles.reduce((total, file) => total + (file.size || 0), 0);
    let uploadedBytes = 0;
    for (const [index, file] of validFiles.entries()) {
      const formData = new FormData();
      formData.append("file", file);
      await api.post(`/diary/${entryId}/attachments`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (event) => {
          if (!toastId || !event.total) return;
          const currentFileBytes = Math.min(event.loaded, file.size || event.loaded);
          const percent = Math.min(99, Math.round(((uploadedBytes + currentFileBytes) * 100) / (totalBytes || 1)));
          setUploadProgress(percent);
          toast.loading(`Diary saved. Uploading ${index + 1}/${validFiles.length}: ${percent}%`, { id: toastId });
        },
      });
      uploadedBytes += file.size || 0;
      setFiles((previous) => previous.filter((pendingFile) => pendingFile !== file));
      setNewImages((previous) => previous.filter((pendingFile) => pendingFile !== file));
      setNewVideos((previous) => previous.filter((pendingFile) => pendingFile !== file));
      setNewAudios((previous) => previous.filter((pendingFile) => pendingFile !== file));
    }
    setUploadProgress(100);
    setIsUploadFinalizing(true);
  };

  const handleSubmit = async (saveStatus = "published") => {
    if (isSubmitting) return;
    if (!formState.title.trim() || !formState.content.trim()) {
      toast.error("Title and diary content are required.");
      return;
    }

    const newUploadFiles = mergeUniqueFiles([], [
      ...newImages,
      ...newVideos,
      ...newAudios,
      ...newZips,
      ...files.filter((file) => file instanceof File || file instanceof Blob),
    ]);
    const oversizedFile = newUploadFiles.find((file) => file.size > MAX_ATTACHMENT_FILE_SIZE);
    if (oversizedFile) {
      toast.error(`${oversizedFile.name || "Attachment"} exceeds the 100 MB per-file limit.`);
      return;
    }

    const payload = {
      ...formState,
      content: formState.content,
      status: saveStatus,
      tags: formState.tags ? formState.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : [],
      category_id: formState.category_id || null,
      mood: formState.mood || "Happy",
      removed_image_ids: removedImageIds,
      removed_video_ids: removedVideoIds,
      removed_audio_ids: removedAudioIds,
      removed_zip_ids: removedZipIds,
    };

    if (!removedImageIds.length) delete payload.removed_image_ids;
    if (!removedVideoIds.length) delete payload.removed_video_ids;
    if (!removedAudioIds.length) delete payload.removed_audio_ids;
    if (!removedZipIds.length) delete payload.removed_zip_ids;

    let savedEntryId = editingId;
    let entrySaved = false;
    try {
      setIsSubmitting(true);
      setUploadProgress(newUploadFiles.length ? 0 : null);
      setIsUploadFinalizing(false);
      const config = { headers: { "Content-Type": "application/json" } };
      let response;
      if (editingId) {
        response = await api.put(`/diary/${editingId}`, payload, config);
      } else {
        response = await api.post("/diary", payload, config);
      }

      savedEntryId = response?.data?.id || editingId;
      entrySaved = true;
      localStorage.removeItem("diary-draft-temp");
      setEditingId(savedEntryId);
      setSelectedEntry(response.data || selectedEntry);
      setDraftSaved(true);

      if (newUploadFiles.length) {
        const uploadToastId = `diary-upload-${savedEntryId}`;
        toast.loading("Diary saved. Please wait while attachments upload: 0%", { id: uploadToastId });
        await uploadAttachmentFiles(savedEntryId, newUploadFiles, uploadToastId);
        const entryResponse = await api.get(`/diary/${savedEntryId}`);
        setEntries((previous) => editingId
          ? previous.map((entry) => String(entry.id) === String(savedEntryId) ? entryResponse.data : entry)
          : [entryResponse.data, ...previous]);
        openEditEntry(entryResponse.data);
        toast.success("Diary and attachments saved.", { id: uploadToastId });
      } else {
        await fetchData();
        closeEditor();
        toast.success(editingId ? "Diary updated successfully." : "Diary saved successfully.");
      }
    } catch (error) {
      console.error("Diary save/upload failed:", error);
      const message = error.response?.data?.message || error.message || "Unexpected error.";
      toast.error(entrySaved ? `Diary saved, but an attachment upload failed: ${message}` : message);
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
      setIsUploadFinalizing(false);
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
    const oversizedFile = selectedFiles.find((file) => file.size > MAX_ATTACHMENT_FILE_SIZE);
    if (oversizedFile) {
      toast.error(`${oversizedFile.name} exceeds the 100 MB per-file limit.`);
      e.target.value = "";
      return;
    }
    const imageFiles = selectedFiles.filter((file) => file.type.startsWith("image/"));
    const videoFiles = selectedFiles.filter((file) => file.type.startsWith("video/"));
    const audioFiles = selectedFiles.filter((file) => file.type.startsWith("audio/"));

    setFiles((prevFiles) => mergeUniqueFiles(prevFiles, selectedFiles));
    setNewImages((prevFiles) => mergeUniqueFiles(prevFiles, imageFiles));
    setNewVideos((prevFiles) => mergeUniqueFiles(prevFiles, videoFiles));
    setNewAudios((prevFiles) => mergeUniqueFiles(prevFiles, audioFiles));
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
        setNewAudios((prevFiles) => mergeUniqueFiles(prevFiles, [file]));
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

  const recentEntries = [...entries].sort((a, b) => toLocalDateKey(b.entry_date).localeCompare(toLocalDateKey(a.entry_date))).slice(0, 5);

  return (
    <div className="min-h-screen space-y-5 p-1 pb-20 md:p-2">

        
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
        <div className="flex flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-center xl:justify-between">
          <div className="relative min-w-[220px] flex-1">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-[#7b2cbf] focus:bg-white"
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

          <select
            value={dateRangeFilter}
            onChange={(event) => setDateRangeFilter(event.target.value)}
            aria-label="Filter diary entries by date range"
            className="w-full min-w-[160px] appearance-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 pr-10 text-sm font-medium text-slate-600 outline-none transition-all focus:border-[#7b2cbf] focus:bg-white xl:w-auto"
          >
            {DATE_FILTER_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>

          {dateRangeFilter === "Custom Date Range" && (
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 xl:w-auto">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                From
                <input type="date" value={customStartDate} onChange={(event) => setCustomStartDate(event.target.value)} aria-label="Diary start date" className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#7b2cbf]" />
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                To
                <input type="date" value={customEndDate} onChange={(event) => setCustomEndDate(event.target.value)} aria-label="Diary end date" className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#7b2cbf]" />
              </label>
            </div>
          )}

          <div className="relative min-w-[150px]">
            <button
              type="button"
              onClick={() => setIsCalendarOpen((open) => !open)}
              className="flex w-full items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-slate-600 outline-none transition-all hover:border-[#7b2cbf] focus:border-[#7b2cbf] focus:bg-white"
              aria-label="Filter diary entries by date"
              aria-expanded={isCalendarOpen}
            >
              <FiCalendar className="text-violet-500" size={15} />
              <span className="truncate">{selectedDate ? formatDate(selectedDate) : "Choose date"}</span>
            </button>

            {isCalendarOpen && (
              <div className="absolute left-0 top-full z-30 mt-2 w-[min(300px,calc(100vw-24px))] max-w-[calc(100vw-24px)] rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/15 sm:left-auto sm:right-0">
                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-violet-300 hover:text-violet-700" aria-label="Previous month">
                    <FiChevronLeft size={17} />
                  </button>
                  <p className="whitespace-nowrap text-base font-black text-slate-800 sm:text-lg">{calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
                  <button type="button" onClick={() => setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-violet-300 hover:text-violet-700" aria-label="Next month">
                    <FiChevronRight size={17} />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-7 text-center text-xs font-semibold text-slate-500">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day}>{day}</span>)}
                </div>

                <div className="mt-2 grid grid-cols-7 gap-y-1 text-center">
                  {getCalendarDays(calendarMonth).map((date) => {
                    const dateKey = toDateKey(date);
                    const isCurrentMonth = date.getMonth() === calendarMonth.getMonth();
                    const isSelected = selectedDate === dateKey;
                    const isToday = dateKey === toDateKey(new Date());

                    return (
                      <button
                        type="button"
                        key={dateKey}
                        onClick={() => {
                          setSelectedDate(dateKey);
                          setIsCalendarOpen(false);
                        }}
                        className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm transition ${isSelected ? "bg-orange-500 font-black text-white shadow-lg shadow-orange-300" : isCurrentMonth ? "text-slate-700 hover:bg-orange-50 hover:text-orange-600" : "text-slate-300"} ${isToday && !isSelected ? "font-black text-orange-500" : ""}`}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>

                {selectedDate && (
                  <button type="button" onClick={() => { setSelectedDate(""); setIsCalendarOpen(false); }} className="mt-3 w-full rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600">
                    Clear date filter
                  </button>
                )}
              </div>
            )}
          </div>

           <div className="flex items-center justify-end gap-2 md:col-span-1">
            <button onClick={() => setViewMode("grid")} className={`rounded-xl p-2 ${viewMode === "grid" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"}`}><FiGrid /></button>
            <button onClick={() => setViewMode("list")} className={`rounded-xl p-2 ${viewMode === "list" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"}`}><FiList /></button>
          </div>

           <button
            onClick={openNewEntry}
              className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[18px] bg-gradient-to-r from-[#240046] to-[#7b2cbf] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-purple-900/20 transition hover:from-[#10002b] hover:to-[#5a189a]"
          >
              <FiPlus size={18} className="shrink-0" />
            Add New Diary
          </button>
        </div>
      </div>

      <div className="w-full">
        <div className="space-y-4">
          {loading ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-slate-500 shadow-sm">Loading diary entries...</div>
          ) : viewMode === "list" ? (
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-[#1F0A3C] to-[#3c096c]">
                      <th className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider w-16 text-center">S No</th>
                      <th className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider">Date</th>
                      <th className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider">Title & Content</th>
                      <th className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider">Category</th>
                      <th className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider">Mood</th>
                      <th className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginatedEntries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center">
                          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 text-2xl text-violet-600">📖</div>
                          <p className="mt-4 font-bold text-slate-900">No diary entries found</p>
                          <p className="mt-1 text-sm text-slate-500">Start writing about your day, thoughts and special moments.</p>
                          <button onClick={openNewEntry} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#240046] to-[#7b2cbf] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-900/20 hover:from-[#10002b] hover:to-[#5a189a]"><FiPlus /> Add Diary Entry</button>
                        </td>
                      </tr>
                    ) : paginatedEntries.map((entry, index) => (
                      <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap text-center font-bold text-slate-400">
                          {(safeCurrentPage - 1) * pageSize + index + 1}
                        </td>
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
          ) : filteredEntries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-3xl text-violet-600">📖</div>
              <h3 className="mt-5 text-2xl font-bold text-slate-900">Your Diary Is Empty</h3>
              <p className="mt-2 text-slate-500">Start writing about your day, thoughts and special moments.</p>
              <button onClick={openNewEntry} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#240046] to-[#7b2cbf] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-purple-900/20 hover:from-[#10002b] hover:to-[#5a189a]"> <FiPlus /> Add Diary Entry </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {paginatedEntries.map((entry) => (
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

          {filteredEntries.length > 0 && (
            <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm md:flex-row">
              <div className="text-sm text-slate-500">
                Showing {Math.min((safeCurrentPage - 1) * pageSize + 1, filteredEntries.length)}-
                {Math.min(safeCurrentPage * pageSize, filteredEntries.length)} of {filteredEntries.length}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={safeCurrentPage === 1}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-violet-300 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FiArrowLeft size={15} />
                </button>

                {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold transition ${
                      safeCurrentPage === pageNumber
                        ? "bg-gradient-to-r from-[#240046] to-[#7b2cbf] text-white shadow-md"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700"
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={safeCurrentPage === totalPages}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-violet-300 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FiArrowRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>


      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#3c096c]/20 bg-gradient-to-r from-[#1F0A3C] to-[#3c096c] px-5 py-4 text-white">
              <h2 className="text-xl font-bold text-white">{editingId ? "Edit Diary" : "Add Diary Entry"}</h2>
              <button type="button" onClick={closeEditor} disabled={isSubmitting} className="rounded-full bg-white/10 p-2 text-white/80 hover:bg-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"><FiX /></button>
            </div>

            <div className="p-4 md:p-6">
              <fieldset disabled={isSubmitting} className="contents">
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
                      <p className="text-xs text-slate-500">Images, videos and files | Up to 100 MB each</p>
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
                  {(existingImages.length > 0 || existingVideos.length > 0 || existingAudios.length > 0 || existingZips.length > 0 || newImages.length > 0 || newVideos.length > 0 || newAudios.length > 0 || newZips.length > 0) && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {existingImages.map((file, index) => (
                        <div key={`${file.id || file.name}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                          <div className="max-h-40 overflow-hidden bg-slate-100">
                            <img src={getFilePreviewUrl(file)} alt={file.name} className="h-40 w-full object-cover" />
                          </div>
                          <div className="flex items-center justify-between gap-2 px-3 py-2">
                            <span className="truncate text-[11px] text-slate-600">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setRemovedImageIds((prev) => [...new Set([...prev, String(file.id)])]);
                                setExistingImages((prev) => prev.filter((item) => String(item.id) !== String(file.id)));
                              }}
                              className="rounded-lg bg-rose-100 px-2 py-1 text-[10px] font-semibold text-rose-600"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}

                      {existingVideos.map((file, index) => (
                        <div key={`${file.id || file.name}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                          <div className="max-h-40 overflow-hidden bg-slate-100">
                            <video src={getFilePreviewUrl(file)} className="h-40 w-full object-cover" controls />
                          </div>
                          <div className="flex items-center justify-between gap-2 px-3 py-2">
                            <span className="truncate text-[11px] text-slate-600">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setRemovedVideoIds((prev) => [...new Set([...prev, String(file.id)])]);
                                setExistingVideos((prev) => prev.filter((item) => String(item.id) !== String(file.id)));
                              }}
                              className="rounded-lg bg-rose-100 px-2 py-1 text-[10px] font-semibold text-rose-600"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}

                      {existingAudios.map((file, index) => (
                        <div key={`${file.id || file.name}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                          <div className="max-h-40 overflow-hidden bg-gradient-to-br from-violet-500 to-pink-500">
                            <audio src={getFilePreviewUrl(file)} controls className="w-full p-2" />
                          </div>
                          <div className="flex items-center justify-between gap-2 px-3 py-2">
                            <span className="truncate text-[11px] text-slate-600">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setRemovedAudioIds((prev) => [...new Set([...prev, String(file.id)])]);
                                setExistingAudios((prev) => prev.filter((item) => String(item.id) !== String(file.id)));
                              }}
                              className="rounded-lg bg-rose-100 px-2 py-1 text-[10px] font-semibold text-rose-600"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}

                      {existingZips.map((file, index) => (
                        <div key={`${file.id || file.name}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                          <div className="flex h-40 flex-col items-center justify-center bg-slate-100">
                            <span className="text-3xl">🗜️</span>
                            <span className="mt-2 truncate px-2 text-xs font-medium text-slate-600">{file.name}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2 px-3 py-2">
                            <span className="truncate text-[11px] text-slate-600">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setRemovedZipIds((prev) => [...new Set([...prev, String(file.id)])]);
                                setExistingZips((prev) => prev.filter((item) => String(item.id) !== String(file.id)));
                              }}
                              className="rounded-lg bg-rose-100 px-2 py-1 text-[10px] font-semibold text-rose-600"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}

                      {newImages.map((file, index) => (
                        <div key={`${file.name}-${file.size}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                          <div className="max-h-40 overflow-hidden bg-slate-100">
                            <img src={getFilePreviewUrl(file)} alt={file.name} className="h-40 w-full object-cover" />
                          </div>
                          <div className="flex items-center justify-between gap-2 px-3 py-2">
                            <span className="truncate text-[11px] text-slate-600">{file.name}</span>
                            <button type="button" onClick={() => setNewImages((prev) => prev.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg bg-rose-100 px-2 py-1 text-[10px] font-semibold text-rose-600">Remove</button>
                          </div>
                        </div>
                      ))}

                      {newVideos.map((file, index) => (
                        <div key={`${file.name}-${file.size}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                          <div className="max-h-40 overflow-hidden bg-slate-100">
                            <video src={getFilePreviewUrl(file)} className="h-40 w-full object-cover" controls />
                          </div>
                          <div className="flex items-center justify-between gap-2 px-3 py-2">
                            <span className="truncate text-[11px] text-slate-600">{file.name}</span>
                            <button type="button" onClick={() => setNewVideos((prev) => prev.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg bg-rose-100 px-2 py-1 text-[10px] font-semibold text-rose-600">Remove</button>
                          </div>
                        </div>
                      ))}

                      {newAudios.map((file, index) => (
                        <div key={`${file.name}-${file.size}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                          <div className="max-h-40 overflow-hidden bg-gradient-to-br from-violet-500 to-pink-500">
                            <audio src={getFilePreviewUrl(file)} controls className="w-full p-2" />
                          </div>
                          <div className="flex items-center justify-between gap-2 px-3 py-2">
                            <span className="truncate text-[11px] text-slate-600">{file.name}</span>
                            <button type="button" onClick={() => setNewAudios((prev) => prev.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg bg-rose-100 px-2 py-1 text-[10px] font-semibold text-rose-600">Remove</button>
                          </div>
                        </div>
                      ))}

                      {newZips.map((file, index) => (
                        <div key={`${file.name}-${file.size}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                          <div className="flex h-40 flex-col items-center justify-center bg-slate-100">
                            <span className="text-3xl">🗜️</span>
                            <span className="mt-2 truncate px-2 text-xs font-medium text-slate-600">{file.name}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2 px-3 py-2">
                            <span className="truncate text-[11px] text-slate-600">{file.name}</span>
                            <button type="button" onClick={() => { setNewZips((prev) => prev.filter((_, itemIndex) => itemIndex !== index)); setFiles((prev) => prev.filter((f) => f.name !== file.name)); }} className="rounded-lg bg-rose-100 px-2 py-1 text-[10px] font-semibold text-rose-600">Remove</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="md:col-span-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Upload ZIP / Archive files</p>
                      <p className="text-xs text-slate-500">.zip, .rar, .7z | Up to 100 MB each</p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">
                      🗜️ Choose ZIPs
                      <input
                        type="file"
                        className="hidden"
                        multiple
                        accept=".zip,.rar,.7z"
                        onChange={(e) => {
                          const selectedFiles = Array.from(e.target.files || []);
                          const zipFiles = selectedFiles.filter((file) =>
                            file.name.endsWith(".zip") ||
                            file.name.endsWith(".rar") ||
                            file.name.endsWith(".7z") ||
                            file.type === "application/zip" ||
                            file.type === "application/x-zip-compressed"
                          );
                          const oversizedFile = zipFiles.find((file) => file.size > MAX_ATTACHMENT_FILE_SIZE);
                          if (oversizedFile) {
                            toast.error(`${oversizedFile.name} exceeds the 100 MB per-file limit.`);
                            e.target.value = "";
                            return;
                          }
                          setNewZips((prev) => mergeUniqueFiles(prev, zipFiles));
                          setFiles((prev) => mergeUniqueFiles(prev, zipFiles));
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  {newZips.length > 0 && (
                    <p className="mt-2 text-xs text-slate-500">{newZips.length} zip file(s) selected</p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button type="button" onClick={() => handleSubmit("draft")} disabled={isSubmitting} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60">
                  {isSubmitting
                    ? uploadProgress === null ? "Saving..." : isUploadFinalizing ? "Finishing upload..." : `Uploading ${uploadProgress}%`
                    : "Save Draft"}
                </button>
                <button type="button" onClick={() => handleSubmit("published")} disabled={isSubmitting} className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {isSubmitting
                    ? uploadProgress === null ? "Saving..." : isUploadFinalizing ? "Finishing upload..." : `Uploading ${uploadProgress}%`
                    : "Save Entry"}
                </button>
              </div>
              </fieldset>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiaryManagement;
