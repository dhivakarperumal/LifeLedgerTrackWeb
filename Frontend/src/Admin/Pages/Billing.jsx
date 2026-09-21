import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import {
    FiPlus,
    FiEye,
    FiFilter,
    FiSearch,
    FiX,
    FiMoreVertical,
    FiCreditCard,
    FiFileText,
    FiGrid,
    FiList,
    FiDollarSign,
    FiShoppingBag,
    FiChevronLeft,
    FiChevronRight
} from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";

const Billing = () => {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState("table");
    const [statusFilter, setStatusFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    useEffect(() => {
        const fetchShopOrders = async () => {
            try {
                const response = await api.get("/orders");
                const shopOrders = (response.data || [])
                    .filter((order) => String(order.order_type || "").toLowerCase() === "shop")
                    .map((order) => ({
                        orderId: order.id,
                        id: `#ORD-${order.id}`,
                        createdAt: order.created_at,
                        date: order.created_at ? new Date(order.created_at).toLocaleDateString("en-CA") : "-",
                        customer: order.customer_name || "Guest Customer",
                        amount: Number(order.total_amount || 0),
                        status: order.payment_status || "Pending",
                        method: order.payment_method || "Showroom"
                    }));
                setInvoices(shopOrders);
            } catch (error) {
                console.error("Fetch Shop Orders Error:", error);
            }
        };

        fetchShopOrders();
    }, []);

    const filteredInvoices = invoices.filter((invoice) => {
        const matchesSearch = `${invoice.id} ${invoice.customer}`.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || invoice.status.toLowerCase() === statusFilter;
        return matchesSearch && matchesStatus;
    });
    const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
    const paginatedInvoices = filteredInvoices.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );
    const today = new Date();
    const todayInvoices = invoices.filter((invoice) => {
        const orderDate = new Date(invoice.createdAt);
        return !Number.isNaN(orderDate.getTime()) &&
            orderDate.getFullYear() === today.getFullYear() &&
            orderDate.getMonth() === today.getMonth() &&
            orderDate.getDate() === today.getDate();
    });
    const totalAmountToday = todayInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
    const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    useEffect(() => {
        if (totalPages > 0 && currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const getStatusStyle = (status) => {
        switch (status) {
            case "Paid": return "bg-emerald-100 text-emerald-700";
            case "Pending": return "bg-amber-100 text-amber-700";
            case "Overdue": return "bg-red-100 text-red-700";
            default: return "bg-gray-100 text-gray-700";
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
       

            {/* Billing Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="min-h-[132px] bg-white p-5 rounded-2xl border border-gray-200 shadow-[0_2px_8px_rgba(15,23,42,0.08)] flex items-center gap-5">
                    <div className="h-[70px] w-[70px] shrink-0 rounded-[1.25rem] bg-[#FF9200] text-white flex items-center justify-center shadow-lg shadow-orange-100">
                        <FiCreditCard size={30} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-400 mb-1">Total Amount</p>
                        <h2 className="text-2xl font-black leading-none text-slate-800">₹{totalAmount.toLocaleString("en-IN")}</h2>
                        <p className="text-xs text-slate-400 mt-2 font-medium">Shop orders only</p>
                    </div>
                </div>
                <div className="min-h-[132px] bg-white p-5 rounded-2xl border border-gray-200 shadow-[0_2px_8px_rgba(15,23,42,0.08)] flex items-center gap-5">
                    <div className="h-[70px] w-[70px] shrink-0 rounded-[1.25rem] bg-gradient-to-br from-[#4b0b78] to-[#7c22ce] text-white flex items-center justify-center shadow-lg shadow-purple-200">
                        <FiDollarSign size={30} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-400 mb-1">Today Amount</p>
                        <h2 className="text-2xl font-black leading-none text-slate-800">₹{totalAmountToday.toLocaleString("en-IN")}</h2>
                        <p className="text-xs text-slate-400 mt-2 font-medium">Shop orders only</p>
                    </div>
                </div>
                <div className="min-h-[132px] bg-white p-5 rounded-2xl border border-gray-200 shadow-[0_2px_8px_rgba(15,23,42,0.08)] flex items-center gap-5">
                    <div className="h-[70px] w-[70px] shrink-0 rounded-[1.25rem] bg-[#00C7A5] text-white flex items-center justify-center shadow-lg shadow-emerald-100">
                        <FiShoppingBag size={30} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-400 mb-1">Order Count Today</p>
                        <h2 className="text-2xl font-black leading-none text-slate-800">{todayInvoices.length}</h2>
                        <p className="text-xs text-slate-400 mt-2 font-medium">Shop orders only</p>
                    </div>
                </div>
              
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-[2rem] border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-7 flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="relative w-full md:w-72">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Order ID or customer..."
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            className="pl-12 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 transition-all text-sm w-full"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm("")}
                                title="Clear search"
                                aria-label="Clear search"
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                            >
                                <FiX size={16} />
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <div className="flex items-center gap-1 p-1 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex items-center gap-2 px-2 border-r border-gray-200">
                            <FiFilter className="text-gray-400" size={16} />
                            <select
                                value={statusFilter}
                                onChange={(event) => setStatusFilter(event.target.value)}
                                aria-label="Filter orders by payment status"
                                className="bg-transparent text-xs font-bold text-gray-600 outline-none cursor-pointer"
                            >
                                <option value="all">All</option>
                                <option value="paid">Paid</option>
                                <option value="pending">Pending</option>
                                <option value="overdue">Overdue</option>
                            </select>
                        </div>
                            <button
                            type="button"
                            title="Card view"
                            aria-label="Card view"
                            onClick={() => setViewMode("card")}
                            className={`p-2.5 rounded-lg transition-all ${viewMode === "card" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-700"}`}
                        >
                            <FiGrid size={18} />
                            </button>
                            <button
                            type="button"
                            title="Table view"
                            aria-label="Table view"
                            onClick={() => setViewMode("table")}
                            className={`p-2.5 rounded-lg transition-all ${viewMode === "table" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-700"}`}
                        >
                            <FiList size={18} />
                            </button>
                        </div>
                        <button
                        onClick={() => navigate("/admin/orders/shop-create")}
                        className="flex items-center gap-2 px-6 py-3 bg-[#4b0b78] hover:bg-[#260642] text-white rounded-md text-sm font-bold transition-all shadow-lg shadow-purple-200"
                        >
                            <FiPlus /> Create New Order
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                {viewMode === "table" ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-[#350866] text-[#FCD34D]">
                                <th className="px-6 py-5 w-12 rounded-tl-[2rem]">
                                    <input type="checkbox" aria-label="Select all orders" className="h-4 w-4 accent-[#FCD34D]" />
                                </th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider">Order ID</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider">Payment</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider">Status</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider">Order Date</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider text-right rounded-tr-[2rem]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {paginatedInvoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-blue-50/20 transition-colors group">
                                    <td className="px-6 py-6">
                                        <input type="checkbox" aria-label={`Select ${inv.id}`} className="h-4 w-4 accent-[#4b0b78]" />
                                    </td>
                                    <td className="px-6 py-6 text-xs font-bold text-slate-800">{inv.id}</td>
                                    <td className="px-6 py-6 text-xs font-bold text-slate-700">{inv.customer}</td>
                                    <td className="px-6 py-6 text-xs font-bold text-slate-800">₹{inv.amount.toFixed(2)}</td>
                                    <td className="px-6 py-6">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                                            <FiCreditCard /> {inv.method}
                                        </div>
                                    </td>
                                    <td className="px-6 py-6">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusStyle(inv.status)}`}>
                                            {inv.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-6 text-[11px] text-gray-500">{inv.date}</td>
                                    <td className="px-6 py-6">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => navigate(`/admin/orders/${inv.orderId}`)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition-all" title="View order" aria-label={`View order ${inv.id}`}>
                                                <FiEye size={16} />
                                            </button>
                                           
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredInvoices.length === 0 && (
                                <tr>
                                    <td colSpan="8" className="px-8 py-12 text-center text-sm text-gray-400">
                                        No Shop orders found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 p-6 bg-gray-50/40">
                        {paginatedInvoices.map((inv) => (
                            <article key={inv.id} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-5 shadow-sm hover:-translate-y-0.5 hover:shadow-lg transition-all">
                                <div className="flex items-start justify-between gap-3 pb-4 border-b border-gray-100">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.16em]">Shop Order</p>
                                        <h3 className="text-lg font-black text-slate-800 mt-1">{inv.id}</h3>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input type="checkbox" aria-label={`Select ${inv.id}`} className="h-4 w-4 accent-[#4b0b78]" />
                                        <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${getStatusStyle(inv.status)}`}>
                                            {inv.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Customer</p>
                                        <p className="font-bold text-slate-700 mt-1 truncate">{inv.customer}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Payment</p>
                                        <p className="font-bold text-slate-700 mt-1 truncate">{inv.method}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Order Date</p>
                                        <p className="text-gray-500 mt-1">{inv.date}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Amount</p>
                                        <p className="text-lg font-black text-slate-800 mt-0.5">₹{inv.amount.toFixed(2)}</p>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                                    <button onClick={() => navigate(`/admin/orders/${inv.orderId}`)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="View order" aria-label={`View order ${inv.id}`}>
                                        <FiEye size={16} />
                                    </button>
                                    <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-all" title="More actions" aria-label={`More actions for ${inv.id}`}>
                                        <FiMoreVertical size={16} />
                                    </button>
                                </div>
                            </article>
                        ))}
                        {filteredInvoices.length === 0 && (
                            <p className="col-span-full px-8 py-12 text-center text-sm text-gray-400">No Shop orders found.</p>
                        )}
                    </div>
                )}
                {totalPages > 1 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-6 py-4">
                        <p className="text-xs font-semibold text-gray-500">
                            Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredInvoices.length)} of {filteredInvoices.length}
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                                disabled={currentPage === 1}
                                aria-label="Previous page"
                                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <FiChevronLeft size={16} />
                            </button>
                            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                                <button
                                    type="button"
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`min-w-9 h-9 px-2 rounded-lg border text-xs font-bold transition-colors ${currentPage === page ? "bg-[#4b0b78] border-[#4b0b78] text-white" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                                >
                                    {page}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                aria-label="Next page"
                                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <FiChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Billing;
