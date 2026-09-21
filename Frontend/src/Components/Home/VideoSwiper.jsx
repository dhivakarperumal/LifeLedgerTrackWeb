import React, { useState, useEffect } from "react";
import Heading from "../Heading";
import {
  FaHeart,
  FaCommentDots,
  FaShare,
  FaEllipsisH,
  FaPlay,
} from "react-icons/fa";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import PageContainer from "../CommenComponents/PageContainer";
import api from "../../api";
import { StoreContext } from "../../PrivateRouter/StoreContext";
import { useContext } from "react";

export default function VideoSwiper() {
  const { videosCache, setVideosCache } = useContext(StoreContext);
  const [videos, setVideos] = useState(videosCache || []);
  const [loading, setLoading] = useState(!videosCache || videosCache.length === 0);
  const [selectedVideo, setSelectedVideo] = useState(null);

  // Extract YouTube ID from URL
  const getYoutubeId = (url) => {
  const regExp =
    /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([^&?/]+)/;
  const match = url.match(regExp);
  return match ? match[1] : url;
};

  const resolveMediaUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    const cleanPath = url.replace(/\\/g, '/');
    const finalPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
    return `${backendUrl}${finalPath}`;
  };

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        if (videosCache && videosCache.length > 0) {
          setVideos(videosCache);
          setLoading(false);
          return;
        }

        const response = await api.get("/videos");
        const data = Array.isArray(response.data) ? response.data : [];
        setVideos(data);
        setVideosCache(data);
      } catch (err) {
        console.error("Error fetching videos:", err);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [videosCache, setVideosCache]);

  // Share Function
  const handleShare = async (e, video) => {
    e.stopPropagation();

    const videoUrl =
      video.type === "youtube" ? video.videoId : window.location.origin;

    try {
      if (navigator.share) {
        await navigator.share({
          title: video.title,
          text: "Check out this video!",
          url: videoUrl,
        });
      } else {
        await navigator.clipboard.writeText(videoUrl);
        alert("Video link copied!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="py-15">
      <PageContainer>
        <Heading title="Showcase Reels" />
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-slate-50 rounded-2xl overflow-hidden animate-pulse h-[420px]">
                <div className="w-full h-full bg-slate-200"></div>
              </div>
            ))}
          </div>
        ) : (
          <Swiper
            modules={[Autoplay]}
            spaceBetween={20}
            loop={Array.isArray(videos) && videos.length > 4}
            autoplay={{ delay: 3000 }}
            breakpoints={{
              320: { slidesPerView: 1 },
              640: { slidesPerView: 2 },
              768: { slidesPerView: 3 },
              1024: { slidesPerView: 4 },
            }}
          >
            {Array.isArray(videos) && videos.map((video) => (
              <SwiperSlide key={video.id}>
                <div
                  className="relative rounded-2xl overflow-hidden shadow-lg group cursor-pointer h-[420px] bg-slate-100"
                  onClick={() => setSelectedVideo(video)}
                >
                  <div className="w-full h-full relative">
                    {video.type === "youtube" ? (
                      <img
                        src={`https://img.youtube.com/vi/${getYoutubeId(
                          video.videoId
                        )}/hqdefault.jpg`}
                        alt={video.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
                      />
                    ) : (
                      <video
                        src={resolveMediaUrl(video.videoId)}
                        muted
                        autoPlay
                        loop
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover"
                        onMouseOver={(e) => e.target.play()}
                        onMouseOut={(e) => {
                          e.target.pause();
                          e.target.currentTime = 0;
                        }}
                      />
                    )}
                  </div>

                  {/* Play Icon */}
                  {/* <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform">
                      <FaPlay className="text-white text-2xl ml-1" />
                    </div>
                  </div> */}

                  {/* Actions */}
                  <div
                    className="absolute right-3 bottom-12 flex flex-col gap-4 text-white text-xl z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FaHeart className="hover:text-red-500 drop-shadow-lg" />
                    <FaCommentDots className="hover:text-yellow-300 drop-shadow-lg" />
                    <FaShare
                      className="hover:text-blue-400 cursor-pointer drop-shadow-lg"
                      onClick={(e) => handleShare(e, video)}
                    />
                    <FaEllipsisH className="drop-shadow-lg" />
                  </div>

                  {/* Title */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4">
                    <div className="text-white text-sm font-black tracking-tight drop-shadow-md">
                      {video.title}
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </PageContainer>

      {/* Video Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-[1000] backdrop-blur-sm p-4">

          <PageContainer>
            <div className="relative ">

              <button
                onClick={() => setSelectedVideo(null)}
                className="absolute px-2 py-1 rounded-full bg-white/40 -top-10 -right-5 md:top-0 md:right-20 text-black cursor-pointer text-3xl"
              >
                ✕
              </button>

              <div className="w-full max-w-4xl max-h-[80vh] aspect-video rounded-3xl overflow-hidden shadow-2xl bg-black border border-white/10 mx-auto">

                {selectedVideo.type === "youtube" ? (
                  <iframe
                    key={selectedVideo.videoId}
                    src={`https://www.youtube.com/embed/${getYoutubeId(
                      selectedVideo.videoId
                    )}?autoplay=1&mute=1&playsinline=1&rel=0`}
                    title={selectedVideo.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={resolveMediaUrl(selectedVideo.videoId)}
                    controls
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-contain"
                  />
                )}

              </div>

              {/* <div className="mt-6 text-center">
              <h3 className="text-white text-2xl font-black uppercase tracking-tighter">
                {selectedVideo.title}
              </h3>

              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-2">
                Currently displaying artisan showcase
              </p>
            </div> */}

            </div>
          </PageContainer>

        </div>
      )}
    </div>
  );
}
