import React from "react";
import Heading from "../Heading";
import AnimatedButton from "../AnimatedButton";
import artisanImg from "../../../public/about/artisan_weaving.png";
import detailImg from "../../../public/about/fabric_detail.png";
import sustainableImg from "../../../public/about/sustainable_craft.png";
import weaverImg from "../../../public/about/master_weaver_portrait.png";
import PageContainer from "../CommenComponents/PageContainer";
import PageHeader from "../CommenComponents/PageHeader";
import { FaCertificate, FaLandmark, FaHandsHelping, FaGem } from "react-icons/fa";

export default function AboutUs() {
    return (
        <div>

            <PageHeader title="About Us" />
            <section className="py-24">
                <PageContainer>
                    <div className="grid lg:grid-cols-2 gap-20 items-center">
                        <div className="relative">
                            <div className="absolute -top-10 -left-10 w-40 h-40 bg-red-100 rounded-full blur-3xl opacity-60 animate-subtle-float" />
                            <img
                                src={artisanImg}
                                alt="Artisan Weaving"
                                className="rounded-2xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] relative z-10 w-full object-cover aspect-[4/5] sm:aspect-[3/2] md:aspect-square"
                            />
                            {/* Floating UI Element */}
                            <div className="absolute -bottom-10 -right-6 md:-right-10 p-6 rounded-2xl shadow-xl z-20 max-w-[240px] bg-white/70 backdrop-blur-xl border border-white/30">
                                <p className="font-playfair text-primary-dark text-xl font-bold mb-1">True Artistry</p>
                                <p className="font-outfit text-xs text-gray-500 leading-relaxed uppercase tracking-widest">Every thread tells a story of a thousand hands.</p>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <span className="font-outfit text-primary-dark font-bold uppercase tracking-widest text-sm">
                                Our Philosophy
                            </span>
                            <h2 className="font-playfair text-4xl md:text-6xl text-stone-900 leading-[1.1]">
                                Weaving dreams into <br />
                                <em className="text-primary-light">timeless silhouettes</em>
                            </h2>
                            <p className="font-outfit text-gray-600 leading-[1.8] text-lg max-w-xl">
                                At the heart of our craft lies a passion for preserving the ancient arts. We don't just sell sarees; we curate heritage. Each piece is meticulously hand-woven by master artisans who have inherited centuries of wisdom.
                            </p>
                            <div className="grid grid-cols-2 gap-8 pt-6">
                                <div>
                                    <p className="font-playfair text-3xl font-bold text-primary-dark">450+</p>
                                    <p className="font-outfit text-xs text-gray-400 uppercase tracking-widest mt-1">Master Weavers</p>
                                </div>
                                <div>
                                    <p className="font-playfair text-3xl font-bold text-primary-dark">100%</p>
                                    <p className="font-outfit text-xs text-gray-400 uppercase tracking-widest mt-1">Natural Fibers</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </PageContainer>
            </section>

            {/* --- THE CRAFT SECTION --- */}
            <section className="py-24 bg-[#EFE9E4] relative overflow-hidden">
                <PageContainer>
                    <div className=" relative z-10">
                        <div className="text-center mb-16">
                            <h2 className="font-playfair text-4xl md:text-6xl text-stone-900 mb-6">Details that <br /> <em className="italic text-primary-light font-light">define excellence</em></h2>
                            <div className="w-24 h-0.5 bg-primary-light mx-auto" />
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {/* Card 1 */}
                            <div className="group overflow-hidden bg-white rounded-3xl p-4 transition-transform hover:-translate-y-2 duration-500 shadow-sm hover:shadow-2xl">
                                <div className="overflow-hidden rounded-2xl mb-6 aspect-square">
                                    <img src={detailImg} alt="Fabric Detail" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                </div>
                                <h3 className="font-playfair text-2xl mb-3 px-2 text-primary-dark">Ethereal Silk</h3>
                                <p className="font-outfit text-gray-500 text-sm leading-relaxed px-2 pb-4">
                                    Sourced from the heart of Banaras, our silk is mulberry-pure, offering a luster that deepens with every generation.
                                </p>
                            </div>

                            {/* Card 2 - Master Weaver Feature */}
                            <div className=" overflow-hidden bg-white rounded-3xl p-4 transition-transform hover:-translate-y-2 duration-500 shadow-sm hover:shadow-2xl">
                                <div className="overflow-hidden rounded-2xl mb-6 aspect-square">
                                    <img src={weaverImg} alt="Master Weaver" className="w-full h-full object-cover hover:scale-110 transition-transform duration-700" />
                                </div>
                                <h3 className="font-playfair text-2xl mb-3 px-2 text-primary-dark">Artisan Empowerment</h3>
                                <p className="font-outfit text-gray-500 text-sm leading-relaxed px-2 pb-4">
                                    Every purchase supports local weaving communities, helping preserve traditional crafts and providing sustainable livelihoods for artisans.
                                </p>

                                <div className="px-2 pt-2">
                                    {/* <AnimatedButton text="Read His Story " /> */}
                                </div>

                            </div>


                            {/* Card 3 - Consistent Style */}
                            <div className="group overflow-hidden bg-white rounded-3xl p-4 transition-transform hover:-translate-y-2 duration-500 shadow-sm hover:shadow-2xl">
                                <div className="overflow-hidden rounded-2xl mb-6 aspect-square">
                                    <img src={sustainableImg} alt="Sustainable Heritage" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                </div>
                                <h3 className="font-playfair text-2xl mb-3 px-2 text-primary-dark">Sustainable Heritage</h3>
                                <p className="font-outfit text-gray-500 text-sm leading-relaxed px-2 pb-4">
                                    We use vegetable dyes and traditional methods that respect both the artisan and the Earth.
                                </p>
                            </div>
                        </div>
                    </div>
                </PageContainer>
            </section>

            {/* --- VALUES --- */}


            <section className="py-24 bg-gradient-to-b from-white via-stone-50 to-white">
                <PageContainer>

                    <div className="text-center">

                        {/* Tag */}
                        <div className="inline-block px-6 py-2 border border-stone-200 rounded-full mb-6">
                            <span className="font-outfit text-[10px] uppercase tracking-[0.5em] text-stone-400">
                                Our Core Principles
                            </span>
                        </div>

                        {/* Heading */}
                        <h2 className="font-playfair text-primary-light  text-4xl md:text-6xl mb-6">
                            Crafting Sarees with Purpose
                        </h2>

                        <p className="mt-4 max-w-2xl mx-auto text-gray-500 font-outfit">
                            Every saree we create reflects our dedication to tradition,
                            craftsmanship, and timeless elegance.
                        </p>

                        {/* Cards */}
                        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 mt-16">

                            {[
                                {
                                    title: "Authenticity",
                                    desc: "Every thread is verified for quality and pure silk certification.",
                                    icon: <FaCertificate />,
                                },
                                {
                                    title: "Heritage",
                                    desc: "Preserving ancient weaving techniques for the next generation.",
                                    icon: <FaLandmark />,
                                },
                                {
                                    title: "Ethical",
                                    desc: "Ensuring fair wages and safe working conditions for all artisans.",
                                    icon: <FaHandsHelping />,
                                },
                                {
                                    title: "Quality",
                                    desc: "Rigorous detail checks before any piece reaches your wardrobe.",
                                    icon: <FaGem />,
                                },
                            ].map((v, i) => (
                                <div
                                    key={i}
                                    className="relative bg-white/80 backdrop-blur-md border border-stone-100 rounded-3xl p-8 shadow-sm hover:shadow-2xl transition duration-500 group overflow-hidden"
                                >

                                    {/* Glow Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition"></div>

                                    {/* Icon */}
                                    <div className="relative w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-2xl mb-6 group-hover:scale-110 transition">
                                        {v.icon}
                                    </div>

                                    {/* Title */}
                                    <h3 className="font-playfair text-xl font-semibold text-primary-dark">
                                        {v.title}
                                    </h3>

                                    {/* Description */}
                                    <p className="font-outfit text-sm text-gray-500 mt-3 leading-relaxed">
                                        {v.desc}
                                    </p>

                                    {/* Bottom Accent Line */}
                                    <div className="mt-6 w-10 h-[2px] bg-primary mx-auto group-hover:w-16 transition-all"></div>

                                </div>
                            ))}

                        </div>
                    </div>

                </PageContainer>
            </section>

        </div>
    );
}
