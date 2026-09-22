import React, { useState, useEffect, useMemo } from "react";
import api from "../../api";
import { toast } from "react-hot-toast";
import {
    FiBarChart2, FiSearch, FiFilter, FiDownload,
    FiTrendingDown, FiSend, FiRepeat, FiCalendar,
    FiTag, FiCreditCard, FiRefreshCw, FiX, FiList, FiGrid,
    FiChevronDown, FiCheckCircle, FiAlertCircle,
} from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";

/* ── helpers ──────────────────────────────────────────────────────────────── */
const fmt = (n) =>
    Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) => {
    if (!d) return "—";
    const dt = new Date(d);
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

/* ── badge colours ───────────────────────────────────────────────────────── */
const typeColors = {
    expense: "bg-rose-50 text-rose-600 border-rose-200",
    transfer: "bg-blue-50 text-blue-600 border-blue-200",
};

/* ── main component ───────────────────────────────────────────────────────── */
const Reports = () => {
    /* data */
    const [expenses, setExpenses]   = useState([]);
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading]     = useState(true);

    /* filters */
    const [reportType, setReportType]       = useState("all");   // all | expense | transfer
    const [searchTerm, setSearchTerm]       = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [paymentFilter, setPaymentFilter] = useState("All");
    const [dateFrom, setDateFrom]           = useState("");
    const [dateTo, setDateTo]               = useState("");
    const [viewMode, setViewMode]           = useState("table"); // table | grid

    /* ── fetch ────────────────────────────────────────────────────────────── */
    const fetchAll = async () => {
        setLoading(true);
        try {
            const [expRes, trfRes] = await Promise.all([
                api.get("/expenses"),
                api.get("/transfers"),
            ]);
            setExpenses(
                (expRes.data || []).map((e) => ({ ...e, _type: "expense", _date: e.expense_date }))
            );
            setTransfers(
                (trfRes.data || []).map((t) => ({ ...t, _type: "transfer", _date: t.transfer_date }))
            );
        } catch (err) {
            console.error(err);
            toast.error("Failed to load report data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    /* ── merged & filtered list ───────────────────────────────────────────── */
    const allRecords = useMemo(() => {
        const exp = reportType === "transfer" ? [] : expenses;
        const trf = reportType === "expense"  ? [] : transfers;
        return [...exp, ...trf].sort((a, b) => new Date(b._date) - new Date(a._date));
    }, [expenses, transfers, reportType]);

    /* unique categories & payment methods */
    const categories = useMemo(() => {
        const set = new Set(allRecords.map((r) => r.category).filter(Boolean));
        return ["All", ...Array.from(set).sort()];
    }, [allRecords]);

    const paymentMethods = useMemo(() => {
        const set = new Set(
            allRecords.map((r) => r.payment_method || r.paymentMethod).filter(Boolean)
        );
        return ["All", ...Array.from(set).sort()];
    }, [allRecords]);

    const visible = useMemo(() => {
        const q = searchTerm.toLowerCase();
        return allRecords.filter((r) => {
            const payment = r.payment_method || r.paymentMethod || "";
            const amount  = r._type === "expense" ? r.expense_amount : r.amount;

            const matchSearch =
                (r.title  || "").toLowerCase().includes(q) ||
                (r.category || "").toLowerCase().includes(q) ||
                (r.notes  || "").toLowerCase().includes(q) ||
                String(amount || "").includes(q);

            const matchCat     = categoryFilter === "All" || r.category === categoryFilter;
            const matchPayment = paymentFilter  === "All" || payment === paymentFilter;

            const rDate = r._date ? new Date(r._date) : null;
            const matchFrom = !dateFrom || (rDate && rDate >= new Date(dateFrom));
            const matchTo   = !dateTo   || (rDate && rDate <= new Date(dateTo));

            return matchSearch && matchCat && matchPayment && matchFrom && matchTo;
        });
    }, [allRecords, searchTerm, categoryFilter, paymentFilter, dateFrom, dateTo]);

    /* ── summary stats (from visible rows) ───────────────────────────────── */
    const stats = useMemo(() => {
        const expRows = visible.filter((r) => r._type === "expense");
        const trfRows = visible.filter((r) => r._type === "transfer");
        return {
            totalRecords:   visible.length,
            totalExpense:   expRows.reduce((s, r) => s + Number(r.expense_amount || 0), 0),
            totalTransfer:  trfRows.reduce((s, r) => s + Number(r.amount        || 0), 0),
            totalRemaining: trfRows.reduce((s, r) => s + Number(r.remaining_amount || 0), 0),
            expCount:       expRows.length,
            trfCount:       trfRows.length,
            recurring:      expRows.filter((r) => r.recurring === "Yes").length,
        };
    }, [visible]);

    /* ── reset filters ────────────────────────────────────────────────────── */
    const resetFilters = () => {
        setSearchTerm("");
        setCategoryFilter("All");
        setPaymentFilter("All");
        setDateFrom("");
        setDateTo("");
        setReportType("all");
    };

    /* ── CSV export ───────────────────────────────────────────────────────── */
    const exportCSV = () => {
        const headers = ["#", "Type", "Title", "Category", "Amount (₹)", "Payment Method", "Date", "Notes", "Recurring"];
        const rows = visible.map((r, i) => [
            i + 1,
            r._type === "expense" ? "Expense" : "Transfer",
            `"${(r.title || "").replace(/"/g, '""')}"`,
            r.category || "—",
            r._type === "expense" ? r.expense_amount : r.amount,
            r.payment_method || r.paymentMethod || "—",
            fmtDate(r._date),
            `"${(r.notes || "").replace(/"/g, '""')}"`,
            r._type === "expense" ? (r.recurring || "No") : "—",
        ]);
        const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href = url;
        a.download = `life-ledger-report-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Report exported!");
    };

    /* ═══════════════════════ RENDER ═══════════════════════════════════════ */
    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700 min-h-screen pb-20">

            {/* ── PAGE HEADER ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#240046] to-[#7b2cbf] flex items-center justify-center text-white shadow-lg shadow-purple-900/30">
                        <FiBarChart2 size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-800 leading-none">Reports</h1>
                        <p className="text-xs text-gray-400 font-medium mt-0.5">Expense &amp; Transfer event history with filters</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchAll}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-slate-700 transition-all text-sm font-semibold"
                    >
                        <FiRefreshCw size={15} /> Refresh
                    </button>
                    <button
                        onClick={exportCSV}
                        className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/30 active:scale-95"
                    >
                        <FiDownload size={15} /> Export CSV
                    </button>
                </div>
            </div>

            {/* ── STAT CARDS ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                {[
                    { label: "Total Records",    value: stats.totalRecords,             icon: <FiList size={18} />,        gradient: "from-[#240046] to-[#7b2cbf]" },
                    { label: "Expenses",         value: stats.expCount,                 icon: <FiTrendingDown size={18} />, gradient: "from-rose-500 to-pink-500" },
                    { label: "Transfers",        value: stats.trfCount,                 icon: <FiSend size={18} />,        gradient: "from-blue-500 to-indigo-500" },
                    { label: "Total Spent",      value: `₹${fmt(stats.totalExpense)}`,  icon: <FaRupeeSign size={16} />,   gradient: "from-rose-400 to-rose-600" },
                    { label: "Total Transferred",value: `₹${fmt(stats.totalTransfer)}`, icon: <FiRepeat size={18} />,      gradient: "from-amber-400 to-orange-500" },
                    { label: "Remaining",        value: `₹${fmt(stats.totalRemaining)}`,icon: <FiCheckCircle size={18} />, gradient: "from-emerald-400 to-teal-500" },
                    { label: "Recurring",        value: stats.recurring,                icon: <FiRefreshCw size={18} />,   gradient: "from-cyan-400 to-sky-500" },
                ].map((s, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-all min-w-0">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-white shadow-sm shrink-0`}>
                            {s.icon}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] text-gray-400 font-medium truncate">{s.label}</p>
                            <p className="text-lg font-black text-slate-800 leading-none truncate">{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── FILTER BAR ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                <div className="flex flex-wrap gap-3 items-center">

                    {/* Search */}
                    <div className="relative flex-1 min-w-[180px]">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                        <input
                            type="text"
                            placeholder="Search by title, category, notes..."
                            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#7b2cbf] focus:bg-white transition-all text-sm font-medium text-slate-700"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Report type tabs */}
                    <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 gap-1">
                        {[
                            { value: "all",      label: "All" },
                            { value: "expense",  label: "Expenses" },
                            { value: "transfer", label: "Transfers" },
                        ].map((t) => (
                            <button
                                key={t.value}
                                onClick={() => setReportType(t.value)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    reportType === t.value
                                        ? "bg-white text-[#7b2cbf] shadow-sm"
                                        : "text-gray-400 hover:text-slate-600"
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* View mode */}
                    <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                        <button onClick={() => setViewMode("table")} className={`p-2 rounded-lg transition-all ${viewMode === "table" ? "bg-white text-[#7b2cbf] shadow-sm" : "text-gray-400 hover:text-slate-600"}`}>
                            <FiList size={16} />
                        </button>
                        <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-white text-[#7b2cbf] shadow-sm" : "text-gray-400 hover:text-slate-600"}`}>
                            <FiGrid size={16} />
                        </button>
                    </div>
                </div>

                {/* Second row of filters */}
                <div className="flex flex-wrap gap-3 items-center">
                    {/* Category */}
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-slate-600 outline-none hover:border-[#7b2cbf] transition-all cursor-pointer"
                    >
                        {categories.map((c) => <option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>)}
                    </select>

                    {/* Payment Method */}
                    <select
                        value={paymentFilter}
                        onChange={(e) => setPaymentFilter(e.target.value)}
                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-slate-600 outline-none hover:border-[#7b2cbf] transition-all cursor-pointer"
                    >
                        {paymentMethods.map((m) => <option key={m} value={m}>{m === "All" ? "All Payment Methods" : m}</option>)}
                    </select>

                    {/* Date From */}
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-400 font-medium whitespace-nowrap">From</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-slate-600 outline-none focus:border-[#7b2cbf] transition-all"
                        />
                    </div>

                    {/* Date To */}
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-400 font-medium whitespace-nowrap">To</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-slate-600 outline-none focus:border-[#7b2cbf] transition-all"
                        />
                    </div>

                    {/* Reset */}
                    {(searchTerm || categoryFilter !== "All" || paymentFilter !== "All" || dateFrom || dateTo || reportType !== "all") && (
                        <button
                            onClick={resetFilters}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-red-500 bg-red-50 hover:bg-red-100 text-xs font-bold transition-all"
                        >
                            <FiX size={13} /> Reset Filters
                        </button>
                    )}

                    <span className="ml-auto text-xs text-gray-400 font-medium">
                        Showing <span className="font-bold text-slate-700">{visible.length}</span> records
                    </span>
                </div>
            </div>

            {/* ── CONTENT ── */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="w-10 h-10 border-4 border-[#7b2cbf]/20 border-t-[#7b2cbf] rounded-full animate-spin mb-4" />
                    <p className="text-gray-400 font-bold text-sm">Loading report data...</p>
                </div>
            ) : visible.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <FiAlertCircle size={40} className="text-gray-300 mb-3" />
                    <p className="text-gray-400 font-bold text-sm">No records found</p>
                    <p className="text-gray-300 text-xs mt-1">Try adjusting your filters</p>
                </div>
            ) : viewMode === "table" ? (

                /* ═══════════════ TABLE VIEW ═══════════════ */
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-gradient-to-r from-[#1F0A3C] to-[#3c096c]">
                                    {["#", "Type", "Title", "Category", "Amount", "Payment", "Date", "Recurring / Remaining", "Notes"].map((h) => (
                                        <th key={h} className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {visible.map((r, i) => {
                                    const isExp    = r._type === "expense";
                                    const amount   = isExp ? r.expense_amount : r.amount;
                                    const payment  = r.payment_method || r.paymentMethod || "—";

                                    return (
                                        <tr key={`${r._type}-${r.id}`} className="hover:bg-[#240046]/5 transition-colors">
                                            <td className="px-4 py-3.5 text-gray-500 font-medium text-xs">{i + 1}</td>

                                            {/* Type badge */}
                                            <td className="px-4 py-3.5">
                                                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${typeColors[r._type]}`}>
                                                    {isExp ? "Expense" : "Transfer"}
                                                </span>
                                            </td>

                                            {/* Title */}
                                            <td className="px-4 py-3.5">
                                                <p className="font-bold text-slate-800 max-w-[160px] truncate">{r.title}</p>
                                            </td>

                                            {/* Category */}
                                            <td className="px-4 py-3.5">
                                                {r.category
                                                    ? <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#240046]/10 text-[#7b2cbf] border border-[#7b2cbf]/20">{r.category}</span>
                                                    : <span className="text-gray-300 text-xs">—</span>
                                                }
                                            </td>

                                            {/* Amount */}
                                            <td className="px-4 py-3.5">
                                                <p className={`font-black ${isExp ? "text-rose-600" : "text-blue-600"}`}>
                                                    ₹{fmt(amount)}
                                                </p>
                                            </td>

                                            {/* Payment Method */}
                                            <td className="px-4 py-3.5">
                                                <span className="px-2 py-1 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-600">{payment}</span>
                                            </td>

                                            {/* Date */}
                                            <td className="px-4 py-3.5 text-gray-600 font-medium text-xs whitespace-nowrap">
                                                {fmtDate(r._date)}
                                            </td>

                                            {/* Recurring / Remaining */}
                                            <td className="px-4 py-3.5">
                                                {isExp ? (
                                                    r.recurring === "Yes"
                                                        ? <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">Recurring</span>
                                                        : <span className="text-gray-300 text-xs">—</span>
                                                ) : (
                                                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${Number(r.remaining_amount) > 0 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-500 border-red-100"}`}>
                                                        ₹{fmt(r.remaining_amount)}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Notes */}
                                            <td className="px-4 py-3.5 text-gray-400 text-xs max-w-[160px] truncate">
                                                {r.notes || "—"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>

                            {/* Totals footer */}
                            <tfoot>
                                <tr className="bg-gradient-to-r from-[#1F0A3C]/5 to-[#3c096c]/5 border-t-2 border-[#1F0A3C]/10">
                                    <td colSpan={4} className="px-4 py-3 text-xs font-bold text-slate-600">
                                        Totals ({visible.length} records)
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="space-y-0.5">
                                            {stats.expCount > 0 && <p className="text-xs font-black text-rose-600">-₹{fmt(stats.totalExpense)}</p>}
                                            {stats.trfCount > 0 && <p className="text-xs font-black text-blue-600">₹{fmt(stats.totalTransfer)}</p>}
                                        </div>
                                    </td>
                                    <td colSpan={4} />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

            ) : (

                /* ═══════════════ GRID VIEW ═══════════════ */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {visible.map((r) => {
                        const isExp   = r._type === "expense";
                        const amount  = isExp ? r.expense_amount : r.amount;
                        const payment = r.payment_method || r.paymentMethod || "—";

                        return (
                            <div
                                key={`${r._type}-${r.id}`}
                                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all flex flex-col gap-3"
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-800 truncate">{r.title}</p>
                                        <p className="text-[11px] text-gray-400 mt-0.5">{fmtDate(r._date)}</p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border shrink-0 ${typeColors[r._type]}`}>
                                        {isExp ? "Expense" : "Transfer"}
                                    </span>
                                </div>

                                {/* Amount */}
                                <div className={`text-2xl font-black ${isExp ? "text-rose-600" : "text-blue-600"}`}>
                                    ₹{fmt(amount)}
                                </div>

                                {/* Tags */}
                                <div className="flex flex-wrap gap-2">
                                    {r.category && (
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#240046]/10 text-[#7b2cbf] border border-[#7b2cbf]/20">
                                            {r.category}
                                        </span>
                                    )}
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 text-gray-600">
                                        {payment}
                                    </span>
                                    {isExp && r.recurring === "Yes" && (
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                            Recurring
                                        </span>
                                    )}
                                </div>

                                {/* Transfer remaining */}
                                {!isExp && (
                                    <div className="flex items-center justify-between border-t border-gray-50 pt-2">
                                        <span className="text-[11px] text-gray-400">Remaining</span>
                                        <span className={`text-sm font-black ${Number(r.remaining_amount) > 0 ? "text-emerald-600" : "text-red-500"}`}>
                                            ₹{fmt(r.remaining_amount)}
                                        </span>
                                    </div>
                                )}

                                {/* Notes */}
                                {r.notes && (
                                    <p className="text-[11px] text-gray-400 border-t border-gray-50 pt-2 line-clamp-2">{r.notes}</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Reports;
