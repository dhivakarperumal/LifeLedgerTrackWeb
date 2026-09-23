import React, { createContext, useState, useEffect, useContext, useCallback } from "react";
import { toast } from "react-hot-toast";
import api from "../api";
import { AuthContext } from "./AuthContext";
import { getProductStock } from "../utils/stock";

export const StoreContext = createContext();

const resolveStoredImage = (image) => {
    if (!image || typeof image !== "string" || /^(https?:|data:|blob:)/i.test(image)) return image;
    const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
    return `${backendUrl}${image.startsWith("/") ? image : `/${image}`}`;
};

const getFirstStoredImage = (images) => {
    if (!images) return null;
    try {
        const parsed = typeof images === "string" ? JSON.parse(images) : images;
        return Array.isArray(parsed) ? parsed[0] || null : parsed;
    } catch {
        return typeof images === "string" ? images : null;
    }
};

export const StoreProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const [cart, setCart] = useState([]);
    const [wishlist, setWishlist] = useState([]);
    const [loadingCart, setLoadingCart] = useState(false);
    const [loadingWishlist, setLoadingWishlist] = useState(false);
    const [productsCache, setProductsCache] = useState([]);
    const [videosCache, setVideosCache] = useState([]);
    const [bannersCache, setBannersCache] = useState({});
    const [categoriesCache, setCategoriesCache] = useState([]);
    const [lastFetchTime, setLastFetchTime] = useState(0);

    // Stale backend endpoints are intentionally disabled; keep local state empty.
    const fetchCart = useCallback(async () => {
        setCart([]);
        setLoadingCart(false);
    }, []);

    const fetchWishlist = useCallback(async () => {
        setWishlist([]);
        setLoadingWishlist(false);
    }, []);

    useEffect(() => {
        setCart([]);
        setWishlist([]);
    }, [user?.user_id]);

    // ─── CART ACTIONS ────────────────────────────────────────────

    const addToCart = async (product, variant = null, size = null, qty = 1) => {
        if (!user?.user_id) {
            toast.error("Please login to add items to cart");
            return;
        }

        const productId = product?.product_id ?? product?.productId ?? product?.id;
        if (!productId || !Number.isInteger(Number(productId)) || Number(productId) < 1) {
            console.error("Add to cart skipped: product has no valid id", product);
            toast.error("Unable to add this product to cart");
            return;
        }

        const selectedVariant = variant || product.variants?.[0] || null;
        const selectedSize = size || selectedVariant?.selectedSizes?.[0] || "Free Size";
        const availableStock = getProductStock(product, selectedVariant, selectedSize);
        if (availableStock < 1) {
            toast.error("This product is out of stock");
            return;
        }
        if (qty > availableStock) {
            toast.error(`Only ${availableStock} item${availableStock === 1 ? "" : "s"} available`);
            return;
        }
        const variantColor = selectedVariant?.colorName || selectedVariant?.color || "Default";
        
        // Correctly parse images if they are stored as JSON strings
        const variantImage = getFirstStoredImage(selectedVariant?.images) || getFirstStoredImage(product.images);
        
        const price = parseFloat(product.offer_price || product.price || 0);

        toast.error("Cart API is disabled in this build.");
        return;
    };

    const removeFromCart = async () => {
        toast.error("Cart API is disabled in this build.");
    };

    const updateCartQuantity = async () => {
        toast.error("Cart API is disabled in this build.");
    };

    const clearCart = async () => {
        setCart([]);
        toast.error("Cart API is disabled in this build.");
    };

    // ─── WISHLIST ACTIONS ────────────────────────────────────────

    const toggleWishlist = async (product, variant = null, size = null) => {
        if (!user?.user_id) {
            toast.error("Please login to manage wishlist");
            return;
        }

        const productId = product.product_id ?? product.productId ?? product.id;
        const isAlready = wishlist.some(w =>
            String(w.product_id ?? w.productId ?? w.id) === String(productId)
        );

        toast.error("Wishlist API is disabled in this build.");
        return;
    };

    return (
        <StoreContext.Provider value={{
            cart, wishlist,
            addToCart, removeFromCart, updateCartQuantity, clearCart,
            toggleWishlist,
            loadingCart, loadingWishlist,
            fetchCart, fetchWishlist,
            productsCache, setProductsCache,
            videosCache, setVideosCache,
            bannersCache, setBannersCache,
            categoriesCache, setCategoriesCache,
            lastFetchTime, setLastFetchTime
        }}>
            {children}
        </StoreContext.Provider>
    );
};
