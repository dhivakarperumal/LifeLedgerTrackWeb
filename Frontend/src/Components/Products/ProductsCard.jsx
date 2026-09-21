import React, { useState, useContext } from "react";
import { StoreContext } from "../../PrivateRouter/StoreContext";
import { FiPlus, FiHeart, FiShare2 } from "react-icons/fi";
import { BsQrCode } from "react-icons/bs";
import { useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import QuickViewModal from "./QuickModel";
import { FaStar } from "react-icons/fa";
import ReactDOM from "react-dom";
import { getProductStock } from "../../utils/stock";

const ProductCard = ({ product, priority = false }) => {
  const { addToCart, toggleWishlist, wishlist } = useContext(StoreContext);
  const navigate = useNavigate();
  const [showQR, setShowQR] = useState(false);
  const [quickView, setQuickView] = useState(false);

  const isInWishlist = wishlist.some(
    (p) => p.product_id === product.id || p.id === product.id,
  );

  if (!product) return null;

  const isOutOfStock = getProductStock(product) < 1;

  const handleClick = () => {
    navigate(`/products/${product.id}`);
  };

  const productUrl = `${window.location.origin}/products/${product.id}`;

  const handleShare = async (e) => {
    e.stopPropagation();

    try {
      if (navigator.share) {
        await navigator.share({
          title: product?.name,
          text: "Check out this product!",
          url: productUrl,
        });
      } else {
        await navigator.clipboard.writeText(productUrl);
        alert("Product link copied!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to resolve image URLs
  const resolveImage = (img) => {
    if (!img || typeof img !== 'string') return null;
    if (img.startsWith('http') || img.startsWith('data:')) return img;
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    const cleanPath = img.replace(/\\/g, '/');
    const finalPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
    return `${backendUrl}${finalPath}`;
  };

  const rawImages =
    product?.variants &&
      product.variants.length > 0 &&
      product.variants[0]?.images &&
      product.variants[0].images.length > 0
      ? (typeof product.variants[0].images === 'string' ? JSON.parse(product.variants[0].images) : product.variants[0].images)
      : product?.images && product.images.length > 0
        ? (typeof product.images === 'string' ? JSON.parse(product.images) : product.images)
        : [
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            product?.name || "Product",
          )}&background=random`,
        ];

  const images = (Array.isArray(rawImages) ? rawImages : [rawImages])
    .map(img => resolveImage(img))
    .filter(Boolean);

  if (images.length === 0) {
    images.push(`https://ui-avatars.com/api/?name=${encodeURIComponent(product?.name || "Product")}&background=random`);
  }

  return (
    <>
      <div
        onClick={handleClick}
        className="relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition duration-300 group cursor-pointer"
      >
        {/* Icons */}
        <div
          className="absolute top-3 right-3 flex flex-col gap-4 z-20 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-700 translate-x-4 group-hover:translate-x-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            onClick={() => toggleWishlist(product)}
            className={`bg-primary rounded-full p-2 shadow-sm transition duration-300 ${isInWishlist
                ? "text-red-500 scale-110"
                : "text-white hover:bg-primary-light"
              }`}
          >
            <FiHeart
              className={`text-lg ${isInWishlist ? "fill-current" : ""}`}
            />
          </div>

          {/* <div
            onClick={() => addToCart(product)}
            className="bg-primary rounded-full p-2 shadow hover:bg-primary-light text-white transition duration-300"
          >
            <FiPlus className="text-lg" />
          </div> */}

          <div
            onClick={handleShare}
            className="bg-primary rounded-full p-2 shadow-sm hover:bg-primary-light text-white transition duration-300"
          >
            <FiShare2 className="text-lg text-white" />
          </div>

          <div
            onClick={(e) => {
              e.stopPropagation();
              setShowQR(true);
            }}
            className="bg-primary rounded-full p-2 shadow-sm hover:bg-primary-light text-white transition duration-300"
          >
            <BsQrCode className="text-lg text-white" />
          </div>
        </div>

        {/* Image */}
        <div className="relative h-80 overflow-hidden">
          {/* Default Image */}
          <img
            src={images[0]}
            alt={product?.name}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            className={`absolute w-full h-full object-cover transition-opacity duration-700 ${images[1] ? "group-hover:opacity-0" : "opacity-100"
              }`}
          />

          {/* Hover Image */}
          {images[1] && (
            <img
              src={images[1]}
              alt={product?.name}
              loading="lazy"
              decoding="async"
              className="absolute w-full h-full object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100"
            />
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              setQuickView(true);
            }}
            title="Quick View"
            className="absolute bottom-3 right-3 invisible bg-primary text-white p-2 rounded-full shadow-md hover:bg-primary-light cursor-pointer opacity-0 pointer-events-none transition-all duration-700 translate-y-4 group-hover:visible group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0"
          >
            <FiPlus className="text-lg" />
          </button>

          {product?.offer && (
            <span className="absolute top-3 left-3 bg-primary text-white text-xs px-3 py-1 rounded-full">
              {Math.floor(product.offer)}% OFF
            </span>
          )}

          {isOutOfStock && (
            <span className="absolute bottom-3 left-3 bg-red-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
              Out of Stock
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h2 className="font-semibold text-gray-800 line-clamp-1">
            {product?.name}
          </h2>

          {/* Rating */}
          <div className="flex items-center gap-1 mt-1">
            {[...Array(5)].map((_, i) => (
              <FaStar
                key={i}
                className={`text-xs ${i < Math.round(product?.rating || 0)
                    ? "text-yellow-400"
                    : "text-gray-300"
                  }`}
              />
            ))}
          </div>

          {/* Price */}
          <div className="flex items-center mt-2">
            <div className="flex items-center gap-3">
              <span className="text-primary font-bold text-lg">
                ₹{product?.offer_price || product?.price}
              </span>

              {product?.mrp && (
                <span className="text-gray-400 line-through text-sm">
                  ₹{product?.mrp}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* QR Popup */}
      {showQR &&
        ReactDOM.createPortal(
          <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]"
            onClick={() => setShowQR(false)}
          >
            <div
              className="bg-white p-6 rounded-xl shadow-xl text-center max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-semibold text-lg mb-4">Scan to view product</h3>

              <div className="flex justify-center">
                <QRCodeCanvas value={productUrl} size={200} />
              </div>

              <p className="text-sm text-gray-500 mt-3">{product?.name}</p>

              <button
                onClick={() => setShowQR(false)}
                className="mt-5 cursor-pointer px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light"
              >
                Close
              </button>
            </div>
          </div>,
          document.body
        )}
      {quickView && (
        <QuickViewModal product={product} onClose={() => setQuickView(false)} />
      )}
    </>
  );
};

export default ProductCard;
