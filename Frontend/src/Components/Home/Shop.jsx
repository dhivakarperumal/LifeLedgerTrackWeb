import React, { useContext, useEffect, useState } from "react";
import api from "../../api";
import ProductCard from "../Products/ProductsCard";
import PageHeader from "../CommenComponents/PageHeader";
import { FiFilter, FiX, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { BsGrid3X3Gap, BsGridFill, BsGrid1X2, BsGrid3X2 } from "react-icons/bs";
import { StoreContext } from "../../PrivateRouter/StoreContext";

const AGE_GROUPS = [
  "Infant (0–1)",
  "Toddler (1–3)",
  "Kids (3–5)",
  "Kids (5–7)",
  "Kids (7–10)",
  "Teen (10–15)",
  "Teen (15–20)",
  "Adult (20+)",
];

const Shop = ({ defaultCategory = "" }) => {
  const { productsCache, setProductsCache, lastFetchTime, setLastFetchTime } =
    useContext(StoreContext);
  const [products, setProducts] = useState(
    Array.isArray(productsCache) ? productsCache : [],
  );
  const [filteredProducts, setFilteredProducts] = useState(
    Array.isArray(productsCache) ? productsCache : [],
  );

  const [loading, setLoading] = useState(
    !productsCache || productsCache.length === 0,
  );

  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(
    defaultCategory ? true : false,
  );

  const [selectedCategory, setSelectedCategory] = useState(defaultCategory);
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [selectedAge, setSelectedAge] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [priceRange, setPriceRange] = useState(10000);
  const [rating, setRating] = useState(0);
  const [offerFilter, setOfferFilter] = useState(0);
  const [sortOption, setSortOption] = useState("");

  const [gridView, setGridView] = useState(5);

  const [currentPage, setCurrentPage] = useState(1);

  const fetchProducts = async () => {
    try {
      const res = await api.get("/products");
      setProducts(res.data);
      setFilteredProducts(res.data);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  /* ---------------- FILTER LOGIC ---------------- */

  useEffect(() => {
    let updated = [...products];

    if (search) {
      updated = updated.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()),
      );
    }

    if (selectedCategory) {
      updated = updated.filter(
        (p) => p.category?.toLowerCase() === selectedCategory.toLowerCase(),
      );
    }

    if (selectedSubCategory) {
      updated = updated.filter((p) => p.subcategory === selectedSubCategory);
    }

    if (selectedAge) {
      updated = updated.filter((p) => p.age === selectedAge);
    }

    if (selectedColor) {
      updated = updated.filter((p) =>
        p.variants?.some((v) => v.colorName === selectedColor),
      );
    }

    if (selectedSize) {
      updated = updated.filter((p) =>
        p.variants?.some((v) => v.selectedSizes?.includes(selectedSize)),
      );
    }

    updated = updated.filter((p) => p.offer_price <= priceRange);

    if (rating) {
      updated = updated.filter((p) => p.rating >= rating);
    }

    if (offerFilter) {
      updated = updated.filter((p) => p.offer >= offerFilter);
    }

    /* -------- SORTING -------- */

    if (sortOption === "az") {
      updated.sort((a, b) => a.name.localeCompare(b.name));
    }

    if (sortOption === "za") {
      updated.sort((a, b) => b.name.localeCompare(a.name));
    }

    if (sortOption === "priceLowHigh") {
      updated.sort((a, b) => a.offer_price - b.offer_price);
    }

    if (sortOption === "priceHighLow") {
      updated.sort((a, b) => b.offer_price - a.offer_price);
    }

    if (sortOption === "offerHighLow") {
      updated.sort((a, b) => b.offer - a.offer);
    }

    if (sortOption === "offerLowHigh") {
      updated.sort((a, b) => a.offer - b.offer);
    }

    setFilteredProducts([...updated]);
    setCurrentPage(1);
  }, [
    search,
    selectedCategory,
    selectedSubCategory,
    selectedAge,
    selectedColor,
    selectedSize,
    priceRange,
    rating,
    offerFilter,
    sortOption,
    products,
  ]);

  useEffect(() => {
    if (defaultCategory) {
      setSelectedCategory(defaultCategory);
    }
  }, [defaultCategory]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setGridView(4); // reset to default desktop grid
      }
    };

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* -------- UNIQUE FILTER DATA -------- */

  const categories = [...new Set(products.map((p) => p.category))];

  const subCategories = [
    ...new Set(
      products
        .filter((p) => p.category === selectedCategory)
        .map((p) => p.subcategory),
    ),
  ];

  const colors = selectedCategory
    ? [
        ...new Set(
          products
            .filter((p) => p.category === selectedCategory)
            .flatMap((p) => p.variants?.map((v) => v.colorName)),
        ),
      ]
    : [];

  const sizes = selectedCategory
    ? [
        ...new Set(
          products
            .filter((p) => p.category === selectedCategory)
            .flatMap((p) => p.variants?.flatMap((v) => v.selectedSizes || [])),
        ),
      ]
    : [];

  const clearFilters = () => {
    setSelectedCategory("");
    setSelectedSubCategory("");
    setSelectedAge("");
    setSelectedColor("");
    setSelectedSize("");
    setPriceRange(10000);
    setRating(0);
    setOfferFilter(0);
  };

  const productsPerPage =
    gridView === 5
      ? 15
      : gridView === 4
        ? 12
        : gridView === 3
          ? 9
          : gridView === 2
            ? 6
            : 3;

  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;

  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  if (loading) {
    return (
      <>
        <PageHeader title={defaultCategory ? defaultCategory : "Shop"} />

        {/* PRODUCT SKELETON GRID */}
        <div className="px-4 md:px-10 py-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, index) => (
            <div
              key={index}
              className="bg-gray-200 animate-pulse rounded-xl h-[300px]"
            />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Shop" />

      {/* SEARCH BAR */}

      <div className="px-4 md:px-10 mt-6">
        <div className="flex flex-col md:flex-row md:flex-wrap md:items-center md:justify-between gap-3 bg-white border border-gray-200 rounded-2xl shadow-sm px-4 py-3">
          {/* FILTER BUTTON */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl transition font-medium text-sm cursor-pointer w-fit"
          >
            {showFilters ? <FiX size={18} /> : <FiFilter size={18} />}
            {showFilters ? "Close" : "Filters"}
          </button>

          {/* SEARCH INPUT */}
          <div className="flex items-center gap-3 flex-1 w-full">
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>

            <input
              type="text"
              placeholder="Search sarees, colors, designs..."
              className="w-full outline-none text-sm text-gray-700 placeholder-gray-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* SORT DROPDOWN */}
          <div className="flex flex-wrap items-center gap-3 md:border-l md:pl-4 pt-2 md:pt-0">
            {/* SORT */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-sm text-gray-600 font-medium">Sort By</span>

              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="text-sm border rounded-lg px-2 py-1 outline-none cursor-pointer"
              >
                <option value="">Default</option>
                <option value="az">A - Z</option>
                <option value="za">Z - A</option>
                <option value="priceLowHigh">Price Low → High</option>
                <option value="priceHighLow">Price High → Low</option>
                <option value="offerHighLow">Offer High → Low</option>
                <option value="offerLowHigh">Offer Low → High</option>
              </select>
            </div>

            {/* GRID SELECTOR */}
            <div className="flex items-center gap-2">
              {/* Desktop Grid Icons */}
              <button
                onClick={() => setGridView(5)}
                className={`hidden lg:flex p-2 border rounded ${
                  gridView === 5 ? "bg-primary text-white" : "border-gray-300"
                }`}
              >
                <BsGrid3X3Gap size={16} />
              </button>

              <button
                onClick={() => setGridView(4)}
                className={`hidden lg:flex p-2 border rounded ${
                  gridView === 4 ? "bg-primary text-white" : "border-gray-300"
                }`}
              >
                <BsGridFill size={16} />
              </button>

              <button
                onClick={() => setGridView(3)}
                className={`hidden lg:flex p-2 border rounded ${
                  gridView === 3 ? "bg-primary text-white" : "border-gray-300"
                }`}
              >
                <BsGrid3X2 size={16} />
              </button>

              {/* Mobile Grid Icons */}
              <button
                onClick={() => setGridView(2)}
                className={`lg:hidden flex p-2 border rounded ${
                  gridView === 2 ? "bg-primary text-white" : "border-gray-300"
                }`}
              >
                <BsGrid1X2 size={16} />
              </button>

              <button
                onClick={() => setGridView(1)}
                className={`lg:hidden flex p-2 border rounded ${
                  gridView === 1 ? "bg-primary text-white" : "border-gray-300"
                }`}
              >
                <BsGridFill size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-start items-center mt-6 w-full">
        {/* FILTER SIDEBAR */}

        {showFilters && (
          <div className="w-full lg:w-72 bg-white border border-gray-200 rounded-2xl shadow-md p-6 space-y-8 lg:ml-10 lg:sticky lg:top-24 h-fit">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-xl text-gray-800">Filters</h3>

              <button
                onClick={clearFilters}
                className="text-sm text-red-500 border border-red-500 px-3 py-1 rounded-2xl cursor-pointer font-medium"
              >
                Clear
              </button>
            </div>

            {/* PRICE */}

            <div>
              <h4 className="font-semibold mb-3 text-gray-800 border-b border-gray-300 pb-1">
                Price
              </h4>

              <input
                type="range"
                min="0"
                max="10000"
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="w-full"
              />

              <p className="text-sm mt-1">Up to ₹{priceRange}</p>
            </div>

              {/* CATEGORY */}

            <div>
              <h4 className="font-semibold mb-3 text-gray-800 border-b border-gray-300 pb-1">
                Category
              </h4>

              <label className="flex items-center gap-3 mb-2 cursor-pointer">
                <input
                  type="radio"
                  name="category"
                  className="accent-primary"
                  checked={selectedCategory === ""}
                  onChange={() => setSelectedCategory("")}
                />
                <span className="text-sm text-gray-700">All</span>
              </label>

              {categories.map((cat) => (
                <label
                  key={cat}
                  className="flex items-center gap-3 mb-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="category"
                    className="accent-primary"
                    checked={selectedCategory === cat}
                    onChange={() => setSelectedCategory(cat)}
                  />

                  <span className="text-sm text-gray-700">{cat}</span>
                </label>
              ))}
            </div>

            {/* SUBCATEGORY */}

            {selectedCategory && (
              <div>
                <h4 className="font-semibold mb-3 text-gray-800 border-b border-gray-300 pb-1">
                  Age Group
                </h4>

                <label className="flex items-center gap-3 mb-2 cursor-pointer">
                  <input
                    type="radio"
                    name="age-group"
                    className="accent-primary"
                    checked={selectedAge === ""}
                    onChange={() => setSelectedAge("")}
                  />
                  <span className="text-sm text-gray-700">All</span>
                </label>

                {AGE_GROUPS.map((ageGroup) => (
                  <label
                    key={ageGroup}
                    className="flex items-center gap-3 mb-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="age-group"
                      className="accent-primary"
                      checked={selectedAge === ageGroup}
                      onChange={() => setSelectedAge(ageGroup)}
                    />
                    <span className="text-sm text-gray-700">{ageGroup}</span>
                  </label>
                ))}
              </div>
            )}

            {selectedCategory && (
              <div>
                <h4 className="font-semibold mb-3 text-gray-800 border-b border-gray-300 pb-1">
                  SubCategory
                </h4>

                {subCategories.map((sub) => (
                  <label
                    key={sub}
                    className="flex items-center gap-3 mb-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="subcategory"
                      className="accent-primary"
                      checked={selectedSubCategory === sub}
                      onChange={() => setSelectedSubCategory(sub)}
                    />

                    <span className="text-sm text-gray-700">{sub}</span>
                  </label>
                ))}
              </div>
            )}

            {/* COLORS */}

            {selectedCategory && (
              <div>
                <h4 className="font-semibold mb-3 text-gray-800 border-b border-gray-300 pb-1">
                  Colors
                </h4>

                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`px-3 py-1 text-xs font-medium border rounded-full transition ${
                        selectedColor === color
                          ? "bg-primary text-white border-primary"
                          : "border-gray-300 hover:border-primary"
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* SIZES */}

            {selectedCategory && (
              <div>
                <h4 className="font-semibold mb-3 text-gray-800 border-b border-gray-300 pb-1">
                  Sizes
                </h4>

                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-3 py-1 text-sm font-semibold border rounded-lg transition ${
                        selectedSize === size
                          ? "bg-primary text-white border-primary"
                          : "border-gray-300 hover:border-primary"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* RATING */}

            {/* <div>
              <h4 className="font-semibold mb-3 text-gray-800 border-b border-gray-300 pb-1">
                Rating
              </h4>

              {[4, 3, 2, 1].map((r) => (
                <label
                  key={r}
                  className="flex items-center gap-3 mb-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="rating"
                    className="accent-primary"
                    checked={rating === r}
                    onChange={() => setRating(r)}
                  />

                  <span className="text-sm text-gray-700">{r}+ Stars</span>
                </label>
              ))}
            </div> */}

            {/* OFFERS */}

            <div>
              <h4 className="font-semibold mb-3 text-gray-800 border-b border-gray-300 pb-1">
                Offers
              </h4>

              {[10, 20, 30, 40, 50].map((offer) => (
                <label
                  key={offer}
                  className="flex items-center gap-3 mb-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="offer"
                    className="accent-primary"
                    checked={offerFilter === offer}
                    onChange={() => setOfferFilter(offer)}
                  />

                  <span className="text-sm text-gray-700">
                    {offer}% and above
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* PRODUCTS GRID */}

        <div className="flex-1">
          <div
            className={`px-4 md:px-10 py-6 grid gap-6 
  ${
    gridView === 5
      ? showFilters
        ? "lg:grid-cols-4"
        : "lg:grid-cols-5"
      : gridView === 4
        ? "lg:grid-cols-4"
        : gridView === 3
          ? "lg:grid-cols-3"
          : gridView === 2
            ? "grid-cols-2"
            : "grid-cols-1"
  }`}
          >
            {currentProducts.length > 0 ? (
              currentProducts.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))
            ) : (
              <p>No products found</p>
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-10 flex-wrap">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-4 py-2 border rounded-lg bg-white hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
              >
                <FiChevronLeft size={18} />
              </button>

              {[...Array(totalPages)].map((_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-4 py-2 rounded-lg border transition cursor-pointer ${
                      currentPage === page
                        ? "bg-primary text-white border-primary shadow-md"
                        : "bg-white hover:bg-gray-100"
                    }`}
                  >
                    {page}
                  </button>
                );
              })}

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-4 py-2 border rounded-lg bg-white hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
              >
                <FiChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Shop;
