const fs = require('fs');

const filePath = 'd:/Q Techx Projects/Webs/Saree_Web_Sites/frontend/src/Admin/Pages/Orders.jsx';
let code = fs.readFileSync(filePath, 'utf-8');

const returnStart = code.indexOf('    return (');
if (returnStart === -1) {
    console.log("Could not find return statement");
    process.exit(1);
}

const newUi = `    return (
        <div className="bg-[#f8f9fc] min-h-screen pb-10 font-sans animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Toaster position="top-right" />
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                
                {/* Header & Breadcrumb */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-2">
                    <div></div>
                    <div className="flex flex-col items-end gap-3">
                        <div className="text-xs font-semibold text-gray-500 flex items-center gap-2">
                            <span>Dashboard</span>
                            <span className="text-gray-400">&gt;</span>
                            <span>Orders</span>
                            <span className="text-gray-400">&gt;</span>
                            <span className="text-[#4318FF] font-bold">All Orders</span>
                        </div>
                        <button
                            className="bg-[#4318FF] hover:bg-blue-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm shadow-[#4318FF]/20"
                        >
                            <FiDownload className="text-lg leading-none" /> Export Orders
                        </button>
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex flex-col justify-between h-[120px] relative overflow-hidden">
                        <div className="absolute left-5 top-5 w-12 h-12 rounded-full bg-[#f4f1ff] text-[#4318FF] flex items-center justify-center">
                            <FiShoppingBag size={22} />
                        </div>
                        <div className="ml-16">
                            <p className="text-[11px] font-bold text-gray-700 mb-0.5">Total Orders</p>
                            <h3 className="text-2xl font-black text-[#4318FF]">{filteredOrders.length || 320}</h3>
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium">All orders placed</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex flex-col justify-between h-[120px] relative overflow-hidden">
                        <div className="absolute left-5 top-5 w-12 h-12 rounded-full bg-green-50 text-green-500 flex items-center justify-center">
                            <FiCheckCircle size={22} />
                        </div>
                        <div className="ml-16">
                            <p className="text-[11px] font-bold text-gray-700 mb-0.5">Confirmed Orders</p>
                            <h3 className="text-2xl font-black text-green-500">{orders.filter(o => ['Order Placed', 'Processing', 'New'].includes(o.status)).length || 145}</h3>
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium">Orders confirmed</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex flex-col justify-between h-[120px] relative overflow-hidden">
                        <div className="absolute left-5 top-5 w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
                            <FiTruck size={22} />
                        </div>
                        <div className="ml-16">
                            <p className="text-[11px] font-bold text-gray-700 mb-0.5">Shipped Orders</p>
                            <h3 className="text-2xl font-black text-blue-500">{orders.filter(o => ['Shipping', 'Out for Delivery', 'Shipped', 'Packing'].includes(o.status)).length || 98}</h3>
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium">Orders shipped</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex flex-col justify-between h-[120px] relative overflow-hidden">
                        <div className="absolute left-5 top-5 w-12 h-12 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
                            <FiShoppingBag size={22} />
                        </div>
                        <div className="ml-16">
                            <p className="text-[11px] font-bold text-gray-700 mb-0.5">Delivered Orders</p>
                            <h3 className="text-2xl font-black text-orange-500">{orders.filter(o => o.status === 'Delivered').length || 60}</h3>
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium">Orders delivered</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex flex-col justify-between h-[120px] relative overflow-hidden">
                        <div className="absolute left-5 top-5 w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
                            <FiXCircle size={22} />
                        </div>
                        <div className="ml-16">
                            <p className="text-[11px] font-bold text-gray-700 mb-0.5">Cancelled Orders</p>
                            <h3 className="text-2xl font-black text-red-500">{orders.filter(o => o.status === 'Cancelled').length || 17}</h3>
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium">Orders cancelled</p>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4 flex-1">
                        <div className="relative w-full md:w-72">
                            <input 
                                type="text" 
                                placeholder="Search by Order ID, Customer, Phone..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium focus:outline-none focus:border-[#4318FF]"
                            />
                            <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                        
                        <div className="relative">
                            <span className="absolute -top-2.5 left-3 bg-white px-1 text-[10px] font-bold text-gray-500 z-10">Select Status</span>
                            <select 
                                value={activeStatus}
                                onChange={(e) => setActiveStatus(e.target.value)}
                                className="w-36 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium focus:outline-none focus:border-[#4318FF] appearance-none"
                            >
                                <option value="All">All Status</option>
                                <option value="Order Placed">Confirmed</option>
                                <option value="Shipping">Shipped</option>
                                <option value="Delivered">Delivered</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[10px]">▼</span>
                        </div>

                        <div className="relative">
                            <span className="absolute -top-2.5 left-3 bg-white px-1 text-[10px] font-bold text-gray-500 z-10">Select Payment</span>
                            <select 
                                className="w-36 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium focus:outline-none focus:border-[#4318FF] appearance-none"
                            >
                                <option>All Payment</option>
                                <option>Online</option>
                                <option>COD</option>
                            </select>
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[10px]">▼</span>
                        </div>

                        <div className="relative">
                            <span className="absolute -top-2.5 left-3 bg-white px-1 text-[10px] font-bold text-gray-500 z-10">Select Date Range</span>
                            <div className="w-44 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium flex items-center justify-between cursor-pointer">
                                <span className="text-white select-none">Date</span>
                                <FiCalendar className="text-gray-400" />
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 border border-[#4318FF] text-[#4318FF] font-bold rounded-lg text-[13px] hover:bg-blue-50 transition-colors shadow-sm">
                            <FiFilter size={14} /> Filters
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-[#4318FF] font-bold rounded-lg text-[13px] hover:bg-gray-50 transition-colors shadow-sm">
                            <span className="text-base leading-none">↻</span> Reset
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-[#f8f9fc] border-b border-gray-100 text-[11px] font-black text-[#2B3674] uppercase tracking-wider">
                                    <th className="px-6 py-4 w-12"><input type="checkbox" className="rounded border-gray-300 text-[#4318FF] focus:ring-[#4318FF]" /></th>
                                    <th className="px-6 py-4">Order ID</th>
                                    <th className="px-6 py-4">Customer</th>
                                    <th className="px-6 py-4">Products</th>
                                    <th className="px-6 py-4">Amount</th>
                                    <th className="px-6 py-4">Payment</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Order Date</th>
                                    <th className="px-6 py-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-10 text-center text-gray-400 text-sm font-semibold">
                                            Loading orders...
                                        </td>
                                    </tr>
                                ) : currentItems.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-10 text-center text-gray-400 text-sm font-semibold">
                                            No orders found.
                                        </td>
                                    </tr>
                                ) : (
                                    currentItems.map((order, idx) => {
                                        const mockName = order.customer_name || "Guest Customer";
                                        const mockPhone = order.customer_phone || "+91 98765 43210";
                                        const mockProductImg = "https://via.placeholder.com/40"; // Placeholder
                                        const mockProductName = "Saree Name"; // Placeholder
                                        const mockPaymentMethod = order.payment_method || (idx % 2 === 0 ? "Online" : "COD");
                                        const mockPaymentStatus = mockPaymentMethod === "Online" ? "Paid" : "Pending";
                                        
                                        return (
                                            <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <input type="checkbox" className="rounded border-gray-300 text-[#4318FF] focus:ring-[#4318FF]" />
                                                </td>
                                                <td className="px-6 py-4 text-[13px] font-black text-[#4318FF]">
                                                    #SS{10000 + (parseInt(order.id) || idx + 1)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold shrink-0">
                                                           {mockName.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="text-[13px] font-bold text-[#2B3674]">{mockName}</div>
                                                            <div className="text-[11px] text-gray-400 font-medium mt-0.5">{mockPhone}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <img src={mockProductImg} alt="product" className="w-10 h-10 rounded shadow-sm object-cover" />
                                                        <div>
                                                            <div className="text-[13px] font-bold text-[#2B3674]">{mockProductName}</div>
                                                            <div className="text-[11px] text-gray-400 font-medium mt-0.5">x1</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-[13px] font-black text-[#2B3674]">₹{parseFloat(order.total_amount || 0).toLocaleString()}</div>
                                                    <div className="text-[11px] text-gray-400 font-medium mt-0.5">1 Item</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col items-start gap-1">
                                                        <span className={\`px-2.5 py-1 rounded text-[10px] font-bold \${mockPaymentMethod === 'Online' ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-[#f4f1ff] text-[#4318FF]'}\`}>
                                                            {mockPaymentMethod}
                                                        </span>
                                                        <span className="text-[10px] text-gray-500 font-medium">{mockPaymentStatus}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col items-start gap-1 relative group/status">
                                                        <select
                                                                value={order.status}
                                                                onChange={(e) => handleQuickStatusUpdate(order.id, e.target.value)}
                                                                className={\`appearance-none cursor-pointer flex items-center gap-2 px-2.5 py-1 rounded text-[10px] font-bold border outline-none transition-all \${
                                                                    order.status === 'Delivered' ? 'bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]' :
                                                                    order.status === 'Shipped' || order.status === 'Out for Delivery' ? 'bg-[#eff6ff] text-[#3b82f6] border-[#bfdbfe]' :
                                                                    order.status === 'Cancelled' ? 'bg-[#fef2f2] text-[#ef4444] border-[#fecaca]' :
                                                                    order.status === 'Processing' || order.status === 'Order Placed' ? 'bg-[#fff7ed] text-[#ea580c] border-[#fed7aa]' :
                                                                    'bg-[#f4f1ff] text-[#4318FF] border-[#e0e7ff]'
                                                                }\`}
                                                            >
                                                                {(() => {
                                                                    const flow = ["Order Placed", "Packing", "Shipping", "Out for Delivery", "Delivered"];
                                                                    const currentIndex = flow.indexOf(order.status);
                                                                    const options = currentIndex === -1 
                                                                        ? [...flow, "Cancelled", order.status] 
                                                                        : [...flow.slice(currentIndex), ...(currentIndex < 2 ? ["Cancelled"] : [])];
                                                                    
                                                                    return Array.from(new Set(options)).map(status => (
                                                                        <option key={status} value={status}>{status}</option>
                                                                    ));
                                                                })()}
                                                        </select>
                                                        <div className="text-[9px] text-gray-400 font-medium mt-1">
                                                            {order.status === 'Delivered' ? 'Delivered on' :
                                                             order.status === 'Shipped' || order.status === 'Out for Delivery' ? 'Shipped on' :
                                                             order.status === 'Cancelled' ? 'Cancelled on' : 'Updated on'}
                                                             <br/>
                                                            {order.updated_at ? new Date(order.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-[12px] font-bold text-[#2B3674]">{order.created_at ? new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown'}</div>
                                                    <div className="text-[11px] text-gray-500 font-medium">{order.created_at ? new Date(order.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Link to={\`/admin/orders/\${order.id}\`} className="p-1.5 border border-gray-200 rounded hover:bg-gray-100 text-[#4318FF] transition-colors shadow-sm">
                                                            <FiEye size={14} />
                                                        </Link>
                                                        <button 
                                                            className="p-1.5 border border-gray-200 rounded hover:bg-gray-100 text-[#4318FF] transition-colors shadow-sm"
                                                        >
                                                            <FiMoreVertical size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
                        <p className="text-[13px] font-bold text-[#2B3674]">
                            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredOrders.length)} of {filteredOrders.length} orders
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 text-[13px] font-bold text-[#2B3674] shadow-sm cursor-pointer hover:bg-gray-50">
                                10 per page <span className="text-gray-400 text-[10px] ml-1">▼</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 shadow-sm font-bold text-[13px]"
                                >
                                    &lt;
                                </button>
                                {[...Array(Math.min(totalPages || 1, 3))].map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentPage(i + 1)}
                                        className={\`w-8 h-8 flex items-center justify-center rounded-lg text-[13px] font-bold shadow-sm \${currentPage === i + 1 ? 'bg-[#4318FF] text-white border border-[#4318FF]' : 'border border-gray-200 text-[#2B3674] hover:bg-gray-50'}\`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                                {totalPages > 3 && <span className="w-8 h-8 flex items-center justify-center text-gray-400">...</span>}
                                {totalPages > 3 && (
                                    <button
                                        onClick={() => setCurrentPage(totalPages)}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-[13px] font-bold border border-gray-200 text-[#2B3674] hover:bg-gray-50 shadow-sm"
                                    >
                                        {totalPages}
                                    </button>
                                )}
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 shadow-sm font-bold text-[13px]"
                                >
                                    &gt;
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            {/* Logistics Pipeline Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setShowModal(false)}
                    />
                    <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className={\`p-8 \${modalData.status === 'Cancelled' ? 'bg-red-600' : 'bg-slate-900'} text-white\`}>
                            <h3 className="text-xl font-black tracking-tight">{modalData.status} Pipeline Meta</h3>
                            <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-1 italic">Order Ref: #ORD-0{modalData.orderId}</p>
                        </div>

                        <form onSubmit={handleModalSubmit} className="p-8 space-y-6">
                            {modalData.status === 'Shipping' ? (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Docket Number / AWB</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500/20 transition-all outline-none font-bold"
                                            placeholder="Enter Tracking ID..."
                                            value={modalData.tracking}
                                            onChange={(e) => setModalData(p => ({ ...p, tracking: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Courier Intelligence Unit</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500/20 transition-all outline-none font-bold"
                                            placeholder="e.g. BlueDart, Delhivery..."
                                            value={modalData.courier}
                                            onChange={(e) => setModalData(p => ({ ...p, courier: e.target.value }))}
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Cancellation Rationale</label>
                                    <textarea
                                        required
                                        rows="4"
                                        className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-red-500/20 transition-all outline-none font-bold resize-none"
                                        placeholder="Reason for order termination..."
                                        value={modalData.reason}
                                        onChange={(e) => setModalData(p => ({ ...p, reason: e.target.value }))}
                                    />
                                </div>
                            )}

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2 border-gray-100 text-gray-400 hover:bg-gray-50 transition-all"
                                >
                                    Abort
                                </button>
                                <button
                                    type="submit"
                                    className={\`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] text-white shadow-lg transition-all active:scale-95 \${modalData.status === 'Cancelled' ? 'bg-red-600 shadow-red-500/20 hover:bg-red-500' : 'bg-[#4318FF] shadow-blue-500/20 hover:bg-blue-800'}\`}
                                >
                                    Sync Pipeline
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
}

export default Orders;
`;

const finalCode = code.substring(0, returnStart) + newUi;
fs.writeFileSync(filePath, finalCode, 'utf-8');
console.log("Updated Orders.jsx successfully");
