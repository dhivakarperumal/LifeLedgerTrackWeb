import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  FiPlus,
  FiX,
  FiUpload,
  FiSearch,
  FiGrid,
  FiList,
  FiEye,
  FiEdit2,
  FiTrash2,
  FiFileText,
} from "react-icons/fi";
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
  const isIncomePage =
    location.pathname.replace(/\/$/, "") === "/admin/more/income";
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [budgetDraft, setBudgetDraft] = useState("0");
  const [monthlyBudget, setMonthlyBudget] = useState(() => {
    const savedBudget = Number(
      localStorage.getItem("lifeLedgerMonthlyBudget") || 0,
    );
    return Number.isFinite(savedBudget) ? savedBudget : 0;
  });
  const [incomes, setIncomes] = useState([]);
  const [incomeCategoryOptions, setIncomeCategoryOptions] = useState([]);
  const [selectedIncome, setSelectedIncome] = useState(null);
  const [editingIncomeId, setEditingIncomeId] = useState(null);
  const [existingAttachment, setExistingAttachment] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [incomeFilter, setIncomeFilter] = useState("All Income");
  const [viewMode, setViewMode] = useState("table");

  useEffect(() => {
    localStorage.setItem("lifeLedgerMonthlyBudget", String(monthlyBudget));
  }, [monthlyBudget]);

  useEffect(() => {
    if (!isIncomePage) return;

    if (location.state?.openAddIncome) {
      setIsModalOpen(true);
    }

    const loadIncome = async () => {
      try {
        const [incomeResponse, categoryResponse] = await Promise.all([
          api.get("/incomes"),
          api.get("/categories"),
        ]);

        const incomeData = incomeResponse.data || [];
        const categories = Array.isArray(categoryResponse.data) ? categoryResponse.data : [];
        const incomeKeywords = ["income", "incomes", "earning", "earnings", "revenue", "salary", "business", "freelance"];

        const filteredIncomeCategories = categories
          .filter((category) => {
            const typeValue = String(category?.catType || category?.type || category?.category_type || "")
              .trim()
              .toLowerCase();
            const nameValue = String(category?.name || "").trim().toLowerCase();

            return (
              typeValue === "income"
              || typeValue.includes("income")
              || typeValue.includes("earning")
              || typeValue.includes("revenue")
              || incomeKeywords.some((keyword) => nameValue.includes(keyword))
            );
          })
          .map((category) => category.name)
          .filter(Boolean);

        setIncomes(incomeData);
        setIncomeCategoryOptions([...new Set(filteredIncomeCategories)]);
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
    setSelectedIncome(null);
    setEditingIncomeId(null);
    setExistingAttachment(null);
    setForm(initialForm);
  };

  const openAddIncome = () => {
    setSelectedIncome(null);
    setEditingIncomeId(null);
    setExistingAttachment(null);
    setForm(initialForm);
    setIsModalOpen(true);
  };

  const openEditIncome = (income) => {
    setSelectedIncome(null);
    setEditingIncomeId(income.id);
    setExistingAttachment(income.attachment || null);
    setForm({
      title: income.title || "",
      amount: income.amount ?? "",
      category: income.category || "",
      date: income.income_date ? String(income.income_date).split("T")[0] : new Date().toISOString().split("T")[0],
      paymentMethod: income.payment_method || "Cash",
      notes: income.notes || "",
      recurring: income.recurring || "No",
      attachment: null,
    });
    setIsModalOpen(true);
  };

  const openViewIncome = (income) => setSelectedIncome(income);

  const handleDeleteIncome = async (id) => {
    if (!window.confirm("Delete this income record?")) return;

    try {
      await api.delete(`/incomes/${id}`);
      setIncomes((current) => current.filter((item) => item.id !== id));
      if (selectedIncome?.id === id) setSelectedIncome(null);
      toast.success("Income deleted successfully!");
    } catch (error) {
      console.error("Delete Income Error:", error);
      toast.error(error.response?.data?.message || "Failed to delete income");
    }
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

      let response;
      if (editingIncomeId) {
        response = await api.put(`/incomes/${editingIncomeId}`, payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setIncomes((current) => current.map((item) => item.id === editingIncomeId ? response.data.income : item));
        toast.success("Income updated successfully!");
      } else {
        response = await api.post("/incomes", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setIncomes((current) => [response.data.income, ...current]);
        toast.success("Income added successfully!");
      }
      closeModal();
    } catch (error) {
      console.error("Create/Update Income Error:", error);
      toast.error(error.response?.data?.message || "Failed to save income");
    } finally {
      setIsSaving(false);
    }
  };

  const totalIncome = incomes.reduce(
    (total, income) => total + Number(income.amount || 0),
    0,
  );
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyIncome = incomes
    .filter((income) => {
      const incomeDate = new Date(income.income_date);
      return (
        incomeDate.getMonth() === currentMonth &&
        incomeDate.getFullYear() === currentYear
      );
    })
    .reduce((total, income) => total + Number(income.amount || 0), 0);
  const recurringIncome = incomes
    .filter((income) => income.recurring === "Yes")
    .reduce((total, income) => total + Number(income.amount || 0), 0);
  const visibleIncomes = incomes.filter((income) => {
    const searchValue =
      `${income.title || ""} ${income.category || ""} ${income.payment_method || ""}`.toLowerCase();
    const matchesSearch = searchValue.includes(searchTerm.toLowerCase());
    const matchesFilter =
      incomeFilter === "All Income" ||
      (incomeFilter === "Recurring" && income.recurring === "Yes") ||
      (incomeFilter === "One-time" && income.recurring !== "Yes");
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 pb-20">
      {isIncomePage ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <IncomeStatCard
              label="Total Income"
              value={totalIncome}
              caption="All recorded income"
              color="bg-[#4b0b78]"
              icon="$"
              iconStyle="text-[1.8rem]"
            />
            <IncomeStatCard
              label="This Month"
              value={monthlyIncome}
              caption="Income this month"
              color="bg-[#18b8a7]"
              icon="↗"
              iconStyle="text-[1.8rem]"
            />
            <IncomeStatCard
              label="Recurring Income"
              value={recurringIncome}
              caption="Recurring entries"
              color="bg-[#f59e0b]"
              icon="↻"
              iconStyle="text-[1.8rem]"
            />
            <IncomeStatCard
              label="Income Records"
              value={incomes.length}
              caption="Total transactions"
              color="bg-[#f43f83]"
              icon="#"
              isCount
              iconStyle="text-[1.9rem]"
              compact
            />
            <div className="relative overflow-hidden rounded-[1.8rem] bg-gradient-to-br from-[#7f39d5] via-[#7b35d6] to-[#6d2bc4] p-4 shadow-[0_10px_30px_rgba(111,52,180,0.28)] xl:col-span-1">
              <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10" />
              <div className="absolute -bottom-12 right-0 h-24 w-24 rounded-full bg-white/10" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/25 bg-white/10 text-3xl font-black text-white shadow-md backdrop-blur-sm">
                  ₹
                </div>
                <div className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/90">
                  ▼ -0%
                </div>
              </div>
              <div className="relative mt-4">
                <h2 className="text-[2rem] font-black leading-none tracking-[-0.06em] text-white">
                  ₹
                  {monthlyBudget.toLocaleString("en-IN", {
                    maximumFractionDigits: 2,
                  })}
                </h2>
                <p className="mt-2 text-base font-semibold text-white/85">
                  Monthly Budget
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="relative min-w-[220px] flex-1">
              <FiSearch
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
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
              <button
                type="button"
                aria-label="List view"
                onClick={() => setViewMode("table")}
                className={`rounded-lg p-2 transition-all ${viewMode === "table" ? "bg-white text-[#7b2cbf] shadow-sm" : "text-gray-400 hover:text-slate-600"}`}
              >
                <FiList size={17} />
              </button>
              <button
                type="button"
                aria-label="Grid view"
                onClick={() => setViewMode("grid")}
                className={`rounded-lg p-2 transition-all ${viewMode === "grid" ? "bg-white text-[#7b2cbf] shadow-sm" : "text-gray-400 hover:text-slate-600"}`}
              >
                <FiGrid size={17} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setBudgetDraft(String(monthlyBudget));
                setIsBudgetModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1d4ed8] to-[#2563eb] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-900/20 transition-all hover:from-[#1e40af] hover:to-[#1d4ed8] active:scale-95"
            >
              <FiPlus size={15} /> Set Monthly Budget
            </button>
            <button
              type="button"
              onClick={openAddIncome}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#240046] to-[#7b2cbf] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-purple-900/30 transition-all hover:from-[#10002b] hover:to-[#5a189a] active:scale-95"
            >
              <FiPlus size={16} /> Add New Income
            </button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            {viewMode === "table" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#350866] text-xs uppercase tracking-wider text-[#FCD34D]">
                    <tr>
                      <th className="px-4 py-4">S No</th>
                      <th className="px-6 py-4">Title</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Remaining</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Payment</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleIncomes.map((income, index) => (
                      <tr key={income.id} className="text-slate-700">
                        <td className="px-4 py-4 font-bold text-slate-500">{index + 1}</td>
                        <td className="px-6 py-4 font-bold">{income.title}</td>
                        <td className="px-6 py-4">{income.category}</td>
                        <td className="px-6 py-4 font-bold">
                          ₹
                          {Number(income.amount).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-6 py-4 font-black text-[#00bfa5]">
                          ₹
                          {Number(
                            income.remaining_amount ?? income.amount,
                          ).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-6 py-4">{income.income_date}</td>
                        <td className="px-6 py-4">
                          {income.payment_method || "-"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {income.attachment && (
                              <button
                                type="button"
                                onClick={() => openViewIncome(income)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-all hover:bg-blue-500 hover:text-white"
                                title="View income"
                              >
                                <FiEye size={14} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openEditIncome(income)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 transition-all hover:bg-violet-500 hover:text-white"
                              title="Edit income"
                            >
                              <FiEdit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteIncome(income.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 transition-all hover:bg-red-500 hover:text-white"
                              title="Delete income"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleIncomes.map((income) => (
                  <div
                    key={income.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-800">
                          {income.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {income.category || "Uncategorized"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400 line-through">
                          ₹
                          {Number(income.amount).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                        <p className="font-black text-[#00bfa5]">
                          ₹
                          {Number(
                            income.remaining_amount ?? income.amount,
                          ).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    </div>
                    <p className="mt-4 text-xs text-slate-500">
                      {income.income_date} · {income.payment_method || "-"}
                    </p>
                    <div className="mt-4 flex items-center justify-end gap-2">
                      {income.attachment && (
                        <button
                          type="button"
                          onClick={() => openViewIncome(income)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-all hover:bg-blue-500 hover:text-white"
                          title="View income"
                        >
                          <FiEye size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditIncome(income)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 transition-all hover:bg-violet-500 hover:text-white"
                        title="Edit income"
                      >
                        <FiEdit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteIncome(income.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 transition-all hover:bg-red-500 hover:text-white"
                        title="Delete income"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {visibleIncomes.length === 0 && (
              <p className="p-8 text-center text-sm font-semibold text-slate-400">
                No income records found.
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-400">
            No billing records found.
          </p>
        </div>
      )}

      {selectedIncome && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setSelectedIncome(null)} />
          <div className="relative z-10 w-full max-w-xl rounded-[1.8rem] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#3c096c]/20 bg-gradient-to-r from-[#1F0A3C] to-[#3c096c] px-6 py-5 text-white">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
                  Income Details
                </p>
                <h2 className="mt-1 text-2xl font-black text-white">
                  {selectedIncome.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIncome(null)}
                className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white"
                aria-label="Close income details"
              >
                <FiX size={22} />
              </button>
            </div>

            <div className="space-y-4 p-6 text-sm text-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Category</p>
                  <p className="mt-2 font-bold text-slate-800">{selectedIncome.category || "-"}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Amount</p>
                  <p className="mt-2 font-black text-emerald-600">₹{Number(selectedIncome.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Date</p>
                  <p className="mt-2 font-bold text-slate-800">{selectedIncome.income_date || "-"}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Payment</p>
                  <p className="mt-2 font-bold text-slate-800">{selectedIncome.payment_method || "-"}</p>
                </div>
              </div>

              {selectedIncome.notes && (
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Notes</p>
                  <p className="mt-2 leading-6 text-slate-700">{selectedIncome.notes}</p>
                </div>
              )}

              {selectedIncome.attachment && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Attachment</p>
                  <a
                    href={`${import.meta.env.VITE_API_URL.replace("/api", "")}${selectedIncome.attachment}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex rounded-lg bg-violet-100 px-3 py-2 text-sm font-bold text-violet-700 hover:bg-violet-200"
                  >
                    Open attachment
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#3c096c]/20 bg-gradient-to-r from-[#1F0A3C] to-[#3c096c] px-6 py-5 text-white">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
                  Monthly Budget
                </p>
                <h2 className="mt-1 text-2xl font-black text-white">
                  Set Budget
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsBudgetModalOpen(false)}
                className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white"
                aria-label="Close monthly budget form"
              >
                <FiX size={22} />
              </button>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                const value = Number(budgetDraft || 0);
                if (!Number.isFinite(value) || value < 0) {
                  toast.error("Please enter a valid monthly budget amount.");
                  return;
                }
                setMonthlyBudget(value);
                setIsBudgetModalOpen(false);
                toast.success("Monthly budget updated successfully!");
              }}
              className="space-y-5 px-6 py-6"
            >
              <label>
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Monthly Budget Amount
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={budgetDraft}
                  onChange={(event) => setBudgetDraft(event.target.value)}
                  placeholder="Enter amount"
                  className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  required
                />
              </label>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBudgetModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-[#1d4ed8] to-[#2563eb] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-900/20 transition-all hover:from-[#1e40af] hover:to-[#1d4ed8]"
                >
                  Save Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#3c096c]/20 bg-gradient-to-r from-[#1F0A3C] to-[#3c096c] px-6 py-5 text-white sm:px-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
                  Income Management
                </p>
                <h2 className="mt-1 text-2xl font-black text-white">
                  {editingIncomeId ? "Edit Income" : "Add Income"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white"
                aria-label="Close add income form"
              >
                <FiX size={22} />
              </button>
            </div>

            <form
              onSubmit={submitIncome}
              className="space-y-5 px-6 py-6 sm:px-8"
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Income Title <b className="text-red-500">*</b>
                  </span>
                  <input
                    name="title"
                    value={form.title}
                    onChange={updateField}
                    required
                    placeholder="e.g. Freelance payment"
                    className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-purple-500"
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Amount <b className="text-red-500">*</b>
                  </span>
                  <input
                    name="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={updateField}
                    required
                    placeholder="0.00"
                    className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-purple-500"
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Income Category <b className="text-red-500">*</b>
                  </span>
                  <select
                    name="category"
                    value={form.category}
                    onChange={updateField}
                    required
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none focus:border-purple-500"
                  >
                    <option value="">{incomeCategoryOptions.length ? "Select category" : "No income categories available"}</option>
                    {incomeCategoryOptions.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Date <b className="text-red-500">*</b>
                  </span>
                  <input
                    name="date"
                    type="date"
                    value={form.date}
                    onChange={updateField}
                    required
                    className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-purple-500"
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Payment Method
                  </span>
                  <select
                    name="paymentMethod"
                    value={form.paymentMethod}
                    onChange={updateField}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none focus:border-purple-500"
                  >
                    <option>Cash</option>
                    <option>Bank Transfer</option>
                    <option>UPI</option>
                    <option>Card</option>
                    <option>Other</option>
                  </select>
                </label>
                <label className="sm:col-span-2">
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Description / Notes
                  </span>
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={updateField}
                    rows="3"
                    placeholder="Add any useful details..."
                    className="w-full resize-none rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-purple-500"
                  />
                </label>
                <fieldset>
                  <legend className="mb-2 text-sm font-bold text-slate-700">
                    Recurring Income
                  </legend>
                  <div className="flex gap-5 pt-1">
                    {["Yes", "No"].map((option) => (
                      <label
                        key={option}
                        className="flex items-center gap-2 text-sm font-semibold text-slate-600"
                      >
                        <input
                          type="radio"
                          name="recurring"
                          value={option}
                          checked={form.recurring === option}
                          onChange={updateField}
                          className="accent-purple-700"
                        />{" "}
                        {option}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div>
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Attachment / Receipt{" "}
                    <small className="font-normal text-slate-400">
                      (Optional)
                    </small>
                  </span>

                  {/* ── Existing receipt preview (edit mode only) ── */}
                  {existingAttachment && !form.attachment && (
                    <div className="mb-3 flex items-start gap-3 rounded-xl border border-purple-200 bg-purple-50 p-3">
                      <div className="shrink-0">
                        {/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(existingAttachment) ? (
                          <a
                            href={`${import.meta.env.VITE_API_URL.replace("/api", "")}${existingAttachment}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <img
                              src={`${import.meta.env.VITE_API_URL.replace("/api", "")}${existingAttachment}`}
                              alt="Current receipt"
                              className="h-20 w-20 rounded-lg border border-purple-200 object-cover shadow-sm hover:opacity-90 transition-opacity"
                            />
                          </a>
                        ) : (
                          <a
                            href={`${import.meta.env.VITE_API_URL.replace("/api", "")}${existingAttachment}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-20 w-20 items-center justify-center rounded-lg border border-purple-200 bg-white text-purple-600 shadow-sm hover:bg-purple-100 transition-colors"
                          >
                            <FiFileText size={24} />
                          </a>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-black uppercase tracking-widest text-purple-600">Current Receipt</p>
                        <a
                          href={`${import.meta.env.VITE_API_URL.replace("/api", "")}${existingAttachment}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 block truncate text-xs font-semibold text-slate-600 hover:text-purple-700 hover:underline"
                        >
                          {existingAttachment.split("/").pop()}
                        </a>
                        <p className="mt-1 text-[10px] text-slate-400">Upload a new file below to replace it</p>
                      </div>
                    </div>
                  )}

                  {/* ── File picker ── */}
                  <label className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-all">
                    <FiUpload />
                    <input
                      name="attachment"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        updateField(e);
                      }}
                      className="min-w-0 text-xs"
                    />
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-[#4b0b78] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-200 hover:bg-[#260642] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : editingIncomeId ? "Update Income" : "Save Income"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const IncomeStatCard = ({
  label,
  value,
  caption,
  color,
  icon,
  isCount = false,
  iconStyle = "text-[1.8rem]",
  compact = false,
}) => (
  <div
    className={`flex ${compact ? "min-h-[170px]" : "min-h-[170px]"} flex-col justify-between rounded-[1.6rem] border border-gray-200 bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,0.06)]`}
  >
    <div className="flex items-start justify-between gap-3">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] text-2xl font-black text-white shadow-lg ${color} ${iconStyle}`}
      >
        {icon}
      </div>
      <div className="mt-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">
        {label === "Total Income"
          ? "All"
          : label === "This Month"
            ? "This"
            : label === "Recurring Income"
              ? "Auto"
              : "#"}
      </div>
    </div>

    <div className="mt-3 min-w-0">
      <p className="text-[1.05rem] font-bold leading-snug text-slate-700">
        {label}
      </p>
      <h2 className="mt-2 text-[2.1rem] font-black leading-none tracking-[-0.05em] text-slate-800">
        {isCount
          ? value
          : `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
      </h2>
      <p className="mt-2 text-[0.72rem] font-medium text-slate-400">
        {caption}
      </p>
    </div>
  </div>
);

export default Billing;
