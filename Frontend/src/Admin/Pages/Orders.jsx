import React, { useEffect, useState } from "react";
import api from "../../api";
import { toast } from "react-hot-toast";

const Orders = ({ statusFilter = "All" }) => {
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        api.get("/orders")
            .then((response) => setOrders(response.data?.data || response.data || []))
            .catch((error) => {
                console.error("Fetch Orders Error:", error);
                toast.error("Failed to load orders");
            });
    }, []);

    const visibleOrders = statusFilter === "All"
        ? orders
        : orders.filter((order) => order.status === statusFilter || (statusFilter === "Order Placed" && order.status === "New Order"));

    return (
        <div className="space-y-6 pb-20">
            <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-600">Order Management</p>
                <h1 className="mt-1 text-3xl font-black text-slate-800">{statusFilter === "All" ? "All Orders" : statusFilter}</h1>
            </div>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#350866] text-xs uppercase tracking-wider text-[#FCD34D]">
                            <tr>
                                <th className="px-6 py-4">Order</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {visibleOrders.map((order) => (
                                <tr key={order.id} className="text-slate-700">
                                    <td className="px-6 py-4 font-bold">#{order.id}</td>
                                    <td className="px-6 py-4">{order.customer_name || "Guest Customer"}</td>
                                    <td className="px-6 py-4 font-bold">₹{Number(order.total_amount || 0).toLocaleString("en-IN")}</td>
                                    <td className="px-6 py-4">{order.status || "-"}</td>
                                    <td className="px-6 py-4">{order.created_at ? new Date(order.created_at).toLocaleDateString("en-IN") : "-"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {visibleOrders.length === 0 && <p className="p-8 text-center text-sm font-semibold text-slate-400">No orders found.</p>}
            </div>
        </div>
    );
};

export default Orders;
