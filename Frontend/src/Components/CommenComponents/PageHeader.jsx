import React from "react";
import { Link } from "react-router-dom";
import defaultBg from "/assets/purpleph.jpg";

const PageHeader = ({ title, background }) => {

  const bgImage = background || defaultBg;

  return (
    <div
      className="relative w-full h-[180px] sm:h-[200px] md:h-[210px] lg:h-[220px] flex items-center justify-center text-white"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        // backgroundRepeat: "no-repeat"
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0"></div>

      {/* Content */}
      <div className="relative text-center px-4">

        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-3">
          {title}
        </h1>

        {/* Breadcrumb */}
        <div className="text-xs sm:text-sm md:text-base flex justify-center items-center gap-2">

          <Link
            to="/"
            className=" hover:text-white/80 transition"
          >
            Home
          </Link>

          <span>/</span>

          <span className="text-gray-200">{title}</span>

        </div>

      </div>
    </div>
  );
};

export default PageHeader;