import React, { useEffect, useState } from "react";
import { FiDollarSign, FiSend, FiFileText, FiCalendar } from "react-icons/fi";
import { toast } from "react-hot-toast";
import api from "../../api";

const Transfer = () => {
    const [formData, setFormData] = useState({
        title: "",
        fromAccount: "",
        toAccount: "",
        amount: "",
        category: "",
        date: new Date().toISOString().split('T')[0],
        notes: "",
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [transfers, setTransfers] = useState([]);

    useEffect(() => {
        api.get("/transfers")
            .then((response) => setTransfers(response.data || []))
            .catch((error) => {
                console.error("Fetch Transfers Error:", error);
                toast.error("Failed to load transfers.");
            });
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
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
            setFormData({
                title: "",
                fromAccount: "",
                toAccount: "",
                amount: "",
                category: "",
                date: new Date().toISOString().split('T')[0],
                notes: "",
            });
        } catch (error) {
            toast.error(error.response?.data?.message || "Transfer failed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 bg-[#0B031E] text-white min-h-screen">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-[#D4AF37] flex items-center gap-2">
                        <FiSend className="text-[#FBBF24]" />
                        Transfer Amount
                    </h1>
                    <p className="text-gray-400 mt-1">Record a transfer without counting it as new income.</p>
                </div>

                <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Income Title *</label>
                            <input type="text" name="title" required value={formData.title} onChange={handleChange} placeholder="e.g. Move monthly savings" className="w-full px-3 py-2 border border-white/10 rounded-lg bg-white/5 text-white focus:outline-none focus:border-[#D4AF37]" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* From Account */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    From Account *
                                </label>
                                <div className="relative">
                                    <select
                                        name="fromAccount"
                                        required
                                        value={formData.fromAccount}
                                        onChange={handleChange}
                                        className="w-full pl-3 pr-10 py-2 border border-white/10 rounded-lg bg-white/5 text-white focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
                                    >
                                        <option value="" className="bg-[#12072B]">Select source...</option>
                                        <option value="Bank" className="bg-[#12072B]">Bank</option>
                                        <option value="UPI" className="bg-[#12072B]">UPI</option>
                                        <option value="Cash" className="bg-[#12072B]">Cash</option>
                                        <option value="Other" className="bg-[#12072B]">Other</option>
                                    </select>
                                </div>
                            </div>

                            {/* To Account */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    To Account *
                                </label>
                                <div className="relative">
                                    <select
                                        name="toAccount"
                                        required
                                        value={formData.toAccount}
                                        onChange={handleChange}
                                        className="w-full pl-3 pr-10 py-2 border border-white/10 rounded-lg bg-white/5 text-white focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
                                    >
                                        <option value="" className="bg-[#12072B]">Select destination...</option>
                                        <option value="Main Account" className="bg-[#12072B]">Main Account</option>
                                        <option value="Savings" className="bg-[#12072B]">Savings</option>
                                        <option value="Wallet" className="bg-[#12072B]">Wallet</option>
                                        <option value="Other" className="bg-[#12072B]">Other</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Amount */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                        Transfer Amount ₹ *
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FiDollarSign className="text-gray-400" />
                                    </div>
                                    <input
                                        type="number"
                                        name="amount"
                                        required
                                        min="0.01"
                                        step="0.01"
                                        value={formData.amount}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-3 py-2 border border-white/10 rounded-lg bg-white/5 text-white focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            {/* Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Date *
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FiCalendar className="text-gray-400" />
                                    </div>
                                    <input
                                        type="date"
                                        name="date"
                                        required
                                        value={formData.date}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-3 py-2 border border-white/10 rounded-lg bg-white/5 text-white focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] [&::-webkit-calendar-picker-indicator]:invert"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Income Category *</label>
                            <select name="category" required value={formData.category} onChange={handleChange} className="w-full px-3 py-2 border border-white/10 rounded-lg bg-white/5 text-white focus:outline-none focus:border-[#D4AF37]">
                                <option value="" className="bg-[#12072B]">Select category...</option>
                                <option value="Savings" className="bg-[#12072B]">Savings</option>
                                <option value="Investment" className="bg-[#12072B]">Investment</option>
                                <option value="Budget Transfer" className="bg-[#12072B]">Budget Transfer</option>
                                <option value="Other" className="bg-[#12072B]">Other</option>
                            </select>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Description
                            </label>
                            <div className="relative">
                                <div className="absolute top-3 left-3 flex items-start pointer-events-none">
                                    <FiFileText className="text-gray-400" />
                                </div>
                                <textarea
                                    name="notes"
                                    rows="3"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-3 py-2 border border-white/10 rounded-lg bg-white/5 text-white focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
                                    placeholder="Add any notes here..."
                                ></textarea>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end pt-4 border-t border-white/10">
                            <button
                                type="button"
                                className="px-5 py-2 mr-3 text-sm font-medium text-white border border-white/20 rounded-lg hover:bg-white/10 focus:outline-none transition-colors"
                                onClick={() => setFormData({ title: '', fromAccount: '', toAccount: '', amount: '', category: '', date: new Date().toISOString().split('T')[0], notes: '' })}
                            >
                                Clear
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-5 py-2 text-sm font-medium text-black bg-gradient-to-r from-[#D4AF37] to-[#FBBF24] rounded-lg hover:shadow-lg hover:shadow-[#D4AF37]/20 focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <FiSend />
                                        Complete Transfer
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Transfer;
