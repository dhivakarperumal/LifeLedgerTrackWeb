import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api";
import { formatDateOnly } from "../../utils/date";
import getMediaUrl from "../../utils/mediaUrl";
import { toast } from "react-hot-toast";
import { FiImage, FiVideo, FiMusic, FiCalendar, FiMapPin, FiClock, FiTag, FiBookOpen, FiArrowLeft, FiHeart, FiEdit2, FiTrash2, FiEye, FiDownload, FiShare2, FiFileText } from "react-icons/fi";

const formatDate = (value) => {
  if (!value) return "—";
  return formatDateOnly(value, "en-US", { month: "short", day: "numeric", year: "numeric" });
};

const getMediaFileName = (media, index) => {
  if (typeof media === "object" && media) {
    const name = media.original_name || media.file_name || media.name;
    if (name) return name;
  }

  const mediaUrl = typeof media === "string"
    ? media
    : media?.file_url || media?.url || media?.path || media?.src || "";
  const pathname = new URL(getMediaUrl(mediaUrl), window.location.origin).pathname;
  const filename = pathname.split("/").pop();

  try {
    return filename ? decodeURIComponent(filename) : `Attachment ${index + 1}`;
  } catch {
    return filename || `Attachment ${index + 1}`;
  }
};

const getMediaCategory = (media) => {
  const declaredType = String(media?.mime_type || media?.media_type || media?.file_type || media?.type || "").toLowerCase();
  const fileName = String(media?.original_name || media?.file_name || media?.name || media?.file_url || media?.url || media || "").toLowerCase();

  if (declaredType.startsWith("image/") || declaredType === "image") return "images";
  if (declaredType.startsWith("audio/") || declaredType === "audio") return "audio";
  if (declaredType.startsWith("video/") || declaredType === "video") return "videos";
  if (declaredType.includes("zip") || /\.(zip|rar|7z)$/i.test(fileName)) return "zip";
  if (/\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(fileName)) return "images";
  if (/\.(mp3|wav|m4a|aac|ogg)$/i.test(fileName)) return "audio";
  if (/\.(mp4|mov|webm|m4v|mkv|avi)$/i.test(fileName)) return "videos";
  return "files";
};

const getMemoryMediaTabs = (memory) => {
  const mediaByCategory = { images: [], videos: [], audio: [], zip: [], files: [] };
  const seenUrls = new Set();
  const sources = [
    { items: memory.images, category: "images" },
    { items: memory.videos, category: "videos" },
    { items: memory.audio, category: "audio" },
    { items: memory.media_files },
    { items: memory.media_gallery },
    { items: memory.media_url ? [{ file_url: memory.media_url, media_type: memory.media_type }] : [] },
  ];

  sources.forEach(({ items, category }) => {
    if (!Array.isArray(items)) return;
    items.forEach((media, index) => {
      const url = typeof media === "string"
        ? media
        : media?.file_url || media?.url || media?.path || media?.src || "";
      if (!url || seenUrls.has(url)) return;
      seenUrls.add(url);
      const mediaCategory = category || getMediaCategory(media);
      mediaByCategory[mediaCategory].push({
        media,
        url,
        fileName: getMediaFileName(media, index),
        category: mediaCategory,
      });
    });
  });

  const allMedia = Object.values(mediaByCategory).flat();
  return [
    { id: "all", label: "All", icon: FiFileText, items: allMedia },
    { id: "images", label: "Images", icon: FiImage },
    { id: "videos", label: "Videos", icon: FiVideo },
    { id: "audio", label: "Audio", icon: FiMusic },
    { id: "zip", label: "ZIP", icon: FiFileText },
    { id: "files", label: "Files", icon: FiFileText },
  ].filter((tab) => tab.id === "all" ? allMedia.length > 0 : mediaByCategory[tab.id].length > 0)
    .map((tab) => tab.id === "all" ? tab : ({ ...tab, items: mediaByCategory[tab.id] }));
};

const MemoryDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [memory, setMemory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeMediaTab, setActiveMediaTab] = useState("personal");

  useEffect(() => {
    const fetchMemory = async () => {
      try {
        const response = await api.get(`/memories/${id}`);
        setMemory(response.data?.data || response.data);
      } catch (error) {
        toast.error("Failed to load memory details.");
        navigate("/admin/users/memories");
      } finally {
        setLoading(false);
      }
    };
    fetchMemory();
  }, [id, navigate]);

  const toggleFavorite = async () => {
    try {
      await api.patch(`/memories/${id}/favorite`);
      setMemory((prev) => ({ ...prev, is_favorite: !prev.is_favorite }));
      toast.success("Favorite updated.");
    } catch (error) {
      toast.error("Unable to toggle favorite.");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this memory permanently?")) return;
    try {
      await api.delete(`/memories/${id}`);
      toast.success("Memory deleted.");
      navigate("/admin/users/memories");
    } catch (error) {
      toast.error("Failed to delete memory.");
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
      console.error("Memory media download failed:", error);
      toast.error(error.response?.status === 423
        ? "Unlock the app to download this attachment."
        : "Failed to download attachment.");
    }
  };

  const handleShare = async (url, text = memory.title) => {
    const shareData = { title: memory.title, text, url };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error.name === "AbortError") return;
        console.error("Memory sharing failed:", error);
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard.");
    } catch (error) {
      console.error("Memory link copy failed:", error);
      toast.error("Unable to share or copy this link.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#7b2cbf]/20 border-t-[#7b2cbf]" />
          <p className="text-sm font-bold text-gray-500">Loading memory details...</p>
        </div>
      </div>
    );
  }

  if (!memory) return null;
  const mediaTabs = [
    { id: "personal", label: "Personal", icon: FiBookOpen, items: [] },
    ...getMemoryMediaTabs(memory),
  ];
  const activeTab = mediaTabs.find((tab) => tab.id === activeMediaTab) || mediaTabs[0];
  const memoryTags = Array.isArray(memory.tags) ? memory.tags : [];

  return (
    <div className="min-h-screen  pb-20">
      <div className="mx-auto max-w-7xl px-4 py-6 md:p-2">
        
        {/* Top Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <button onClick={() => navigate("/admin/users/memories")} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50">
            <FiArrowLeft /> Back to Memories
          </button>
          
          <div className="flex gap-3">
             <button onClick={() => handleShare(window.location.href, memory.description || memory.title)} className="inline-flex items-center gap-2 rounded-xl bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-700 shadow-sm transition hover:bg-violet-100">
               <FiShare2 /> Share
             </button>
             <button onClick={() => navigate("/admin/users/memories", { state: { editMemoryId: memory.id } })} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700">
               <FiEdit2 /> Edit
             </button>
             <button onClick={toggleFavorite} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition ${memory.is_favorite ? 'bg-pink-50 text-pink-600 hover:bg-pink-100' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>
               <FiHeart className={memory.is_favorite ? "fill-current" : ""} /> {memory.is_favorite ? "Favorited" : "Favorite"}
             </button>
             <button onClick={handleDelete} className="inline-flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-600 shadow-sm transition hover:bg-rose-100">
               <FiTrash2 /> Delete
             </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
          {/* Hero Header */}
          <div className="w-full bg-slate-900 overflow-hidden flex flex-col rounded-t-3xl">
             {memory.media_url ? (
              memory.media_type === "video" ? (
                <div className="relative w-full h-[300px] md:h-[500px] bg-black">
                  <video src={getMediaUrl(memory.media_url)} crossOrigin="use-credentials" controls className="h-full w-full object-contain" />
                </div>
              ) : memory.media_type === "audio" ? (
                <div className="relative w-full h-64 md:h-80 flex flex-col items-center justify-center bg-gradient-to-br from-violet-500 to-pink-500">
                  <FiMusic className="text-7xl text-white/50 mb-6 drop-shadow-lg" />
                  <audio src={getMediaUrl(memory.media_url)} crossOrigin="use-credentials" controls className="w-4/5 max-w-md shadow-xl rounded-full bg-white" />
                </div>
              ) : (
                <div className="relative h-72 w-full md:h-96">
                  <img src={getMediaUrl(memory.media_url)} alt={memory.title} crossOrigin="use-credentials" className="absolute inset-0 h-full w-full object-cover opacity-90" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/30 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 w-full p-6 md:p-10 text-white">
                     <div className="mb-4 flex items-center gap-3">
                        <span className="rounded-full bg-white/20 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-widest backdrop-blur-md">{memory.category_name || "General"}</span>
                        <span className={`rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-widest backdrop-blur-md ${memory.status === 'published' ? 'bg-emerald-500/30 text-emerald-100' : 'bg-amber-500/30 text-amber-100'}`}>{memory.status || "published"}</span>
                     </div>
                     <h1 className="text-4xl font-black drop-shadow-lg md:text-5xl">{memory.title}</h1>
                  </div>
                </div>
              )
            ) : (
              <div className="relative h-72 w-full md:h-96 flex items-center justify-center bg-gradient-to-br from-[#240046] to-[#7b2cbf]">
                <FiBookOpen className="text-7xl text-white/20 absolute" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/30 to-transparent"></div>
                <div className="absolute bottom-0 left-0 w-full p-6 md:p-10 text-white">
                   <div className="mb-4 flex items-center gap-3">
                      <span className="rounded-full bg-white/20 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-widest backdrop-blur-md">{memory.category_name || "General"}</span>
                      <span className={`rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-widest backdrop-blur-md ${memory.status === 'published' ? 'bg-emerald-500/30 text-emerald-100' : 'bg-amber-500/30 text-amber-100'}`}>{memory.status || "published"}</span>
                   </div>
                   <h1 className="text-4xl font-black drop-shadow-lg md:text-5xl">{memory.title}</h1>
                </div>
              </div>
            )}
            
            {/* Title Block for Video/Audio so text doesn't cover controls */}
            {memory.media_url && (memory.media_type === "video" || memory.media_type === "audio") && (
              <div className="w-full bg-white p-6 md:p-10 pb-0 md:pb-0">
                 <div className="mb-4 flex items-center gap-3">
                    <span className="rounded-full bg-violet-100 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-widest text-violet-700">{memory.category_name || "General"}</span>
                    <span className={`rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-widest ${memory.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{memory.status || "published"}</span>
                 </div>
                 <h1 className="text-4xl font-black text-slate-900 md:text-5xl">{memory.title}</h1>
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="p-6 md:p-2">
            {/* Media Gallery */}
            {activeTab && (
              <div className="mb-10 rounded-[22px] border border-slate-200 bg-[#f4f5f7] p-4 md:p-2">
                <h3 className="mb-5 text-[11px] font-extrabold uppercase tracking-[0.25em] text-slate-500">Media & attachments</h3>

                <div className="grid gap-4 md:grid-cols-[190px_minmax(0,1fr)]">
                  <div role="tablist" aria-orientation="vertical" aria-label="Memory media categories" className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
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
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="rounded-full bg-violet-100 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-widest text-violet-700">{memory.category_name || "General"}</span>
                          <span className={`rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-widest ${memory.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{memory.status || "published"}</span>
                          <span className="rounded-full bg-pink-100 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-widest text-pink-700">{memory.is_favorite ? "Favorite" : "Not a favorite"}</span>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                          {[
                            { label: "Date", value: formatDate(memory.memory_date), icon: FiCalendar, color: "bg-violet-100 text-violet-600" },
                            { label: "Location", value: memory.location || "Not set", icon: FiMapPin, color: "bg-sky-100 text-sky-600" },
                            { label: "Mood", value: memory.mood || "Not set", icon: FiClock, color: "bg-amber-100 text-amber-600" },
                          ].map(({ label, value, icon: Icon, color }) => (
                            <div key={label} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}><Icon size={19} /></div>
                              <div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p><p className="font-semibold text-slate-800">{value}</p></div>
                            </div>
                          ))}
                        </div>

                        <section className="rounded-2xl border border-slate-200 bg-white p-5">
                          <h4 className="mb-2 text-sm font-bold text-slate-800">About this memory</h4>
                          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{memory.description || "No description provided for this memory."}</p>
                        </section>

                        <div className="grid gap-5 lg:grid-cols-2">
                          <section className="rounded-2xl border border-slate-200 bg-white p-5">
                            <h4 className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Tags</h4>
                            {memoryTags.length ? (
                              <div className="flex flex-wrap gap-2">
                                {memoryTags.map((tag, idx) => (
                                  <span key={`${tag}-${idx}`} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600"><FiTag size={12} />{tag}</span>
                                ))}
                              </div>
                            ) : <p className="text-sm text-slate-400">No tags added.</p>}
                          </section>

                          <section className="rounded-2xl border border-slate-200 bg-white p-5">
                            <h4 className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Voice note transcript</h4>
                            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{memory.voice_note || "No voice note transcript."}</p>
                          </section>
                        </div>

                        <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 text-xs text-slate-400 sm:flex-row sm:gap-6">
                          {memory.created_at && <span><strong className="font-bold uppercase tracking-widest text-slate-500">Created:</strong> {new Date(memory.created_at).toLocaleString()}</span>}
                          {memory.updated_at && <span><strong className="font-bold uppercase tracking-widest text-slate-500">Last Modified:</strong> {new Date(memory.updated_at).toLocaleString()}</span>}
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {activeTab.items.map(({ url, fileName, category }, idx) => {
                          const resolvedUrl = getMediaUrl(url);
                          const mediaCategory = activeTab.id === "all" ? category : activeTab.id;
                          const isImage = mediaCategory === "images";
                          const isVideo = mediaCategory === "videos";
                          const isAudio = mediaCategory === "audio";

                          return (
                            <div key={`${url}-${idx}`} className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
                              <div className={isAudio ? "flex h-[220px] items-center justify-center bg-gradient-to-r from-violet-500 to-pink-500 p-4" : "flex h-[220px] items-center justify-center overflow-hidden bg-black"}>
                                {isImage ? (
                                  <img src={resolvedUrl} alt={fileName} crossOrigin="use-credentials" className="h-full w-full object-cover" />
                                ) : isVideo ? (
                                  <video src={resolvedUrl} crossOrigin="use-credentials" controls className="h-full w-full object-contain" />
                                ) : isAudio ? (
                                  <audio src={resolvedUrl} crossOrigin="use-credentials" controls className="w-full" />
                                ) : (
                                  <div className="flex flex-col items-center gap-3 p-4 text-center text-white">
                                    <FiFileText size={42} />
                                    <span className="text-xs font-semibold">{mediaCategory === "zip" ? "ZIP archive" : "File attachment"}</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center justify-between gap-3 px-3 py-3">
                                <span className="truncate text-[12px] text-slate-700">{fileName}</span>
                                <div className="flex shrink-0 items-center gap-1.5">
                                  <a href={resolvedUrl} target="_blank" rel="noreferrer" aria-label={`Open ${fileName}`} title="Open" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100">
                                    <FiEye size={14} />
                                  </a>
                                  <button type="button" onClick={() => handleDownload(url, fileName)} aria-label={`Download ${fileName}`} title="Download" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-violet-50 hover:text-violet-700">
                                    <FiDownload size={14} />
                                  </button>
                                  <button type="button" onClick={() => handleShare(window.location.href, `${memory.title} - ${fileName}`)} aria-label={`Share ${fileName}`} title="Share memory" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-violet-50 hover:text-violet-700">
                                    <FiShare2 size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemoryDetails;
