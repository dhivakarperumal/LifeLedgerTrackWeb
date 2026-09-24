import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    FiDollarSign, FiSend, FiX, FiPlus, FiSearch,
    FiGrid, FiList, FiArrowRight, FiTrash2, FiRefreshCw,
    FiUpload, FiPaperclip, FiEye, FiEdit2,
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import api from "../../api";

/* ── helpers ────────────────────────────────────────────────────────────── */
const fmt = (v) =>
    `₹${Number(v || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

const emptyForm = () => ({
    title: "",
    amount: "",
    paymentMethod: "Cash",
    category: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
});

/* ── main component ─────────────────────────────────────────────────────── */
const Transfer = () => {
    const navigate = useNavigate();

    const [transfers, setTransfers] = useState([]);
    const [incomes, setIncomes] = useState([]);
    const [transferCategoryOptions, setTransferCategoryOptions] = useState([]);
    const [selectedIncomeId, setSelectedIncomeId] = useState("");
    const [selectedTransfer, setSelectedTransfer] = useState(null);
    const [editingTransferId, setEditingTransferId] = useState(null);
    const [formData, setFormData] = useState(emptyForm());
    const [receiptFile, setReceiptFile] = useState(null);
    const [existingReceipt, setExistingReceipt] = useState(null);
    const fileInputRef = useRef(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All Transfers");
    const [viewMode, setViewMode] = useState("table");
    const [deletingId, setDeletingId] = useState(null);

    /* ── data loaders ─────────────────────────────────────────────────── */
    const loadTransfers = async () => {
        try {
            const res = await api.get("/transfers");
            setTransfers(res.data || []);
        } catch (err) {
            console.error("Fetch Transfers Error:", err);
            toast.error("Failed to load transfers.");
        }
    };

    const loadIncomes = async () => {
        try {
            const res = await api.get("/incomes");
            setIncomes(res.data || []);
        } catch (err) {
            console.error("Fetch Incomes Error:", err);
        }
    };

    const loadCategories = async () => {
        try {
            const res = await api.get("/categories");
            const categories = Array.isArray(res.data) ? res.data : [];
            const transferKeywords = [
                "transfer",
                "transfers",
                "budget transfer",
                "budgettransfer",
                "saving",
                "savings",
                "investment",
                "investments",
            ];

            const filteredTransferCategories = categories
                .filter((category) => {
                    const typeValue = String(category?.catType || category?.type || category?.category_type || "")
                        .trim()
                        .toLowerCase();
                    const nameValue = String(category?.name || "").trim().toLowerCase();

                    return (
                        typeValue === "transfer"
                        || typeValue.includes("transfer")
                        || typeValue.includes("saving")
                        || typeValue.includes("investment")
                        || transferKeywords.some((keyword) => nameValue.includes(keyword))
                    );
                })
                .map((category) => String(category.name).trim())
                .filter(Boolean);

            setTransferCategoryOptions([...new Set(filteredTransferCategories)]);
        } catch (err) {
            console.error("Fetch Transfer Categories Error:", err);
            setTransferCategoryOptions([]);
        }
    };

    const loadAll = async () => {
        setLoading(true);
        await Promise.all([loadTransfers(), loadIncomes(), loadCategories()]);
        setLoading(false);
    };

    useEffect(() => { loadAll(); }, []);

    /* ── selected income helpers ──────────────────────────────────────── */
    const selectedIncome = useMemo(
        () => incomes.find((i) => String(i.id) === String(selectedIncomeId)) || null,
        [incomes, selectedIncomeId],
    );
    const availableBalance   = Number(selectedIncome?.remaining_amount ?? selectedIncome?.amount ?? 0);
    const transferAmount     = Number(formData.amount || 0);
    const remainingAfterThis = selectedIncome ? Math.max(availableBalance - transferAmount, 0) : 0;

    /* ── form handlers ────────────────────────────────────────────────── */
    const handleChange = (e) =>
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

    const handleIncomeSelect = (e) => {
        const id = e.target.value;
        setSelectedIncomeId(id);
        setFormData((prev) => ({ ...prev, amount: "" }));
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedIncomeId("");
        setSelectedTransfer(null);
        setEditingTransferId(null);
        setExistingReceipt(null);
        setFormData(emptyForm());
        setReceiptFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const openAddTransfer = () => {
        setSelectedTransfer(null);
        setEditingTransferId(null);
        setExistingReceipt(null);
        setSelectedIncomeId("");
        setFormData(emptyForm());
        setReceiptFile(null);
        setIsModalOpen(true);
    };

    const openEditTransfer = (transfer) => {
        setSelectedTransfer(null);
        setEditingTransferId(transfer.id);
        setExistingReceipt(transfer.receipt || null);
        setSelectedIncomeId(transfer.source_income_id ? String(transfer.source_income_id) : "");
        setFormData({
            title: transfer.title || "",
            amount: transfer.amount ?? "",
            category: transfer.category || "",
            paymentMethod: transfer.payment_method || "Cash",
            date: transfer.transfer_date ? String(transfer.transfer_date).split("T")[0] : new Date().toISOString().split("T")[0],
            notes: transfer.notes || "",
        });
        setReceiptFile(null);
        setIsModalOpen(true);
    };

    const openViewTransfer = (transfer) => setSelectedTransfer(transfer);

    /* ── submit ───────────────────────────────────────────────────────── */
    const handleSubmit = async (e) => {
        e.preventDefault();
        const numericAmount = Number(formData.amount);

        if (!numericAmount || numericAmount <= 0) {
            toast.error("Transfer amount must be greater than zero.");
            return;
        }

        if (selectedIncome && numericAmount > availableBalance) {
            toast.error(
                `Insufficient income balance. Available: ${fmt(availableBalance)}`,
            );
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = new FormData();
            payload.append("title", formData.title);
            payload.append("amount", numericAmount);
            payload.append("category", formData.category);
            payload.append("paymentMethod", formData.paymentMethod);
            payload.append("date", formData.date);
            payload.append("notes", formData.notes);
            payload.append("sourceIncomeId", selectedIncome ? selectedIncome.id : "");
            if (receiptFile) payload.append("receipt", receiptFile);

            let response;
            if (editingTransferId) {
                response = await api.put(`/transfers/${editingTransferId}`, payload, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                setTransfers((current) => current.map((item) => item.id === editingTransferId ? response.data.transfer : item));
                toast.success("Transfer updated successfully!");
            } else {
                response = await api.post("/transfers", payload, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                setTransfers((current) => [response.data.transfer, ...current]);
                toast.success("Transfer saved successfully!");
            }
            closeModal();
            await loadAll();
        } catch (err) {
            toast.error(err.response?.data?.message || "Transfer failed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    /* ── delete ───────────────────────────────────────────────────────── */
    const handleDelete = async (id) => {
        if (!window.confirm("Delete this transfer? Any linked expenses will keep their data."))
            return;
        setDeletingId(id);
        try {
            await api.delete(`/transfers/${id}`);
            toast.success("Transfer deleted.");
            await loadAll();
        } catch (err) {
            toast.error(err.response?.data?.message || "Delete failed.");
        } finally {
            setDeletingId(null);
        }
    };

    /* ── derived stats ────────────────────────────────────────────────── */
    const totalTransferred = transfers.reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalRemaining   = transfers.reduce((s, t) => s + Number(t.remaining_amount ?? t.amount ?? 0), 0);
    const totalExpense     = transfers.reduce((s, t) => s + Number(t.total_expense || 0), 0);

    /* ── filtered list ────────────────────────────────────────────────── */
    const visible = transfers.filter((t) => {
        const hay = `${t.title || ""} ${t.category || ""}`.toLowerCase();
        const matchSearch = hay.includes(searchTerm.toLowerCase());
        const matchFilter = categoryFilter === "All Transfers" || t.category === categoryFilter;
        return matchSearch && matchFilter;
    });

    /* ── render ───────────────────────────────────────────────────────── */
    return (
        <div className="space-y-6 pb-20">

            {/* ── stat cards ──────────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
                <StatCard label="Total Transfers"    value={transfers.length}        caption="All records"           color="bg-[#4b0b78]" icon={<FiSend />} />
                <StatCard label="Amount Transferred" value={fmt(totalTransferred)}   caption="Total moved amount"    color="bg-[#3c096c]" icon={<FiDollarSign />} />
                <StatCard label="Total Expense"      value={fmt(totalExpense)}        caption="Spent from transfers"  color="bg-red-600"   icon={<FiArrowRight />} />
                <StatCard label="Total Remaining"    value={fmt(totalRemaining)}      caption="Balance in transfers"  color="bg-[#00897b]" icon={<FiDollarSign />} />
            </div>

            {/* ── toolbar ─────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="relative min-w-[220px] flex-1">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search transfers by title, category…"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-[#7b2cbf] focus:bg-white"
                    />
                </div>
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-slate-600 outline-none transition-all hover:border-[#7b2cbf]"
                >
                    <option value="All Transfers">All Transfers</option>
                    {transferCategoryOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                    ))}
                </select>
                <div className="flex rounded-xl border border-gray-200 bg-gray-100 p-1">
                    <button type="button" onClick={() => setViewMode("table")}
                        className={`rounded-lg p-2 transition-all ${viewMode === "table" ? "bg-white text-[#7b2cbf] shadow-sm" : "text-gray-400 hover:text-slate-600"}`}
                    ><FiList size={17} /></button>
                    <button type="button" onClick={() => setViewMode("grid")}
                        className={`rounded-lg p-2 transition-all ${viewMode === "grid" ? "bg-white text-[#7b2cbf] shadow-sm" : "text-gray-400 hover:text-slate-600"}`}
                    ><FiGrid size={17} /></button>
                </div>
              
                <button type="button" onClick={openAddTransfer}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#240046] to-[#7b2cbf] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-purple-900/30 transition-all hover:from-[#10002b] hover:to-[#5a189a] active:scale-95"
                >
                    <FiPlus size={16} /> Add New Transfer
                </button>
            </div>

            {/* ── table / grid ────────────────────────────────────────── */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                {loading ? (
                    <p className="p-8 text-center text-sm font-semibold text-slate-400">Loading transfers…</p>
                ) : viewMode === "table" ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gradient-to-r from-[#1F0A3C] to-[#3c096c] text-xs uppercase tracking-wider text-[#FCD34D]">
                                <tr>
                                    <th className="px-4 py-4">S No</th>
                                    <th className="px-6 py-4">Title</th>
                                    <th className="px-6 py-4">Category</th>
                                    <th className="px-5 py-4 text-right">Transfer Amt</th>
                                    <th className="px-5 py-4 text-right">Total Expense</th>
                                    <th className="px-5 py-4 text-right">Remaining</th>
                                    <th className="px-6 py-4">Payment</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-4 py-4 text-center">Receipt</th>
                                    <th className="px-4 py-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {visible.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="py-10 text-center text-sm text-slate-400">
                                            No transfer records found.
                                        </td>
                                    </tr>
                                )}
                                {visible.map((t, index) => {
                                    const trAmt  = Number(t.amount || 0);
                                    const expAmt = Number(t.total_expense || 0);
                                    const remAmt = Math.max(trAmt - expAmt, 0);
                                    return (
                                        <tr key={t.id} className="text-slate-700 hover:bg-purple-50/40">
                                            <td className="px-4 py-4 font-bold text-slate-500">{index + 1}</td>
                                            <td className="px-6 py-4 font-bold">{t.title}</td>
                                            <td className="px-6 py-4 text-slate-500">{t.category || "—"}</td>
                                            <td className="px-5 py-4 text-right font-bold text-slate-800">{fmt(trAmt)}</td>
                                            <td className="px-5 py-4 text-right font-bold text-red-500">{fmt(expAmt)}</td>
                                            <td className="px-5 py-4 text-right font-black text-[#00897b]">{fmt(remAmt)}</td>
                                            <td className="px-6 py-4 text-slate-500">{t.payment_method || "—"}</td>
                                            <td className="px-6 py-4 text-slate-500">
                                                {t.transfer_date ? String(t.transfer_date).split("T")[0] : "—"}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {t.receipt ? (
                                                    <a
                                                        href={`${(import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "")}${t.receipt}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-2.5 py-1.5 text-[11px] font-bold text-purple-700 hover:bg-purple-100"
                                                        title="View Receipt"
                                                    >
                                                        <FiPaperclip size={12} /> View
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-slate-300">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {t.receipt && (
                                                        <button
                                                            type="button"
                                                            onClick={() => openViewTransfer(t)}
                                                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-all hover:bg-blue-500 hover:text-white"
                                                            title="View transfer"
                                                        >
                                                            <FiEye size={14} />
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditTransfer(t)}
                                                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 transition-all hover:bg-violet-500 hover:text-white"
                                                        title="Edit transfer"
                                                    >
                                                        <FiEdit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(t.id)}
                                                        disabled={deletingId === t.id}
                                                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-400 transition-all hover:bg-red-500 hover:text-white disabled:opacity-40"
                                                        title="Delete transfer"
                                                    >
                                                        <FiTrash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* ── grid view ──────────────────────────────────── */
                    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
                        {visible.length === 0 && (
                            <p className="col-span-full py-10 text-center text-sm text-slate-400">
                                No transfer records found.
                            </p>
                        )}
                        {visible.map((t, index) => {
                            const trAmt  = Number(t.amount || 0);
                            const expAmt = Number(t.total_expense || 0);
                            const remAmt = Math.max(trAmt - expAmt, 0);
                            const pct    = trAmt > 0 ? Math.min((expAmt / trAmt) * 100, 100) : 0;
                            return (
                                <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                        <span>S No {index + 1}</span>
                                        <div className="flex items-center gap-2">
                                            {t.receipt && (
                                                <button
                                                    type="button"
                                                    onClick={() => openViewTransfer(t)}
                                                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-all hover:bg-blue-500 hover:text-white"
                                                    title="View transfer"
                                                >
                                                    <FiEye size={12} />
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => openEditTransfer(t)}
                                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-600 transition-all hover:bg-violet-500 hover:text-white"
                                                title="Edit transfer"
                                            >
                                                <FiEdit2 size={12} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(t.id)}
                                                disabled={deletingId === t.id}
                                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-400 transition-all hover:bg-red-500 hover:text-white disabled:opacity-40 shrink-0"
                                                title="Delete transfer"
                                            >
                                                <FiTrash2 size={12} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <div>
                                            <p className="font-black text-slate-800">{t.title}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{t.category || "—"} · {t.transfer_date ? String(t.transfer_date).split("T")[0] : "—"}</p>
                                        </div>
                                    </div>

                                    <div className="w-full h-2 rounded-full bg-slate-100 mb-3">
                                        <div
                                            className="h-2 rounded-full bg-red-400 transition-all"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                        <div className="rounded-lg bg-slate-50 p-2">
                                            <p className="text-slate-400 font-medium mb-1">Transfer</p>
                                            <p className="font-black text-slate-800">{fmt(trAmt)}</p>
                                        </div>
                                        <div className="rounded-lg bg-red-50 p-2">
                                            <p className="text-red-400 font-medium mb-1">Expense</p>
                                            <p className="font-black text-red-500">{fmt(expAmt)}</p>
                                        </div>
                                        <div className="rounded-lg bg-emerald-50 p-2">
                                            <p className="text-emerald-600 font-medium mb-1">Remaining</p>
                                            <p className="font-black text-[#00897b]">{fmt(remAmt)}</p>
                                        </div>
                                    </div>
                                    {t.receipt && (
                                        <a
                                            href={`${(import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "")}${t.receipt}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="mt-2 flex items-center gap-2 rounded-lg border border-purple-100 bg-purple-50 px-3 py-2 text-xs font-bold text-purple-700 hover:bg-purple-100 transition-all"
                                        >
                                            <FiPaperclip size={13} />
                                            View Receipt
                                            <FiEye size={12} className="ml-auto" />
                                        </a>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {selectedTransfer && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="absolute inset-0" onClick={() => setSelectedTransfer(null)} />
                    <div className="relative z-10 w-full max-w-xl rounded-[1.8rem] bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-[#3c096c]/20 bg-gradient-to-r from-[#1F0A3C] to-[#3c096c] px-6 py-5 text-white">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Transfer Details</p>
                                <h2 className="mt-1 text-2xl font-black text-white">{selectedTransfer.title}</h2>
                            </div>
                            <button type="button" onClick={() => setSelectedTransfer(null)} className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white" aria-label="Close transfer details">
                                <FiX size={22} />
                            </button>
                        </div>
                        <div className="space-y-4 p-6 text-sm text-slate-700">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-xl bg-slate-50 p-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Amount</p>
                                    <p className="mt-2 font-black text-slate-800">{fmt(selectedTransfer.amount)}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Category</p>
                                    <p className="mt-2 font-bold text-slate-800">{selectedTransfer.category || "—"}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-xl bg-slate-50 p-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Date</p>
                                    <p className="mt-2 font-bold text-slate-800">{selectedTransfer.transfer_date ? String(selectedTransfer.transfer_date).split("T")[0] : "—"}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Payment</p>
                                    <p className="mt-2 font-bold text-slate-800">{selectedTransfer.payment_method || "—"}</p>
                                </div>
                            </div>
                            {selectedTransfer.notes && (
                                <div className="rounded-xl bg-slate-50 p-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Notes</p>
                                    <p className="mt-2 leading-6 text-slate-700">{selectedTransfer.notes}</p>
                                </div>
                            )}
                            {selectedTransfer.receipt && (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Receipt</p>
                                    <a href={`${(import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "")}${selectedTransfer.receipt}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-lg bg-violet-100 px-3 py-2 text-sm font-bold text-violet-700 hover:bg-violet-200">Open receipt</a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── ADD TRANSFER MODAL ───────────────────────────────────── */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-[#3c096c]/20 bg-gradient-to-r from-[#1F0A3C] to-[#3c096c] px-6 py-5 text-white">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Finance Management</p>
                                <h2 className="mt-1 text-2xl font-black text-white">{editingTransferId ? "Edit Transfer" : "Add New Transfer"}</h2>
                            </div>
                            <button type="button" onClick={closeModal}
                                className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white"
                            ><FiX size={22} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">

                       <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                         {/* income source */}
                                <label className="sm:col-span-2 mb-3">
                                    <span className="mb-2 block text-sm font-bold text-slate-700">Select Existing Income Record</span>
                                    <select
                                        value={selectedIncomeId} onChange={handleIncomeSelect}
                                        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none focus:border-purple-500"
                                    >
                                        <option value="">Choose an income record (optional)</option>
                                        {incomes.map((inc) => (
                                            <option key={inc.id} value={inc.id}>
                                                {inc.title} — {fmt(inc.remaining_amount ?? inc.amount ?? 0)} available
                                            </option>
                                        ))}
                                    </select>
                                </label>
                       </div>

                            {/* balance summary */}
                            <div className="grid grid-cols-3 gap-3">
                                <SummaryBox label="Available Income" value={selectedIncome ? fmt(availableBalance) : "—"} />
                                <SummaryBox label="Transfer Amount"  value={fmt(transferAmount)} accent="text-purple-800" />
                                <SummaryBox label="Remaining Income" value={selectedIncome ? fmt(remainingAfterThis) : "—"} accent="text-emerald-700" />
                            </div>

                            {/* title */}
                            <label className="block">
                                <span className="mb-2 block text-sm font-bold text-slate-700">Transfer Title *</span>
                                <input
                                    type="text" name="title" required
                                    value={formData.title} onChange={handleChange}
                                    placeholder="e.g. Monthly savings"
                                    className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-purple-500"
                                />
                            </label>

                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                {/* amount */}
                                <label>
                                    <span className="mb-2 block text-sm font-bold text-slate-700">Transfer Amount ₹ *</span>
                                    <span className="relative block">
                                        <FiDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="number" name="amount" required min="0.01" step="0.01"
                                            value={formData.amount} onChange={handleChange}
                                            placeholder="0.00"
                                            className="w-full rounded-lg border border-slate-200 py-3 pl-10 pr-4 outline-none focus:border-purple-500"
                                        />
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => { closeModal(); navigate("/admin/more/income", { state: { openAddIncome: true } }); }}
                                        className="mt-1 text-sm font-bold text-purple-700 hover:text-purple-900"
                                    >
                                        + Add Income Instead
                                    </button>
                                </label>

                                {/* payment method */}
                                <label>
                                    <span className="mb-2 block text-sm font-bold text-slate-700">Payment Method *</span>
                                    <select
                                        name="paymentMethod" required
                                        value={formData.paymentMethod} onChange={handleChange}
                                        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none focus:border-purple-500"
                                    >
                                        <option>Cash</option>
                                        <option>Bank Transfer</option>
                                        <option>UPI</option>
                                        <option>Card</option>
                                        <option>Other</option>
                                    </select>
                                </label>

                                

                                {/* category */}
                                <label>
                                    <span className="mb-2 block text-sm font-bold text-slate-700">Category *</span>
                                    <select
                                        name="category" required
                                        value={formData.category} onChange={handleChange}
                                        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none focus:border-purple-500"
                                    >
                                        <option value="">{transferCategoryOptions.length ? "Select category" : "No transfer categories available"}</option>
                                        {transferCategoryOptions.map((option) => (
                                            <option key={option} value={option}>{option}</option>
                                        ))}
                                    </select>
                                </label>

                                {/* date */}
                                <label>
                                    <span className="mb-2 block text-sm font-bold text-slate-700">Date *</span>
                                    <input
                                        type="date" name="date" required
                                        value={formData.date} onChange={handleChange}
                                        className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-purple-500"
                                    />
                                </label>
                            </div>

                            {/* notes */}
                            <label className="block">
                                <span className="mb-2 block text-sm font-bold text-slate-700">Notes</span>
                                <textarea
                                    name="notes" rows={3}
                                    value={formData.notes} onChange={handleChange}
                                    placeholder="Add any notes here…"
                                    className="w-full resize-none rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-purple-500"
                                />
                            </label>

                            {/* ── Receipt Upload ──────────────────────────── */}
                            <div>
                                <span className="mb-2 block text-sm font-bold text-slate-700">
                                    Upload Receipt <small className="font-normal text-slate-400">(Optional — JPG, PNG, PDF · max 10 MB)</small>
                                </span>

                                {/* ── Existing receipt preview (edit mode only) ── */}
                                {existingReceipt && !receiptFile && (
                                    <div className="mb-3 flex items-start gap-3 rounded-xl border border-purple-200 bg-purple-50 p-3">
                                        <div className="shrink-0">
                                            {/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(existingReceipt) ? (
                                                <a
                                                    href={`${(import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "")}${existingReceipt}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    <img
                                                        src={`${(import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "")}${existingReceipt}`}
                                                        alt="Current receipt"
                                                        className="h-20 w-20 rounded-lg border border-purple-200 object-cover shadow-sm hover:opacity-90 transition-opacity"
                                                    />
                                                </a>
                                            ) : (
                                                <a
                                                    href={`${(import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "")}${existingReceipt}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex h-20 w-20 items-center justify-center rounded-lg border border-purple-200 bg-white text-purple-600 shadow-sm hover:bg-purple-100 transition-colors"
                                                >
                                                    <FiPaperclip size={24} />
                                                </a>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[11px] font-black uppercase tracking-widest text-purple-600">Current Receipt</p>
                                            <a
                                                href={`${(import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "")}${existingReceipt}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="mt-1 block truncate text-xs font-semibold text-slate-600 hover:text-purple-700 hover:underline"
                                            >
                                                {existingReceipt.split("/").pop()}
                                            </a>
                                            <p className="mt-1 text-[10px] text-slate-400">Upload a new file below to replace it</p>
                                        </div>
                                    </div>
                                )}

                                {/* ── File picker ── */}
                                <label
                                    className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed px-4 py-4 transition-all ${
                                        receiptFile
                                            ? "border-purple-400 bg-purple-50"
                                            : "border-slate-200 bg-slate-50 hover:border-purple-300 hover:bg-purple-50/40"
                                    }`}
                                >
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${receiptFile ? "bg-purple-600" : "bg-slate-200"}`}>
                                        <FiUpload size={18} className={receiptFile ? "text-white" : "text-slate-500"} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {receiptFile ? (
                                            <>
                                                <p className="text-sm font-bold text-purple-700 truncate">{receiptFile.name}</p>
                                                <p className="text-xs text-slate-400">{(receiptFile.size / 1024).toFixed(1)} KB</p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-sm font-semibold text-slate-600">Click to browse or drag &amp; drop</p>
                                                <p className="text-xs text-slate-400">Supports: JPG, PNG, WEBP, PDF</p>
                                            </>
                                        )}
                                    </div>
                                    {receiptFile && (
                                        <button
                                            type="button"
                                            onClick={(ev) => { ev.preventDefault(); setReceiptFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                                            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                                        >
                                            <FiX size={16} />
                                        </button>
                                    )}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*,.pdf"
                                        className="hidden"
                                        onChange={(ev) => setReceiptFile(ev.target.files?.[0] || null)}
                                    />
                                </label>
                            </div>

                            {/* actions */}
                            <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                                <button type="button" onClick={closeModal}
                                    className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
                                >Cancel</button>
                                <button type="submit" disabled={isSubmitting}
                                    className="rounded-lg bg-[#4b0b78] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#260642] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isSubmitting ? "Saving…" : "Save Transfer"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

/* ── small sub-components ──────────────────────────────────────────────── */
const StatCard = ({ label, value, caption, color, icon }) => (
    <div className="flex min-h-32 items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.08)]">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[1rem] text-xl font-black text-white shadow-lg ${color}`}>
            {icon}
        </div>
        <div className="min-w-0">
            <p className="mb-0.5 text-sm font-bold text-slate-400">{label}</p>
            <h2 className="text-xl font-black leading-none text-slate-800">{value}</h2>
            <p className="mt-1 text-xs font-medium text-slate-400">{caption}</p>
        </div>
    </div>
);

const SummaryBox = ({ label, value, accent = "text-slate-800" }) => (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
        <p className={`mt-2 text-lg font-black ${accent}`}>{value}</p>
    </div>
);

export default Transfer;
