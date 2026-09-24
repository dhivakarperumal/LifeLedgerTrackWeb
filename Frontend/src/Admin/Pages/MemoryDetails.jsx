import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api";
import { toast } from "react-hot-toast";
import { FiImage, FiVideo, FiMusic, FiCalendar, FiMapPin, FiClock, FiTag, FiBookOpen, FiArrowLeft, FiHeart, FiEdit2, FiTrash2, FiEye } from "react-icons/fi";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const getMediaUrl = (value) => {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  const base = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
  return `${base}${value.startsWith("/") ? value : `/${value}`}`;
};

const MemoryDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [memory, setMemory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMemory = async () => {
      try {
        const response = await api.get(`/memories/${id}`);
        setMemory(response.data);
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

  return (
    <div className="min-h-screen  pb-20">
      <div className="mx-auto max-w-7xl px-4 py-6 md:p-2">
        
        {/* Top Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <button onClick={() => navigate("/admin/users/memories")} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50">
            <FiArrowLeft /> Back to Memories
          </button>
          
          <div className="flex gap-3">
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
                  <video src={getMediaUrl(memory.media_url)} controls className="h-full w-full object-contain" />
                </div>
              ) : memory.media_type === "audio" ? (
                <div className="relative w-full h-64 md:h-80 flex flex-col items-center justify-center bg-gradient-to-br from-violet-500 to-pink-500">
                  <FiMusic className="text-7xl text-white/50 mb-6 drop-shadow-lg" />
                  <audio src={getMediaUrl(memory.media_url)} controls className="w-4/5 max-w-md shadow-xl rounded-full bg-white" />
                </div>
              ) : (
                <div className="relative h-72 w-full md:h-96">
                  <img src={getMediaUrl(memory.media_url)} alt={memory.title} className="absolute inset-0 h-full w-full object-cover opacity-90" />
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
          <div className="p-6 md:p-10">
            {/* Metadata Grid */}
            <div className="mb-8 grid gap-6 md:grid-cols-3 border-b border-slate-100 pb-8 text-sm">
              {memory.memory_date && (
                <div className="flex items-center gap-4 text-slate-600">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 shadow-sm"><FiCalendar size={20} /></div> 
                  <div className="flex flex-col"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Date</span><span className="font-semibold text-slate-800 text-base">{formatDate(memory.memory_date)}</span></div>
                </div>
              )}
              {memory.location && (
                <div className="flex items-center gap-4 text-slate-600">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 shadow-sm"><FiMapPin size={20} /></div> 
                  <div className="flex flex-col"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Location</span><span className="font-semibold text-slate-800 text-base">{memory.location}</span></div>
                </div>
              )}
              {memory.mood && (
                <div className="flex items-center gap-4 text-slate-600">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 shadow-sm"><FiClock size={20} /></div> 
                  <div className="flex flex-col"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Mood</span><span className="font-semibold text-slate-800 text-base">{memory.mood}</span></div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mb-10 prose prose-slate max-w-none">
               <h3 className="mb-4 text-xl font-bold text-slate-800">About this memory</h3>
               <p className="whitespace-pre-line text-[16px] leading-relaxed text-slate-600">
                 {memory.description || <span className="italic text-slate-400">No description provided for this memory.</span>}
               </p>
            </div>

            {/* Media Gallery */}
            {(() => {
              const galleryItems = Array.isArray(memory.media_gallery) && memory.media_gallery.length
                ? memory.media_gallery
                : memory.media_url
                  ? [memory.media_url]
                  : [];

              const uniqueGallery = galleryItems.filter((item, index, arr) => item && arr.indexOf(item) === index);

              if (!uniqueGallery.length) return null;

              return (
                <div className="mb-10 rounded-[22px] border border-slate-200 bg-[#f4f5f7] p-4 md:p-6">
                  <h3 className="mb-5 text-[11px] font-extrabold uppercase tracking-[0.25em] text-slate-500">Media & attachments</h3>

                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {uniqueGallery.map((mediaUrl, idx) => {
                      const resolvedUrl = getMediaUrl(mediaUrl);
                      const isVideo = /(\.(mp4|webm|ogg|mov|m4v))$/i.test(mediaUrl || "");
                      const isAudio = /(\.(mp3|wav|ogg|m4a|aac))$/i.test(mediaUrl || "");
                      const fileName = (mediaUrl || "").split("/").pop() || `Attachment ${idx + 1}`;

                      return (
                        <div key={`${mediaUrl}-${idx}`} className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
                          <div className={isAudio ? "flex h-[220px] items-center justify-center bg-gradient-to-r from-violet-500 to-pink-500 p-4" : "h-[220px] overflow-hidden bg-black"}>
                            {isVideo ? (
                              <video src={resolvedUrl} controls className="h-full w-full object-cover" />
                            ) : isAudio ? (
                              <div className="flex w-full items-center justify-center">
                                <div className="flex w-full max-w-[94%] items-center gap-3 rounded-full bg-white/95 px-4 py-3 shadow-lg">
                                  <span className="text-lg text-slate-700">▶</span>
                                  <audio src={resolvedUrl} controls className="h-9 w-full" />
                                </div>
                              </div>
                            ) : (
                              <img src={resolvedUrl} alt={fileName} className="h-full w-full object-cover" />
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-3 px-3 py-3">
                            <span className="truncate text-[12px] text-slate-700">{fileName}</span>
                            <a href={resolvedUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100">
                              Open
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div className="grid gap-6 md:grid-cols-2">
              {/* Tags */}
              {memory.tags?.length > 0 && (
                <div>
                  <h3 className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {memory.tags.map((tag, idx) => (
                      <span key={`${tag}-${idx}`} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-[12px] font-bold uppercase tracking-wider text-slate-600 transition hover:bg-slate-200">
                        <FiTag size={12} /> {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Voice Note */}
              {memory.voice_note && (
                <div>
                  <h3 className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Voice Note Transcript</h3>
                  <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5 shadow-sm">
                    <p className="text-sm font-medium italic leading-relaxed text-slate-700">"{memory.voice_note}"</p>
                  </div>
                </div>
              )}
            </div>

            {/* Timestamps */}
            <div className="mt-10 border-t border-slate-100 pt-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-6 text-[12px] font-medium text-slate-400">
                {memory.created_at && <span><strong className="text-slate-500 uppercase tracking-widest text-[10px]">Created:</strong> {new Date(memory.created_at).toLocaleString()}</span>}
                {memory.updated_at && <span><strong className="text-slate-500 uppercase tracking-widest text-[10px]">Last Modified:</strong> {new Date(memory.updated_at).toLocaleString()}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemoryDetails;
