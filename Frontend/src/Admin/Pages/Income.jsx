import React, { useState } from "react";
import { FiDollarSign, FiPlusCircle, FiFileText, FiCalendar, FiTrendingUp } from "react-icons/fi";
import { toast } from "react-hot-toast";

const Income = () => {
    const [formData, setFormData] = useState({
        source: "",
        category: "",
        amount: "",
        date: new Date().toISOString().split('T')[0],
        description: "",
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            toast.success("Income recorded successfully!");
            setFormData({
                source: "",
                category: "",
                amount: "",
                date: new Date().toISOString().split('T')[0],
                description: "",
            });
        } catch (error) {
            toast.error("Failed to record income.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 bg-[#0B031E] text-white min-h-screen">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-[#D4AF37] flex items-center gap-2">
                        <FiTrendingUp className="text-[#FBBF24]" />
                        Record Income
                    </h1>
                    <p className="text-gray-400 mt-1">Log a new incoming payment or revenue source.</p>
                </div>

                <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Source */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Source *
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="source"
                                        required
                                        value={formData.source}
                                        onChange={handleChange}
                                        className="w-full pl-3 pr-3 py-2 border border-white/10 rounded-lg bg-white/5 text-white focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
                                        placeholder="e.g. Sales, Client Project"
                                    />
                                </div>
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Category *
                                </label>
                                <div className="relative">
                                    <select
                                        name="category"
                                        required
                                        value={formData.category}
                                        onChange={handleChange}
                                        className="w-full pl-3 pr-10 py-2 border border-white/10 rounded-lg bg-white/5 text-white focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
                                    >
                                        <option value="" className="bg-[#12072B]">Select a category...</option>
                                        <option value="Sales" className="bg-[#12072B]">Sales</option>
                                        <option value="Services" className="bg-[#12072B]">Services</option>
                                        <option value="Investment" className="bg-[#12072B]">Investment</option>
                                        <option value="Other" className="bg-[#12072B]">Other</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Amount */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Amount *
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
                                    name="description"
                                    rows="3"
                                    value={formData.description}
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
                                onClick={() => setFormData({ source: '', category: '', amount: '', date: new Date().toISOString().split('T')[0], description: '' })}
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
                                        <FiPlusCircle />
                                        Record Income
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

export default Income;
