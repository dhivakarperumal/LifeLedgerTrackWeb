import React, { useEffect, useState } from "react";
import api from "../../api";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";

import "swiper/css";

import ProductCard from "./ProductsCard";

const RelatedProducts = ({ category, currentProductId }) => {
  const [products, setProducts] = useState([]);

  const fetchRelatedProducts = async () => {
    try {
      const res = await api.get("/products");

      const filtered = res.data.filter(
        (p) =>
          p.category?.toLowerCase() === category?.toLowerCase() &&
          p.id !== currentProductId,
      );

      setProducts(filtered);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (category) {
      fetchRelatedProducts();
    }
  }, [category]);

  if (!products.length) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 mt-16">
      <h2 className="text-2xl font-bold mb-6 text-primary-dark">
        Related Products
      </h2>

      <Swiper
        modules={[Autoplay]}
        spaceBetween={20}
        loop={true}
        autoplay={{ delay: 3500 }}
        breakpoints={{
          320: { slidesPerView: 1 },
          480: { slidesPerView: 2 },
          640: { slidesPerView: 2.5 },
          768: { slidesPerView: 3 },
          1024: { slidesPerView: 4 },
        }}
      >
        {products.map((product) => (
          <SwiperSlide key={product.id} className=" mb-10">
            <ProductCard product={product} />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default RelatedProducts;
