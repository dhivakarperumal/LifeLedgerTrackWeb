import React, { useState, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade, Pagination } from "swiper/modules";
import api from "../api";
import { Link } from "react-router-dom";
import { useContext } from "react";
import { StoreContext } from "../PrivateRouter/StoreContext";

import "swiper/css";
import "swiper/css/effect-fade";
import PageContainer from "./CommenComponents/PageContainer";
import "swiper/css/pagination";

const defaultSlides = [
    {
        title: "GULPOSH",
        subtitle: "Luxury Saree Collection",
        description: "Experience the elegance of traditional craftsmanship.",
        image: "/Hero/download.jpg",
        mobile_image: "/Hero/download.jpg",
        link: "/shop"
    },
    {
        title: "ROYAL SAREES",
        subtitle: "Timeless Traditional Elegance",
        description: "A heritage of beauty in every fold.",
        image: "/Hero/images.jpg",
        mobile_image: "/Hero/images.jpg",
        link: "/shop"
    }
];

const resolveBannerImage = (image) => {
    if (!image || !image.startsWith("/uploads/")) return image;
    const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
    return `${backendUrl}${image}`;
};

const normalizeSlides = (slides) => slides.map((slide) => ({
    ...slide,
    image: resolveBannerImage(slide.image),
    mobile_image: resolveBannerImage(slide.mobile_image),
}));

export default function HeroSlider() {
    const { bannersCache, setBannersCache } = useContext(StoreContext);
    const [slides, setSlides] = useState(bannersCache.hero || []);
    const [loading, setLoading] = useState(!bannersCache.hero);

    useEffect(() => {
        const fetchBanners = async () => {
            try {
                if (bannersCache.hero) {
                    setSlides(bannersCache.hero);
                    setLoading(false);
                    return;
                }

                const response = await api.get("/banners/type/hero");
                const activeBanners = Array.isArray(response.data) ? response.data : [];
                const finalSlides = activeBanners.length > 0 ? normalizeSlides(activeBanners) : defaultSlides;
                setSlides(finalSlides);
                setBannersCache(prev => ({ ...prev, hero: finalSlides }));
            } catch (error) {
                console.error("Error fetching hero banners:", error);
                setSlides(defaultSlides);
            } finally {
                setLoading(false);
            }
        };
        fetchBanners();
    }, [bannersCache, setBannersCache]);

    if (loading) return (
        <div className="w-full h-[80vh] bg-slate-50 animate-pulse flex items-center justify-center">
            <p className="text-slate-300 font-serif italic text-xl">Curating Elegance...</p>
        </div>
    );

    return (
        <section className="w-full h-[80vh] md:h-screen overflow-hidden bg-slate-900 flex items-center justify-center">
            <Swiper
                modules={[Autoplay, EffectFade, Pagination]}
                effect="fade"
                fadeEffect={{ crossFade: true }}
                autoplay={{ delay: 5000, disableOnInteraction: false }}
                
                loop={slides.length > 1}
                className="w-full h-full"
            >
                {slides.map((slide, index) => (
                    <SwiperSlide key={index} className="!h-full">
                        <div className="relative w-full h-full group">
                            {/* Responsive Background Image */}
                            <picture className="absolute inset-0 w-full h-full">
                                {slide.mobile_image && <source media="(max-width: 768px)" srcSet={slide.mobile_image} />}
                                <img
                                    src={slide.image}
                                    alt={slide.title}
                                    className="w-full h-full object-cover transform scale-105 group-hover:scale-100 transition-transform duration-[10s]"
                                />
                            </picture>

                            {/* Refined Overlays */}
                            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>
                            <div className="absolute inset-0 bg-black/10"></div>

                            {/* Content Layer */}
                            <div className="absolute inset-0 flex items-center">
                                <PageContainer>
                                    <div className="text-white max-w-2xl px-4">
                                        <div className="overflow-hidden mb-2">
                                            <p className="text-xs md:text-sm tracking-[6px] md:tracking-[8px] uppercase text-amber-400 font-bold animate-in slide-in-from-left duration-700">
                                                {slide.subtitle || "Premium Collection"}
                                            </p>
                                        </div>

                                        <h1 className="text-4xl md:text-6xl font-serif font-light leading-[1.1] mb-6 animate-in slide-in-from-left duration-1000 delay-200">
                                            {slide.title}
                                        </h1>

                                        {slide.description && (
                                            <p className="text-sm hidden md:block md:text-lg text-gray-300 mb-8 max-w-lg leading-relaxed animate-in slide-in-from-left duration-1000 delay-300 opacity-90">
                                                {slide.description}
                                            </p>
                                        )}

                                        <div className="animate-in slide-in-from-bottom duration-1000 delay-500">
                                            <Link 
                                                to={slide.link || "/shop"}
                                                className="inline-block px-6 md:px-12 py-4 border border-white/30 text-white tracking-[0.2em] font-black text-xs hover:bg-white hover:text-black hover:border-white transition-all duration-500 shadow-xl backdrop-blur-sm"
                                            >
                                                EXPLORE COLLECTION
                                            </Link>
                                        </div>
                                    </div>
                                </PageContainer>
                            </div>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>

            <style dangerouslySetInnerHTML={{ __html: `
                .swiper-pagination-bullet { background: white !important; opacity: 0.5 !important; }
                .swiper-pagination-bullet-active { background: #fbbf24 !important; opacity: 1 !important; width: 30px !important; border-radius: 4px !important; }
            `}} />
        </section>
    );
}
