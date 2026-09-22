import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { FiPlus, FiX, FiUpload, FiSearch, FiGrid, FiList } from "react-icons/fi";
import { toast } from "react-hot-toast";
import api from "../../api";

const initialForm = {
    title: "",
    amount: "",
    category: "",
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "Cash",
    notes: "",
    recurring: "No",
    attachment: null,
};

const Billing = () => {
    const location = useLocation();
    const isIncomePage = location.pathname.replace(/\/$/, "") === "/admin/more/income";
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState(initialForm);
    const [incomes, setIncomes] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [incomeFilter, setIncomeFilter] = useState("All Income");
    const [viewMode, setViewMode] = useState("table");

    useEffect(() => {
        if (!isIncomePage) return;

        if (location.state?.openAddIncome) {
            setIsModalOpen(true);
        }

        const loadIncome = async () => {
            try {
                const response = await api.get("/incomes");
                setIncomes(response.data || []);
            } catch (error) {
                console.error("Fetch Income Error:", error);
                toast.error("Failed to load income records");
            }
        };

        loadIncome();
    }, [isIncomePage]);

    const updateField = (event) => {
        const { name, value, files } = event.target;
        setForm((current) => ({ ...current, [name]: files ? files[0] : value }));
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setForm(initialForm);
    };

    const submitIncome = async (event) => {
        event.preventDefault();
        setIsSaving(true);
        try {
            const payload = new FormData();
            payload.append("title", form.title);
            payload.append("amount", form.amount);
            payload.append("category", form.category);
            payload.append("date", form.date);
            payload.append("paymentMethod", form.paymentMethod);
            payload.append("notes", form.notes);
            payload.append("recurring", form.recurring);
            if (form.attachment) payload.append("attachment", form.attachment);

            const response = await api.post("/incomes", payload);
            setIncomes((current) => [response.data.income, ...current]);
            toast.success("Income added successfully!");
            closeModal();
        } catch (error) {
            console.error("Create Income Error:", error);
            toast.error(error.response?.data?.message || "Failed to add income");
        } finally {
            setIsSaving(false);
        }
    };

    const totalIncome = incomes.reduce((total, income) => total + Number(income.amount || 0), 0);
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyIncome = incomes
        .filter((income) => {
            const incomeDate = new Date(income.income_date);
            return incomeDate.getMonth() === currentMonth && incomeDate.getFullYear() === currentYear;
        })
        .reduce((total, income) => total + Number(income.amount || 0), 0);
    const recurringIncome = incomes
        .filter((income) => income.recurring === "Yes")
        .reduce((total, income) => total + Number(income.amount || 0), 0);
    const visibleIncomes = incomes.filter((income) => {
        const searchValue = `${income.title || ""} ${income.category || ""} ${income.payment_method || ""}`.toLowerCase();
        const matchesSearch = searchValue.includes(searchTerm.toLowerCase());
        const matchesFilter = incomeFilter === "All Income"
            || (incomeFilter === "Recurring" && income.recurring === "Yes")
            || (incomeFilter === "One-time" && income.recurring !== "Yes");
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="space-y-6 pb-20">
         

            {isIncomePage ? (
                <>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                        <IncomeStatCard label="Total Income" value={totalIncome} caption="All recorded income" color="bg-[#4b0b78]" icon="$" />
                        <IncomeStatCard label="This Month" value={monthlyIncome} caption="Income this month" color="bg-[#00bfa5]" icon="↗" />
                        <IncomeStatCard label="Recurring Income" value={recurringIncome} caption="Recurring entries" color="bg-[#ff9200]" icon="↻" />
                        <IncomeStatCard label="Income Records" value={incomes.length} caption="Total transactions" color="bg-[#f43f83]" icon="#" isCount />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="relative min-w-[220px] flex-1">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="search"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Search income by title, category..."
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-[#7b2cbf] focus:bg-white"
                            />
                        </div>
                        <select
                            value={incomeFilter}
                            onChange={(event) => setIncomeFilter(event.target.value)}
                            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-slate-600 outline-none transition-all hover:border-[#7b2cbf]"
                        >
                            <option>All Income</option>
                            <option>Recurring</option>
                            <option>One-time</option>
                        </select>
                        <div className="flex rounded-xl border border-gray-200 bg-gray-100 p-1">
                            <button type="button" aria-label="List view" onClick={() => setViewMode("table")} className={`rounded-lg p-2 transition-all ${viewMode === "table" ? "bg-white text-[#7b2cbf] shadow-sm" : "text-gray-400 hover:text-slate-600"}`}>
                                <FiList size={17} />
                            </button>
                            <button type="button" aria-label="Grid view" onClick={() => setViewMode("grid")} className={`rounded-lg p-2 transition-all ${viewMode === "grid" ? "bg-white text-[#7b2cbf] shadow-sm" : "text-gray-400 hover:text-slate-600"}`}>
                                <FiGrid size={17} />
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#240046] to-[#7b2cbf] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-purple-900/30 transition-all hover:from-[#10002b] hover:to-[#5a189a] active:scale-95"
                        >
                            <FiPlus size={16} /> Add New Income
                        </button>
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    {viewMode === "table" ? <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#350866] text-xs uppercase tracking-wider text-[#FCD34D]">
                                <tr><th className="px-6 py-4">Title</th><th className="px-6 py-4">Category</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4">Remaining</th><th className="px-6 py-4">Date</th><th className="px-6 py-4">Payment</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {visibleIncomes.map((income) => (
                                    <tr key={income.id} className="text-slate-700">
                                        <td className="px-6 py-4 font-bold">{income.title}</td>
                                        <td className="px-6 py-4">{income.category}</td>
                                        <td className="px-6 py-4 font-bold">₹{Number(income.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                        <td className="px-6 py-4 font-black text-[#00bfa5]">₹{Number(income.remaining_amount ?? income.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                        <td className="px-6 py-4">{income.income_date}</td>
                                        <td className="px-6 py-4">{income.payment_method || "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div> : <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
                        {visibleIncomes.map((income) => (
                            <div key={income.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div><p className="font-bold text-slate-800">{income.title}</p><p className="text-xs text-slate-500">{income.category || "Uncategorized"}</p></div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-400 line-through">₹{Number(income.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                                        <p className="font-black text-[#00bfa5]">₹{Number(income.remaining_amount ?? income.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                                    </div>
                                </div>
                                <p className="mt-4 text-xs text-slate-500">{income.income_date} · {income.payment_method || "-"}</p>
                            </div>
                        ))}
                    </div>}
                    {visibleIncomes.length === 0 && <p className="p-8 text-center text-sm font-semibold text-slate-400">No income records found.</p>}
                    </div>
                </>
            ) : (
                <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm"><p className="text-sm font-semibold text-slate-400">No billing records found.</p></div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 sm:px-8">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-600">Income Management</p>
                                <h2 className="mt-1 text-2xl font-black text-slate-800">Add Income</h2>
                            </div>
                            <button type="button" onClick={closeModal} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close add income form">
                                <FiX size={22} />
                            </button>
                        </div>

                        <form onSubmit={submitIncome} className="space-y-5 px-6 py-6 sm:px-8">
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                <label className="sm:col-span-2">
                                    <span className="mb-2 block text-sm font-bold text-slate-700">Income Title <b className="text-red-500">*</b></span>
                                    <input name="title" value={form.title} onChange={updateField} required placeholder="e.g. Freelance payment" className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-purple-500" />
                                </label>
                                <label>
                                    <span className="mb-2 block text-sm font-bold text-slate-700">Amount <b className="text-red-500">*</b></span>
                                    <input name="amount" type="number" min="0" step="0.01" value={form.amount} onChange={updateField} required placeholder="0.00" className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-purple-500" />
                                </label>
                                <label>
                                    <span className="mb-2 block text-sm font-bold text-slate-700">Income Category <b className="text-red-500">*</b></span>
                                    <select name="category" value={form.category} onChange={updateField} required className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none focus:border-purple-500">
                                        <option value="">Select category</option>
                                        <option>Salary</option><option>Business</option><option>Freelance</option><option>Investment</option><option>Other</option>
                                    </select>
                                </label>
                                <label>
                                    <span className="mb-2 block text-sm font-bold text-slate-700">Date <b className="text-red-500">*</b></span>
                                    <input name="date" type="date" value={form.date} onChange={updateField} required className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-purple-500" />
                                </label>
                                <label>
                                    <span className="mb-2 block text-sm font-bold text-slate-700">Payment Method</span>
                                    <select name="paymentMethod" value={form.paymentMethod} onChange={updateField} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none focus:border-purple-500">
                                        <option>Cash</option><option>Bank Transfer</option><option>UPI</option><option>Card</option><option>Other</option>
                                    </select>
                                </label>
                                <label className="sm:col-span-2">
                                    <span className="mb-2 block text-sm font-bold text-slate-700">Description / Notes</span>
                                    <textarea name="notes" value={form.notes} onChange={updateField} rows="3" placeholder="Add any useful details..." className="w-full resize-none rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-purple-500" />
                                </label>
                                <fieldset>
                                    <legend className="mb-2 text-sm font-bold text-slate-700">Recurring Income</legend>
                                    <div className="flex gap-5 pt-1">
                                        {["Yes", "No"].map((option) => (
                                            <label key={option} className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                                                <input type="radio" name="recurring" value={option} checked={form.recurring === option} onChange={updateField} className="accent-purple-700" /> {option}
                                            </label>
                                        ))}
                                    </div>
                                </fieldset>
                                <label>
                                    <span className="mb-2 block text-sm font-bold text-slate-700">Attachment / Receipt <small className="font-normal text-slate-400">(Optional)</small></span>
                                    <span className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500">
                                        <FiUpload />
                                        <input name="attachment" type="file" accept="image/*,.pdf" onChange={updateField} className="min-w-0 text-xs" />
                                    </span>
                                </label>
                            </div>
                            <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                                <button type="button" onClick={closeModal} className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                                <button type="submit" disabled={isSaving} className="rounded-lg bg-[#4b0b78] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-200 hover:bg-[#260642] disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? "Saving..." : "Save Income"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const IncomeStatCard = ({ label, value, caption, color, icon, isCount = false }) => (
    <div className="flex min-h-33 items-center gap-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.08)]">
        <div className={`flex h-17.5 w-17.5 shrink-0 items-center justify-center rounded-[1.25rem] text-3xl font-black text-white shadow-lg ${color}`}>
            {icon}
        </div>
        <div className="min-w-0">
            <p className="mb-1 text-sm font-bold text-slate-400">{label}</p>
            <h2 className="text-2xl font-black leading-none text-slate-800">
                {isCount ? value : `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
            </h2>
            <p className="mt-2 text-xs font-medium text-slate-400">{caption}</p>
        </div>
    </div>
);

export default Billing;
