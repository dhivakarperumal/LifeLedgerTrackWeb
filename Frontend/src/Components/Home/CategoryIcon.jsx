import React, { useEffect, useState } from "react";
import api from "../../api";
import PageContainer from "../CommenComponents/PageContainer";
import { Link } from "react-router-dom";
import Heading from "../Heading";
import { useContext } from "react";
import { StoreContext } from "../../PrivateRouter/StoreContext";

const CategoryIcon = () => {
  const { categoriesCache, setCategoriesCache } = useContext(StoreContext);
  const [categories, setCategories] = useState(categoriesCache || []);
  const [loading, setLoading] = useState(!categoriesCache || categoriesCache.length === 0);

  const fetchCategories = async () => {
    try {
      if (categoriesCache && categoriesCache.length > 0) {
        setCategories(categoriesCache);
        setLoading(false);
        return;
      }

      const res = await api.get("/categories");
      const data = Array.isArray(res.data) ? res.data : [];
      setCategories(data);
      setCategoriesCache(data);
    } catch (error) {
      console.error(error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [categoriesCache, setCategoriesCache]);

  return (
    <section className="py-12 bg-white overflow-hidden">
      <PageContainer>
        {/* Section Heading */}

        <Heading title="Shop By Category" align="center" />
        {/* Categories container */}
        {loading ? (
          <div className="flex flex-wrap justify-center gap-8 md:gap-12">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex flex-col items-center w-28 md:w-36 animate-pulse">
                <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-gray-100" />
                <div className="mt-5 w-24 h-8 bg-gray-100 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-8 md:gap-12">
            {Array.isArray(categories) && categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/category/${cat.name.toLowerCase()}`}
                className="group cursor-pointer flex flex-col items-center w-28 md:w-36"
              >
                {/* Animated Gradient Border Ring */}
                <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-full p-[3px] bg-gradient-to-tr from-gray-200 via-gray-100 to-gray-200 group-hover:from-primary-dark group-hover:via-primary group-hover:to-primary-light group-hover:shadow-[0_0_25px_rgba(153,27,27,0.4)] transition-all duration-500 ease-out">
                  {/* Inner Image Container */}
                  <div className="w-full h-full bg-white rounded-full p-1 relative overflow-hidden">
                    <img
                      src={
                        cat.images?.[0] ||
                        "https://images.unsplash.com/photo-1610030469983-98e550d6193c"
                      }
                      alt={cat.name}
                      className="w-full h-full object-cover object-top rounded-full group-hover:scale-110 transition-transform duration-700 ease-in-out"
                    />
                    {/* Color Tint Overlay on Hover */}
                    <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full" />
                  </div>
                </div>

                {/* Category Name Pill */}
                <div className="mt-5 px-5 py-2 rounded-full bg-gray-50 border border-gray-100 group-hover:border-primary/30 group-hover:bg-primary/5 group-hover:shadow-md transition-all duration-300">
                  <p className="text-sm md:text-base font-bold text-gray-700 group-hover:text-primary transition-colors duration-300 text-center">
                    {cat.name}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </PageContainer>
    </section>
  );
};

export default CategoryIcon;
