import React, { useEffect, useMemo, useState } from "react";
import { FiDollarSign, FiSend, FiX, FiPlus, FiSearch, FiGrid, FiList, FiArrowRight } from "react-icons/fi";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import api from "../../api";

const createEmptyForm = () => ({
    title: "",
    fromAccount: "",
    toAccount: "",
    amount: "",
    paymentMethod: "Cash",
    category: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
});

const formatCurrency = (value) => {
    const numeric = Number(value || 0);
    return `₹${numeric.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const Transfer = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState(createEmptyForm);
    const [transfers, setTransfers] = useState([]);
    const [incomes, setIncomes] = useState([]);
    const [selectedIncomeId, setSelectedIncomeId] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [transferFilter, setTransferFilter] = useState("All Transfers");
    const [viewMode, setViewMode] = useState("table");

    const loadIncomeOptions = async () => {
        try {
            const response = await api.get("/incomes");
            setIncomes(response.data || []);
        } catch (error) {
            console.error("Fetch Income Options Error:", error);
        }
    };

    useEffect(() => {
        const loadTransfers = async () => {
            try {
                const response = await api.get("/transfers");
                setTransfers(response.data || []);
            } catch (error) {
                console.error("Fetch Transfers Error:", error);
                toast.error("Failed to load transfers.");
            }
        };

        loadTransfers();
        loadIncomeOptions();
    }, []);

    const selectedIncome = useMemo(
        () => incomes.find((income) => String(income.id) === String(selectedIncomeId)) || null,
        [incomes, selectedIncomeId],
    );

    const availableBalance = Number(selectedIncome?.remaining_amount ?? selectedIncome?.amount ?? 0);
    const transferAmount = Number(formData.amount || 0);
    const remainingAfterTransfer = selectedIncome ? Math.max(availableBalance - transferAmount, 0) : 0;

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((current) => ({ ...current, [name]: value }));
    };

    const handleIncomeSelect = (event) => {
        const incomeId = event.target.value;
        const nextIncome = incomes.find((income) => String(income.id) === String(incomeId)) || null;
        setSelectedIncomeId(incomeId);

        setFormData((current) => ({
            ...current,
            amount: "",
            category: current.category || nextIncome?.category || "",
            title: current.title || nextIncome?.title || "",
        }));
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedIncomeId("");
        setFormData(createEmptyForm());
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const numericAmount = Number(formData.amount);

        if (selectedIncome && numericAmount > availableBalance) {
            toast.error(`Insufficient income balance. Available amount: ${formatCurrency(availableBalance)}`);
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await api.post("/transfers", {
                title: formData.title,
                amount: numericAmount,
                category: formData.category,
                paymentMethod: formData.paymentMethod,
                transferFrom: formData.fromAccount,
                transferTo: formData.toAccount,
                date: formData.date,
                notes: formData.notes,
                sourceIncomeId: selectedIncome ? selectedIncome.id : null,
            });
            setTransfers((current) => [response.data.transfer, ...current]);
            await loadIncomeOptions();
            toast.success("Transfer completed successfully!");
            closeModal();
        } catch (error) {
            toast.error(error.response?.data?.message || "Transfer failed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalTransferred = transfers.reduce((total, transfer) => total + Number(transfer.amount || 0), 0);
    const visibleTransfers = transfers.filter((transfer) => {
        const searchValue = `${transfer.title || ""} ${transfer.category || ""} ${transfer.transfer_from || ""} ${transfer.transfer_to || ""}`.toLowerCase();
        const matchesSearch = searchValue.includes(searchTerm.toLowerCase());
        const matchesFilter = transferFilter === "All Transfers" || transfer.category === transferFilter;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="space-y-6 pb-20">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <TransferStatCard label="Total Transfers" value={transfers.length} caption="All transfer records" color="bg-[#4b0b78]" icon={<FiSend />} />
                <TransferStatCard label="Amount Transferred" value={`₹${totalTransferred.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`} caption="Total moved amount" color="bg-[#00bfa5]" icon={<FiDollarSign />} />
                <TransferStatCard label="Income Sources" value={incomes.length} caption="Available income records" color="bg-[#ff9200]" icon={<FiArrowRight />} />
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="relative min-w-[220px] flex-1">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search transfers by title, account..." className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-[#7b2cbf] focus:bg-white" />
                </div>
                <select value={transferFilter} onChange={(event) => setTransferFilter(event.target.value)} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-slate-600 outline-none transition-all hover:border-[#7b2cbf]">
                    <option>All Transfers</option><option>Savings</option><option>Investment</option><option>Budget Transfer</option><option>Other</option>
                </select>
                <div className="flex rounded-xl border border-gray-200 bg-gray-100 p-1">
                    <button type="button" aria-label="List view" onClick={() => setViewMode("table")} className={`rounded-lg p-2 transition-all ${viewMode === "table" ? "bg-white text-[#7b2cbf] shadow-sm" : "text-gray-400 hover:text-slate-600"}`}><FiList size={17} /></button>
                    <button type="button" aria-label="Grid view" onClick={() => setViewMode("grid")} className={`rounded-lg p-2 transition-all ${viewMode === "grid" ? "bg-white text-[#7b2cbf] shadow-sm" : "text-gray-400 hover:text-slate-600"}`}><FiGrid size={17} /></button>
                </div>
                <button type="button" onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#240046] to-[#7b2cbf] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-purple-900/30 transition-all hover:from-[#10002b] hover:to-[#5a189a] active:scale-95">
                    <FiPlus size={16} /> Add New Transfer
                </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                {viewMode === "table" ? <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gradient-to-r from-[#1F0A3C] to-[#3c096c] text-xs uppercase tracking-wider text-[#FCD34D]">
                            <tr>
                                <th className="px-6 py-4">Title</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Transfer Amount</th>
                                <th className="px-6 py-4">Total Expense</th>
                                <th className="px-6 py-4">Remaining Amount</th>
                                <th className="px-6 py-4">Payment Method</th>
                                <th className="px-6 py-4">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {visibleTransfers.map((transfer) => {
                                const trAmt = Number(transfer.amount || 0);
                                const remAmt = Number(transfer.remaining_amount ?? transfer.amount ?? 0);
                                const expAmt = Math.max(trAmt - remAmt, 0);

                                return (
                                <tr key={transfer.id} className="text-slate-700 hover:bg-purple-50/40">
                                    <td className="px-6 py-4 font-bold">{transfer.title}</td>
                                    <td className="px-6 py-4">{transfer.category || "-"}</td>
                                    <td className="px-6 py-4 font-bold text-slate-800">₹{trAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-4 font-bold text-red-500">₹{expAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-4 font-black text-[#00bfa5]">₹{remAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-4">{transfer.payment_method || "-"}</td>
                                    <td className="px-6 py-4">{transfer.transfer_date ? String(transfer.transfer_date).split("T")[0] : "-"}</td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div> : <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
                    {visibleTransfers.map((transfer) => {
                        const trAmt = Number(transfer.amount || 0);
                        const remAmt = Number(transfer.remaining_amount ?? transfer.amount ?? 0);
                        const expAmt = Math.max(trAmt - remAmt, 0);
                        return (
                        <div key={transfer.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="font-bold text-slate-800">{transfer.title}</p>
                                    <p className="text-xs text-slate-500">{transfer.category || "-"}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-400 line-through">₹{trAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                                    <p className="font-black text-[#00bfa5]">₹{remAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                                </div>
                            </div>
                            <p className="mt-4 text-xs text-slate-500">
                                Expense: ₹{expAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })} · {transfer.transfer_date ? String(transfer.transfer_date).split("T")[0] : "-"}
                            </p>
                        </div>
                        );
                    })}
                </div>}
                {visibleTransfers.length === 0 && <p className="p-8 text-center text-sm font-semibold text-slate-400">No transfer records found.</p>}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 sm:px-8">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-600">Finance Management</p>
                                <h2 className="mt-1 text-2xl font-black text-slate-800">Add New Transfer</h2>
                            </div>
                            <button type="button" onClick={closeModal} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close add transfer form"><FiX size={22} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6 sm:px-8">
                            <label className="block">
                                <span className="mb-2 block text-sm font-bold text-slate-700">Transfer Title *</span>
                                <input type="text" name="title" required value={formData.title} onChange={handleChange} placeholder="e.g. Move monthly savings" className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-purple-500" />
                            </label>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Available Income</p>
                                    <p className="mt-2 text-lg font-black text-slate-800">{selectedIncome ? formatCurrency(availableBalance) : "—"}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Transfer Amount</p>
                                    <p className="mt-2 text-lg font-black text-purple-800">{formatCurrency(transferAmount)}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Remaining Income</p>
                                    <p className="mt-2 text-lg font-black text-emerald-700">{selectedIncome ? formatCurrency(remainingAfterTransfer) : "—"}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                <label>
                                    <span className="mb-2 block text-sm font-bold text-slate-700">Payment Method *</span>
                                    <select name="paymentMethod" required value={formData.paymentMethod} onChange={handleChange} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none focus:border-purple-500">
                                        <option>Cash</option>
                                        <option>Bank Transfer</option>
                                        <option>UPI</option>
                                        <option>Card</option>
                                        <option>Other</option>
                                    </select>
                                </label>
                                <label>
                                    <span className="mb-2 block text-sm font-bold text-slate-700">Transfer Amount *</span>
                                    <span className="relative block">
                                        <FiDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="number" name="amount" required min="0.01" step="0.01" value={formData.amount} onChange={handleChange} placeholder="0.00" className="w-full rounded-lg border border-slate-200 py-3 pl-10 pr-4 outline-none focus:border-purple-500" />
                                    </span>
                                    <button type="button" onClick={() => { closeModal(); navigate("/admin/more/income", { state: { openAddIncome: true } }); }} className="mt-2 text-sm font-bold text-purple-700 hover:text-purple-900">+ Add Income Instead</button>
                                </label>
                                <label className="sm:col-span-2">
                                    <span className="mb-2 block text-sm font-bold text-slate-700">Select Existing Income Record</span>
                                    <select value={selectedIncomeId} onChange={handleIncomeSelect} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none focus:border-purple-500">
                                        <option value="">Choose an income record</option>
                                        {incomes.map((income) => (
                                            <option key={income.id} value={income.id}>
                                                {income.title} — {formatCurrency(income.remaining_amount ?? income.amount ?? 0)} available
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label>
                                    <span className="mb-2 block text-sm font-bold text-slate-700">Date *</span>
                                    <input type="date" name="date" required value={formData.date} onChange={handleChange} className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-purple-500" />
                                </label>
                            </div>
                            <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Category *</span><select name="category" required value={formData.category} onChange={handleChange} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none focus:border-purple-500"><option value="">Select category</option><option>Savings</option><option>Investment</option><option>Budget Transfer</option><option>Other</option></select></label>
                            <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Notes</span><textarea name="notes" rows="3" value={formData.notes} onChange={handleChange} placeholder="Add any notes here..." className="w-full resize-none rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-purple-500" /></label>
                            <div className="flex justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={closeModal} className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button><button type="submit" disabled={isSubmitting} className="rounded-lg bg-[#4b0b78] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#260642] disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? "Saving..." : "Save Transfer"}</button></div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const TransferStatCard = ({ label, value, caption, color, icon }) => (
    <div className="flex min-h-32 items-center gap-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.08)]">
        <div className={`flex h-17.5 w-17.5 shrink-0 items-center justify-center rounded-[1.25rem] text-2xl font-black text-white shadow-lg ${color}`}>{icon}</div>
        <div className="min-w-0"><p className="mb-1 text-sm font-bold text-slate-400">{label}</p><h2 className="text-2xl font-black leading-none text-slate-800">{value}</h2><p className="mt-2 text-xs font-medium text-slate-400">{caption}</p></div>
    </div>
);

export default Transfer;
