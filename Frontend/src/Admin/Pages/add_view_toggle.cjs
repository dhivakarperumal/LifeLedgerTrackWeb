const fs = require('fs');
const path = 'd:/Q Techx Projects/Webs/Saree_Web_Sites/frontend/src/Admin/Pages/Users.jsx';
let code = fs.readFileSync(path, 'utf-8');

// 1. Replace the old header+button block with toggle + button
const oldHeader = `                     </div>
                     
                      <div className="flex justify-end mb-2">
                     <button
                         onClick={() => { setIsEditing(false); setFormData({ username: "", name: "", email: "", phone: "", role: "user", password: "" }); setIsModalOpen(true); }}
                        className="flex items-center gap-2  bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white px-5 py-3 rounded-md font-bold text-sm transition-all shadow-lg shadow-purple-500/25 active:scale-95"
                     >
                         <span className="text-lg leading-none ">+</span> Add New Customer
                     </button>
                 </div>
                 </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">`;

const newHeader = `                     </div>
                    <div className="flex items-center justify-end gap-3 mb-2">
                        {/* View Toggle */}
                        <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
                            <button
                                onClick={() => setViewMode("table")}
                                className={\`p-2 rounded-md transition-all \${viewMode === "table" ? "bg-white shadow text-[#4318FF]" : "text-gray-400 hover:text-gray-600"}\`}
                                title="Table View"
                            >
                                <FiList size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode("card")}
                                className={\`p-2 rounded-md transition-all \${viewMode === "card" ? "bg-white shadow text-[#4318FF]" : "text-gray-400 hover:text-gray-600"}\`}
                                title="Card View"
                            >
                                <FiGrid size={16} />
                            </button>
                        </div>
                        <button
                            onClick={() => { setIsEditing(false); setFormData({ username: "", name: "", email: "", phone: "", role: "user", password: "" }); setIsModalOpen(true); }}
                            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-all shadow-lg shadow-purple-500/25 active:scale-95"
                        >
                            <span className="text-lg leading-none">+</span> Add New Customer
                        </button>
                    </div>
                </div>

                {/* Card View */}
                {viewMode === "card" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {loading ? (
                            <div className="col-span-full text-center text-gray-400 py-10 text-sm font-semibold">Loading customers...</div>
                        ) : currentItems.length === 0 ? (
                            <div className="col-span-full text-center text-gray-400 py-10 text-sm font-semibold">No customers found.</div>
                        ) : (
                            currentItems.map((user, idx) => {
                                const mockPhone = user.phone || "+91 98765 4321" + (idx % 10);
                                const mockStatus = (idx % 4 === 3) ? "Inactive" : "Active";
                                return (
                                    <div key={user.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-violet-200 transition-all">
                                        <div className="flex items-start gap-3 mb-4">
                                            <img src={user.avatar} alt="avatar" className="w-12 h-12 rounded-full shadow-sm shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[13px] font-black text-[#2B3674] truncate">{user.name}</p>
                                                <p className="text-[11px] text-gray-400 font-medium mt-0.5 truncate">{mockPhone}</p>
                                            </div>
                                            <span className={\`px-2 py-0.5 rounded text-[10px] font-black shrink-0 \${mockStatus === 'Active' ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-[#ffedd5] text-[#ea580c]'}\`}>
                                                {mockStatus}
                                            </span>
                                        </div>
                                        <div className="space-y-2 border-t border-gray-50 pt-4">
                                            <div className="flex items-center gap-2 text-[12px] text-gray-500">
                                                <FiMail size={12} className="text-gray-400 shrink-0" />
                                                <span className="truncate">{user.email}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[12px] text-gray-500">
                                                <FiCalendar size={12} className="text-gray-400 shrink-0" />
                                                <span>Joined: {user.joined}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
                                            <span className={\`px-2.5 py-1 rounded text-[11px] font-bold \${
                                                user.role === 'admin' ? 'bg-slate-100 text-slate-700' :
                                                user.role === 'manager' ? 'bg-indigo-50 text-indigo-600' :
                                                'bg-violet-50 text-violet-600'
                                            }\`}>
                                                {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                                <button title="View" className="p-1.5 border border-gray-200 rounded-lg hover:bg-violet-50 hover:text-violet-600 text-gray-400 transition-colors">
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                                </button>
                                                <button title="Edit" onClick={() => openEditModal(user)} className="p-1.5 border border-gray-200 rounded-lg hover:bg-violet-50 hover:text-violet-600 text-gray-400 transition-colors">
                                                    <FiEdit2 size={13} />
                                                </button>
                                                <button title="Delete" onClick={() => handleDeleteUser(user.id)} className="p-1.5 border border-gray-200 rounded-lg hover:bg-red-50 hover:text-red-500 text-gray-400 transition-colors">
                                                    <FiUserX size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Pagination for Card View */}
                {viewMode === "card" && totalPages > 1 && (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                        <p className="text-[13px] font-bold text-[#2B3674]">
                            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredUsers.length)} of {filteredUsers.length} customers
                        </p>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 font-bold text-[13px]">&lt;</button>
                            {[...Array(Math.min(totalPages || 1, 5))].map((_, i) => (
                                <button key={i} onClick={() => setCurrentPage(i + 1)} className={\`w-8 h-8 flex items-center justify-center rounded-lg text-[13px] font-bold \${currentPage === i + 1 ? 'bg-[#4318FF] text-white' : 'border border-gray-200 text-[#2B3674] hover:bg-gray-50'}\`}>{i + 1}</button>
                            ))}
                            <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 font-bold text-[13px]">&gt;</button>
                        </div>
                    </div>
                )}

                {/* Table View */}
                {viewMode === "table" && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">`;

code = code.replace(oldHeader, newHeader);

// 2. Close the table view conditional after the table's closing div (line 467 area)
// The table ends with </div>\n\n                {/* Add/Edit
const oldTableClose = `                </div>

                {/* Add/Edit User Modal */}`;
const newTableClose = `                </div>
                )}

                {/* Add/Edit User Modal */}`;

code = code.replace(oldTableClose, newTableClose);

fs.writeFileSync(path, code, 'utf-8');
console.log('Done');
