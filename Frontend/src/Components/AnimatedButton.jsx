import React from "react";
import { IoArrowForward } from "react-icons/io5";

const AnimatedButton = ({ text }) => {
  return (
    <button className="text-primary-light hover:text-white border-2 border-primary-light px-8 py-2 rounded-2xl font-semibold flex items-center gap-2 cursor-pointer group overflow-hidden relative">
      <span className="relative z-10 flex items-center gap-2">
        {text}
        <span className="transition-transform duration-300 group-hover:translate-x-2 flex items-center">
          <IoArrowForward className="text-lg" />
        </span>
      </span>

      <span className="absolute inset-0 bg-primary-light transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500"></span>
    </button>
  );
};

export default AnimatedButton;
