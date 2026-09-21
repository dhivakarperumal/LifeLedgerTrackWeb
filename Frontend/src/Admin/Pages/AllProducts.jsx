import React, { useState, useEffect, useContext } from "react";
import { createPortal } from "react-dom";
import { useAdmin } from "../../PrivateRouter/AdminContext";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api";
import { toast, Toaster } from "react-hot-toast";
import { FaRupeeSign } from "react-icons/fa";
import {
    FiPlus,
    FiSearch,
    FiFilter,
    FiEdit2,
    FiTrash2,
    FiEye,
    FiBox,
    FiGrid,
    FiList,
    FiChevronRight,
    FiPackage,
    FiLayout,
    FiDatabase
} from "react-icons/fi";

const AllProducts = () => {
    const navigate = useNavigate();
    const { productsCache, setProductsCached } = useAdmin();

    const [searchTerm, setSearchTerm] = useState("");
    const [showLowStockOnly, setShowLowStockOnly] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const currentCacheKey = JSON.stringify({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
        status: showLowStockOnly ? "Low Stock" : "All"
    });

    const pageData = productsCache[currentCacheKey];
    const [products, setProducts] = useState(pageData?.products || []);
    const [loading, setLoading] = useState(!pageData);
    const [viewMode, setViewMode] = useState("table"); // 'table' or 'grid'

    // Stock Update Modal State
    const [currentProduct, setCurrentProduct] = useState(null);
    const [newStock, setNewStock] = useState("");
    const [updatingStock, setUpdatingStock] = useState(false);

    const [pagination, setPagination] = useState(pageData?.pagination || { total: 0, totalPages: 1 });
    const [stats, setStats] = useState(pageData?.stats || { total: 0, active: 0, lowStock: 0, outOfStock: 0 });

    // Rapid Add Modal
    const [isRapidAddOpen, setIsRapidAddOpen] = useState(false);
    const [rapidSaving, setRapidSaving] = useState(false);
    const [rapidProd, setRapidProd] = useState({ name: "", mrp: "", status: "Active" });

    const handleRapidAdd = async (e, shouldContinue = false) => {
        if (e) e.preventDefault();
        if (!rapidProd.name || !rapidProd.mrp) return toast.error("Essentials missing!");

        setRapidSaving(true);
        try {
            await api.post("/products", {
                ...rapidProd,
                category: "Saree",
                total_stock: "0",
                variants: []
            });
            toast.success("Boutique addition live!");
            if (shouldContinue) {
                setRapidProd({ name: "", mrp: "", status: "Active" });
            } else {
                setIsRapidAddOpen(false);
                setRapidProd({ name: "", mrp: "", status: "Active" });
            }
            fetchProducts();
        } catch (error) {
            toast.error("Process failed.");
        } finally {
            setRapidSaving(false);
        }
    };

    const fetchProducts = async () => {
        const params = {
            page: currentPage,
            limit: itemsPerPage,
            search: searchTerm,
            status: showLowStockOnly ? "Low Stock" : "All"
        };
        const cacheKey = JSON.stringify(params);
        if (!productsCache[cacheKey]) setLoading(true);

        try {
            const response = await api.get("/products", { params });
            const data = response.data;
            let finalData = {};
            if (Array.isArray(data)) {
                finalData = { products: data, pagination: { total: data.length, totalPages: 1 }, stats: { total: 0, active: 0, lowStock: 0, outOfStock: 0 } };
            } else {
                finalData = {
                    products: Array.isArray(data.products) ? data.products : [],
                    pagination: data.pagination || { total: 0, totalPages: 1 },
                    stats: data.stats || { total: 0, active: 0, lowStock: 0, outOfStock: 0 }
                };
            }
            setProducts(finalData.products);
            setPagination(finalData.pagination);
            setStats(finalData.stats);
            setProductsCached(prev => ({ ...prev, [cacheKey]: finalData }));
        } catch (error) {
            console.error("Error fetching products:", error);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchProducts();
        }, 300);
        return () => clearTimeout(timeout);
    }, [currentPage, searchTerm, showLowStockOnly]);

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this product?")) return;
        try {
            await api.delete(`/products/${id}`);
            toast.success("Product removed from vault.");
            fetchProducts();
        } catch (error) {
            toast.error("Deletion failed.");
            console.error("Error deleting product:", error);
        }
    };

    const handleStockUpdate = async (e) => {
        e.preventDefault();
        if (!currentProduct || newStock === "") return;

        setUpdatingStock(true);
        try {
            // Send partial update - most backends handle this if we send just what changed, 
            // but for ours we might need to send all or use a specific endpoint.
            // Assuming current backend needs a full update based on our previous look.
            const updatedProduct = { ...currentProduct, total_stock: parseInt(newStock) };
            await api.put(`/products/${currentProduct.id}`, updatedProduct);

            toast.success("Stock updated instantly!");
            setProducts(products.map(p => p.id === currentProduct.id ? { ...p, total_stock: parseInt(newStock), status: parseInt(newStock) === 0 ? 'Out of Stock' : parseInt(newStock) < 10 ? 'Low Stock' : 'Active' } : p));
            setCurrentProduct(null);
        } catch (error) {
            toast.error("Failed to update stock");
        } finally {
            setUpdatingStock(false);
        }
    };


    const getStatusStyle = (status) => {
        switch (status) {
            case "Active": return "bg-emerald-50 text-emerald-600 border-emerald-100";
            case "Low Stock": return "bg-amber-50 text-amber-600 border-amber-100";
            case "Out of Stock": return "bg-rose-50 text-rose-600 border-rose-100";
            default: return "bg-gray-50 text-gray-600 border-gray-100";
        }
    };

    // Simplified Pagination (Handled by backend)
    const totalPages = pagination.totalPages;
    const currentItems = products;

    // Reset to page 1 when search/filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, showLowStockOnly]);

    const getProductImage = (product) => {
        let imgUrl = null;
        try {
            const processUrl = (url) => {
                if (!url || typeof url !== 'string') return null;
                if (url.startsWith('http') || url.startsWith('data:')) return url;
                const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
                const cleanPath = url.startsWith('/') ? url : `/${url}`;
                return `${backendUrl}${cleanPath}`;
            };

            // 1. Try variants first
            if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
                const firstVar = product.variants[0];
                const vImgs = typeof firstVar.images === 'string' ? JSON.parse(firstVar.images) : firstVar.images;
                if (Array.isArray(vImgs) && vImgs.length > 0) imgUrl = vImgs[0];
            }

            // 2. Try main images column
            if (!imgUrl && product.images) {
                const imgs = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
                if (Array.isArray(imgs) && imgs.length > 0) imgUrl = imgs[0];
            }

            const finalUrl = processUrl(imgUrl);
            if (finalUrl) return finalUrl;
        } catch (e) {
            console.error("Error getting product image:", e);
        }

        return `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name || 'P')}&background=random`;
    };

    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700 min-h-screen pb-20">
            <Toaster position="top-right" />

           
           

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="w-10 h-10 border-4 border-[#7b2cbf]/20 border-t-[#7b2cbf] rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-400 font-bold text-sm">Loading products...</p>
                </div>
            ) : (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: "Total Products", value: stats.total, sub: "All saree products",    icon: <FiBox size={22} />,          gradient: "from-[#240046] to-[#7b2cbf]" },
                            { label: "Active",         value: stats.active, sub: "Active products",     icon: <FiCheckCircle />,             gradient: "from-emerald-400 to-teal-500" },
                            { label: "Inactive",       value: stats.outOfStock || 0, sub: "Inactive products", icon: <FiAlertCircle />,      gradient: "from-orange-400 to-amber-500" },
                            { label: "Low Stock",      value: stats.lowStock, sub: "Products low in stock", icon: <FiXCircle />,             gradient: "from-rose-400 to-pink-500" },
                        ].map((stat, i) => (
                            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-all">
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center text-white shadow-lg shrink-0`}>
                                    {stat.icon}
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-medium">{stat.label}</p>
                                    <p className="text-3xl font-black text-slate-800 leading-none my-0.5">{stat.value}</p>
                                    <p className="text-[10px] text-gray-400">{stat.sub}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Filter Bar */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
                        <div className="relative flex-1 min-w-[200px]">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                            <input
                                type="text"
                                placeholder="Search sarees by name, SKU..."
                                className="w-1/2 pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#7b2cbf] focus:bg-white transition-all text-sm font-medium text-slate-700"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                       
                    
                        <select className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-slate-600 outline-none hover:border-[#7b2cbf] transition-all cursor-pointer">
                            <option>Select Status</option>
                            <option>Active</option>
                            <option>Low Stock</option>
                            <option>Out of Stock</option>
                        </select>
                       <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                        <button onClick={() => setViewMode("table")} className={`p-2 rounded-lg transition-all ${viewMode === "table" ? "bg-white text-[#7b2cbf] shadow-sm" : "text-gray-400 hover:text-slate-600"}`}>
                            <FiList size={17} />
                        </button>
                        <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-white text-[#7b2cbf] shadow-sm" : "text-gray-400 hover:text-slate-600"}`}>
                            <FiGrid size={17} />
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsRapidAddOpen(true)}
                        className="flex items-center gap-2 bg-gradient-to-r from-[#240046] to-[#7b2cbf] hover:from-[#10002b] hover:to-[#5a189a] text-white px-5 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-purple-900/30 active:scale-95"
                    >
                        <FiPlus size={16} /> Add New Expensive
                    </button>
                </div>
                    </div>

                    {viewMode === "table" ? (
                        /* Table View */
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-[#1F0A3C] to-[#3c096c] border-b border-[#3c096c]">
                                            <th className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider w-10">
                                                <input type="checkbox" className="rounded border-[#FCD34D]/40 accent-[#FCD34D]" />
                                            </th>
                                            <th className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider w-12">S.No.</th>
                                            <th className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider">Saree</th>
                                            <th className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider">Category</th>
                                            <th className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider">Price</th>
                                            <th className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider">Stock</th>
                                            <th className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider">Status</th>
                                            <th className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {currentItems.map((product, index) => (
                                            <tr key={product.id} className="hover:bg-[#240046]/5 transition-colors group">
                                                <td className="px-5 py-4">
                                                    <input type="checkbox" className="rounded border-gray-300" />
                                                </td>
                                                <td className="px-3 py-4 text-sm text-gray-500 font-medium">
                                                    {(currentPage - 1) * itemsPerPage + index + 1}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 border border-gray-100 shrink-0 group-hover:scale-105 transition-transform">
                                                            <img
                                                                src={getProductImage(product)}
                                                                alt={product.name}
                                                                loading="lazy"
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name)}&background=3c096c&color=FCD34D`}
                                                            />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-800 leading-tight max-w-[180px] truncate">{product.name}</p>
                                                            <p className="text-[11px] text-gray-400 font-medium mt-0.5">SKU: {product.product_code || `SS${String(product.id).padStart(4,'0')}`}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#240046]/10 text-[#7b2cbf] border border-[#7b2cbf]/20">
                                                        {product.category || '—'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <p className="text-sm font-bold text-slate-800">₹{parseFloat(product.offer_price || product.discount_price || product.mrp || 0).toLocaleString('en-IN')}</p>
                                                    {product.mrp && product.offer_price && parseFloat(product.mrp) > parseFloat(product.offer_price) && (
                                                        <p className="text-[11px] text-gray-400 line-through">₹{parseFloat(product.mrp).toLocaleString('en-IN')}</p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <button
                                                        onClick={() => { setCurrentProduct(product); setNewStock(product.total_stock || "0"); }}
                                                        className="text-sm font-bold text-slate-700 hover:text-[#7b2cbf] underline decoration-dotted decoration-gray-300 transition-colors"
                                                    >
                                                        {product.total_stock ?? product.stock ?? 0}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`px-3 py-1 rounded-lg text-[11px] font-bold border ${getStatusStyle(product.status)}`}>
                                                        {product.status || 'Active'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <Link
                                                            to={`/admin/products/${product.id}`}
                                                            className="w-8 h-8 rounded-lg bg-[#240046]/10 text-[#7b2cbf] flex items-center justify-center hover:bg-[#240046] hover:text-[#FCD34D] transition-all"
                                                            title="View"
                                                        >
                                                            <FiEye size={13} />
                                                        </Link>
                                                        <Link
                                                            to={`/admin/products/edit/${product.id}`}
                                                            className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all"
                                                            title="Edit"
                                                        >
                                                            <FiEdit2 size={13} />
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDelete(product.id)}
                                                            className="w-8 h-8 rounded-lg bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                                                            title="Delete"
                                                        >
                                                            <FiTrash2 size={13} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Table Footer / Pagination */}
                            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
                                <p className="text-xs text-gray-500 font-medium">
                                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, pagination.total)} of {pagination.total} sarees
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-500 hover:border-[#7b2cbf] hover:text-[#7b2cbf] disabled:opacity-30 transition-all"
                                    >‹</button>
                                    {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                                        const page = i + 1;
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all border ${currentPage === page ? "bg-gradient-to-br from-[#1F0A3C] to-[#7b2cbf] border-[#7b2cbf] text-[#FCD34D] shadow-md shadow-purple-900/20" : "bg-white border-gray-200 text-gray-500 hover:border-[#7b2cbf]"}`}
                                            >
                                                {page}
                                            </button>
                                        );
                                    })}
                                    {totalPages > 5 && <span className="text-gray-400 text-sm">...</span>}
                                    {totalPages > 5 && (
                                        <button
                                            onClick={() => setCurrentPage(totalPages)}
                                            className={`w-8 h-8 rounded-lg text-xs font-bold border ${currentPage === totalPages ? "bg-gradient-to-br from-[#1F0A3C] to-[#7b2cbf] border-[#7b2cbf] text-[#FCD34D]" : "bg-white border-gray-200 text-gray-500 hover:border-[#7b2cbf]"}`}
                                        >
                                            {totalPages}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-500 hover:border-[#7b2cbf] hover:text-[#7b2cbf] disabled:opacity-30 transition-all"
                                    >›</button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Grid View */
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {currentItems.map((product) => (
                                <div key={product.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-xl transition-all flex flex-col">
                                    <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
                                        <img
                                            src={getProductImage(product)}
                                            alt={product.name}
                                            loading="lazy"
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                            onError={(e) => e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name)}&background=3c096c&color=FCD34D`}
                                        />
                                        <div className="absolute top-3 left-3">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border backdrop-blur-md ${getStatusStyle(product.status)}`}>
                                                {product.status}
                                            </span>
                                        </div>
                                        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Link to={`/admin/products/edit/${product.id}`} className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-500 shadow-md hover:bg-blue-500 hover:text-white transition-all">
                                                <FiEdit2 size={13} />
                                            </Link>
                                            <button onClick={() => handleDelete(product.id)} className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-red-400 shadow-md hover:bg-red-500 hover:text-white transition-all">
                                                <FiTrash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <p className="text-[10px] text-[#7b2cbf] font-bold uppercase tracking-widest">{product.category}</p>
                                        <h4 className="text-sm font-bold text-slate-800 truncate mt-0.5">{product.name}</h4>
                                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                                            <div>
                                                <p className="text-base font-black text-slate-800">₹{parseFloat(product.offer_price || product.mrp || 0).toLocaleString('en-IN')}</p>
                                                <p className="text-[10px] text-gray-400">Stock: {product.total_stock ?? 0}</p>
                                            </div>
                                            <Link to={`/admin/products/${product.id}`} className="px-3 py-1.5 bg-[#240046]/10 text-[#7b2cbf] rounded-lg text-xs font-bold hover:bg-[#240046] hover:text-[#FCD34D] transition-all">
                                                View
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {currentItems.length === 0 && (
                        <div className="text-center py-24 bg-white rounded-2xl border border-gray-100 flex flex-col items-center">
                            <div className="w-16 h-16 bg-[#240046]/5 rounded-full flex items-center justify-center text-[#7b2cbf]/40 mb-4">
                                <FiBox size={32} />
                            </div>
                            <p className="text-slate-500 font-bold text-sm">No products found</p>
                            <p className="text-slate-400 text-xs mt-1">Try adjusting your search or filters</p>
                        </div>
                    )}
                </>
            )}

            {/* QUICK STOCK UPDATE MODAL */}
            {currentProduct && (
                createPortal(
                <div className="fixed inset-0 z-[100] flex h-screen w-screen items-center justify-center bg-transparent p-4">
                    <div className="absolute inset-0 z-0 bg-slate-900/60 backdrop-blur-[3px]" onClick={() => setCurrentProduct(null)}></div>
                    <div className="relative z-10 bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="bg-gradient-to-r from-[#1F0A3C] to-[#3c096c] p-8 text-white relative">
                            <div className="absolute top-0 right-0 p-8 opacity-10"><FiPackage size={80} /></div>
                            <h2 className="text-2xl font-black italic uppercase tracking-tight truncate">{currentProduct.name}</h2>
                            <p className="text-xs text-[#FCD34D]/60 font-bold uppercase tracking-widest mt-1">Stock Controller</p>
                        </div>

                        <form onSubmit={handleStockUpdate} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Inventory</span>
                                    <span className="text-lg font-black text-slate-800">{currentProduct.total_stock} Units</span>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">New Stock Level</label>
                                    <input
                                        autoFocus
                                        type="number"
                                        className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-[#7b2cbf]/30 rounded-2xl outline-none font-bold text-slate-800 transition-all text-2xl text-center"
                                        placeholder="0"
                                        value={newStock}
                                        onChange={(e) => setNewStock(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={updatingStock}
                                className="w-full py-5 bg-gradient-to-r from-[#1F0A3C] to-[#7b2cbf] hover:from-[#10002b] hover:to-[#5a189a] text-[#FCD34D] rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-xl shadow-purple-900/20 flex items-center justify-center gap-3"
                            >
                                {updatingStock ? <div className="w-4 h-4 border-2 border-t-[#FCD34D] rounded-full animate-spin"></div> : "Sync Stock Record"}
                            </button>

                            <button
                                type="button"
                                onClick={() => setCurrentProduct(null)}
                                className="w-full py-2 text-[10px] font-black text-gray-400 hover:text-slate-800 uppercase tracking-widest transition-colors"
                            >
                                Cancel
                            </button>
                        </form>
                    </div>
                </div>,
                document.body
                )
            )}

            {/* RAPID PRODUCT ADD MODAL */}
            {isRapidAddOpen && (
                createPortal(
                <div className="fixed inset-0 z-[100] flex h-screen w-screen items-center justify-center bg-transparent p-4">
                    <div className="absolute inset-0 z-0 bg-slate-900/60 backdrop-blur-[3px]" onClick={() => setIsRapidAddOpen(false)}></div>
                    <div className="relative z-10 bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="bg-gradient-to-r from-[#1F0A3C] to-[#3c096c] p-8 text-white relative">
                            <div className="absolute top-0 right-0 p-8 opacity-10"><FiBox size={80} /></div>
                            <h2 className="text-2xl font-black italic uppercase tracking-tight">Rapid Addition</h2>
                            <p className="text-xs text-[#FCD34D]/60 font-bold uppercase tracking-widest mt-1">Instant AJAX Listing</p>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Title</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-[#7b2cbf]/30 rounded-2xl outline-none font-bold text-slate-800 transition-all"
                                        placeholder="e.g. Traditional Silk"
                                        value={rapidProd.name}
                                        onChange={(e) => setRapidProd({ ...rapidProd, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Price (MRP)</label>
                                    <div className="relative">
                                        <FaRupeeSign className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="number"
                                            className="w-full pl-12 pr-6 py-4 bg-gray-50 border-2 border-transparent focus:border-[#7b2cbf]/30 rounded-2xl outline-none font-bold text-slate-800 transition-all"
                                            placeholder="2999"
                                            value={rapidProd.mrp}
                                            onChange={(e) => setRapidProd({ ...rapidProd, mrp: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={(e) => handleRapidAdd(e, true)}
                                    disabled={rapidSaving}
                                    className="w-full py-5 bg-white border-2 border-[#7b2cbf]/20 hover:bg-[#240046]/5 text-[#7b2cbf] rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 flex items-center justify-center gap-3"
                                >
                                    List & Add Another
                                </button>
                                <button
                                    onClick={(e) => handleRapidAdd(e, false)}
                                    disabled={rapidSaving}
                                    className="w-full py-5 bg-gradient-to-r from-[#1F0A3C] to-[#7b2cbf] hover:from-[#10002b] hover:to-[#5a189a] text-[#FCD34D] rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-xl shadow-purple-900/20 flex items-center justify-center gap-3"
                                >
                                    {rapidSaving ? <div className="w-4 h-4 border-2 border-t-[#FCD34D] rounded-full animate-spin"></div> : "Save & Close"}
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsRapidAddOpen(false)}
                                className="w-full py-2 text-[10px] font-black text-gray-400 hover:text-slate-800 uppercase tracking-widest transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
                )
            )}
        </div>
    );
};

// SVG Helper Components
const FiCheckCircle = () => <svg stroke="currentColor" fill="none" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
const FiAlertCircle = () => <svg stroke="currentColor" fill="none" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
const FiXCircle = () => <svg stroke="currentColor" fill="none" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>

export default AllProducts;
