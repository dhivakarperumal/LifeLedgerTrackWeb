import React, { useEffect, useState } from "react";
import api from "../../api";
import { StoreContext } from "../../PrivateRouter/StoreContext";
import { useContext } from "react";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";

import "swiper/css";

import ProductCard from "../Products/ProductsCard";
import Heading from "../Heading";
import PageContainer from "../CommenComponents/PageContainer";

const OfferProducts = () => {
  const { productsCache, setProductsCache, lastFetchTime, setLastFetchTime } = useContext(StoreContext);
  const initialProducts = Array.isArray(productsCache) ? productsCache.filter((p) => p.offer && p.offer > 0).sort((a, b) => b.offer - a.offer) : [];
  const [products, setProducts] = useState(initialProducts);

  const fetchOfferProducts = async () => {
    try {
      let data = productsCache;

      if (!data || data.length === 0 || !lastFetchTime || (Date.now() - lastFetchTime > 5 * 60 * 1000)) {
        const res = await api.get("/products");
        data = Array.isArray(res.data) ? res.data : [];
        setProductsCache(data);
        setLastFetchTime(Date.now());
      }

      const sortedProducts = (data || [])
        .filter((p) => p.offer && p.offer > 0) // only products with offers
        .sort((a, b) => b.offer - a.offer); // highest offer first

      setProducts(sortedProducts);
    } catch (error) {
      console.error("Error fetching offer products:", error);
      setProducts([]);
    }
  };

  useEffect(() => {
    fetchOfferProducts();
  }, []);

  if (products.length === 0) {
    return (
      <PageContainer>
        <div className="py-5">
          <Heading title="Best Offers" />
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white rounded-3xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="w-full h-80 bg-gray-100"></div>
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-100 rounded-full w-3/4"></div>
                  <div className="h-3 bg-gray-100 rounded-full w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="py-5">
        {/* Title */}
        <Heading title="Best Offers" />

        {/* Swiper */}
        <Swiper
          modules={[Autoplay]}
          spaceBetween={20}
          loop={true}
          autoplay={{ delay: 3000 }}
          breakpoints={{
            320: { slidesPerView: 1 },
            480: { slidesPerView: 2 },
            640: { slidesPerView: 3 },
            768: { slidesPerView: 4 },
            1024: { slidesPerView: 5 },
          }}
        >
          {Array.isArray(products) && products.map((product) => (
            <SwiperSlide key={product.id} className="flex justify-center pb-10">
              <ProductCard product={product} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </PageContainer>
  );
};

export default OfferProducts;
