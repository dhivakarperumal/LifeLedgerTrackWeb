import React, { useState, useEffect } from "react";
import { FiArrowLeft, FiSearch, FiSave, FiLayers, FiBox, FiPlus, FiCheck } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { toast, Toaster } from "react-hot-toast";

const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const getImageUrl = (imagePath) => {
  if (!imagePath) return `https://ui-avatars.com/api/?name=Product&background=random`;
  if (imagePath.startsWith('http')) return imagePath;
  return `${BACKEND_URL}${imagePath}`;
};

const AddStock = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState("");
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [loading, setLoading] = useState(false);

    // UI state for inputs
    const [stockAdditions, setStockAdditions] = useState({});
    const [manualTotalStockAdd, setManualTotalStockAdd] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchProducts();
        }, 300);
        return () => clearTimeout(timeout);
    }, [search]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const params = { search };
            const res = await api.get("/products", { params });
            const data = res.data;
            setProducts(Array.isArray(data) ? data : (data.products || []));
        } catch (error) {
            toast.error("Failed to load products");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectProduct = async (prod) => {
        setSelectedProduct(null);
        setStockAdditions({});
        setManualTotalStockAdd("");
        setSearch("");
        try {
            const res = await api.get(`/products/${prod.id}`);
            const p = res.data;
            let variants = [];
            if (p.variants) {
                variants = typeof p.variants === 'string' ? JSON.parse(p.variants) : p.variants;
            }
            setSelectedProduct({ ...p, variants: Array.isArray(variants) ? variants : [] });
        } catch (error) {
            toast.error("Failed to fetch product details");
        }
    };

    const handleSearchChange = (e) => {
        setSearch(e.target.value);
        if (selectedProduct) setSelectedProduct(null); // Clear selection if user searches again
    };

    const filteredProducts = products;

    const handleAdditionChange = (key, value) => {
        const val = value.replace(/[^0-9]/g, '');
        setStockAdditions(prev => ({ ...prev, [key]: val }));
    };

    const getCurrentStockValue = (product) => {
        const current = Number.parseInt(product?.total_stock ?? product?.stock ?? 0, 10) || 0;
        return Math.max(0, current);
    };

    const handleSave = async () => {
        if (!selectedProduct) return;
        setIsSaving(true);
        try {
            const updatedVariants = [...selectedProduct.variants];
            let addedTotal = 0;
            const hasVariantsWithSizes = updatedVariants.some(v => v.sizesStock && Object.keys(v.sizesStock).length > 0);

            if (hasVariantsWithSizes) {
                updatedVariants.forEach((v, vIndex) => {
                    if (v.sizesStock) {
                        Object.keys(v.sizesStock).forEach(size => {
                            const key = `${vIndex}-${size}`;
                            const addition = parseInt(stockAdditions[key]) || 0;
                            v.sizesStock[size] = (parseInt(v.sizesStock[size]) || 0) + addition;
                            addedTotal += addition;
                        });
                    }
                });
            } else {
                addedTotal = parseInt(manualTotalStockAdd) || 0;
            }

            if (addedTotal === 0) {
                toast.error("Please add a quantity greater than 0");
                setIsSaving(false);
                return;
            }

            const oldTotal = getCurrentStockValue(selectedProduct);
            const newTotalStock = oldTotal + addedTotal;
            const status = newTotalStock <= 0 ? "Out of Stock" : newTotalStock < 10 ? "Low Stock" : "Active";

            const payload = {
                ...selectedProduct,
                total_stock: newTotalStock.toString(),
                stock: newTotalStock.toString(),
                status: status,
                variants: updatedVariants
            };

            await api.put(`/products/${selectedProduct.id}`, payload);
            toast.success(`Successfully added ${addedTotal} to stock!`);
            setTimeout(() => navigate(-1), 1500);
        } catch (error) {
            toast.error("Failed to add stock");
        } finally {
            setIsSaving(false);
        }
    };

    const hasSizes = selectedProduct && selectedProduct.variants && selectedProduct.variants.some(v => v.sizesStock && Object.keys(v.sizesStock).length > 0);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            <Toaster position="top-right" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2">
                <div className="flex items-center gap-3 sm:gap-4">
                    <button onClick={() => navigate(-1)} className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-blue-600 transition-all shadow-sm active:scale-95 shadow-blue-500/5">
                        <FiArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl sm:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                            Add New Stock
                        </h1>
                        <p className="text-sm font-bold text-gray-400 mt-1">Select a product and top up your inventory securely.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Search & Selection Section */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-4">Step 1: Find Product</label>
                        <div className="relative mb-4">
                            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={handleSearchChange}
                                placeholder="Search by name or SKU..."
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent rounded-[1rem] outline-none focus:bg-white focus:border-blue-500/30 transition-all text-sm font-bold text-slate-800 shadow-inner"
                            />
                        </div>

                        {!selectedProduct && (
                            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                                {filteredProducts.map(prod => (
                                    <button
                                        key={prod.id}
                                        onClick={() => handleSelectProduct(prod)}
                                        className="w-full text-left p-3 rounded-xl bg-gray-50 hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-all flex items-center gap-3 group"
                                    >
                                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200">
                                            <img
                                                src={getImageUrl((prod.variants && prod.variants.length > 0 && prod.variants[0].images?.length > 0) ? prod.variants[0].images[0] : (prod.images && prod.images.length > 0) ? prod.images[0] : null)}
                                                alt={prod.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-sm font-black text-slate-800 truncate">{prod.name}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{prod.product_code || `#SKU-${1000 + prod.id}`}</p>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 text-blue-500 transition-opacity">
                                            <FiPlus />
                                        </div>
                                    </button>
                                ))}
                                {filteredProducts.length === 0 && search && (
                                    <p className="text-xs text-center font-bold text-gray-400 py-4">No products found.</p>
                                )}
                            </div>
                        )}
                        {selectedProduct && (
                            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                                    <FiCheck /> Product Selected
                                </div>
                                <button onClick={() => setSelectedProduct(null)} className="text-[10px] font-black uppercase text-blue-500 hover:text-blue-700 bg-white px-2 py-1 rounded-lg">
                                    Change
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Addition Section */}
                <div className="lg:col-span-2 space-y-6">
                    {selectedProduct ? (
                        <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute -top-10 -right-10 p-8 opacity-[0.03] text-blue-600">
                                <FiLayers size={200} />
                            </div>

                            <div className="relative z-10 space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 shadow-inner">
                                        <img
                                            src={getImageUrl((selectedProduct.variants && selectedProduct.variants.length > 0 && selectedProduct.variants[0].images?.length > 0) ? selectedProduct.variants[0].images[0] : (selectedProduct.images && selectedProduct.images.length > 0) ? selectedProduct.images[0] : null)}
                                            alt={selectedProduct.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">{selectedProduct.name}</h2>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{selectedProduct.product_code || `#SKU-${1000 + selectedProduct.id}`}</span>
                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-200"></span>
                                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md">Total Current: {selectedProduct.total_stock || 0}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 space-y-6">
                                    <label className="text-xs font-black text-slate-800 uppercase tracking-widest block flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                        Step 2: Enter New Stock Details
                                    </label>

                                    {hasSizes ? (
                                        <div className="space-y-6">
                                            {selectedProduct.variants.map((v, vIndex) => {
                                                if (!v.sizesStock || Object.keys(v.sizesStock).length === 0) return null;
                                                return (
                                                    <div key={vIndex} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                                        <div className="flex items-center gap-3 mb-4">
                                                            <div className="w-5 h-5 rounded-full shadow-sm border border-gray-200" style={{ backgroundColor: v.color }}></div>
                                                            <span className="text-sm font-black text-slate-800">{v.colorName || 'Default Shade'}</span>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                            {Object.entries(v.sizesStock).map(([size, currentStock]) => {
                                                                const key = `${vIndex}-${size}`;
                                                                const added = parseInt(stockAdditions[key]) || 0;
                                                                const oldTotal = parseInt(currentStock) || 0;
                                                                const newTotalMatch = oldTotal + added;
                                                                return (
                                                                    <div key={size} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                                        <div className="flex justify-between items-center mb-2">
                                                                            <label className="text-[10px] font-black text-gray-400 uppercase">{size}</label>
                                                                            <span className="text-[9px] font-black bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-md">Curr: {oldTotal}</span>
                                                                        </div>
                                                                        <div className="relative mt-1">
                                                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">+</div>
                                                                            <input
                                                                                type="text"
                                                                                value={stockAdditions[key] || ""}
                                                                                onChange={(e) => handleAdditionChange(key, e.target.value)}
                                                                                className="w-full pl-8 pr-3 py-2.5 bg-white border border-blue-100 focus:border-blue-500 outline-none rounded-lg text-lg font-black text-blue-600 shadow-inner transition-all placeholder:text-gray-300"
                                                                                placeholder="0"
                                                                            />
                                                                        </div>
                                                                        {added > 0 && (
                                                                            <p className="text-[10px] text-emerald-500 font-bold mt-2 text-right tracking-tight">
                                                                                New Total = {newTotalMatch}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                                            <div className="flex justify-between items-end">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase">Quantity to Add</label>
                                                    <p className="text-xs font-bold text-gray-500">Current Stock: <span className="text-slate-800">{selectedProduct.total_stock || 0}</span></p>
                                                </div>
                                                {parseInt(manualTotalStockAdd) > 0 && (
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase">New Total Stock</p>
                                                        <p className="text-xl font-black text-emerald-500">{(parseInt(selectedProduct.total_stock) || 0) + (parseInt(manualTotalStockAdd) || 0)}</p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 font-black text-xl">+</div>
                                                <input
                                                    type="text"
                                                    value={manualTotalStockAdd}
                                                    onChange={(e) => setManualTotalStockAdd(e.target.value.replace(/[^0-9]/g, ''))}
                                                    placeholder="0"
                                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-blue-100 rounded-[1rem] outline-none focus:bg-white focus:border-blue-500 transition-all text-2xl font-black text-blue-600 shadow-inner"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-end">
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="flex items-center justify-center gap-3 bg-primary border-4 border-white hover:bg-primary-light disabled:bg-slate-400 text-white py-4 px-10 rounded-[2.5rem] text-lg font-black shadow-2xl shadow-slate-200 transition-all active:scale-95 group w-full sm:w-auto"
                                    >
                                        {isSaving ? (
                                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <>
                                                <FiSave className="text-xl group-hover:scale-110 transition-transform" />
                                                <span>Confirm & Update Stock</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full min-h-[400px] border-2 border-dashed border-gray-100 rounded-[2.5rem] flex flex-col items-center justify-center bg-gray-50/50 text-center p-10">
                            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-gray-300 mb-4">
                                <FiBox size={32} />
                            </div>
                            <h3 className="text-lg font-black text-gray-400">No Product Selected</h3>
                            <p className="text-sm font-bold text-gray-400 mt-2 max-w-xs mx-auto">Please find and select a product from the left pane to add new stock to its inventory.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddStock;
