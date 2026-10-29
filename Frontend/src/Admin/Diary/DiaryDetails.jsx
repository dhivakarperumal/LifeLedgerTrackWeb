import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api";
import { toast } from "react-hot-toast";
import { formatDateOnly } from "../../utils/date";
import {
  FiArrowLeft,
  FiCalendar,
  FiClock,
  FiMapPin,
  FiTag,
  FiHeart,
  FiEdit2,
  FiTrash2,
  FiBookOpen,
  FiImage,
  FiVideo,
  FiMusic,
  FiFileText,
  FiEye,
  FiDownload,
  FiShare2,
} from "react-icons/fi";

const formatDate = (value) => {
  if (!value) return "—";
  return formatDateOnly(value, "en-US", { month: "short", day: "numeric", year: "numeric" });
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

const getMediaUrl = (value) => {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  const base = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
  return `${base}${value.startsWith("/") ? value : `/${value}`}`;
};

const getMediaFileName = (value, fallback) => {
  const pathname = new URL(getMediaUrl(value), window.location.origin).pathname;
  const filename = pathname.split("/").pop();
  try {
    return filename ? decodeURIComponent(filename) : fallback;
  } catch {
    return filename || fallback;
  }
};

const DiaryDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchEntry = async () => {
    try {
      const response = await api.get(`/diary/${id}`);
      setEntry(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load diary details.");
      navigate("/admin/users/diary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntry();
  }, [id, navigate]);

  const toggleFavorite = async () => {
    try {
      await api.patch(`/diary/${id}/favorite`);
      setEntry((prev) => (prev ? { ...prev, is_favorite: !prev.is_favorite } : prev));
      toast.success("Favorite updated.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update favorite.");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this diary entry permanently?")) return;

    try {
      await api.delete(`/diary/${id}`);
      toast.success("Diary entry deleted.");
      navigate("/admin/users/diary");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete diary entry.");
    }
  };

  const handleDownload = async (mediaUrl, fileName) => {
    try {
      const response = await api.get(getMediaUrl(mediaUrl), { responseType: "blob" });
      const downloadUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      toast.success("Download started.");
    } catch (error) {
      console.error("Diary attachment download failed:", error);
      toast.error(error.response?.status === 423
        ? "Unlock the app to download this attachment."
        : "Failed to download attachment.");
    }
  };

  const handleShare = async (text = entry.title) => {
    const shareData = { title: entry.title, text, url: window.location.href };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error.name === "AbortError") return;
        console.error("Diary entry sharing failed:", error);
      }
    }

    try {
      await navigator.clipboard.writeText(shareData.url);
      toast.success("Link copied to clipboard.");
    } catch (error) {
      console.error("Diary entry link copy failed:", error);
      toast.error("Unable to share or copy this link.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#7b2cbf]/20 border-t-[#7b2cbf]" />
          <p className="text-sm font-bold text-gray-500">Loading diary details...</p>
        </div>
      </div>
    );
  }

  if (!entry) return null;

  const attachments = Array.isArray(entry.attachments) ? entry.attachments : Array.isArray(entry.media_files) ? entry.media_files : [];

  return (
    <div className="min-h-screen  pb-20">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-2">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <button
            onClick={() => navigate("/admin/users/diary")}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <FiArrowLeft /> Back to diary
          </button>

          <div className="flex gap-3">
            <button
              onClick={() => handleShare(entry.content || entry.title)}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-700 shadow-sm transition hover:bg-violet-100"
            >
              <FiShare2 /> Share
            </button>
            <button
              onClick={toggleFavorite}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition ${entry.is_favorite ? "bg-pink-50 text-pink-600 hover:bg-pink-100" : "bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              <FiHeart className={entry.is_favorite ? "fill-current" : ""} />
              {entry.is_favorite ? "Favorited" : "Favorite"}
            </button>
            <button
              onClick={() => navigate(`/admin/users/diary?edit=${entry.id}`, { replace: true })}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-100 px-4 py-2.5 text-sm font-bold text-violet-700 shadow-sm transition hover:bg-violet-200"
            >
              <FiEdit2 /> Edit
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-600 shadow-sm transition hover:bg-rose-100"
            >
              <FiTrash2 /> Delete
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-[28px] bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-gradient-to-r from-[#240046] to-[#7b2cbf] p-6 text-white md:p-8">
            <div className="mb-3 flex flex-wrap gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em]">
              <span className="rounded-full bg-white/15 px-3 py-1.5">{entry.category_name || "General"}</span>
              <span className="rounded-full bg-white/15 px-3 py-1.5">{entry.status || "published"}</span>
              <span className="rounded-full bg-white/15 px-3 py-1.5">{entry.mood || "Normal"}</span>
            </div>
            <h1 className="text-3xl font-black md:text-5xl">{entry.title}</h1>
          </div>

          <div className="space-y-8 p-6 md:p-8">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-slate-500"><FiCalendar size={15} /> Date</div>
                <p className="text-base font-bold text-slate-800">{formatDate(entry.entry_date)}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-slate-500"><FiClock size={15} /> Time</div>
                <p className="text-base font-bold text-slate-800">{entry.entry_time || "Not set"}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-slate-500"><FiMapPin size={15} /> Location</div>
                <p className="text-base font-bold text-slate-800">{entry.location || "No location"}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-slate-500"><FiHeart size={15} /> Favorite</div>
                <p className="text-base font-bold text-slate-800">{entry.is_favorite ? "Yes" : "No"}</p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.8fr_1fr]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Diary entry</p>
                <div className="prose max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: entry.content || "<p>No content provided.</p>" }} />
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Tags</p>
                  {entry.tags?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {entry.tags.map((tag, index) => (
                        <span key={`${tag}-${index}`} className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700"><FiTag size={10} /> {tag}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No tags added.</p>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Meta</p>
                  <div className="space-y-2 text-sm text-slate-700">
                    <p><span className="font-semibold">Private:</span> {entry.is_private ? "Yes" : "No"}</p>
                    <p><span className="font-semibold">Locked:</span> {entry.is_locked ? "Yes" : "No"}</p>
                    <p><span className="font-semibold">Created:</span> {formatDateTime(entry.created_at)}</p>
                    <p><span className="font-semibold">Updated:</span> {formatDateTime(entry.updated_at)}</p>
                  </div>
                </div>
              </div>
            </div>

            {attachments.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="mb-4 text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Media & attachments</p>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {attachments.map((attachment, index) => {
                    const fileType = String(attachment?.file_type || attachment?.type || "file");
                    const mediaUrl = attachment?.file_url || attachment?.url || attachment?.path || attachment?.src;
                    const url = getMediaUrl(mediaUrl);
                    const fileName = attachment?.file_name || attachment?.name || getMediaFileName(mediaUrl, `Attachment ${index + 1}`);

                    if (!url) return null;

                    const isImage = fileType.startsWith("image/") || /image/i.test(fileType);
                    const isVideo = fileType.startsWith("video/") || /video/i.test(fileType);
                    const isAudio = fileType.startsWith("audio/") || /audio/i.test(fileType);

                    return (
                      <div key={`${fileName}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        {isImage ? (
                          <img src={url} alt={fileName} crossOrigin="use-credentials" className="h-52 w-full object-cover" />
                        ) : isVideo ? (
                          <video src={url} crossOrigin="use-credentials" controls className="h-52 w-full object-cover" />
                        ) : isAudio ? (
                          <div className="flex h-52 items-center justify-center bg-gradient-to-br from-violet-500 to-pink-500 p-3">
                            <audio src={url} crossOrigin="use-credentials" controls className="w-full" />
                          </div>
                        ) : (
                          <div className="flex h-52 items-center justify-center bg-slate-200 p-3 text-center text-sm font-medium text-slate-700">
                            <div className="flex flex-col items-center gap-2">
                              <FiFileText size={28} />
                              <span>{fileName}</span>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-3 px-3 py-2">
                          <span className="truncate text-xs text-slate-600">{fileName}</span>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <a href={url} target="_blank" rel="noreferrer" aria-label={`Open ${fileName}`} title="Open" className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                              <FiEye size={14} />
                            </a>
                            <button type="button" onClick={() => handleDownload(mediaUrl, fileName)} aria-label={`Download ${fileName}`} title="Download" className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-violet-100 hover:text-violet-700">
                              <FiDownload size={14} />
                            </button>
                            <button type="button" onClick={() => handleShare(`${entry.title} - ${fileName}`)} aria-label={`Share ${fileName}`} title="Share diary entry" className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-violet-100 hover:text-violet-700">
                              <FiShare2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!attachments.length && (entry.image_path || entry.video_path || entry.audio_path || entry.file_path) && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="mb-4 text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Primary media</p>
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    ["image_path", entry.image_path, "Diary image"],
                    ["video_path", entry.video_path, "Diary video"],
                    ["audio_path", entry.audio_path, "Diary audio"],
                    ["file_path", entry.file_path, "Diary attachment"],
                  ].filter(([, path]) => path).map(([type, path, label]) => {
                    const url = getMediaUrl(path);
                    const fileName = getMediaFileName(path, label);
                    return (
                      <div key={type} className="min-w-0 space-y-2">
                        {type === "image_path" && <img src={url} alt="Diary media" crossOrigin="use-credentials" className="h-60 w-full rounded-2xl object-cover" />}
                        {type === "video_path" && <video src={url} crossOrigin="use-credentials" controls className="h-60 w-full rounded-2xl object-cover" />}
                        {type === "audio_path" && <audio src={url} crossOrigin="use-credentials" controls className="w-full" />}
                        {type === "file_path" && <a href={url} target="_blank" rel="noreferrer" className="flex h-60 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-sm font-semibold text-slate-700">Open attached file</a>}
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => handleDownload(path, fileName)} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-100 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-200">
                            <FiDownload size={14} /> Download
                          </button>
                          <button type="button" onClick={() => handleShare(`${entry.title} - ${fileName}`)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200">
                            <FiShare2 size={14} /> Share
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiaryDetails;
