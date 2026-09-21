import React from "react";

const Heading = ({ title, subtitle, align = "left" }) => {
  return (
    <div className={`w-full mb-10 text-${align}`}>
      <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary via-primary-light to-primary-dark bg-clip-text text-transparent">
        {title}
      </h2>

      {subtitle && (
        <p className="mt-3 text-gray-500 text-sm md:text-base">{subtitle}</p>
      )}

      <div
        className={`w-24 h-1 bg-gradient-to-r from-primary via-primary-light to-primary-dark mt-3 rounded-full ${
          align === "center" ? "mx-auto" : ""
        }`}
      />
    </div>
  );
};

export default Heading;
