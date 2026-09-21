import React from 'react';
import leftBannerBg from '../../public/silksbanner/saree_banner_custom.png';
import rightTopBg from '../../public/silksbanner/saree_maroon_kanchipuram.png';
import rightBottomBg from '../../public/silksbanner/saree_banner.png';

const SilksBanner = () => {
    return (
        <div className="w-full max-w-[1400px] mx-auto p-4 md:p-10 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                <div className="md:col-span-2 relative h-[400px] md:h-[600px] overflow-hidden rounded-xl group shadow-[0_20px_50px_rgba(0,0,0,0.2)] bg-gray-50 transition-all duration-500 hover:-translate-y-2">
                    <img
                        src={leftBannerBg}
                        alt="Heritage Collection"
                        className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none transition-opacity duration-500 group-hover:opacity-80"></div>
                    <div className="absolute inset-0 flex items-center px-8 md:px-16 pointer-events-none">
                        <div className="max-w-md pointer-events-auto">
                            <p className="text-primary-light text-sm md:text-lg mb-1 font-medium italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">Traditional Heritage Weaves</p>
                            <h2 className="text-primary text-4xl md:text-6xl font-bold mb-4 tracking-tight drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">Elite Silk</h2>
                            <a href="#" className="text-primary-dark text-sm md:text-base font-semibold border-b-2 border-primary-light pb-1 hover:text-red-400 hover:border-red-400 transition-all uppercase tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
                                Browse Collection
                            </a>
                        </div>
                    </div>
                </div>

                {/* Right Side: Two Stacked Banners (Roughly 33% width) */}
                <div className="flex flex-col gap-6 h-[400px] md:h-[600px]">

                    {/* Top Right Banner */}
                    <div className="relative flex-1 overflow-hidden rounded-xl group shadow-[0_15px_35px_rgba(0,0,0,0.15)] bg-[#f5f5f5] transition-all duration-500 hover:-translate-y-2">
                        <img
                            src={rightTopBg}
                            alt="Designer Wear"
                            className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40 pointer-events-none"></div>
                        <div className="absolute inset-0 flex items-center px-8 pointer-events-none">
                            <div className="pointer-events-auto">
                                <p className="text-primary-light text-xs md:text-sm mb-1 uppercase tracking-[0.2em] drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">Designer Wear</p>
                                <h3 className="text-primary text-2xl md:text-3xl font-bold mb-4 uppercase tracking-tighter drop-shadow-[0_3px_6px_rgba(0,0,0,0.7)]">Silk Fusion</h3>
                                <a href="#" className="text-primary-dark text-xs md:text-sm font-bold border-b-2 border-primary-light pb-1 hover:text-red-400 hover:border-red-400 transition-all uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                                    Browse Products
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Right Banner */}
                    <div className="relative flex-1 overflow-hidden rounded-xl group shadow-[0_15px_35px_rgba(0,0,0,0.15)] bg-[#e0f2f1] transition-all duration-500 hover:-translate-y-2">
                        <img
                            src={rightBottomBg}
                            alt="Daily Elegance"
                            className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40 pointer-events-none"></div>
                        <div className="absolute inset-0 flex items-center px-8 pointer-events-none">
                            <div className="pointer-events-auto">
                                <p className="text-primary-light text-xs md:text-sm mb-1 uppercase tracking-[0.2em] drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">Daily Elegance</p>
                                <h3 className="text-primary text-2xl md:text-3xl font-bold mb-4 uppercase tracking-tighter drop-shadow-[0_3px_6px_rgba(0,0,0,0.7)]">Cotton Bliss</h3>
                                <a href="#" className="text-primary-dark text-xs md:text-sm font-bold border-b-2 border-primary-light pb-1 hover:text-red-400 hover:border-red-400 transition-all uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                                    Browse Products
                                </a>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};

export default SilksBanner;
