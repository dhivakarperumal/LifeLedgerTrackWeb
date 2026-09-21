import React, { useEffect, useState } from "react";
import { FiDollarSign, FiSend, FiX, FiPlus } from "react-icons/fi";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import api from "../../api";

const createEmptyForm = () => ({
    title: "",
    fromAccount: "",
    toAccount: "",
    amount: "",
    category: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
});

const Transfer = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState(createEmptyForm);
    const [transfers, setTransfers] = useState([]);
    const [incomes, setIncomes] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

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

        const loadIncomeOptions = async () => {
            try {
                const response = await api.get("/incomes");
                setIncomes(response.data || []);
            } catch (error) {
                console.error("Fetch Income Options Error:", error);
            }
        };

        loadIncomeOptions();
    }, []);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((current) => ({ ...current, [name]: value }));
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setFormData(createEmptyForm());
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            const response = await api.post("/transfers", {
                title: formData.title,
                amount: formData.amount,
                category: formData.category,
                transferFrom: formData.fromAccount,
                transferTo: formData.toAccount,
                date: formData.date,
                notes: formData.notes,
            });
            setTransfers((current) => [response.data.transfer, ...current]);
            toast.success("Transfer completed successfully!");
            closeModal();
        } catch (error) {
            toast.error(error.response?.data?.message || "Transfer failed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-600">Finance Management</p>
                    <h1 className="mt-1 flex items-center gap-2 text-3xl font-black text-slate-800">
                        <FiSend className="text-purple-700" /> All Transfer Amounts
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">Track money moved between your accounts.</p>
                </div>
                <button type="button" onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#240046] to-[#7b2cbf] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-purple-900/30 transition-all hover:from-[#10002b] hover:to-[#5a189a] active:scale-95">
                    <FiPlus size={16} /> Add New Transfer
                </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gradient-to-r from-[#1F0A3C] to-[#3c096c] text-xs uppercase tracking-wider text-[#FCD34D]">
                            <tr>
                                <th className="px-6 py-4">Title</th>
                                <th className="px-6 py-4">From</th>
                                <th className="px-6 py-4">To</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {transfers.map((transfer) => (
                                <tr key={transfer.id} className="text-slate-700 hover:bg-purple-50/40">
                                    <td className="px-6 py-4 font-bold">{transfer.title}</td>
                                    <td className="px-6 py-4">{transfer.transfer_from || "-"}</td>
                                    <td className="px-6 py-4">{transfer.transfer_to || "-"}</td>
                                    <td className="px-6 py-4">{transfer.category || "-"}</td>
                                    <td className="px-6 py-4 font-bold text-purple-800">₹{Number(transfer.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-4">{transfer.transfer_date || "-"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {transfers.length === 0 && <p className="p-8 text-center text-sm font-semibold text-slate-400">No transfer records found.</p>}
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
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                <label><span className="mb-2 block text-sm font-bold text-slate-700">From Account *</span><select name="fromAccount" required value={formData.fromAccount} onChange={handleChange} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none focus:border-purple-500"><option value="">Select source</option><option>Bank</option><option>UPI</option><option>Cash</option><option>Other</option></select></label>
                                <label><span className="mb-2 block text-sm font-bold text-slate-700">To Account *</span><select name="toAccount" required value={formData.toAccount} onChange={handleChange} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none focus:border-purple-500"><option value="">Select destination</option><option>Main Account</option><option>Savings</option><option>Wallet</option><option>Other</option></select></label>
                                <label><span className="mb-2 block text-sm font-bold text-slate-700">Transfer Amount *</span><span className="relative block"><FiDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="number" name="amount" required min="0.01" step="0.01" value={formData.amount} onChange={handleChange} placeholder="0.00" className="w-full rounded-lg border border-slate-200 py-3 pl-10 pr-4 outline-none focus:border-purple-500" /></span><button type="button" onClick={() => { closeModal(); navigate("/admin/more/income", { state: { openAddIncome: true } }); }} className="mt-2 text-sm font-bold text-purple-700 hover:text-purple-900">+ Add Income Instead</button></label>
                                <label><span className="mb-2 block text-sm font-bold text-slate-700">Select Income Amount</span><select value="" onChange={(event) => setFormData((current) => ({ ...current, amount: event.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none focus:border-purple-500"><option value="">Choose an income record</option>{incomes.map((income) => <option key={income.id} value={income.amount}>{income.title} - ₹{Number(income.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</option>)}</select></label>
                                <label><span className="mb-2 block text-sm font-bold text-slate-700">Date *</span><input type="date" name="date" required value={formData.date} onChange={handleChange} className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-purple-500" /></label>
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

export default Transfer;
