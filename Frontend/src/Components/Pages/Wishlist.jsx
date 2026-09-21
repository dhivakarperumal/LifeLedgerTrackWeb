import React, { useContext, useState } from "react";
import { FiHeart, FiTrash2, FiEye, FiShoppingCart, FiGrid, FiList, FiSearch } from "react-icons/fi";
import { FaStar } from "react-icons/fa";
import { StoreContext } from "../../PrivateRouter/StoreContext";
import { useNavigate } from "react-router-dom";
import PageHeader from "../CommenComponents/PageHeader";
import PageContainer from "../CommenComponents/PageContainer";

const resolveImageUrl = (image) => {
  if (!image || typeof image !== "string") return null;
  if (/^(https?:|data:|blob:)/i.test(image)) return image;

  const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
  const cleanPath = image.replace(/\\/g, "/");
  return `${backendUrl}${cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`}`;
};

const getFirstImage = (images) => {
  if (!images) return null;

  try {
    const parsed = typeof images === "string" ? JSON.parse(images) : images;
    const image = Array.isArray(parsed) ? parsed[0] : parsed;
    return resolveImageUrl(image);
  } catch {
    return resolveImageUrl(images);
  }
};

export default function WishList() {
  const { wishlist, toggleWishlist, addToCart } = useContext(StoreContext);
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState("card");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredWishlist = wishlist.filter((item) =>
    item.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Page Title */}
      <PageHeader title="My Wishlist" />

      <div className=" bg-gray-50 py-16">
        {/* Wishlist Grid */}
        <PageContainer>
          <div className="">
            {wishlist.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                {/* Search Bar */}
                <div className="relative w-full max-w-sm">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search wishlist..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm transition"
                  />
                </div>

                {/* View Toggles */}
                <div className="flex gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => setViewMode("card")}
                    className={`p-2.5 rounded-lg transition shadow-sm cursor-pointer ${
                      viewMode === "card"
                        ? "bg-primary text-white"
                        : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <FiGrid size={20} />
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={`p-2.5 rounded-lg transition shadow-sm cursor-pointer ${
                      viewMode === "table"
                        ? "bg-primary text-white"
                        : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <FiList size={20} />
                  </button>
                </div>
              </div>
            )}

            {wishlist.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm max-w-xl mx-auto">
                <div className="w-16 h-16 flex items-center justify-center rounded-full bg-primary-light/10 mb-5">
                  <FiHeart className="text-primary-light text-3xl" />
                </div>

                <h2 className="text-xl font-semibold text-gray-800">
                  Your wishlist is empty
                </h2>

                <p className="text-gray-500 mt-2 max-w-sm">
                  Looks like you haven't added any sarees yet. Browse our
                  collections and save your favorites.
                </p>

                <button
                  onClick={() => navigate("/shop")}
                  className="mt-6 px-6 py-2.5 bg-primary-dark text-white rounded-lg font-medium hover:bg-primary-light transition cursor-pointer"
                >
                  Explore Products
                </button>
              </div>
            ) : filteredWishlist.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm max-w-xl mx-auto">
                <FiSearch className="text-gray-300 text-4xl mb-4" />
                <h3 className="text-lg font-semibold text-gray-800">No items found</h3>
                <p className="text-sm text-gray-500 mt-1">We couldn't find any wishlist items matching "{searchQuery}"</p>
              </div>
            ) : viewMode === "card" ? (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                      {filteredWishlist.map((item) => {
                  const image = getFirstImage(item?.variants?.[0]?.images) || getFirstImage(item?.image);
                  const fallbackImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(item?.name || "Product")}&background=f3f4f6&color=240046`;

                  const price = item?.variants?.[0]?.price || item?.price;
                  const mrp = item?.variants?.[0]?.mrp || item?.mrp;
                  const discount = mrp ? Math.round(((mrp - price) / mrp) * 100) : 0;

                  return (
                    <div
                      key={item.id ?? item._id ?? item.product_id}
                      onClick={() => navigate(`/products/${item.product_id ?? item.productId ?? item.id}`)}
                      className="bg-white rounded-2xl shadow-md hover:shadow-xl transition duration-300 overflow-hidden border border-gray-100 group flex flex-col cursor-pointer"
                    >
                      {/* Image */}
                      <div className="relative h-64 overflow-hidden">
                        <img
                          src={image || fallbackImage}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = fallbackImage;
                          }}
                        />

                        {/* Popular Badge */}
                        <span className="absolute bottom-3 left-3 bg-pink-100 text-pink-600 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
                          Popular
                        </span>

                   
                      </div>

                      {/* Content */}
                      <div className="p-4 flex flex-col flex-1">
                        <h3 className="font-bold text-gray-900 line-clamp-1">
                          {item.name}
                        </h3>

                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                          {item.subtitle || "Rich Zari Weave | Traditional Look"}
                        </p>

                        {/* Rating */}
                        <div className="flex items-center gap-1 mt-2">
                           <div className="flex text-yellow-400 text-[10px]">
                             <FaStar /><FaStar /><FaStar /><FaStar /><FaStar />
                           </div>
                           <span className="text-[11px] font-semibold text-gray-800 ml-1">(4.8)</span>
                           <span className="text-[10px] text-gray-500">124 reviews</span>
                        </div>

                        {/* Price */}
                        <div className="flex items-center gap-2 mt-3">
                          <span className="text-xl font-bold text-gray-900">
                            ₹{price}
                          </span>

                          {mrp && (
                            <span className="text-xs text-gray-500 line-through font-medium">
                              ₹{mrp}
                            </span>
                          )}

                          {discount > 0 && (
                            <span className="bg-pink-100 text-pink-600 text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto">
                              {discount}% OFF
                            </span>
                          )}
                        </div>

                        {/* Buttons */}
                        <div className="flex flex-col gap-2 mt-4">
                         
                          
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleWishlist(item);
                            }}
                            className="w-full flex items-center justify-center gap-2 border-2 border-primary text-primary py-2 rounded-xl text-sm font-semibold hover:bg-primary/5 transition cursor-pointer"
                          >
                            <FiTrash2 className="text-lg" /> Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left whitespace-nowrap">
                    <thead className="bg-primary-dark border-b border-primary-light">
                      <tr>
                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-white/80">S No</th>
                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-white/80">Product</th>
                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-white/80">Price</th>
                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-white/80 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                            {filteredWishlist.map((item) => {
                        const image = getFirstImage(item?.variants?.[0]?.images) || getFirstImage(item?.image);
                        const fallbackImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(item?.name || "Product")}&background=f3f4f6&color=240046`;
                        const price = item?.variants?.[0]?.price || item?.price;
                        const mrp = item?.variants?.[0]?.mrp || item?.mrp;
                        const discount = mrp ? Math.round(((mrp - price) / mrp) * 100) : 0;

                        return (
                          <tr
                            key={item.id ?? item._id ?? item.product_id}
                            onClick={() => navigate(`/products/${item.product_id ?? item.productId ?? item.id}`)}
                            className="hover:bg-gray-50/50 transition cursor-pointer"
                          >
                            <td className="px-6 py-4 text-sm font-semibold text-gray-500">{filteredWishlist.indexOf(item) + 1}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-100 shrink-0 group">
                                  <img
                                    src={image || fallbackImage}
                                    alt={item.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.src = fallbackImage;
                                    }}
                                  />
                                </div>
                                <div>
                                  <h3 className="font-bold text-gray-900">{item.name}</h3>
                                  <p className="text-xs text-gray-500 mt-0.5">{item.subtitle || "Rich Zari Weave"}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-900 text-lg">₹{price}</span>
                                  {discount > 0 && (
                                    <span className="bg-pink-100 text-pink-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                      {discount}% OFF
                                    </span>
                                  )}
                                </div>
                                {mrp && (
                                  <span className="text-sm text-gray-400 line-through">₹{mrp}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex justify-center items-center gap-3">
                              
                                <button
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    toggleWishlist(item);
                                  }}
                                  className="p-2 text-gray-400 hover:text-red-500 transition cursor-pointer bg-white border border-gray-200 rounded-lg shadow-sm hover:border-red-500 hover:bg-red-50"
                                >
                                  <FiTrash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </PageContainer>
      </div>
    </>
  );
}
