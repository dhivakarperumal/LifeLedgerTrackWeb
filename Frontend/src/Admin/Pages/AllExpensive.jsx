import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import api from "../../api";
import { toast, Toaster } from "react-hot-toast";
import { FaRupeeSign } from "react-icons/fa";
import {
    FiPlus, FiSearch, FiTrash2, FiList, FiGrid,
    FiX, FiArrowDown, FiArrowUp, FiRepeat, FiAlertCircle,
    FiDollarSign, FiCalendar, FiTag, FiCreditCard,
    FiFileText, FiRefreshCw, FiPaperclip, FiInfo,
    FiTrendingDown, FiCheckCircle, FiEye, FiEdit2, FiMapPin,
} from "react-icons/fi";

// ─── empty form factory ───────────────────────────────────────────────────────
const getCurrentTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};

const emptyForm = () => ({
    title: "",
    expense_amount: "",
    transfer_amount: "",
    transfer_id: "",
    category: "",
    from: "",
    to: "",
    payment_method: "Cash",
    date: new Date().toISOString().split("T")[0],
    time: getCurrentTime(),
    notes: "",
    attachment: null,
});

const PAYMENT_METHODS = ["Cash", "UPI", "Bank Transfer", "Card", "Cheque", "Other"];
const isTravelCategory = (value) => String(value || "").trim().toLowerCase() === "travel";

// ─── helpers ─────────────────────────────────────────────────────────────────
const fmt = (n) =>
    Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const AllExpensive = () => {
    // ── list state ────────────────────────────────────────────────────────────
    const [expenses, setExpenses] = useState([]);
    const [stats, setStats] = useState({ total: 0, totalAmount: 0, totalTransfer: 0, recurring: 0 });
    const [categoryOptions, setCategoryOptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [viewMode, setViewMode] = useState("table");

    // ── transfer records for dropdown ─────────────────────────────────────────
    const [transfers, setTransfers] = useState([]);

    // ── modal state ───────────────────────────────────────────────────────────
    const [isOpen, setIsOpen] = useState(false);
    const [modalMode, setModalMode] = useState("add");
    const [editId, setEditId] = useState(null);
    const [viewExpense, setViewExpense] = useState(null);
    const [form, setForm] = useState(emptyForm());
    const [saving, setSaving] = useState(false);
    // toggle: false = select from list, true = enter manually
    const [manualTransfer, setManualTransfer] = useState(false);

    // ── calculated values ─────────────────────────────────────────────────────
    const expAmt = parseFloat(form.expense_amount) || 0;
    const selectedTransfer = form.transfer_id ? transfers.find((t) => String(t.id) === String(form.transfer_id)) : null;
    const trfAmt = Number(form.transfer_amount !== "" ? form.transfer_amount : (selectedTransfer?.remaining_amount ?? selectedTransfer?.amount ?? 0));
    const remaining = form.transfer_amount !== "" || selectedTransfer ? trfAmt - expAmt : null;

    // ── fetch ─────────────────────────────────────────────────────────────────
    const fetchAll = async () => {
        setLoading(true);
        try {
            const [expRes, statsRes, transRes, categoriesRes] = await Promise.all([
                api.get("/expenses"),
                api.get("/expenses/stats"),
                api.get("/transfers"),
                api.get("/categories"),
            ]);

            const sharedCategories = Array.isArray(categoriesRes.data) ? categoriesRes.data : [];
            const expenseCategories = sharedCategories
                .filter((category) => {
                    const typeValue = String(category?.catType || category?.type || category?.category_type || "").trim().toLowerCase();
                    return ["expensive", "expense", "expenses", "expenditure", "expenditures"].includes(typeValue);
                })
                .map((category) => category.name);

            setExpenses(expRes.data || []);
            setStats(statsRes.data || { total: 0, totalAmount: 0, totalTransfer: 0, recurring: 0 });
            setTransfers(transRes.data || []);
            setCategoryOptions(expenseCategories);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load expenses.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    // ── form handlers ─────────────────────────────────────────────────────────
    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (name === "attachment") {
            setForm((f) => ({ ...f, attachment: files[0] || null }));
            return;
        }

        if (name === "category") {
            const nextIsTravel = isTravelCategory(value);
            setForm((f) => ({
                ...f,
                category: value,
                from: nextIsTravel ? f.from : "",
                to: nextIsTravel ? f.to : "",
            }));
            return;
        }

        setForm((f) => ({ ...f, [name]: value }));
    };

    const openCreateModal = () => {
        setEditId(null);
        setModalMode("add");
        setForm(emptyForm());
        setManualTransfer(false);
        setIsOpen(true);
    };

    const openEditExpense = (expense) => {
        setEditId(expense.id);
        setModalMode("edit");
        setForm({
            title: expense.title || "",
            expense_amount: expense.expense_amount ?? "",
            transfer_amount: expense.transfer_amount ?? "",
            transfer_id: expense.transfer_id ?? "",
            category: expense.category || "",
            from: expense.from || "",
            to: expense.to || "",
            payment_method: expense.payment_method || "Cash",
            date: expense.expense_date ? String(expense.expense_date).split("T")[0] : new Date().toISOString().split("T")[0],
            time: expense.expense_time ? String(expense.expense_time).slice(0, 5) : getCurrentTime(),
            notes: expense.notes || "",
            attachment: null,
        });
        setManualTransfer(!expense.transfer_id);
        setIsOpen(true);
    };

    const openViewExpense = (expense) => {
        setViewExpense(expense);
    };

    const closeModal = () => {
        setIsOpen(false);
        setEditId(null);
        setModalMode("add");
        setForm(emptyForm());
        setManualTransfer(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const isTravel = isTravelCategory(form.category);

        if (!form.title || !form.expense_amount || !form.category || !form.date) {
            toast.error("Please fill all required fields.");
            return;
        }

        if (isTravel && (!String(form.from || "").trim() || !String(form.to || "").trim())) {
            toast.error("Travel expenses require both From and To locations.");
            return;
        }
        setSaving(true);
        try {
            const payload = new FormData();
            Object.entries(form).forEach(([k, v]) => {
                if (k === "attachment") {
                    if (v) payload.append(k, v);
                    return;
                }

                if ((k === "from" || k === "to") && !isTravel) {
                    payload.append(k, "");
                    return;
                }

                if (k === "from" || k === "to") {
                    if (v !== null && v !== undefined && String(v).trim() !== "") {
                        payload.append(k, String(v));
                    }
                    return;
                }

                if (v !== null && v !== undefined && v !== "") payload.append(k, v);
            });

            let res;
            if (editId) {
                res = await api.put(`/expenses/${editId}`, payload, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                setExpenses((prev) => prev.map((item) => item.id === editId ? res.data.expense : item));
                toast.success("Expense updated! 💸");
            } else {
                res = await api.post("/expenses", payload, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                setExpenses((prev) => [res.data.expense, ...prev]);
                toast.success("Expense recorded! 💸");
            }

            closeModal();
            fetchAll();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to save expense.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this expense?")) return;
        try {
            await api.delete(`/expenses/${id}`);
            setExpenses((prev) => prev.filter((e) => e.id !== id));
            toast.success("Expense deleted.");
            fetchAll();
        } catch {
            toast.error("Failed to delete.");
        }
    };

    // ── filtered list ─────────────────────────────────────────────────────────
    const visible = expenses.filter((ex) => {
        const q = searchTerm.toLowerCase();
        const matchSearch =
            (ex.title || "").toLowerCase().includes(q) ||
            (ex.category || "").toLowerCase().includes(q) ||
            (ex.notes || "").toLowerCase().includes(q);
        const matchCat = categoryFilter === "All" || ex.category === categoryFilter;
        return matchSearch && matchCat;
    });

    // ── render ────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700 min-h-screen pb-20">
            <Toaster position="top-right" />

            {/* ── STAT CARDS ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    {
                        label: "Total Expenses",
                        value: stats.total,
                        sub: "All records",
                        icon: <FiTrendingDown size={20} />,
                        gradient: "from-[#240046] to-[#7b2cbf]",
                    },
                    {
                        label: "Total Spent",
                        value: `₹${fmt(stats.totalAmount)}`,
                        sub: "Sum of expense amounts",
                        icon: <FaRupeeSign size={18} />,
                        gradient: "from-rose-500 to-pink-500",
                    },
                    {
                        label: "Total Transferred",
                        value: `₹${fmt(stats.totalTransfer)}`,
                        sub: "Sum of transfer amounts",
                        icon: <FiRepeat size={20} />,
                        gradient: "from-amber-400 to-orange-500",
                    },
                    {
                        label: "Recurring",
                        value: stats.recurring,
                        sub: "Recurring expenses",
                        icon: <FiRefreshCw size={20} />,
                        gradient: "from-emerald-400 to-teal-500",
                    },
                ].map((s, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-all">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-white shadow-lg shrink-0`}>
                            {s.icon}
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-medium">{s.label}</p>
                            <p className="text-2xl font-black text-slate-800 leading-none my-0.5">{s.value}</p>
                            <p className="text-[10px] text-gray-400">{s.sub}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── FILTER BAR ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input
                        type="text"
                        placeholder="Search expenses..."
                        className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#7b2cbf] focus:bg-white transition-all text-sm font-medium text-slate-700"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-slate-600 outline-none hover:border-[#7b2cbf] transition-all cursor-pointer"
                >
                    <option value="All">All Categories</option>
                    {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
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
                        onClick={openCreateModal}
                        className="flex items-center gap-2 bg-gradient-to-r from-[#240046] to-[#7b2cbf] hover:from-[#10002b] hover:to-[#5a189a] text-white px-5 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-purple-900/30 active:scale-95"
                    >
                        <FiPlus size={16} /> Add Expense
                    </button>
                </div>
            </div>

            {/* ── CONTENT ── */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="w-10 h-10 border-4 border-[#7b2cbf]/20 border-t-[#7b2cbf] rounded-full animate-spin mb-4" />
                    <p className="text-gray-400 font-bold text-sm">Loading expenses...</p>
                </div>
            ) : viewMode === "table" ? (
                /* ── TABLE VIEW ── */
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-gradient-to-r from-[#1F0A3C] to-[#3c096c]">
                                    {["#", "Title", "Category", "Expense Amt", "Transfer Amt", "Remaining", "Payment", "Date", "Recurring", "Action"].map((h) => (
                                        <th key={h} className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {visible.map((ex, i) => {
                                    const hasTransfer = ex.transfer_amount != null;
                                    const rem = ex.remaining_amount;
                                    return (
                                        <tr key={ex.id} className="hover:bg-[#240046]/5 transition-colors">
                                            <td className="px-4 py-4 text-gray-500 font-medium">{i + 1}</td>
                                            <td className="px-4 py-4">
                                                <p className="font-bold text-slate-800 max-w-[160px] truncate">{ex.title}</p>
                                                {ex.notes && <p className="text-[11px] text-gray-400 truncate max-w-[160px]">{ex.notes}</p>}
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#240046]/10 text-[#7b2cbf] border border-[#7b2cbf]/20">
                                                    {ex.category}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="font-black text-rose-600">₹{fmt(ex.expense_amount)}</p>
                                            </td>
                                            <td className="px-4 py-4">
                                                {hasTransfer
                                                    ? <p className="font-bold text-amber-600">₹{fmt(ex.transfer_amount)}</p>
                                                    : <span className="text-gray-300 text-xs">—</span>}
                                            </td>
                                            <td className="px-4 py-4">
                                                {hasTransfer ? (
                                                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${rem >= 0 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"}`}>
                                                        ₹{fmt(rem)}
                                                    </span>
                                                ) : <span className="text-gray-300 text-xs">—</span>}
                                            </td>
                                            <td className="px-4 py-4 text-slate-600 text-xs font-medium">{ex.payment_method || "—"}</td>
                                            <td className="px-4 py-4 text-slate-600 text-xs whitespace-nowrap">
                                                {ex.expense_date ? String(ex.expense_date).split("T")[0] : "—"}
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${ex.recurring === "Yes" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-gray-50 text-gray-500 border-gray-100"}`}>
                                                    {ex.recurring === "Yes" ? "Yes" : "No"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    {ex.attachment && (
                                                        <button
                                                            type="button"
                                                            onClick={() => openViewExpense(ex)}
                                                            className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all"
                                                            title="View Receipt"
                                                        >
                                                            <FiEye size={13} />
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditExpense(ex)}
                                                        className="w-8 h-8 rounded-lg bg-violet-50 text-violet-500 flex items-center justify-center hover:bg-violet-500 hover:text-white transition-all"
                                                        title="Edit expense"
                                                    >
                                                        <FiEdit2 size={13} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(ex.id)}
                                                        className="w-8 h-8 rounded-lg bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                                                    >
                                                        <FiTrash2 size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {visible.length === 0 && (
                        <div className="text-center py-16 text-gray-400 font-semibold text-sm">
                            No expenses found.
                        </div>
                    )}
                </div>
            ) : (
                /* ── GRID VIEW ── */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {visible.map((ex) => {
                        const hasTransfer = ex.transfer_amount != null;
                        const rem = ex.remaining_amount;
                        return (
                            <div key={ex.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-all">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm leading-tight">{ex.title}</p>
                                        <span className="mt-1 inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-[#240046]/10 text-[#7b2cbf]">
                                            {ex.category}
                                        </span>
                                    </div>
                                    <div className="flex gap-1.5">
                                        {ex.attachment && (
                                            <button
                                                type="button"
                                                onClick={() => openViewExpense(ex)}
                                                className="w-7 h-7 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all shrink-0"
                                                title="View"
                                            >
                                                <FiEye size={12} />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => openEditExpense(ex)}
                                            className="w-7 h-7 rounded-lg bg-violet-50 text-violet-500 flex items-center justify-center hover:bg-violet-500 hover:text-white transition-all shrink-0"
                                            title="Edit"
                                        >
                                            <FiEdit2 size={12} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(ex.id)}
                                            className="w-7 h-7 rounded-lg bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shrink-0"
                                        >
                                            <FiTrash2 size={12} />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-50">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400 font-medium">Expense</span>
                                        <span className="font-black text-rose-600">₹{fmt(ex.expense_amount)}</span>
                                    </div>
                                    {hasTransfer && (
                                        <>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-gray-400 font-medium">Transfer</span>
                                                <span className="font-bold text-amber-600">₹{fmt(ex.transfer_amount)}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-gray-400 font-medium">Remaining</span>
                                                <span className={`font-bold ${rem >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                                    ₹{fmt(rem)}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium mt-auto pt-2 border-t border-gray-50">
                                    <span>{ex.expense_date ? String(ex.expense_date).split("T")[0] : "—"}</span>
                                    <span>{ex.payment_method}</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${ex.recurring === "Yes" ? "bg-emerald-50 text-emerald-600" : "bg-gray-50 text-gray-400"}`}>
                                            {ex.recurring === "Yes" ? "Recurring" : "One-time"}
                                        </span>
                                        {ex.attachment && (
                                            <a
                                                href={`${import.meta.env.VITE_API_URL.replace("/api", "")}${ex.attachment}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="px-2 py-0.5 rounded bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white transition-all text-[9px] font-bold flex items-center gap-1"
                                            >
                                                <FiPaperclip size={10} /> Receipt
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {visible.length === 0 && (
                        <div className="col-span-full text-center py-16 text-gray-400 font-semibold text-sm">
                            No expenses found.
                        </div>
                    )}
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                ADD EXPENSE MODAL
            ════════════════════════════════════════════════════════════════ */}
            {viewExpense && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
                    <div className="absolute inset-0" onClick={() => setViewExpense(null)} />
                    <div className="relative z-10 w-full max-w-xl bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="bg-gradient-to-r from-[#1F0A3C] to-[#3c096c] px-6 py-5 text-white flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FCD34D]/70">Expense Details</p>
                                <h2 className="text-2xl font-black mt-1">{viewExpense.title}</h2>
                            </div>
                            <button onClick={() => setViewExpense(null)} className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                                <FiX size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 text-sm text-slate-700">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-xl bg-slate-50 p-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</p>
                                    <p className="mt-2 font-bold text-slate-800">{viewExpense.category || "—"}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</p>
                                    <p className="mt-2 font-black text-rose-600">₹{fmt(viewExpense.expense_amount)}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-xl bg-slate-50 p-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date</p>
                                    <p className="mt-2 font-bold text-slate-800">{viewExpense.expense_date ? String(viewExpense.expense_date).split("T")[0] : "—"}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment</p>
                                    <p className="mt-2 font-bold text-slate-800">{viewExpense.payment_method || "—"}</p>
                                </div>
                            </div>

                            {viewExpense.notes && (
                                <div className="rounded-xl bg-slate-50 p-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notes</p>
                                    <p className="mt-2 leading-6 text-slate-700">{viewExpense.notes}</p>
                                </div>
                            )}

                            {viewExpense.attachment && (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Receipt</p>
                                    <a
                                        href={`${import.meta.env.VITE_API_URL.replace("/api", "")}${viewExpense.attachment}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-violet-100 px-3 py-2 text-sm font-bold text-violet-700 hover:bg-violet-200"
                                    >
                                        <FiPaperclip size={14} /> Open attachment
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isOpen && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
                    <div
                        className="absolute inset-0"
                        onClick={closeModal}
                    />
                    <div className="relative z-10 w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[95vh] flex flex-col">

                        {/* ── header ── */}
                        <div className="bg-gradient-to-r from-[#1F0A3C] to-[#3c096c] px-8 py-6 text-white flex items-center justify-between shrink-0">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FCD34D]/70">Finance Management</p>
                                <h2 className="text-2xl font-black mt-1">💸 {modalMode === "edit" ? "Edit Expense" : "Add Expense"}</h2>
                            </div>
                            <button onClick={closeModal} className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                                <FiX size={18} />
                            </button>
                        </div>

                        {/* ── body ── */}
                        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-8 py-6 space-y-5">

                            {/* Expense Title */}
                            <Field label="Expense Title *" icon={<FiFileText />}>
                                <input
                                    autoFocus
                                    type="text"
                                    name="title"
                                    required
                                    value={form.title}
                                    onChange={handleChange}
                                    placeholder="e.g. Monthly Grocery"
                                    className={inputCls}
                                />
                            </Field>

                            {/* Amount row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Expense Amount */}
                                <Field label="Expense Amount ₹ *" icon={<FaRupeeSign />}>
                                    <input
                                        type="number"
                                        name="expense_amount"
                                        required
                                        min="0.01"
                                        step="0.01"
                                        value={form.expense_amount}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                        className={inputCls}
                                    />
                                </Field>

                                {/* Transfer Amount (dropdown from transfers) */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            <span className="text-[#7b2cbf]"><FiRepeat size={11} /></span>
                                            Transfer Amount ₹
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setManualTransfer((m) => !m);
                                                setForm((f) => ({ ...f, transfer_amount: "", transfer_id: "" }));
                                            }}
                                            className="text-[10px] font-bold text-[#7b2cbf] hover:underline"
                                        >
                                            {manualTransfer ? "← Select from list" : "Enter manually →"}
                                        </button>
                                    </div>

                                    {manualTransfer ? (
                                        /* Manual number input */
                                        <input
                                            type="number"
                                            name="transfer_amount"
                                            min="0"
                                            step="0.01"
                                            value={form.transfer_amount}
                                            onChange={handleChange}
                                            placeholder="0.00"
                                            className={inputCls}
                                        />
                                    ) : (
                                        /* Dropdown from saved transfer records */
                                        <select
                                            value={form.transfer_id}
                                            onChange={(e) => {
                                                const selId = e.target.value;
                                                const selTransfer = transfers.find(t => String(t.id) === String(selId));
                                                const remAmt = selTransfer
                                                    ? Number(selTransfer.remaining_amount ?? selTransfer.amount ?? 0)
                                                    : "";
                                                setForm((f) => ({
                                                    ...f,
                                                    transfer_id: selId,
                                                    transfer_amount: selId ? remAmt : ""
                                                }));
                                            }}
                                            className={selectCls}
                                        >
                                            <option value="">— No transfer / select record —</option>
                                            {transfers.length === 0 && (
                                                <option disabled>No transfer records found</option>
                                            )}
                                            {transfers.map((t) => {
                                                const dateStr = t.transfer_date
                                                    ? String(t.transfer_date).split("T")[0]
                                                    : "";
                                                const remAmt = Number(t.remaining_amount ?? t.amount ?? 0);
                                                const remStr = remAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 });
                                                return (
                                                    <option key={t.id} value={t.id} disabled={remAmt <= 0}>
                                                        {t.title} — ₹{remStr} 
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    )}
                                </div>
                            </div>

                            {/* ── LIVE CALCULATION BOX — appears as soon as transfer is selected ── */}
                            {trfAmt > 0 && (
                                <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-4">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                        <FiInfo size={12} /> Live Calculation
                                    </p>

                                    {/* Row: Available Remaining in Transfer */}
                                    <div className="flex items-center justify-between py-2 border-b border-slate-200">
                                        <span className="text-sm text-gray-500 font-medium">Available Remaining</span>
                                        <span className="text-sm font-black text-amber-600">₹{fmt(trfAmt)}</span>
                                    </div>

                                    {/* Row: Expense */}
                                    <div className="flex items-center justify-between py-2 border-b border-slate-200">
                                        <span className="text-sm text-gray-500 font-medium">Expense Amount</span>
                                        <span className="text-sm font-black text-rose-600">
                                            {expAmt > 0 ? `− ₹${fmt(expAmt)}` : <span className="text-gray-300 font-medium text-xs italic">Enter expense above ↑</span>}
                                        </span>
                                    </div>

                                    {/* Row: Remaining */}
                                    <div className={`flex items-center justify-between pt-3 mt-1 rounded-xl px-3 py-2 ${
                                        expAmt > 0
                                            ? remaining >= 0
                                                ? "bg-emerald-100 border border-emerald-200"
                                                : "bg-red-100 border border-red-200"
                                            : "bg-gray-100 border border-gray-200"
                                    }`}>
                                        <span className="text-sm font-black text-slate-700">
                                            {expAmt > 0
                                                ? remaining >= 0 ? "✅ Remaining Balance" : "⚠️ Over Budget"
                                                : "Remaining Balance"}
                                        </span>
                                        <span className={`text-xl font-black ${
                                            expAmt > 0
                                                ? remaining >= 0 ? "text-emerald-600" : "text-red-600"
                                                : "text-gray-400"
                                        }`}>
                                            ₹{expAmt > 0 ? fmt(remaining) : fmt(trfAmt)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Category + Payment Method */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field label="Expense Category *" icon={<FiTag />}>
                                    <select
                                        name="category"
                                        required
                                        value={form.category}
                                        onChange={handleChange}
                                        className={selectCls}
                                    >
                                        <option value="">{categoryOptions.length ? "Select a category" : "No categories available"}</option>
                                        {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </Field>

                                <Field label="Payment Method" icon={<FiCreditCard />}>
                                    <select
                                        name="payment_method"
                                        value={form.payment_method}
                                        onChange={handleChange}
                                        className={selectCls}
                                    >
                                        {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
                                    </select>
                                </Field>
                            </div>

                            {isTravelCategory(form.category) && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="From *" icon={<FiMapPin />}>
                                        <input
                                            type="text"
                                            name="from"
                                            value={form.from}
                                            onChange={handleChange}
                                            placeholder="Ambur"
                                            className={inputCls}
                                            required
                                        />
                                    </Field>

                                    <Field label="To *" icon={<FiMapPin />}>
                                        <input
                                            type="text"
                                            name="to"
                                            value={form.to}
                                            onChange={handleChange}
                                            placeholder="Chennai"
                                            className={inputCls}
                                            required
                                        />
                                    </Field>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field label="Date *" icon={<FiCalendar />}>
                                    <input
                                        type="date"
                                        name="date"
                                        required
                                        value={form.date}
                                        onChange={handleChange}
                                        className={inputCls}
                                    />
                                </Field>

                                <Field label="Time" icon={<FiCalendar />}>
                                    <input
                                        type="time"
                                        name="time"
                                        value={form.time || getCurrentTime()}
                                        onChange={handleChange}
                                        className={inputCls}
                                    />
                                </Field>
                            </div>

                            {/* Notes */}
                            <Field label="Description / Notes" icon={<FiFileText />}>
                                <textarea
                                    name="notes"
                                    rows={3}
                                    value={form.notes}
                                    onChange={handleChange}
                                    placeholder="Add any extra details..."
                                    className={`${inputCls} resize-none`}
                                />
                            </Field>

                            {/* Attachment */}
                            <Field label="Attachment / Receipt — Optional" icon={<FiPaperclip />}>
                                <input
                                    type="file"
                                    name="attachment"
                                    accept="image/*,application/pdf"
                                    onChange={handleChange}
                                    className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#240046]/10 file:text-[#7b2cbf] file:font-bold hover:file:bg-[#240046]/20 file:cursor-pointer cursor-pointer"
                                />
                            </Field>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 py-3.5 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#1F0A3C] to-[#7b2cbf] hover:from-[#10002b] hover:to-[#5a189a] text-[#FCD34D] font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-purple-900/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
                                >
                                    {saving
                                        ? <><div className="w-4 h-4 border-2 border-t-[#FCD34D] rounded-full animate-spin" /> Saving…</>
                                        : <><FiPlus size={15} /> Save Expense</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

// ── sub-components ────────────────────────────────────────────────────────────
const inputCls =
    "w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-[#7b2cbf]/30 rounded-xl outline-none font-medium text-slate-800 transition-all text-sm";

const selectCls =
    "w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-[#7b2cbf]/30 rounded-xl outline-none font-medium text-slate-700 transition-all text-sm cursor-pointer";

const Field = ({ label, icon, children }) => (
    <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
            <span className="text-[#7b2cbf]">{icon}</span>
            {label}
        </label>
        {children}
    </div>
);

const CalcBlock = ({ label, value, color }) => (
    <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
        <p className="text-[10px] text-gray-400 font-medium">{label}</p>
        <p className={`text-lg font-black ${color}`}>{value}</p>
    </div>
);

export default AllExpensive;
