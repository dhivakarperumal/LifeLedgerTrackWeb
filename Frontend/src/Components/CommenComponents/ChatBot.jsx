import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import "./ChatBot.css";

// ─── Intent Detection ────────────────────────────────────────────────────────
const ORDER_KEYWORDS = [
  "order", "track", "where is my", "shipment", "shipping", "delivery status",
  "package", "parcel", "when will", "is my order", "delayed", "cancel my order",
  "refund", "return my order", "order history", "recent orders", "my orders",
  "order status", "payment status", "order details", "show my orders",
  "delivery date", "expected delivery", "order placed", "order id", "order #",
  "is my order shipped", "is my order delivered",
];

const SUPPORT_KEYWORDS = [
  "contact", "support", "help", "customer care", "assistance", "assist",
  "whatsapp support", "email support", "call support", "live chat",
  "complaint", "raise complaint", "missing item", "refund help", "return help",
  "talk to support", "need help", "i need help",
];

const GREETING_KEYWORDS = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "hii", "helo", "hai"];
const CART_KEYWORDS = ["cart", "my cart", "shopping cart", "add to cart", "view cart"];
const WISHLIST_KEYWORDS = ["wishlist", "my wishlist", "saved items", "favourites", "favorites"];
const OFFER_KEYWORDS = ["offer", "offers", "deal", "deals", "discount", "sale", "combo"];
const CATEGORY_KEYWORDS = ["category", "categories", "browse", "explore"];
const ACCOUNT_KEYWORDS = ["account", "profile", "my details", "settings"];
const ADDRESS_KEYWORDS = ["address", "delivery address", "shipping address", "location"];
const TRACK_KEYWORDS = ["track", "where is my order", "track order"];

function detectIntent(text) {
  const lower = text.toLowerCase().trim();
  if (GREETING_KEYWORDS.some((k) => lower === k || lower.startsWith(k + " "))) return "greeting";
  if (TRACK_KEYWORDS.some((k) => lower.includes(k))) return "track";
  if (ORDER_KEYWORDS.some((k) => lower.includes(k))) return "order";
  if (SUPPORT_KEYWORDS.some((k) => lower.includes(k))) return "support";
  if (CART_KEYWORDS.some((k) => lower.includes(k))) return "cart";
  if (WISHLIST_KEYWORDS.some((k) => lower.includes(k))) return "wishlist";
  if (OFFER_KEYWORDS.some((k) => lower.includes(k))) return "offers";
  if (CATEGORY_KEYWORDS.some((k) => lower.includes(k))) return "categories";
  if (ACCOUNT_KEYWORDS.some((k) => lower.includes(k))) return "account";
  if (ADDRESS_KEYWORDS.some((k) => lower.includes(k))) return "address";
  if (lower.includes("ord-") || lower.match(/order #?\s*\d+/i)) return "track_specific_order";
  if (lower === "search products" || lower === "search") return "search_prompt";
  return "search";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getUserFromStorage() {
  try {
    const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token") || null;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatAmount(amount) {
  return `₹${parseFloat(amount || 0).toFixed(2)}`;
}

function getOrderStatusColor(status) {
  const s = (status || "").toLowerCase();
  if (s === "delivered") return "#10b981";
  if (s === "shipped" || s === "out for delivery") return "#3b82f6";
  if (s === "processing" || s === "packing") return "#f59e0b";
  if (s === "cancelled") return "#ef4444";
  return "#6b7280";
}

function getProductImage(product) {
  let rawImg = null;
  
  try {
    if (product?.variants?.[0]?.images) {
      let imgs = typeof product.variants[0].images === 'string' ? JSON.parse(product.variants[0].images) : product.variants[0].images;
      if (imgs && imgs.length > 0) rawImg = imgs[0];
    }
    if (!rawImg && product?.images) {
      let imgs = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
      if (imgs && imgs.length > 0) rawImg = imgs[0];
    }
  } catch (e) {
    console.error("Error parsing product images:", e);
  }

  if (!rawImg || typeof rawImg !== 'string') return null;
  if (rawImg.startsWith('http') || rawImg.startsWith('data:')) return rawImg;
  
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
  const cleanPath = rawImg.replace(/\\/g, '/');
  const finalPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
  return `${backendUrl}${finalPath}`;
}

// ─── Quick Actions ────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  {
    label: "Last Order", message: "Show my last order",
    color: "#f43f5e", bg: "#fff1f2",
    icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  },
  // {
  //   label: "Recent Orders", message: "Show recent orders",
  //   color: "#f59e0b", bg: "#fffbeb",
  //   icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  // },
  {
    label: "Where is my order?", message: "Where is my order?",
    color: "#0ea5e9", bg: "#e0f2fe",
    icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  },
  // {
  //   label: "Order Status", message: "Show last order status",
  //   color: "#84cc16", bg: "#ecfccb",
  //   icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  // },
  // {
  //   label: "Order Details", message: "Show order details",
  //   color: "#d946ef", bg: "#fae8ff",
  //   icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  // },
  {
    label: "Today Orders", message: "Show today orders",
    color: "#3b82f6", bg: "#eff6ff",
    icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>,
  },
  // {
  //   label: "Delivered Orders", message: "Show delivered orders",
  //   color: "#10b981", bg: "#f0fdf4",
  //   icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  // },
  {
    label: "My Orders", message: "Show my orders",
    color: "#8b5cf6", bg: "#f5f3ff",
    icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
  },
  {
    label: "Search Products", message: "Search products",
    color: "#3b82f6", bg: "#eff6ff",
    icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  },
  {
    label: "Offers", message: "Show offers and deals",
    color: "#ef4444", bg: "#fef2f2",
    icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  },
  // {
  //   label: "Track Order", message: "Track my order",
  //   color: "#eab308", bg: "#fefce8",
  //   icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  // },
  {
    label: "My Account", message: "Open my account",
    color: "#6366f1", bg: "#eef2ff",
    icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  },
  {
    label: "Delivery Address", message: "Manage delivery address",
    color: "#14b8a6", bg: "#f0fdfa",
    icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  },
  // {
  //   label: "Cart", message: "View my cart",
  //   color: "#10b981", bg: "#f0fdf4",
  //   icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
  // },
  // {
  //   label: "Wishlist", message: "View my wishlist",
  //   color: "#ec4899", bg: "#fdf2f8",
  //   icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  // },
  {
    label: "Categories", message: "Browse categories",
    color: "#8b5cf6", bg: "#f5f3ff",
    icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  },
  {
    label: "Contact Support", message: "Contact support",
    color: "#06b6d4", bg: "#ecfeff",
    icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.78a16 16 0 0 0 6.29 6.29l1.64-1.64a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  },
];

// ─── Main ChatBot Component ───────────────────────────────────────────────────
const ChatBot = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [orders, setOrders] = useState([]);
  const debounceRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const user = getUserFromStorage();
  const isLoggedIn = !!getToken() && !!user;

  // Welcome message on open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: Date.now(),
          from: "bot",
          type: "welcome",
          text: `👋 Hello${user?.name ? `, ${user.name}` : ""}! I'm your AI Shopping Assistant.\n\nI can help you with:\n• 📦 Order tracking\n• 🔍 Product search\n• 🎧 Customer support\n\nWhat can I help you with today?`,
        },
      ]);
    }
  }, [isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input when open
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  const addMessage = (msg) => {
    setMessages((prev) => [...prev, { id: Date.now() + Math.random(), ...msg }]);
  };

  // ── Handle Orders ──
  const fetchOrders = async (filterMode = "all") => {
    if (!isLoggedIn) {
      addMessage({
        from: "bot",
        type: "text",
        text: "🔐 Please log in to view your orders.",
        action: { label: "Go to Login", href: "/login" },
      });
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get("/orders");
      const all = Array.isArray(data) ? data : data?.data || [];
      let userOrders = all.filter((o) => o.user_id === user.user_id);
      
      if (filterMode === "today") {
        const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
        userOrders = userOrders.filter(o => o.created_at?.startsWith(today));
      } else if (filterMode === "delivered") {
        userOrders = userOrders.filter(o => o.status?.toLowerCase() === "delivered");
      }

      // Default sorting by newest
      userOrders = userOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      if (filterMode === "last") {
        userOrders = userOrders.slice(0, 1);
      } else if (filterMode === "recent") {
        userOrders = userOrders.slice(0, 5);
      } else {
        userOrders = userOrders.slice(0, 10);
      }

      setOrders(userOrders);
      if (userOrders.length === 0) {
        addMessage({ from: "bot", type: "text", text: `📭 You have no ${filterMode === "all" ? "" : filterMode} orders yet.` });
      } else {
        addMessage({ from: "bot", type: "orders", orders: userOrders });
      }
    } catch (err) {
      addMessage({ from: "bot", type: "text", text: "⚠️ Unable to fetch orders right now. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const fetchSpecificOrder = async (text) => {
    if (!isLoggedIn) {
      addMessage({
        from: "bot", type: "text",
        text: "🔐 Please log in to view your orders.",
        action: { label: "Go to Login", href: "/login" },
      });
      return;
    }
    setLoading(true);
    try {
      const match = text.match(/(ORD-\d+)/i) || text.match(/order #?\s*(\d+)/i);
      if (!match) {
        addMessage({ from: "bot", type: "text", text: "⚠️ I couldn't detect a valid Order ID. Please provide it like 'ORD-1234'." });
        setLoading(false);
        return;
      }
      const orderIdToFind = match[1].toUpperCase();
      const { data } = await api.get("/orders");
      const all = Array.isArray(data) ? data : data?.data || [];
      const userOrders = all.filter((o) => o.user_id === user.user_id);
      
      const foundOrder = userOrders.find(o => o.order_id?.toUpperCase() === orderIdToFind || o.id.toString() === orderIdToFind);

      if (foundOrder) {
        addMessage({ from: "bot", type: "text", text: `📦 Here are the details for your order:` });
        addMessage({ from: "bot", type: "orders", orders: [foundOrder] });
      } else {
        addMessage({ from: "bot", type: "text", text: `📭 Sorry, I couldn't find order ${orderIdToFind} in your account.` });
      }
    } catch (err) {
      addMessage({ from: "bot", type: "text", text: "⚠️ Unable to fetch order right now. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  // ── Handle Product Search ──
  const searchProducts = useCallback(async (query) => {
    if (!query || query.trim().length < 2) return;
    setLoading(true);
    try {
      const { data } = await api.get("/products");
      const all = Array.isArray(data) ? data : data?.data || [];
      const q = query.toLowerCase();
      const results = all.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.product_code?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q)
      ).slice(0, 8);

      if (results.length === 0) {
        addMessage({
          from: "bot",
          type: "no_products",
          query,
          text: `😕 No products found for "${query}". Try: Silk Saree, Cotton Saree, Kanjeevaram, Banarasi`,
        });
      } else {
        addMessage({ from: "bot", type: "products", products: results, query });
      }
    } catch {
      addMessage({ from: "bot", type: "text", text: "⚠️ Product search failed. Please try again." });
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Handle Intent ──
  const handleIntent = async (text, intent) => {
    switch (intent) {
      case "greeting":
        addMessage({
          from: "bot", type: "text",
          text: "😊 Hello! How can I help you today? You can ask me about your orders, search for products, or get support.",
        });
        break;

      case "order":
        if (text.toLowerCase().includes("last")) {
          addMessage({ from: "bot", type: "text", text: "🔍 Fetching your last order..." });
          await fetchOrders("last");
        } else if (text.toLowerCase().includes("today")) {
          addMessage({ from: "bot", type: "text", text: "🔍 Fetching today's orders..." });
          await fetchOrders("today");
        } else if (text.toLowerCase().includes("deliver")) {
          addMessage({ from: "bot", type: "text", text: "🔍 Fetching delivered orders..." });
          await fetchOrders("delivered");
        } else if (text.toLowerCase().includes("recent")) {
          addMessage({ from: "bot", type: "text", text: "🔍 Fetching your recent orders..." });
          await fetchOrders("recent");
        } else {
          addMessage({ from: "bot", type: "text", text: "🔍 Let me fetch your orders..." });
          await fetchOrders("all");
        }
        break;

      case "track_specific_order":
        addMessage({ from: "bot", type: "text", text: `🔍 Looking up your order...` });
        await fetchSpecificOrder(text);
        break;

      case "support":
        addMessage({ from: "bot", type: "support" });
        break;

      case "cart":
        addMessage({ from: "bot", type: "text", text: "🛒 Taking you to your cart!", action: { label: "Open Cart", href: "/checkout" } });
        break;

      case "wishlist":
        addMessage({ from: "bot", type: "text", text: "❤️ Opening your wishlist!", action: { label: "Open Wishlist", href: "/account" } });
        break;

      case "offers":
        addMessage({ from: "bot", type: "text", text: "🎁 Check out our latest offers and combos!", action: { label: "View Offers", href: "/combo" } });
        break;

      case "categories":
        addMessage({ from: "bot", type: "text", text: "🏷️ Browse all product categories:", action: { label: "Browse Categories", href: "/shop" } });
        break;

      case "track":
        addMessage({ from: "bot", type: "text", text: "📍 To track your order, please go to the Orders page and enter your Order ID at the top.", action: { label: "Track Order", href: "/ordersmain" } });
        break;

      case "account":
        addMessage({ from: "bot", type: "text", text: "👤 Opening your account settings...", action: { label: "My Account", href: "/account" } });
        break;

      case "address":
        addMessage({ from: "bot", type: "text", text: "📍 You can manage your delivery addresses in your account.", action: { label: "Manage Addresses", href: "/account" } });
        break;

      case "search_prompt":
        addMessage({ from: "bot", type: "text", text: "🔍 What product are you looking for? Type the product name below." });
        break;

      default: // product search
        addMessage({ from: "bot", type: "text", text: `🔍 Searching for "${text}"...` });
        await searchProducts(text);
    }
  };

  // ── Send Message ──
  const handleSend = async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed) return;
    setInput("");
    addMessage({ from: "user", type: "text", text: trimmed });
    setLoading(true);
    const intent = detectIntent(trimmed);
    await handleIntent(trimmed, intent);
    setLoading(false);
  };

  // ── Debounced live search while typing ──
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Only trigger live search if it looks like a product query
    if (val.length >= 3 && detectIntent(val) === "search") {
      debounceRef.current = setTimeout(() => {
        // just preview - don't auto-send, user can press Enter
      }, 300);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleProductClick = (product) => {
    navigate(`/products/${product.id}`);
    onClose();
  };

  const handleOrderClick = (order) => {
    navigate("/ordersmain");
    onClose();
  };

  const handleActionClick = (href) => {
    navigate(href);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="chatbot-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="chatbot-panel">
        {/* Header */}
        <div className="chatbot-header">
          <div className="chatbot-header-info">
            <div className="chatbot-avatar">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2z"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                <line x1="9" y1="9" x2="9.01" y2="9"/>
                <line x1="15" y1="9" x2="15.01" y2="9"/>
              </svg>
            </div>
            <div>
              <div className="chatbot-header-title">AI Shopping Assistant</div>
              <div className="chatbot-header-status">
                <span className="status-dot" /> Online
              </div>
            </div>
          </div>
          <button className="chatbot-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Messages */}
        <div className="chatbot-messages">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              onProductClick={handleProductClick}
              onOrderClick={handleOrderClick}
              onActionClick={handleActionClick}
              navigate={navigate}
              onClose={onClose}
              onSend={handleSend}
            />
          ))}

          {/* Loading dots */}
          {loading && (
            <div className="chatbot-msg bot-msg">
              <div className="typing-indicator">
                <span /><span /><span />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Quick Actions */}
        {messages.length <= 1 && (
          <div className="chatbot-quick-actions">
            <div className="quick-actions-label">Quick Actions</div>
            <div className="quick-actions-grid">
              {QUICK_ACTIONS.map((qa) => (
                <button
                  key={qa.label}
                  className="quick-action-chip"
                  onClick={() => handleSend(qa.message)}
                  style={{ "--chip-color": qa.color }}
                >
                  <span className="chip-icon" style={{ color: qa.color, background: qa.bg }}>
                    {qa.icon}
                  </span>
                  {qa.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="chatbot-input-area">
          <input
            ref={inputRef}
            className="chatbot-input"
            placeholder="Ask me anything... (order, products, help)"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
          />
          <button
            className="chatbot-send-btn"
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Message Bubble ───────────────────────────────────────────────────────────
const MessageBubble = ({ msg, onProductClick, onOrderClick, onActionClick, onSend }) => {
  if (msg.from === "user") {
    return (
      <div className="chatbot-msg user-msg">
        <div className="msg-bubble user-bubble">{msg.text}</div>
      </div>
    );
  }

  // Bot messages
  return (
    <div className="chatbot-msg bot-msg">
      <div className="bot-avatar-sm">🤖</div>
      <div className="bot-content">
        {/* Text */}
        {msg.type === "text" || msg.type === "welcome" ? (
          <>
            <div className="msg-bubble bot-bubble" style={{ whiteSpace: "pre-line" }}>{msg.text}</div>
            {msg.action && (
              <button className="msg-action-btn" onClick={() => onActionClick(msg.action.href)}>
                {msg.action.label} →
              </button>
            )}
          </>
        ) : null}

        {/* Orders */}
        {msg.type === "orders" && (
          <div className="orders-list">
            <div className="msg-bubble bot-bubble">📦 Found <strong>{msg.orders.length}</strong> order{msg.orders.length > 1 ? "s" : ""}:</div>
            {msg.orders.map((order) => (
              <div key={order.id} className="order-card" onClick={() => onOrderClick(order)}>
                <div className="order-card-header">
                  <span className="order-id">#{order.order_id || order.id}</span>
                  <span className="order-status-badge" style={{ background: getOrderStatusColor(order.status) }}>
                    {order.status || "Placed"}
                  </span>
                </div>
                <div className="order-card-body">
                  <div className="order-detail-row">
                    <span>📅 {formatDate(order.created_at)}</span>
                    <span className="order-amount">{formatAmount(order.total_amount)}</span>
                  </div>
                  <div className="order-detail-row">
                    <span>💳 {order.payment_method || "—"}</span>
                    <span className={`pay-status ${order.payment_status?.toLowerCase()}`}>
                      {order.payment_status || "—"}
                    </span>
                  </div>
                  {order.items?.length > 0 && (
                    <div className="order-items-preview">
                      {order.items.slice(0, 3).map((item, i) => (
                        <div key={i} className="order-item-chip">{item.product_name}</div>
                      ))}
                      {order.items.length > 3 && <div className="order-item-chip">+{order.items.length - 3} more</div>}
                    </div>
                  )}
                </div>
                <div className="order-card-footer">
                  <span>Tap to view details →</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Products */}
        {msg.type === "products" && (
          <div className="products-list">
            <div className="msg-bubble bot-bubble">✅ Found <strong>{msg.products.length}</strong> product{msg.products.length > 1 ? "s" : ""} for "<em>{msg.query}</em>":</div>
            <div className="products-grid">
              {msg.products.map((product) => {
                const img = getProductImage(product);
                const price = product.offer_price || product.price;
                const originalPrice = product.offer_price ? product.price : null;
                const discount = originalPrice
                  ? Math.round(((originalPrice - price) / originalPrice) * 100)
                  : null;
                return (
                  <div key={product.id} className="product-card-chat" onClick={() => onProductClick(product)}>
                    <div className="product-img-wrap">
                      {img ? (
                        <img src={img} alt={product.name} className="product-img-chat" />
                      ) : (
                        <div className="product-img-placeholder">🛒</div>
                      )}
                      {discount > 0 && <span className="discount-badge">{discount}% OFF</span>}
                    </div>
                    <div className="product-info-chat">
                      <div className="product-name-chat">{product.name}</div>
                      {product.brand && <div className="product-brand-chat">{product.brand}</div>}
                      <div className="product-category-chat">{product.category}</div>
                      <div className="product-price-row">
                        <span className="product-price-chat">₹{parseFloat(price || 0).toFixed(2)}</span>
                        {originalPrice && <span className="product-original-chat">₹{parseFloat(originalPrice).toFixed(2)}</span>}
                      </div>
                      {product.stock_quantity !== undefined && (
                        <div className={`stock-status ${product.stock_quantity > 0 ? "in-stock" : "out-stock"}`}>
                          {product.stock_quantity > 0 ? "✓ In Stock" : "✕ Out of Stock"}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No Products */}
        {msg.type === "no_products" && (
          <div className="msg-bubble bot-bubble no-products-msg">
            <div>{msg.text}</div>
            <div className="suggestions-label">Popular searches:</div>
            <div className="suggestion-chips">
              {["Silk Saree", "Cotton Saree", "Banarasi", "Georgette", "Bridal Saree", "Kanjeevaram"].map((s) => (
                <span key={s} className="suggestion-chip" onClick={() => onSend && onSend(s)}>{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Support */}
        {msg.type === "support" && (
          <div className="support-options">
            <div className="msg-bubble bot-bubble">🎧 How would you like to get support?</div>
            <div className="support-grid">
              {[
                {
                  label: "Live Chat", href: "/contactus", color: "#3b82f6", bg: "#eff6ff",
                  icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
                },
                {
                  label: "WhatsApp", href: "https://wa.me/919876543210", color: "#25d366", bg: "#f0fdf4",
                  icon: <svg viewBox="0 0 32 32" width="22" height="22" fill="currentColor"><path d="M16 2C8.268 2 2 8.268 2 16c0 2.492.658 4.833 1.806 6.857L2 30l7.338-1.788A13.94 13.94 0 0 0 16 30c7.732 0 14-6.268 14-14S23.732 2 16 2zm6.29 19.89c-.345.172-2.04 1.006-2.356 1.12-.316.115-.546.172-.776-.172-.23-.345-.892-1.12-1.093-1.35-.2-.23-.4-.26-.746-.086-.345.172-1.457.537-2.775 1.713-1.025.916-1.717 2.047-1.918 2.392-.2.345-.022.531.15.703.155.155.345.402.518.603.172.2.23.345.345.575.115.23.057.431-.029.603-.086.172-.776 1.87-1.063 2.56-.28.673-.565.582-.776.593l-.66.012c-.23 0-.603-.086-.919-.431-.316-.345-1.207-1.18-1.207-2.876s1.236-3.337 1.408-3.567c.172-.23 2.432-3.712 5.892-5.207.823-.355 1.466-.567 1.967-.726.827-.263 1.58-.226 2.174-.137.663.099 2.04.834 2.328 1.638.287.804.287 1.492.2 1.638z"/></svg>,
                },
                {
                  label: "Call Us", href: "tel:+919876543210", color: "#8b5cf6", bg: "#f5f3ff",
                  icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.78a16 16 0 0 0 6.29 6.29l1.64-1.64a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
                },
                {
                  label: "Email", href: "mailto:support@store.com", color: "#f59e0b", bg: "#fffbeb",
                  icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
                },
                {
                  label: "FAQs", href: "/contactus", color: "#06b6d4", bg: "#ecfeff",
                  icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
                },
                {
                  label: "Return Request", href: "/ordersmain", color: "#10b981", bg: "#f0fdf4",
                  icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4"/></svg>,
                },
                {
                  label: "Refund Help", href: "/ordersmain", color: "#240046", bg: "#f3e8ff",
                  icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
                },
                {
                  label: "Report Issue", href: "/contactus", color: "#ef4444", bg: "#fef2f2",
                  icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
                },
              ].map((opt) => (
                <a
                  key={opt.label}
                  href={opt.href}
                  target={opt.href.startsWith("http") ? "_blank" : "_self"}
                  rel="noreferrer"
                  className="support-option-btn"
                >
                  <span className="support-icon" style={{ color: opt.color, background: opt.bg }}>
                    {opt.icon}
                  </span>
                  <span>{opt.label}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatBot;
