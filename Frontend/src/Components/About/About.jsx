import React from "react";
import Heading from "../Heading";
import AnimatedButton from "../AnimatedButton";
import PageContainer from "../CommenComponents/PageContainer";
import { Link } from "react-router-dom";

export default function About() {
  return (
    <section className="w-full bg-white py-15 px-6 md:px-12">
      <PageContainer>
        <Heading title="About Us" />
        <div className="mt-5 grid md:grid-cols-2 gap-16 items-center">
          {/* Image */}
          <div className="relative group">
            <img
              src="/ChatGPT Image Mar 6, 2026, 05_28_53 PM.png"
              className="rounded-2xl shadow-xl w-full object-cover"
              alt="About Sarees"
            />

            {/* Decorative Border */}
            <div className="absolute -bottom-6 -left-6 w-24 h-24 border-4 border-primary-light rounded-xl"></div>
          </div>

          {/* Content */}
          <div>
            <span className="text-sm uppercase tracking-widest text-primary font-semibold">
              About Our Brand
            </span>

            <h2 className="text-4xl md:text-5xl font-bold text-primary-light mt-3 mb-6 leading-tight">
              Timeless Saree Elegance
            </h2>

            <p className="text-gray-600 text-lg leading-relaxed mb-8 max-w-xl">
              Our saree collections celebrate the rich heritage of Indian
              craftsmanship. Each piece is designed with luxurious fabrics,
              intricate patterns, and timeless elegance to make every occasion
              special.
            </p>

            <Link to="/about">
              <AnimatedButton text="Learn More" />
            </Link>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}
