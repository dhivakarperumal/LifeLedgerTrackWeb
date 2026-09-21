const fs = require('fs');

const filePath = 'd:/Q Techx Projects/Webs/Saree_Web_Sites/frontend/src/Admin/Pages/Users.jsx';
let code = fs.readFileSync(filePath, 'utf-8');

const returnStart = code.indexOf('    return (');
if (returnStart === -1) {
    console.log("Could not find return statement");
    process.exit(1);
}

const newUi = `    return (
        <div className="bg-[#f8f9fc] min-h-screen pb-10 font-sans">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                
                {/* Header & Breadcrumb */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-2">
                    <div></div>
                    <div className="flex flex-col items-end gap-3">
                        <div className="text-xs font-semibold text-gray-500 flex items-center gap-2">
                            <span>Dashboard</span>
                            <span className="text-gray-400">&gt;</span>
                            <span>Customers</span>
                            <span className="text-gray-400">&gt;</span>
                            <span className="text-[#4318FF] font-bold">All Customers</span>
                        </div>
                        <button
                            onClick={() => { setIsEditing(false); setFormData({ username: "", name: "", email: "", phone: "", role: "user", password: "" }); setIsModalOpen(true); }}
                            className="bg-[#4318FF] hover:bg-blue-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm shadow-[#4318FF]/20"
                        >
                            <span className="text-lg leading-none mb-0.5">+</span> Add New Customer
                        </button>
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-[#f4f1ff] text-[#4318FF] flex items-center justify-center shrink-0">
                            <FiUserPlus size={24} />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-gray-700 mb-0.5">Total Customers</p>
                            <h3 className="text-2xl font-black text-[#2B3674]">1,248</h3>
                            <p className="text-[10px] text-gray-400 font-medium">All registered customers</p>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-green-50 text-green-500 flex items-center justify-center shrink-0">
                            <FiUserPlus size={24} />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-gray-700 mb-0.5">Active Customers</p>
                            <h3 className="text-2xl font-black text-green-500">1,102</h3>
                            <p className="text-[10px] text-gray-400 font-medium">Active accounts</p>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                            <FiUserX size={24} />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-gray-700 mb-0.5">Inactive Customers</p>
                            <h3 className="text-2xl font-black text-orange-500">146</h3>
                            <p className="text-[10px] text-gray-400 font-medium">Inactive accounts</p>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                            <FiUserPlus size={24} />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-gray-700 mb-0.5">Male Customers</p>
                            <h3 className="text-2xl font-black text-blue-500">542</h3>
                            <p className="text-[10px] text-gray-400 font-medium">43.4% of total</p>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-pink-50 text-pink-500 flex items-center justify-center shrink-0">
                            <FiUserPlus size={24} />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-gray-700 mb-0.5">Female Customers</p>
                            <h3 className="text-2xl font-black text-pink-500">706</h3>
                            <p className="text-[10px] text-gray-400 font-medium">56.6% of total</p>
                        </div>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4 flex-1">
                        <div className="relative w-full md:w-64">
                            <input 
                                type="text" 
                                placeholder="Search by name, email, phone..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium focus:outline-none focus:border-[#4318FF]"
                            />
                            <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                        
                        <div className="relative">
                            <span className="absolute -top-2.5 left-3 bg-white px-1 text-[10px] font-bold text-gray-500 z-10">Select Status</span>
                            <select 
                                className="w-36 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium focus:outline-none focus:border-[#4318FF] appearance-none"
                            >
                                <option>All Status</option>
                                <option>Active</option>
                                <option>Inactive</option>
                            </select>
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[10px]">▼</span>
                        </div>

                        <div className="relative">
                            <span className="absolute -top-2.5 left-3 bg-white px-1 text-[10px] font-bold text-gray-500 z-10">Select Gender</span>
                            <select 
                                className="w-36 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium focus:outline-none focus:border-[#4318FF] appearance-none"
                            >
                                <option>All Gender</option>
                                <option>Female</option>
                                <option>Male</option>
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
                                    <th className="px-6 py-4">Customer ID</th>
                                    <th className="px-6 py-4">Customer</th>
                                    <th className="px-6 py-4">Email</th>
                                    <th className="px-6 py-4">Phone</th>
                                    <th className="px-6 py-4">Gender</th>
                                    <th className="px-6 py-4 text-center">Orders</th>
                                    <th className="px-6 py-4">Total Spent</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4">Joined Date</th>
                                    <th className="px-6 py-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="11" className="px-6 py-10 text-center text-gray-400 text-sm font-semibold">
                                            Loading customers...
                                        </td>
                                    </tr>
                                ) : currentItems.length === 0 ? (
                                    <tr>
                                        <td colSpan="11" className="px-6 py-10 text-center text-gray-400 text-sm font-semibold">
                                            No customers found.
                                        </td>
                                    </tr>
                                ) : (
                                    currentItems.map((user, idx) => {
                                        // Mock missing data for UI matching
                                        const mockGender = (idx % 3 === 0) ? "Male" : "Female";
                                        const mockPhone = user.phone || "+91 98765 4321" + (idx % 10);
                                        const mockOrders = 24 - idx;
                                        const mockSpent = "₹" + (45890 - (idx * 5000)).toLocaleString();
                                        const mockStatus = (idx % 4 === 3) ? "Inactive" : "Active";
                                        
                                        return (
                                            <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <input type="checkbox" className="rounded border-gray-300 text-[#4318FF] focus:ring-[#4318FF]" />
                                                </td>
                                                <td className="px-6 py-4 text-[13px] font-black text-[#4318FF]">
                                                    CUS{1000 + (parseInt(user.id) || idx + 1)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <img src={user.avatar} alt="avatar" className="w-8 h-8 rounded-full shadow-sm" />
                                                        <span className="text-[13px] font-bold text-[#2B3674]">{user.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-[13px] font-semibold text-[#2B3674]">{user.email}</td>
                                                <td className="px-6 py-4 text-[13px] font-semibold text-gray-500">{mockPhone}</td>
                                                <td className="px-6 py-4">
                                                    <span className={\`px-3 py-1 rounded text-[11px] font-bold \${mockGender === 'Female' ? 'bg-[#ffe4e6] text-[#e11d48]' : 'bg-[#e0e7ff] text-[#4f46e5]'}\`}>
                                                        {mockGender}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-[13px] text-gray-600 font-bold text-center">{mockOrders}</td>
                                                <td className="px-6 py-4 text-[13px] text-gray-600 font-bold">{mockSpent}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={\`px-3 py-1 rounded text-[11px] font-bold \${mockStatus === 'Active' ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-[#ffedd5] text-[#ea580c]'}\`}>
                                                        {mockStatus}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-[12px] font-bold text-[#2B3674]">{user.joined}</div>
                                                    <div className="text-[11px] text-gray-500 font-medium">10:30 AM</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button className="p-1.5 border border-gray-200 rounded hover:bg-gray-100 text-[#4318FF] transition-colors shadow-sm">
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                                        </button>
                                                        <button 
                                                            onClick={() => openEditModal(user)}
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
                            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredUsers.length)} of 1,248 customers
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 text-[13px] font-bold text-[#2B3674] shadow-sm">
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
                                        125
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

                {/* Add/Edit User Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">{isEditing ? 'Modify Domain Privileges' : 'Register New Customer'}</h2>
                                    <p className="text-xs text-gray-500 mt-1">{isEditing ? \`Updating permissions for ID: \${editUserId}\` : 'Add a new customer to your system'}</p>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 text-gray-400 hover:bg-gray-50 rounded-full transition-colors"
                                >
                                    <FiX className="text-xl" />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto space-y-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Username *</label>
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleInputChange}
                                        placeholder="e.g. johndoe"
                                        className="w-full bg-white border border-gray-200 text-slate-800 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#4318FF] focus:border-[#4318FF] transition-all text-sm font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Full Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="e.g. Priya Sharma"
                                        className="w-full bg-white border border-gray-200 text-slate-800 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#4318FF] focus:border-[#4318FF] transition-all text-sm font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Email Address *</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="priya.sharma@gmail.com"
                                        className="w-full bg-white border border-gray-200 text-slate-800 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#4318FF] focus:border-[#4318FF] transition-all text-sm font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Phone Number</label>
                                    <input
                                        type="text"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        placeholder="+91 98765 43210"
                                        className="w-full bg-white border border-gray-200 text-slate-800 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#4318FF] focus:border-[#4318FF] transition-all text-sm font-medium"
                                    />
                                </div>
                                {!isEditing && (
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Password *</label>
                                        <input
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            placeholder="••••••••"
                                            className="w-full bg-white border border-gray-200 text-slate-800 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#4318FF] focus:border-[#4318FF] transition-all text-sm font-medium"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-gray-100 shrink-0 flex gap-4">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg font-bold text-gray-500 hover:bg-gray-50 transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveUser}
                                    disabled={submitLoading || !formData.username || !formData.email}
                                    className="flex-1 bg-[#4318FF] hover:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 text-sm"
                                >
                                    {submitLoading ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : isEditing ? 'Update Customer' : 'Register Customer'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Users;
`;

const finalCode = code.substring(0, returnStart) + newUi;
fs.writeFileSync(filePath, finalCode, 'utf-8');
console.log("Updated Users.jsx successfully");
