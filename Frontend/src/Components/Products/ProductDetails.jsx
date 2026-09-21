import React, { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import { FaStar, FaShareAlt, FaPlus, FaMinus, FaHeart, FaChevronRight, FaChevronLeft } from "react-icons/fa";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import toast from "react-hot-toast";

import api from "../../api";
import { StoreContext } from "../../PrivateRouter/StoreContext";
import { getProductStock } from "../../utils/stock";
import {
  FiHeart,
  FiShoppingCart,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
import RelatedProducts from "./RelatedProducts";
import PageHeader from "../CommenComponents/PageHeader";
import { useAuth } from "../../PrivateRouter/AuthContext";
import { useNavigate } from "react-router-dom";

const ProductDetails = () => {
  const { addToCart, toggleWishlist, wishlist } = useContext(StoreContext);

  const { id } = useParams();
  console.log("Current Product ID:", id);
  const { user } = useAuth();
  console.log("Logged User:", user);
  const navigate = useNavigate();



  const [product, setProduct] = useState(null);

  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [reviewImage, setReviewImage] = useState(null);
  const [uploadingReviewImage, setUploadingReviewImage] = useState(false);

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  const [userReviewed, setUserReviewed] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [showDetails, setShowDetails] = useState(true);
  const [reviewStats, setReviewStats] = useState({
    total_reviews: 0,
    average_rating: 0,
    five_star: 0,
    four_star: 0,
    three_star: 0,
    two_star: 0,
    one_star: 0,
  });
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
    console.log("Component Mounted for Product:", id);
  }, [id]);

  const [zoomed, setZoomed] = useState(false);
  const [backgroundPosition, setBackgroundPosition] = useState("50% 50%");
  const zoomLevel = 2.5;

  const resolveImageUrl = (url) => {
    if (!url || typeof url !== "string") return null;
    if (/^(https?:|data:|blob:)/i.test(url)) return url;
    const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
    const cleanPath = url.replace(/\\/g, "/");
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

  const fetchReviews = async () => {
    try {
      setLoadingReviews(true);
      const res = await api.get(`/reviews/product/${id}`);
      setReviews(res.data?.reviews || []);
      setReviewStats(
        res.data?.stats || {
          total_reviews: 0,
          average_rating: 0,
          five_star: 0,
          four_star: 0,
          three_star: 0,
          two_star: 0,
          one_star: 0,
        }
      );
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const fetchProduct = async () => {
    try {
      const res = await api.get(`/products/${id}`);
      const data = res.data;
      if (!data) throw new Error("Product data not found");

      const normalizedVariants = (Array.isArray(data.variants) ? data.variants : []).map((variant) => ({
        ...variant,
        images: parseImages(variant.images),
      }));
      const normalizedProduct = {
        ...data,
        images: parseImages(data.images),
        variants: normalizedVariants,
      };
      setProduct(normalizedProduct);

      const firstVariant = normalizedVariants[0] || null;
      setSelectedVariant(firstVariant);
      setSelectedImage(firstVariant?.images?.[0] || normalizedProduct.images[0] || null);
      setSelectedSize(firstVariant?.selectedSizes?.[0] || null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleBuyNow = () => {

    if (!user) {
      toast.error("Please login to continue");
      return;
    }

    if (!selectedVariant) {
      alert("Please select a variant");
      return;
    }

    navigate("/checkout", {
      state: {
        product: product,
        variant: selectedVariant,
        size: selectedSize,
        quantity: quantity
      }
    });

  };

  const handleMouseMove = (e) => {
    const { left, top, width, height } =
      e.currentTarget.getBoundingClientRect();

    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;

    setBackgroundPosition(`${x}% ${y}%`);
  };

  const increaseQty = () => {
    if (!selectedVariant || !selectedSize) return;

    const stock = selectedVariant?.sizesStock?.[selectedSize] || 0;

    setQuantity((prev) => {
      if (prev < stock) return prev + 1;
      return prev;
    });
  };

  const decreaseQty = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  // review submitting section
  const submitReview = async () => {
    try {
      if (!rating) {
        alert("Please select rating");
        return;
      }
      const reviewerName = user?.name || user?.username || "";
      if (!reviewerName) {
        alert("Please login before submitting a review");
        return;
      }
      console.log("Submitting Review:", {
        product_id: product.id,
        user_name: reviewerName,
        user_email: user?.email,
        rating,
        comment: reviewText,
      });

      await api.post("/reviews", {
        product_id: product.id,
        user_name: reviewerName,
        user_email: user?.email,
        user_id: user?.user_id || user?.id,
        rating: rating,
        comment: reviewText,
        review_image: reviewImage,
      });

      alert("Review submitted successfully!");

      setRating(0);
      setReviewText("");
      setReviewImage(null);
      setShowReviewForm(false);

      // ⭐ IMPORTANT
      setUserReviewed(true);
      fetchReviews(); // Refresh the reviews list immediately
    } catch (error) {
      console.error(error);
      const errorMsg =
        error.response?.data?.message || "Failed to submit review";
      alert(errorMsg);

      if (errorMsg.includes("already submitted")) {
        setUserReviewed(true);
        setShowReviewForm(false);
      }
    }
  };

  //  check if the user already submitted a review for this product
  const checkUserReview = async () => {
    try {
      const uId = user?.user_id || user?.id;
      if (!uId) {
        setUserReviewed(false);
        return;
      }

      const res = await api.get(`/reviews/check/${id}/${uId}`);
      console.log("Check Review Response:", res.data);

      if (res.data.hasReviewed) {
        setUserReviewed(true);
      } else {
        setUserReviewed(false);
      }
    } catch (err) {
      console.log("Review check error:", err);
      setUserReviewed(false);
    }
  };
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Review image is too large. Maximum size is 5 MB.");
      return;
    }

    setUploadingReviewImage(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await api.post("/reviews/upload", formData);
      setReviewImage(response.data.url);
      toast.success("Review image uploaded!");
    } catch (error) {
      console.error("Review image upload failed:", error);
      toast.error("Review image upload failed");
    } finally {
      setUploadingReviewImage(false);
    }
  };

  useEffect(() => {
    fetchProduct();
    fetchReviews();
    setUserReviewed(false);
  }, [id]);

  useEffect(() => {
    if (user) {
      checkUserReview();
    }
  }, [user, id]);

  if (!product)
    return (
      <>
        <PageHeader title="Loading..." />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 grid lg:grid-cols-2 gap-8 lg:gap-12 animate-pulse">
          {/* LEFT IMAGE SKELETON */}
          <div>
            <div className="w-full h-[320px] sm:h-[420px] lg:h-[480px] bg-gray-200 rounded-xl"></div>

            <div className="flex gap-3 mt-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-20 h-20 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>

          {/* RIGHT DETAILS SKELETON */}
          <div className="space-y-4">
            <div className="h-8 w-3/4 bg-gray-200 rounded"></div>

            <div className="h-4 w-full bg-gray-200 rounded"></div>
            <div className="h-4 w-5/6 bg-gray-200 rounded"></div>

            <div className="h-6 w-32 bg-gray-200 rounded mt-6"></div>

            <div className="flex gap-3 mt-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-16 h-16 bg-gray-200 rounded-lg"></div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-14 h-10 bg-gray-200 rounded-lg"></div>
              ))}
            </div>

            <div className="h-32 bg-gray-200 rounded-xl mt-6"></div>

            <div className="flex gap-4 mt-6">
              <div className="h-12 flex-1 bg-gray-200 rounded-lg"></div>
              <div className="h-12 w-40 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </>
    );

  const displayImages = selectedVariant?.images?.length
    ? selectedVariant.images
    : product.images || [];
  const isSareeCategory = product.category?.trim().toLowerCase() === "saree";
  const availableStock = getProductStock(product, selectedVariant, selectedSize);
  const isOutOfStock = availableStock < 1;

  return (
    <>
      <PageHeader title={product.name} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 grid lg:grid-cols-[0.88fr_1.12fr] gap-8 lg:gap-12">
        {/* LEFT SIDE IMAGES */}
        <div className="lg:h-fit lg:sticky lg:top-24">
          {/* Main Image */}
          <div
            className="relative group w-full max-w-[560px] mx-auto h-[320px] sm:h-[420px] lg:h-[480px] bg-gray-100 rounded-3xl shadow-sm"
            onMouseEnter={() => setZoomed(true)}
            onMouseLeave={() => setZoomed(false)}
            onMouseMove={handleMouseMove}
          >
            <div className="w-full h-full rounded-3xl overflow-hidden">
              <img
                src={selectedImage}
                alt={product.name}
                className="w-full h-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-110"
              />
            </div>

            {zoomed && (
              <div
                className="pointer-events-none absolute top-0 left-full ml-4 w-[520px] h-[480px] border border-gray-200 rounded-2xl overflow-hidden z-50 hidden lg:block bg-white shadow-lg"
                style={{
                  backgroundImage: `url(${selectedImage})`,
                  backgroundRepeat: "no-repeat",
                  backgroundSize: `${zoomLevel * 100}%`,
                  backgroundPosition: backgroundPosition,
                }}
              ></div>
            )}
          </div>
          {/* Thumbnails */}
          <div className="flex gap-2 sm:gap-3 mt-3 sm:mt-4 flex-wrap">
            {displayImages.map((img, index) => (
              <img
                key={index}
                src={img}
                onClick={() => setSelectedImage(resolveImageUrl(img))}
                className={`w-14 h-14 sm:w-18 sm:h-20 sm:h-16 object-cover object-top rounded-lg cursor-pointer border ${selectedImage === img ? "border-primary" : "border-gray-200"
                  }`}
              />
            ))}
          </div>
        </div>

        {/* RIGHT SIDE DETAILS */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-dark">
            {product.name}
          </h1>

          {reviewStats.total_reviews > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <FaStar
                    key={i}
                    size={14}
                    className={
                      i < Math.round(reviewStats.average_rating)
                        ? "text-yellow-400"
                        : "text-gray-200"
                    }
                  />
                ))}
              </div>
              <span className="text-sm text-gray-500">
                ({reviewStats.total_reviews} reviews)
              </span>
            </div>
          )}

          <p className="text-muted mt-2">{product.description}</p>

          <div className="mt-4 space-y-1 text-sm text-gray-600">
            {product.category && (
              <p>
                <span className="font-semibold">Category:</span>{" "}
                {product.category}
              </p>
            )}

            {product.subcategory && (
              <p>
                <span className="font-semibold">Sub Category:</span>{" "}
                {product.subcategory}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 mt-4">
            <span className="text-2xl sm:text-3xl font-bold text-primary">
              ₹{product.offer_price}
            </span>

            {product.mrp && (
              <span className="text-gray-400 line-through text-lg">
                ₹{product.mrp}
              </span>
            )}

            {product.offer && (
              <span className="bg-primary/10 text-primary text-sm px-2 py-1 rounded">
                {Math.floor(product.offer)}% OFF
              </span>
            )}
          </div>

          <div className="mt-6">
            <p className="font-semibold mb-3">Color</p>

            <div className="flex gap-3 flex-wrap">
              {product?.variants?.map((variant, index) => (
                <div
                  key={index}
                  onClick={() => {
                    setSelectedVariant(variant);
                    setSelectedImage(resolveImageUrl(variant.images?.[0]));
                    setSelectedSize(variant.selectedSizes?.[0] || null);
                    setQuantity(1);
                  }}
                  className="flex flex-col items-center cursor-pointer"
                >
                  {/* variant image */}
                  <img
                    src={resolveImageUrl(variant.images?.[0]) || product.images?.[0]}
                    alt={getVariantColorName(variant)}
                    className={`w-16 h-16 object-cover object-top rounded-full border-2 ${selectedVariant === variant
                      ? "border-primary"
                      : "border-gray-200"
                      }`}
                  />

                  {/* color name */}
                  <span className="text-xs mt-1">{getVariantColorName(variant)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6">
            {!isSareeCategory && !(selectedVariant?.selectedSizes?.length === 1 && selectedVariant?.selectedSizes[0].toLowerCase() === "free size") && (
              <>
                <p className="font-semibold mb-3">Sizes</p>

                <div className="flex gap-3 flex-wrap">
                  {selectedVariant?.selectedSizes?.map((size, index) => {
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedSize(size);
                          setQuantity(1);
                        }}
                        className={`px-4 py-2 rounded-lg border text-sm font-semibold transition
              ${selectedSize === size
                            ? "bg-primary text-white border-primary"
                            : "border-gray-300 hover:border-primary"
                          }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {!isSareeCategory && selectedSize && (
              <p className="text-sm text-gray-600 mt-3">
                Stock Available:{" "}
                <span className="font-semibold">
                  {availableStock}
                </span>
              </p>
            )}

            {/* QUANTITY SELECTOR */}
            <div className="mt-6">
              <p className="font-semibold mb-2">Quantity</p>

              <div className="flex items-center border border-gray-200 rounded-lg w-fit overflow-hidden">
                <button
                  onClick={decreaseQty}
                  className="px-4 py-2 text-lg font-bold cursor-pointer hover:bg-gray-100"
                >
                  -
                </button>

                <span className="px-5 py-2 font-semibold text-gray-700 border-x border-gray-200">
                  {quantity}
                </span>

                <button
                  onClick={increaseQty}
                  disabled={isOutOfStock || quantity >= availableStock}
                  className="px-4 py-2 text-lg cursor-pointer font-bold hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>
          </div>


            {/* ACTION BUTTONS */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3">

            <button
              onClick={() =>
                addToCart(product, selectedVariant, selectedSize, quantity)
              }
              disabled={isOutOfStock}
              className="flex-1 cursor-pointer flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-lg disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              <FiShoppingCart size={18} />
              {isOutOfStock ? "Out of Stock" : "Add to Cart"}
            </button>

            <button
              onClick={handleBuyNow}
              disabled={isOutOfStock}
              className="flex-1 cursor-pointer bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-900 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isOutOfStock ? "Out of Stock" : "Buy Now"}
            </button>

            <button
              onClick={() => toggleWishlist(product, selectedVariant)}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg border-2 transition active:scale-95 font-semibold ${wishlist.some((w) => w.product_id === product.id)
                ? "bg-rose-50 border-rose-300 text-rose-500"
                : "border-gray-200 text-gray-600 hover:border-rose-300 hover:text-rose-500"
                }`}
            >
              <FiHeart
                size={18}
                className={

                  wishlist.some((w) => w.product_id === product.id)
                    ? "fill-current cursor-pointer"
                    : "cursor-pointer "
                }
              />
              {/* {wishlist.some((w) => w.product_id === product.id)
                ? "Saved"
                : "Wishlist"} */}
            </button>

          </div>

          {/* PRODUCT DETAILS */}
          {/* PRODUCT DETAILS */}
          <div className="mt-10 bg-gray-50 border border-gray-100 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary-dark">
                Product Details
              </h3>

              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-primary hover:text-primary-dark transition"
              >
                {showDetails ? (
                  <FiChevronUp size={22} />
                ) : (
                  <FiChevronDown size={22} />
                )}
              </button>
            </div>

            {showDetails && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 text-sm">
                {product.material && (
                  <>
                    <span className="text-gray-500">Material</span>
                    <span className="font-medium text-gray-800">
                      {product.material}
                    </span>
                  </>
                )}

                {product.color && (
                  <>
                    <span className="text-gray-500">Color</span>
                    <span className="font-medium text-gray-800">
                      {product.color}
                    </span>
                  </>
                )}

                {product.wash_care && (
                  <>
                    <span className="text-gray-500">Wash Care</span>
                    <span className="font-medium text-gray-800">
                      {product.wash_care}
                    </span>
                  </>
                )}

                {product.saree_length && (
                  <>
                    <span className="text-gray-500">Saree Length</span>
                    <span className="font-medium text-gray-800">
                      {product.saree_length}
                    </span>
                  </>
                )}

                {product.blouse_length && (
                  <>
                    <span className="text-gray-500">Blouse Length</span>
                    <span className="font-medium text-gray-800">
                      {product.blouse_length}
                    </span>
                  </>
                )}

                {product.work_type && (
                  <>
                    <span className="text-gray-500">Work Type</span>
                    <span className="font-medium text-gray-800">
                      {product.work_type}
                    </span>
                  </>
                )}

                {product.zari_color && (
                  <>
                    <span className="text-gray-500">Zari Color</span>
                    <span className="font-medium text-gray-800">
                      {product.zari_color}
                    </span>
                  </>
                )}

                {product.top_length && (
                  <>
                    <span className="text-gray-500">Top Length</span>
                    <span className="font-medium text-gray-800">
                      {product.top_length}
                    </span>
                  </>
                )}

                {product.bottom_length && (
                  <>
                    <span className="text-gray-500">Bottom Length</span>
                    <span className="font-medium text-gray-800">
                      {product.bottom_length}
                    </span>
                  </>
                )}

                {product.dupatta_length && (
                  <>
                    <span className="text-gray-500">Dupatta Length</span>
                    <span className="font-medium text-gray-800">
                      {product.dupatta_length}
                    </span>
                  </>
                )}

                {product.gown_length && (
                  <>
                    <span className="text-gray-500">Gown Length</span>
                    <span className="font-medium text-gray-800">
                      {product.gown_length}
                    </span>
                  </>
                )}

                {product.sleeve_type && (
                  <>
                    <span className="text-gray-500">Sleeve Type</span>
                    <span className="font-medium text-gray-800">
                      {product.sleeve_type}
                    </span>
                  </>
                )}

                {product.neck_type && (
                  <>
                    <span className="text-gray-500">Neck Type</span>
                    <span className="font-medium text-gray-800">
                      {product.neck_type}
                    </span>
                  </>
                )}

                {product.fit_type && (
                  <>
                    <span className="text-gray-500">Fit Type</span>
                    <span className="font-medium text-gray-800">
                      {product.fit_type}
                    </span>
                  </>
                )}

                {product.age && (
                  <>
                    <span className="text-gray-500">Age</span>
                    <span className="font-medium text-gray-800">
                      {product.age}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

        
        </div>
      </div>
      <RelatedProducts
        category={product?.category}
        currentProductId={product?.id}
      />

      {/* REVIEW SECTION */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 mt-20">
        {/* HEADER */}

        <div className="flex items-center justify-between border-t border-gray-200 pt-10 mb-6">
          <h2 className="text-2xl font-bold text-primary-light">Add Reviews</h2>

          {userReviewed ? (
            <p className="text-green-600 font-semibold">
              You already reviewed this product
            </p>
          ) : (
            <button
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="px-6 py-2 rounded-xl font-semibold text-white 
    bg-gradient-to-r from-primary-light to-secondary 
    shadow-md hover:scale-105 transition cursor-pointer"
            >
              {showReviewForm ? "Hide Review Form" : "Write Review"}
            </button>
          )}
        </div>

        {/* REVIEW FORM */}

        {showReviewForm && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 shadow-sm max-w-4xl">
            <h3 className="text-lg font-semibold mb-6">
              Share your experience
            </h3>

            {/* STAR RATING */}

            <div className="mb-6">
              <p className="font-medium mb-2">Rating</p>

              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <FaStar
                    key={star}
                    size={22}
                    className={`cursor-pointer transition
                ${star <= (hoverRating || rating)
                        ? "text-yellow-400"
                        : "text-gray-300"
                      }
              `}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                  />
                ))}
              </div>
            </div>

            {/* REVIEW TEXT */}

            <div className="mb-6">
              <p className="font-medium mb-2">Review</p>

              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Write your review here..."
                className="w-full border border-gray-300 rounded-xl p-4 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="mb-6">
              <p className="font-medium mb-2">Upload Image (optional)</p>

              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full border border-gray-300 rounded-xl p-2"
              />

              {reviewImage && (
                <img
                  src={resolveImageUrl(reviewImage)}
                  alt="preview"
                  className="mt-4 w-32 h-32 object-cover rounded-lg border"
                />
              )}
            </div>

            {/* SUBMIT BUTTON */}

            <button
              onClick={submitReview}
              disabled={uploadingReviewImage}
              className="bg-gradient-to-r from-primary-light to-secondary text-white 
  px-6 py-3 rounded-xl font-semibold shadow-md hover:scale-105 transition"
            >
              Submit Review
            </button>
          </div>
        )}
      </div>

      {/* REVIEWS LIST & STATS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 mb-20 overflow-hidden">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* STATS LEFT */}
          <div className="lg:col-span-1">
            <h3 className="text-xl font-bold mb-6">Customer Reviews</h3>

            <div className="flex items-center gap-4 mb-4">
              <div className="text-4xl font-bold text-gray-800">
                {reviewStats.average_rating}
              </div>
              <div>
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <FaStar
                      key={i}
                      className={
                        i < Math.round(reviewStats.average_rating)
                          ? "text-yellow-400"
                          : "text-gray-200"
                      }
                    />
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Based on {reviewStats.total_reviews} reviews
                </p>
              </div>
            </div>

            {/* PROGRESS BARS */}
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((star) => {
                const count =
                  reviewStats[
                  `${star === 5
                    ? "five"
                    : star === 4
                      ? "four"
                      : star === 3
                        ? "three"
                        : star === 2
                          ? "two"
                          : "one"
                  }_star`
                  ] || 0;
                const percentage =
                  reviewStats.total_reviews > 0
                    ? (count / reviewStats.total_reviews) * 100
                    : 0;

                return (
                  <div key={star} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-3">{star}</span>
                    <FaStar className="text-yellow-400" size={12} />
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-500 w-8">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* REVIEWS LIST RIGHT */}
          <div className="lg:col-span-2">
            {loadingReviews ? (
              <div className="animate-pulse space-y-6">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="border-b pb-6">
                    <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 w-full bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 w-2/3 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : reviews.length > 0 ? (
              <Swiper
                modules={[Pagination, Navigation, Autoplay]}
                spaceBetween={20}
                slidesPerView={1}
                breakpoints={{
                  768: { slidesPerView: 2 },
                  1024: { slidesPerView: 2 }
                }}
                autoplay={{ delay: 3000 }}
                className="review-swiper pb-12"
              >
                {reviews.map((review) => (
                  <SwiperSlide key={review.id}>
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-full">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-bold text-gray-800 text-lg">
                            {review.user_name}
                          </h4>
                          <div className="flex text-yellow-400 gap-0.5 mt-1">
                            {[...Array(5)].map((_, i) => (
                              <FaStar
                                key={i}
                                size={14}
                                className={
                                  i < review.rating
                                    ? "text-yellow-400"
                                    : "text-gray-200"
                                }
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-sm text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <p className="text-gray-600 leading-relaxed italic">
                        "{review.comment}"
                      </p>

                      {review.review_image && (
                        <div className="mt-4 overflow-hidden rounded-xl border border-gray-100 w-fit">
                          <img
                            src={resolveImageUrl(review.review_image)}
                            alt="Review"
                            className="w-40 h-40 object-cover hover:scale-110 transition-transform duration-500"
                          />
                        </div>
                      )}

                      {review.admin_reply && (
                        <div className="mt-6 bg-primary/5 p-4 rounded-xl border-l-4 border-primary/30">
                          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">
                            Response from Seller
                          </p>
                          <p className="text-gray-600 text-sm italic">
                            "{review.admin_reply}"
                          </p>
                        </div>
                      )}
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            ) : (
              <div className="text-center py-10 bg-gray-50 rounded-2xl">
                <p className="text-gray-500 font-medium">
                  No reviews yet. Be the first to share your experience!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductDetails;
