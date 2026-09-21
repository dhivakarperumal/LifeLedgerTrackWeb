import React, { useState, useContext, useEffect } from "react";
import { StoreContext } from "../../PrivateRouter/StoreContext";
import { getProductStock } from "../../utils/stock";
import {
  FiHeart,
  FiShoppingCart,
  FiX,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import ReactDOM from "react-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../PrivateRouter/AuthContext";

const resolveImageUrl = (image) => {
  if (!image || typeof image !== "string") return null;
  if (/^(https?:|data:|blob:)/i.test(image)) return image;

  const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
  const cleanPath = image.replace(/\\/g, "/");
  return `${backendUrl}${cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`}`;
};

const parseImages = (images) => {
  if (!images) return [];
  try {
    const parsed = typeof images === "string" ? JSON.parse(images) : images;
    return (Array.isArray(parsed) ? parsed : [parsed]).map(resolveImageUrl).filter(Boolean);
  } catch {
    return [];
  }
};

const getVariantColorName = (variant) =>
  variant?.colorName || variant?.color || "Default Color";

const QuickViewModal = ({ product, onClose }) => {
  const { addToCart, toggleWishlist, wishlist } = useContext(StoreContext);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [selectedVariant, setSelectedVariant] = useState(
    product?.variants?.[0],
  );
  const [selectedImage, setSelectedImage] = useState(
    parseImages(product?.variants?.[0]?.images || product?.images)[0],
  );
  const [selectedSize, setSelectedSize] = useState(
    product?.variants?.[0]?.selectedSizes?.[0],
  );
  const [imgIndex, setImgIndex] = useState(0);

  const [quantity, setQuantity] = useState(1);

  const isInWishlist = wishlist.some(
    (w) => w.product_id === product?.id || w.id === product?.id,
  );

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  if (!product) return null;

  const allImages = parseImages(selectedVariant?.images || product?.images);
  const fallbackImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name || "Product")}&background=f3f4f6&color=240046`;

  const stock = getProductStock(product, selectedVariant, selectedSize);
  const isOutOfStock = stock < 1;

  const handleBuyNow = () => {
    if (!user) {
      toast.error("Please login to continue");
      onClose(); // close popup
      return;
    }

    if (!selectedVariant) {
      toast.error("Please select a variant");
      return;
    }

    navigate("/checkout", {
      state: {
        product: product,
        variant: selectedVariant,
        size: selectedSize,
        quantity: quantity,
      },
    });

    onClose(); // close popup after navigation
  };

  const prevImage = () => {
    const newIdx = imgIndex === 0 ? allImages.length - 1 : imgIndex - 1;
    setImgIndex(newIdx);
    setSelectedImage(allImages[newIdx]);
  };

  const nextImage = () => {
    const newIdx = imgIndex === allImages.length - 1 ? 0 : imgIndex + 1;
    setImgIndex(newIdx);
    setSelectedImage(allImages[newIdx]);
  };

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-2 sm:p-4"
      onClick={onClose}
    >
      <style>
        {`
        .quickview-scroll::-webkit-scrollbar {
          display: none;
        }
        `}
      </style>

      <div
        className="relative bg-white w-full max-w-5xl rounded-3xl shadow-xl 
  overflow-y-auto md:overflow-hidden 
  max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 bg-white rounded-full p-2 shadow hover:bg-red-50 hover:text-red-500 transition cursor-pointer"
        >
          <FiX size={22} />
        </button>

        <div className="flex flex-col md:flex-row md:h-[95vh]">
          {/* LEFT IMAGE SECTION */}
          <div className="md:w-1/2 w-full bg-gray-50 flex flex-col shrink-0">
            <div className="relative w-full h-[320px] sm:h-[420px] md:h-full overflow-hidden group flex-1">
              <img
                src={selectedImage || fallbackImage}
                alt={product.name}
                className="w-full h-full object-cover object-top"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = fallbackImage;
                }}
              />

              {allImages.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow"
                  >
                    <FiChevronLeft size={20} />
                  </button>

                  <button
                    onClick={nextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow"
                  >
                    <FiChevronRight size={20} />
                  </button>
                </>
              )}

              {product.offer && (
                <span className="absolute top-4 left-4 bg-red-500 text-white text-xs px-3 py-1 rounded-full">
                  {Math.floor(product.offer)}% OFF
                </span>
              )}
            </div>

            {/* Thumbnails */}
            {/* <div className="flex gap-2 p-4 overflow-x-auto">
              {allImages.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  onClick={() => {
                    setSelectedImage(img);
                    setImgIndex(i);
                  }}
                  className={`w-16 h-16 object-cover rounded-lg cursor-pointer border-2 ${selectedImage === img ? "border-primary" : "border-gray-200"
                    }`}
                />
              ))}
            </div> */}
          </div>

          {/* RIGHT CONTENT */}
          <div
            className="md:w-1/2 w-full md:h-full md:overflow-y-auto min-h-0 p-3 flex flex-col gap-6 quickview-scroll"
            style={{ scrollbarWidth: "none" }}
          >
            <div>
              <h2 className="text-2xl font-bold">{product.name}</h2>

              <div className="flex flex-col gap-2 mt-2">
                {product.category && (
                  <span className="text-xs bg-gray-100 px-3 py-1 rounded-full w-fit">
                    Category : {product.category}
                  </span>
                )}
                {product.subcategory && (
                  <span className="text-xs bg-gray-100 px-3 py-1 rounded-full w-fit">
                    Sub Category : {product.subcategory}
                  </span>
                )}
              </div>
            </div>

            {/* Price */}
            <div className="flex items-end gap-3 bg-gray-50 p-4 rounded-xl">
              <span className="text-3xl font-bold text-primary">
                ₹{product.offer_price}
              </span>

              {product.mrp && (
                <span className="line-through text-gray-400">
                  ₹{product.mrp}
                </span>
              )}
            </div>

            {/* Colors */}
            {product.variants?.length > 0 && (
              <div>
                <p className="font-semibold mb-2">Colors</p>
                <div className="flex gap-3 flex-wrap">
                  {product.variants.map((variant, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <img
                        src={parseImages(variant.images)[0] || parseImages(product.images)[0] || fallbackImage}
                        alt={getVariantColorName(variant)}
                        onClick={() => {
                          const variantImages = parseImages(variant.images);
                          setSelectedVariant(variant);
                          setSelectedImage(variantImages[0] || parseImages(product.images)[0] || fallbackImage);
                          setImgIndex(0);
                          setSelectedSize(variant.selectedSizes?.[0]);
                        }}
                        className={`w-14 h-14 rounded-full object-cover cursor-pointer border-2 ${selectedVariant === variant
                          ? "border-primary"
                          : "border-gray-200"
                          }`}
                      />
                      <span className="text-xs">{getVariantColorName(variant)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div>
                <h3 className="font-bold mb-2">Description</h3>
                <p className="text-gray-600 text-sm">{product.description}</p>
              </div>
            )}

            {/* Sizes */}
            {selectedVariant?.selectedSizes?.length > 0 && (
              <div>
                {!(selectedVariant?.selectedSizes?.length === 1 && selectedVariant?.selectedSizes[0].toLowerCase() === "free size") && (
                  <>
                    <p className="font-bold mb-2">Select Size</p>

                    <div className="flex gap-2 flex-wrap">
                      {selectedVariant.selectedSizes.map((size, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedSize(size)}
                          className={`px-4 py-2 rounded-lg ${selectedSize === size
                            ? "bg-primary text-white"
                            : "bg-gray-100"
                            }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* STOCK DISPLAY */}
                {selectedSize && (
                  <p className="text-sm text-gray-600 mt-3">
                    Stock Available :{" "}
                    <span className="font-semibold">
                      {stock}
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* Quantity */}
            <div>
              <p className="font-bold mb-2">Quantity</p>

              <div className="flex items-center gap-3 bg-gray-100 w-fit rounded-xl px-3 py-2">
                <button
                  onClick={() => quantity > 1 && setQuantity(quantity - 1)}
                  disabled={isOutOfStock || quantity >= stock}
                  className="text-lg font-bold px-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                >
                  -
                </button>

                <span className="w-8 text-center font-semibold">
                  {quantity}
                </span>

                <button
                  onClick={() => {
                    if (quantity < stock) {
                      setQuantity(quantity + 1);
                    }
                  }}
                  className="text-lg font-bold px-2 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col md:flex-row gap-3 md:sticky md:bottom-0 bg-white pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  addToCart(product, selectedVariant, selectedSize, quantity);
                  onClose();
                }}
                disabled={isOutOfStock}
                className="w-full md:flex-1 flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-lg cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                <FiShoppingCart size={18} />
                {isOutOfStock ? "Out of Stock" : "Add to Cart"}
              </button>

              {/* Buy Now + Wishlist */}
              <div className="flex gap-3 w-full md:w-auto md:flex-1">
                <button
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  className="flex-1 bg-black text-white py-3 rounded-lg cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {isOutOfStock ? "Out of Stock" : "Buy Now"}
                </button>

                <button
                  onClick={() => toggleWishlist(product)}
                  className={`p-3 rounded-lg border cursor-pointer ${isInWishlist
                    ? "text-red-500 border-red-300"
                    : "border-gray-200"
                    }`}
                >
                  <FiHeart
                    size={20}
                    className={isInWishlist ? "fill-current" : ""}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default QuickViewModal;
