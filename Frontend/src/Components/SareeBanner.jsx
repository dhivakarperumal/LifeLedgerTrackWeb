import React from "react";
import AnimatedButton from "./AnimatedButton";
import PageContainer from "./CommenComponents/PageContainer";
import { Link } from "react-router-dom";

export default function SareeBanner() {
  const sareeCategories = [
    {
      id: 1,
      name: "Silk Sarees",
      image: "/SareeBanner/subh_(147).jpg",
    },
    {
      id: 2,
      name: "Wedding Sarees",
      image: "/SareeBanner/subh_(180).jpg",
    },
    {
      id: 3,
      name: "Designer Sarees",
      image: "/SareeBanner/subh_(462).jpg",
    },
    {
      id: 4,
      name: "Party Wear",
      image: "/SareeBanner/subh_(569).jpg",
    },
  ];

  return (
    <section className="w-full py-15">
      <PageContainer>
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          {/* LEFT IMAGE GRID */}
          <div className="grid grid-cols-2 gap-6">
            {sareeCategories.map((item) => (
              <div
                key={item.id}
                className="relative group overflow-hidden rounded-2xl shadow-lg"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-50 md:h-60 object-top object-cover transition duration-500 group-hover:scale-110"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent"></div>

                <span className="absolute bottom-4 left-4 text-white text-lg font-semibold tracking-wide">
                  {item.name}
                </span>
              </div>
            ))}
          </div>

          {/* RIGHT CONTENT */}
          <div className="text-center lg:text-left">
            <p className="text-primary font-semibold tracking-widest uppercase">
              Premium Collection
            </p>

            <h2 className="mt-3 text-4xl md:text-5xl font-bold text-primary-light leading-tight">
              Discover Elegant <br /> Saree Styles
            </h2>

            <p className="mt-6 text-gray-600 text-lg max-w-lg">
              Explore our exclusive saree collections crafted with tradition,
              luxury fabrics, and timeless elegance designed for every special
              moment.
            </p>

            {/* BUTTON */}
            <div className="mt-8">
              <Link to="/shop">
                <AnimatedButton text="View Collections" />
              </Link>
            </div>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}
