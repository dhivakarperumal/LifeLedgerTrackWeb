import React, { useState, useEffect } from "react";
import api from "../api";
import { Link } from "react-router-dom";
import { useContext } from "react";
import { StoreContext } from "../PrivateRouter/StoreContext";

const resolveBannerImage = (image) => {
  if (!image || !image.startsWith("/uploads/")) return image;
  const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
  return `${backendUrl}${image}`;
};

export default function Banner() {
  const { bannersCache, setBannersCache } = useContext(StoreContext);
  const [offers, setOffers] = useState(bannersCache.offer || []);
  const [loading, setLoading] = useState(!bannersCache.offer);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        if (bannersCache.offer) {
          setOffers(bannersCache.offer);
          setLoading(false);
          return;
        }

        const response = await api.get("/banners/type/offer");
        const activeOffers = Array.isArray(response.data) ? response.data : [];
        const normalizedOffers = activeOffers.map((offer) => ({
          ...offer,
          image: resolveBannerImage(offer.image),
          mobile_image: resolveBannerImage(offer.mobile_image),
        }));
        setOffers(normalizedOffers);
        setBannersCache(prev => ({ ...prev, offer: normalizedOffers }));
      } catch (error) {
        console.error("Error fetching offer banners:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOffers();
  }, [bannersCache, setBannersCache]);

  if (loading || !offers.length) return null;

  const offer = offers[0];

  return (
    <section className="w-full h-[70vh] md:h-[60vh] relative overflow-hidden mt-10 mb-10">

      {/* Background Image */}
      <picture className="absolute inset-0 w-full h-full">
        {offer.mobile_image && (
          <source media="(max-width:768px)" srcSet={offer.mobile_image} />
        )}

        <img
          src={offer.image}
          alt={offer.title}
          className="w-full h-full object-cover scale-105 animate-[bannerZoom_18s_linear_infinite]"
        />
      </picture>

      {/* Premium Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>

      {/* Decorative Glow */}
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-rose-500/20 blur-[180px]"></div>

      {/* Content */}
      <div className="relative z-10 h-full flex items-center px-6 md:px-24">

        <div className="max-w-3xl text-white space-y-6">

          {/* Subtitle */}
          <span className="inline-block text-[11px] md:text-xs font-bold tracking-[0.4em] text-rose-400 uppercase bg-white/10 px-4 py-2 rounded-full backdrop-blur-md">
            {offer.subtitle || "Exclusive Saree Collection"}
          </span>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-light leading-tight tracking-tight">
            {offer.title}
          </h1>

          {/* Description */}
          {offer.description && (
            <p className="max-w-xl text-gray-200 text-sm md:text-lg leading-relaxed">
              {offer.description}
            </p>
          )}

          {/* CTA */}
          <div className="pt-4 flex items-center gap-6">

            <Link
              to={offer.link || "/shop"}
              className="px-10 py-4 bg-white text-black font-bold text-xs tracking-[0.3em] rounded-sm hover:bg-secondary hover:text-white transition-all duration-500 shadow-xl"
            >
              VIEW COLLECTION
            </Link>

          </div>

        </div>

      </div>

      {/* Custom Animation */}
      <style>{`
        @keyframes bannerZoom {
          0% { transform: scale(1.05); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1.05); }
        }
      `}</style>

    </section>
  );
}