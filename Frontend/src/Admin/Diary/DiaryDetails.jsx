import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api";
import { toast } from "react-hot-toast";
import { formatDateOnly } from "../../utils/date";
import getMediaUrl from "../../utils/mediaUrl";
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

const getMediaFileName = (value, fallback) => {
  const pathname = new URL(getMediaUrl(value), window.location.origin).pathname;
  const filename = pathname.split("/").pop();
  try {
    return filename ? decodeURIComponent(filename) : fallback;
  } catch {
    return filename || fallback;
  }
};

const getAttachmentCategory = (media, fallback) => {
  if (fallback) return fallback;
  const declaredType = String(media?.mime_type || media?.media_type || media?.file_type || media?.type || "").toLowerCase();
  const fileName = String(media?.original_name || media?.file_name || media?.name || media?.file_url || media?.url || media?.path || media || "").toLowerCase();
  if (declaredType.startsWith("image/") || declaredType === "image" || /\.(jpe?g|png|webp|gif|bmp|svg)$/i.test(fileName)) return "images";
  if (declaredType.startsWith("video/") || declaredType === "video" || /\.(mp4|mov|webm|m4v|mkv|avi)$/i.test(fileName)) return "videos";
  if (declaredType.startsWith("audio/") || declaredType === "audio" || /\.(mp3|wav|m4a|aac|ogg)$/i.test(fileName)) return "audio";
  if (declaredType.includes("zip") || /\.(zip|rar|7z)$/i.test(fileName)) return "zip";
  return "files";
};

const DiaryDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeMediaTab, setActiveMediaTab] = useState("personal");

  const fetchEntry = async () => {
    try {
      const response = await api.get(`/diary/${id}`);
      setEntry(response.data?.data || response.data);
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

  const rawAttachments = [
    ...(Array.isArray(entry.images) ? entry.images.map((media) => ({ media, category: "images" })) : []),
    ...(Array.isArray(entry.videos) ? entry.videos.map((media) => ({ media, category: "videos" })) : []),
    ...(Array.isArray(entry.audio) ? entry.audio.map((media) => ({ media, category: "audio" })) : []),
    ...(Array.isArray(entry.attachments) ? entry.attachments.map((media) => ({ media })) : []),
    ...(Array.isArray(entry.media_files) ? entry.media_files.map((media) => ({ media })) : []),
    ...[
      ["image_path", "images"],
      ["video_path", "videos"],
      ["audio_path", "audio"],
      ["file_path", "files"],
    ].filter(([field]) => entry[field]).map(([field, category]) => ({ media: entry[field], category })),
  ];
  const seenAttachmentUrls = new Set();
  const attachments = rawAttachments.map(({ media, category }, index) => {
    const url = typeof media === "string" ? media : media?.file_url || media?.url || media?.path || media?.src || "";
    if (!url || seenAttachmentUrls.has(url)) return null;
    seenAttachmentUrls.add(url);
    const fileName = media?.original_name || media?.file_name || media?.name || getMediaFileName(url, `Attachment ${index + 1}`);
    return { media, category: getAttachmentCategory(media, category), url, fileName };
  }).filter(Boolean);
  const mediaTabs = [
    { id: "personal", label: "Personal", icon: FiBookOpen, items: [] },
    ...(attachments.length ? [
      { id: "all", label: "All", icon: FiFileText, items: attachments },
      ...["images", "videos", "audio", "zip", "files"]
        .map((category) => ({
          id: category,
          label: { images: "Images", videos: "Videos", audio: "Audio", zip: "ZIP", files: "Files" }[category],
          icon: { images: FiImage, videos: FiVideo, audio: FiMusic, zip: FiFileText, files: FiFileText }[category],
          items: attachments.filter((item) => item.category === category),
        }))
        .filter((tab) => tab.items.length),
    ] : []),
  ];
  const activeTab = mediaTabs.find((tab) => tab.id === activeMediaTab) || mediaTabs[0];
  const firstImage = Array.isArray(entry.images) ? entry.images[0] : null;
  const coverImage = typeof firstImage === "string"
    ? firstImage
    : firstImage?.file_url || firstImage?.url || firstImage?.path || firstImage?.src || entry.image_path;
  const coverImageUrl = coverImage ? getMediaUrl(coverImage) : "";

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
          <div className="relative flex min-h-[240px] items-end overflow-hidden border-b border-slate-200 bg-gradient-to-r from-[#240046] to-[#7b2cbf] p-6 text-white md:min-h-[340px] md:p-10">
            {coverImageUrl && (
              <>
                <img src={coverImageUrl} alt="" crossOrigin="use-credentials" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#240046]/85 to-[#7b2cbf]/70" />
              </>
            )}
            <div className="relative z-10">
              <div className="mb-3 flex flex-wrap gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em]">
                <span className="rounded-full bg-white/15 px-3 py-1.5">{entry.category_name || "General"}</span>
                <span className="rounded-full bg-white/15 px-3 py-1.5">{entry.status || "published"}</span>
                <span className="rounded-full bg-white/15 px-3 py-1.5">{entry.mood || "Normal"}</span>
              </div>
              <h1 className="text-3xl font-black md:text-5xl">{entry.title}</h1>
            </div>
          </div>

          <div className="p-6 md:p-2">
            <section className="rounded-2xl border border-slate-200 bg-[#f4f5f7] p-4 md:p-6">
              <h2 className="mb-5 text-[11px] font-extrabold uppercase tracking-[0.25em] text-slate-500">Diary details & media</h2>
              <div className="grid gap-4 md:grid-cols-[190px_minmax(0,1fr)]">
                <div role="tablist" aria-orientation="vertical" aria-label="Diary detail categories" className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
                  {mediaTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = tab.id === activeTab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setActiveMediaTab(tab.id)}
                        className={`flex shrink-0 items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition md:w-full ${isActive ? "bg-violet-700 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-violet-50 hover:text-violet-700"}`}
                      >
                        <span className="flex items-center gap-2"><Icon size={16} />{tab.label}</span>
                        {tab.id !== "personal" && (
                          <span className={`rounded-full px-2 py-0.5 text-xs ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{tab.items.length}</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div role="tabpanel" aria-label={activeTab.label} className="min-w-0">
                  {activeTab.id === "personal" ? (
                    <div className="space-y-5">
                      <div className="flex flex-wrap gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em]">
                        <span className="rounded-full bg-violet-100 px-3 py-1.5 text-violet-700">{entry.category_name || "General"}</span>
                        <span className="rounded-full bg-slate-200 px-3 py-1.5 text-slate-700">{entry.status || "published"}</span>
                        <span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-700">{entry.mood || "Normal"}</span>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {[
                          { label: "Date", value: formatDate(entry.entry_date), icon: FiCalendar },
                          { label: "Time", value: entry.entry_time || "Not set", icon: FiClock },
                          { label: "Location", value: entry.location || "No location", icon: FiMapPin },
                          { label: "Favorite", value: entry.is_favorite ? "Yes" : "No", icon: FiHeart },
                        ].map(({ label, value, icon: Icon }) => (
                          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="mb-2 flex items-center gap-2 text-slate-500"><Icon size={15} /> {label}</div>
                            <p className="text-base font-bold text-slate-800">{value}</p>
                          </div>
                        ))}
                      </div>

                      <div className="grid gap-5 lg:grid-cols-[1.8fr_1fr]">
                        <section className="rounded-2xl border border-slate-200 bg-white p-5">
                          <h3 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Diary entry</h3>
                          <div className="prose max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: entry.content || "<p>No content provided.</p>" }} />
                        </section>

                        <div className="space-y-4">
                          <section className="rounded-2xl border border-slate-200 bg-white p-5">
                            <h3 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Tags</h3>
                            {Array.isArray(entry.tags) && entry.tags.length ? (
                              <div className="flex flex-wrap gap-2">
                                {entry.tags.map((tag, index) => (
                                  <span key={`${tag}-${index}`} className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700"><FiTag size={10} /> {tag}</span>
                                ))}
                              </div>
                            ) : <p className="text-sm text-slate-500">No tags added.</p>}
                          </section>

                          <section className="rounded-2xl border border-slate-200 bg-white p-5">
                            <h3 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Meta</h3>
                            <div className="space-y-2 text-sm text-slate-700">
                              <p><span className="font-semibold">Private:</span> {entry.is_private ? "Yes" : "No"}</p>
                              <p><span className="font-semibold">Locked:</span> {entry.is_locked ? "Yes" : "No"}</p>
                              <p><span className="font-semibold">Created:</span> {formatDateTime(entry.created_at)}</p>
                              <p><span className="font-semibold">Updated:</span> {formatDateTime(entry.updated_at)}</p>
                            </div>
                          </section>
                        </div>
                      </div>
                    </div>
                  ) : activeTab.items.length ? (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {activeTab.items.map(({ url: mediaUrl, fileName, category }, index) => {
                        const url = getMediaUrl(mediaUrl);
                        const isImage = category === "images";
                        const isVideo = category === "videos";
                        const isAudio = category === "audio";

                        return (
                          <article key={`${mediaUrl}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
                                <div className="flex flex-col items-center gap-2"><FiFileText size={28} /><span>{fileName}</span></div>
                              </div>
                            )}

                            <div className="flex items-center justify-between gap-3 px-3 py-2">
                              <span className="truncate text-xs text-slate-600">{fileName}</span>
                              <div className="flex shrink-0 items-center gap-1.5">
                                <a href={url} target="_blank" rel="noreferrer" aria-label={`Open ${fileName}`} title="Open" className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700"><FiEye size={14} /></a>
                                <button type="button" onClick={() => handleDownload(mediaUrl, fileName)} aria-label={`Download ${fileName}`} title="Download" className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-violet-100 hover:text-violet-700"><FiDownload size={14} /></button>
                                <button type="button" onClick={() => handleShare(`${entry.title} - ${fileName}`)} aria-label={`Share ${fileName}`} title="Share diary entry" className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-violet-100 hover:text-violet-700"><FiShare2 size={14} /></button>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No media or attachments have been added.</p>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiaryDetails;
