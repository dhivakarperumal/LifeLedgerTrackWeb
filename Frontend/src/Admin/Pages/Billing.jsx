import React, { useContext, useEffect, useMemo, useState } from "react";
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
import { StoreContext } from "../../PrivateRouter/StoreContext";

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

const initialTransferForm = () => ({
  incomeId: "",
  amount: "",
  purpose: "",
  customPurpose: "",
  reason: "",
  date: new Date().toISOString().split("T")[0],
});

const formatDateOnly = (date) => (date ? String(date).split("T")[0] : "-");
const formatMoney = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDateTime = (value) => value ? new Date(value).toLocaleString("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
}) : "-";

const Billing = () => {
  const location = useLocation();
  const { monthlyBudget, setMonthlyBudget } = useContext(StoreContext);
  const isIncomePage =
    location.pathname.replace(/\/$/, "") === "/admin/more/income";
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [budgetDraft, setBudgetDraft] = useState("0");
  const [incomes, setIncomes] = useState([]);
  const [incomeCategoryOptions, setIncomeCategoryOptions] = useState([]);
  const [selectedIncome, setSelectedIncome] = useState(null);
  const [editingIncomeId, setEditingIncomeId] = useState(null);
  const [existingAttachment, setExistingAttachment] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isTransferLoading, setIsTransferLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isTransferSaving, setIsTransferSaving] = useState(false);
  const [transferRecords, setTransferRecords] = useState([]);
  const [transferHistory, setTransferHistory] = useState([]);
  const [transferIncomeFilter, setTransferIncomeFilter] = useState("all");
  const [selectedTransferId, setSelectedTransferId] = useState("");
  const [transferForm, setTransferForm] = useState(initialTransferForm);
  const [transferValidation, setTransferValidation] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [incomeFilter, setIncomeFilter] = useState("All Income");
  const [viewMode, setViewMode] = useState("table");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const selectedTransferRecord = transferRecords.find(
    (transfer) => String(transfer.id) === String(selectedTransferId),
  ) || null;
  const currentTransferRemaining = Number(
    selectedTransferRecord?.remaining_amount ?? selectedTransferRecord?.amount ?? 0,
  );
  const selectedFundingIncome = incomes.find(
    (income) => String(income.id) === String(transferForm.incomeId),
  ) || null;
  const fundingIncomeAvailable = Number(
    selectedFundingIncome?.remaining_amount ?? selectedFundingIncome?.amount ?? 0,
  );
  const newTransferAmount = Number(transferForm.amount || 0);
  const completedTransferAmount = Number(
    selectedTransferRecord?.group_total_transferred ?? selectedTransferRecord?.amount ?? 0,
  );
  const newTransferRemaining = completedTransferAmount + newTransferAmount;
  const filteredTransferRecords = transferRecords.filter((transfer) => (
    !transfer.parent_transfer_id
      && (transferIncomeFilter === "all"
        || String(transfer.source_income_id || "") === String(transferIncomeFilter))
  ));

  useEffect(() => {
    setBudgetDraft(String(monthlyBudget));
  }, [monthlyBudget]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, incomeFilter]);

  useEffect(() => {
    if (!isIncomePage) return;

    if (location.state?.openAddIncome) {
      setIsModalOpen(true);
    }

    const loadMonthlyBudget = async () => {
      try {
        const response = await api.get("/incomes/monthly-budget");
        const nextValue = Number(response.data?.monthly_budget ?? 0);
        if (Number.isFinite(nextValue)) {
          setMonthlyBudget(nextValue);
        }
      } catch (error) {
        console.error("Fetch Monthly Budget Error:", error);
      }
    };

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

    loadMonthlyBudget();
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

  const closeTransferModal = () => {
    setIsTransferModalOpen(false);
    setSelectedTransferId("");
    setTransferForm(initialTransferForm());
    setTransferValidation("");
  };

  const openTransferModal = async () => {
    setTransferRecords([]);
    setTransferIncomeFilter("all");
    setSelectedTransferId("");
    setTransferHistory([]);
    setTransferForm(initialTransferForm());
    setTransferValidation("");
    setIsTransferModalOpen(true);
    setIsTransferLoading(true);
    try {
      const response = await api.get("/transfers");
      setTransferRecords(response.data || []);
    } catch (error) {
      console.error("Fetch Transfer List Error:", error);
      toast.error(error.response?.data?.message || "Failed to load transfers.");
    } finally {
      setIsTransferLoading(false);
    }
  };

  const selectTransferRecord = async (transfer) => {
    setSelectedTransferId(String(transfer.id));
    setTransferHistory([]);
    setTransferForm({ ...initialTransferForm(), incomeId: String(transfer.source_income_id || "") });
    setTransferValidation("");
    setIsHistoryLoading(true);
    try {
      const response = await api.get(`/transfers/${transfer.id}/history`);
      setTransferHistory(response.data || []);
    } catch (error) {
      console.error("Fetch Transfer History Error:", error);
      toast.error(error.response?.data?.message || "Failed to load transfer history.");
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const submitTransferHistory = async (event) => {
    event.preventDefault();
    if (!selectedTransferRecord) return;

    if (!newTransferAmount || newTransferAmount <= 0) {
      setTransferValidation("Enter a transfer amount greater than zero.");
      return;
    }
    if (!transferForm.incomeId || !selectedFundingIncome) {
      setTransferValidation("Select an income to fund this extra transfer.");
      return;
    }
    if (newTransferAmount > fundingIncomeAvailable) {
      setTransferValidation(`Amount cannot exceed the selected income balance of ${formatMoney(fundingIncomeAvailable)}.`);
      return;
    }

    const purpose = transferForm.purpose === "Other"
      ? transferForm.customPurpose.trim()
      : transferForm.purpose;
    if (!purpose) {
      setTransferValidation("Select a purpose or enter a custom purpose.");
      return;
    }

    setIsTransferSaving(true);
    setTransferValidation("");
    try {
      const response = await api.post(`/transfers/${selectedTransferRecord.id}/fund-from-income`, {
        amount: newTransferAmount,
        incomeId: Number(transferForm.incomeId),
        purpose,
        reason: transferForm.reason.trim(),
        date: transferForm.date,
      });
      const savedTransfer = response.data.transfer;
      const savedAdjustment = response.data.adjustment;
      setTransferRecords((current) => current.map((transfer) => (
        String(transfer.id) === String(selectedTransferRecord.id)
          ? {
            ...transfer,
            ...savedTransfer,
            group_total_transferred: response.data.total_transferred,
          }
          : transfer
      )));
      setIncomes((current) => current.map((income) => (
        String(income.id) === String(transferForm.incomeId)
          ? { ...income, remaining_amount: response.data.income_remaining_amount }
          : income
      )));
      const refreshedIncomes = await api.get("/incomes");
      setIncomes(refreshedIncomes.data || []);
      setTransferHistory((current) => [{
        ...savedAdjustment,
        id: selectedTransferRecord.id,
        history_key: `adjustment-${savedAdjustment.id}`,
        event_type: "Extra Amount Added",
        remaining_amount: response.data.total_transferred,
      }, ...current]);
      toast.success("Transfer amount updated successfully.");
      closeTransferModal();
    } catch (error) {
      const message = error.response?.data?.message || "Failed to save transfer.";
      setTransferValidation(message);
      toast.error(message);
    } finally {
      setIsTransferSaving(false);
    }
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
  const remainingIncome = incomes.reduce(
    (total, income) => total + Number(income.remaining_amount ?? income.amount ?? 0),
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
  const filteredIncomes = useMemo(() => {
    return incomes.filter((income) => {
      const searchValue =
        `${income.title || ""} ${income.category || ""} ${income.payment_method || ""}`.toLowerCase();
      const matchesSearch = searchValue.includes(searchTerm.toLowerCase());
      const matchesFilter =
        incomeFilter === "All Income" ||
        (incomeFilter === "Recurring" && income.recurring === "Yes") ||
        (incomeFilter === "One-time" && income.recurring !== "Yes");
      return matchesSearch && matchesFilter;
    });
  }, [incomes, searchTerm, incomeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredIncomes.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedIncomes = filteredIncomes.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize,
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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
              label="Remaining Income"
              value={remainingIncome}
              caption="Available after transfers"
              color="bg-[#00897b]"
              icon="₹"
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

          <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:flex-row md:flex-wrap md:items-center">
            <div className="relative w-full md:min-w-[220px] md:flex-1">
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

            <div className="flex w-full items-center gap-3 md:w-auto">
              <select
                value={incomeFilter}
                onChange={(event) => setIncomeFilter(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-slate-600 outline-none transition-all hover:border-[#7b2cbf] md:w-auto"
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
            </div>

            <button
              type="button"
              onClick={() => {
                setBudgetDraft(String(monthlyBudget));
                setIsBudgetModalOpen(true);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1d4ed8] to-[#2563eb] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-900/20 transition-all hover:from-[#1e40af] hover:to-[#1d4ed8] active:scale-95 md:w-auto"
            >
              <FiPlus size={15} /> Set Monthly Budget
            </button>
            <button
              type="button"
              onClick={openTransferModal}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f766e] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition-all hover:bg-[#115e59] active:scale-95 md:w-auto"
            >
              <FiPlus size={16} /> Add Transfer
            </button>
            <button
              type="button"
              onClick={openAddIncome}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#240046] to-[#7b2cbf] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-purple-900/30 transition-all hover:from-[#10002b] hover:to-[#5a189a] active:scale-95 md:w-auto"
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
                    {paginatedIncomes.map((income, index) => (
                      <tr key={income.id} className="text-slate-700">
                        <td className="px-4 py-4 font-bold text-slate-500">
                          {(safeCurrentPage - 1) * pageSize + index + 1}
                        </td>
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
                        <td className="px-6 py-4">{formatDateOnly(income.income_date)}</td>
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
                {paginatedIncomes.map((income) => (
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
                      {formatDateOnly(income.income_date)} · {income.payment_method || "-"}
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
            {filteredIncomes.length === 0 && (
              <p className="p-8 text-center text-sm font-semibold text-slate-400">
                No income records found.
              </p>
            )}
          </div>

          {filteredIncomes.length > 0 && (
            <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-slate-600">
                Showing {Math.min((safeCurrentPage - 1) * pageSize + 1, filteredIncomes.length)}-
                {Math.min(safeCurrentPage * pageSize, filteredIncomes.length)} of {filteredIncomes.length}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={safeCurrentPage === 1}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Prev
                </button>

                {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`h-9 w-9 rounded-lg text-sm font-bold transition-all ${
                      pageNumber === safeCurrentPage
                        ? "bg-[#4b0b78] text-white shadow-md"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={safeCurrentPage === totalPages}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
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
          <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-[1.8rem] bg-white shadow-2xl">
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
                  <p className="mt-2 font-bold text-slate-800">{formatDateOnly(selectedIncome.income_date)}</p>
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
          <div className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl">
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
              onSubmit={async (event) => {
                event.preventDefault();
                const value = Number(budgetDraft || 0);
                if (!Number.isFinite(value) || value < 0) {
                  toast.error("Please enter a valid monthly budget amount.");
                  return;
                }

                try {
                  await api.put("/incomes/monthly-budget", { monthly_budget: value });
                  setMonthlyBudget(value);
                  setIsBudgetModalOpen(false);
                  toast.success("Monthly budget updated successfully!");
                } catch (error) {
                  console.error("Save Monthly Budget Error:", error);
                  toast.error(error.response?.data?.message || "Failed to save monthly budget.");
                }
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

      {isTransferModalOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) closeTransferModal(); }}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="income-transfer-title"
            className="relative flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-900 px-5 py-4 text-white sm:px-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-teal-300">Income management</p>
                <h2 id="income-transfer-title" className="mt-1 text-xl font-bold">Add Transfer</h2>
              </div>
              <button type="button" onClick={closeTransferModal} className="rounded-lg p-2 text-white/75 transition hover:bg-white/10 hover:text-white" aria-label="Close transfer dialog">
                <FiX size={21} />
              </button>
            </header>

            <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
              <section className="min-w-0 border-b border-slate-200 p-4 sm:p-6 lg:border-b-0 lg:border-r" aria-label="Transfer list">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">Transfer List</h3>
                    <p className="mt-1 text-xs text-slate-500">Select a transfer to use its remaining amount.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{filteredTransferRecords.length} records</span>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      Income
                      <select
                        value={transferIncomeFilter}
                        onChange={(event) => setTransferIncomeFilter(event.target.value)}
                        className="max-w-56 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 outline-none focus:border-teal-600"
                      >
                        <option value="all">All Income</option>
                        {incomes.map((income) => (
                          <option key={income.id} value={income.id}>{income.title} · {income.category}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-[1120px] w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-3">Transfer ID / Date</th>
                        <th className="px-3 py-3">From</th>
                        <th className="px-3 py-3">To</th>
                        <th className="px-3 py-3 text-right">Previous</th>
                        <th className="px-3 py-3 text-right">Transfer</th>
                        <th className="px-3 py-3 text-right">Remaining</th>
                        <th className="px-3 py-3">Purpose / Reason</th>
                        <th className="px-3 py-3">Created by / at</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTransferRecords.map((transfer) => {
                        const isSelected = String(transfer.id) === String(selectedTransferId);
                        return (
                          <tr
                            key={transfer.id}
                            onClick={() => selectTransferRecord(transfer)}
                            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") selectTransferRecord(transfer); }}
                            role="button"
                            tabIndex={0}
                            aria-pressed={isSelected}
                            className={`cursor-pointer align-top transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-600 ${isSelected ? "bg-teal-50" : "hover:bg-slate-50"}`}
                          >
                            <td className="whitespace-nowrap px-3 py-3">
                              <span className="block font-bold text-slate-800">TR{String(transfer.id).padStart(3, "0")}</span>
                              <span className="mt-1 block text-slate-500">{formatDateOnly(transfer.transfer_date)}</span>
                            </td>
                            <td className="max-w-28 px-3 py-3 text-slate-600">{transfer.source_income_category || transfer.transfer_from || "Account"}</td>
                            <td className="max-w-28 px-3 py-3 text-slate-600">{transfer.category || transfer.transfer_to || "Account"}</td>
                            <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-slate-700">{formatMoney(transfer.amount)}</td>
                            <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-slate-700">{formatMoney(transfer.amount)}</td>
                            <td className="whitespace-nowrap px-3 py-3 text-right font-bold text-teal-700">{formatMoney(transfer.remaining_amount ?? transfer.amount)}</td>
                            <td className="max-w-44 px-3 py-3">
                              <span className="block font-semibold text-slate-700">{transfer.title || transfer.category || "-"}</span>
                              <span className="mt-1 block line-clamp-2 text-slate-500">{transfer.notes || "-"}</span>
                            </td>
                            <td className="max-w-40 px-3 py-3">
                              <span className="block text-slate-700">{transfer.created_by_name || transfer.created_by || "-"}</span>
                              <span className="mt-1 block text-slate-500">{formatDateTime(transfer.created_at)}</span>
                            </td>
                          </tr>
                        );
                      })}
                      {!isTransferLoading && filteredTransferRecords.length === 0 && (
                        <tr><td colSpan="8" className="px-4 py-10 text-center text-sm text-slate-500">No transfer records are available.</td></tr>
                      )}
                      {isTransferLoading && (
                        <tr><td colSpan="8" className="px-4 py-10 text-center text-sm text-slate-500">Loading transfers...</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="min-w-0 p-4 sm:p-6">
                {selectedTransferRecord ? (
                  <>
                    <div className="mb-5">
                      <p className="text-xs font-bold uppercase tracking-wider text-teal-700">Selected transfer</p>
                      <h3 className="mt-1 text-lg font-bold text-slate-900">TR{String(selectedTransferRecord.id).padStart(3, "0")} · {selectedTransferRecord.title || selectedTransferRecord.category}</h3>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <div className="rounded-lg border border-slate-200 p-3">
                        <p className="text-[10px] font-bold uppercase text-slate-500">Previous Amount</p>
                        <p className="mt-1 font-bold text-slate-900">{formatMoney(selectedTransferRecord.amount)}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-3">
                        <p className="text-[10px] font-bold uppercase text-slate-500">Completed Amount</p>
                        <p className="mt-1 font-bold text-slate-900">{formatMoney(completedTransferAmount)}</p>
                      </div>
                      <div className="rounded-lg border border-teal-200 bg-teal-50 p-3">
                        <p className="text-[10px] font-bold uppercase text-teal-800">Current Remaining</p>
                        <p className="mt-1 font-bold text-teal-900">{formatMoney(currentTransferRemaining)}</p>
                      </div>
                    </div>

                    <form id="add-transfer-form" onSubmit={submitTransferHistory} className="mt-5 space-y-4">
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-slate-700">Income to Add</span>
                        <select
                          value={transferForm.incomeId}
                          onChange={(event) => {
                            setTransferForm((current) => ({ ...current, incomeId: event.target.value, amount: "" }));
                            setTransferValidation("");
                          }}
                          required
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                        >
                          <option value="">Select income</option>
                          {incomes.map((income) => (
                            <option key={income.id} value={income.id}>
                              {income.title} · {formatMoney(income.remaining_amount ?? income.amount)} available
                            </option>
                          ))}
                        </select>
                      </label>
                      {selectedFundingIncome && (
                        <p className="-mt-2 text-xs text-slate-500">Available from {selectedFundingIncome.title}: {formatMoney(fundingIncomeAvailable)}</p>
                      )}

                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-slate-700">New Extra Amount</span>
                        <input
                          type="number"
                          min="0.01"
                          max={fundingIncomeAvailable}
                          step="0.01"
                          value={transferForm.amount}
                          onChange={(event) => {
                            const value = event.target.value;
                            setTransferForm((current) => ({ ...current, amount: value }));
                            setTransferValidation(Number(value) > fundingIncomeAvailable ? "Extra amount cannot exceed the selected income balance." : "");
                          }}
                          disabled={!transferForm.incomeId || fundingIncomeAvailable <= 0}
                          required
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-slate-700">Purpose</span>
                        <select
                          value={transferForm.purpose}
                          onChange={(event) => setTransferForm((current) => ({ ...current, purpose: event.target.value, customPurpose: "" }))}
                          disabled={!transferForm.incomeId || fundingIncomeAvailable <= 0}
                          required
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100"
                        >
                          <option value="">Select purpose</option>
                          {["Expense", "Budget", "Purchase", "Salary", "Maintenance", "Marketing", "Other"].map((purpose) => <option key={purpose}>{purpose}</option>)}
                        </select>
                      </label>
                      {transferForm.purpose === "Other" && (
                        <label className="block">
                          <span className="mb-1.5 block text-sm font-semibold text-slate-700">Custom Purpose</span>
                          <input
                            value={transferForm.customPurpose}
                            onChange={(event) => setTransferForm((current) => ({ ...current, customPurpose: event.target.value }))}
                            disabled={!transferForm.incomeId || fundingIncomeAvailable <= 0}
                            required
                            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100"
                          />
                        </label>
                      )}
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-slate-700">Reason</span>
                        <textarea
                          rows="3"
                          value={transferForm.reason}
                          onChange={(event) => setTransferForm((current) => ({ ...current, reason: event.target.value }))}
                          disabled={!transferForm.incomeId || fundingIncomeAvailable <= 0}
                          placeholder="Add a note about this transfer"
                          className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-slate-700">Transfer Date</span>
                        <input
                          type="date"
                          value={transferForm.date}
                          onChange={(event) => setTransferForm((current) => ({ ...current, date: event.target.value }))}
                          disabled={!transferForm.incomeId || fundingIncomeAvailable <= 0}
                          required
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100"
                        />
                      </label>

                      <div className="rounded-xl border border-teal-200 bg-teal-50 p-4" aria-live="polite">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium text-slate-600">Current remaining</span>
                          <span className="font-semibold text-slate-900">{formatMoney(currentTransferRemaining)}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium text-slate-600">New extra amount</span>
                          <span className="font-semibold text-slate-900">{formatMoney(newTransferAmount)}</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 border-t border-teal-200 pt-3">
                          <span className="font-bold text-teal-900">Total transfer</span>
                          <span className="text-lg font-black text-teal-900">{formatMoney(newTransferRemaining)}</span>
                        </div>
                      </div>
                      {transferValidation && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{transferValidation}</p>}
                    </form>

                    <div className="mt-6 border-t border-slate-200 pt-5">
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="font-bold text-slate-900">Transfer History</h4>
                        <span className="text-xs text-slate-500">{transferHistory.length} entries</span>
                      </div>
                      {isHistoryLoading ? (
                        <p className="py-5 text-center text-sm text-slate-500">Loading history...</p>
                      ) : transferHistory.length ? (
                        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                          {transferHistory.map((entry) => (
                            <article key={entry.history_key || entry.id} className="rounded-lg border border-slate-200 p-3">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="text-xs font-bold text-slate-900">TR{String(entry.id).padStart(3, "0")} · {entry.event_type || entry.purpose}</p>
                                  <p className="mt-1 text-xs text-slate-500">{formatDateOnly(entry.transfer_date)} · {entry.created_by_name || entry.created_by || "-"} · {formatDateTime(entry.created_at)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-teal-700">{formatMoney(entry.amount)}</p>
                                  <span className="text-[10px] font-bold uppercase text-emerald-700">Completed</span>
                                </div>
                              </div>
                              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                                <p><span className="block text-slate-500">Previous</span><b>{formatMoney(entry.previous_amount)}</b></p>
                                <p><span className="block text-slate-500">Transfer</span><b>{formatMoney(entry.amount)}</b></p>
                                <p><span className="block text-slate-500">Remaining</span><b>{formatMoney(entry.remaining_amount)}</b></p>
                              </div>
                              {entry.reason && <p className="mt-2 border-t border-slate-100 pt-2 text-xs leading-5 text-slate-600">{entry.reason}</p>}
                            </article>
                          ))}
                        </div>
                      ) : (
                        <p className="rounded-lg bg-slate-50 px-3 py-5 text-center text-sm text-slate-500">No additional transfers recorded.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex min-h-64 flex-col items-center justify-center text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-700"><FiPlus size={21} /></div>
                    <h3 className="mt-4 font-bold text-slate-900">Choose a transfer</h3>
                    <p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">Select a record from the list to review its available amount and add to its transfer history.</p>
                  </div>
                )}
              </section>
            </div>

            <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
              <button type="button" onClick={closeTransferModal} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Cancel</button>
              <button
                type="button"
                disabled={!selectedTransferRecord || isTransferSaving}
                onClick={() => { setTransferForm(initialTransferForm()); setTransferValidation(""); }}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >Reset</button>
              <button
                type="submit"
                form="add-transfer-form"
                disabled={!selectedTransferRecord || isTransferSaving || !transferForm.incomeId || fundingIncomeAvailable <= 0}
                className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
              >{isTransferSaving ? "Saving..." : "Save Transfer"}</button>
            </footer>
          </section>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto overflow-hidden rounded-[2rem] bg-white shadow-2xl">
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
