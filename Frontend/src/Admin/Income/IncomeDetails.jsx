import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    FiArrowLeft,
    FiCalendar,
    FiCreditCard,
    FiEye,
    FiFileText,
    FiTag,
} from "react-icons/fi";
import api from "../../api";
import Loader from "../../Components/CommenComponents/Loader";

const formatMoney = (value) => `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
})}`;

const formatDate = (value) => {
    if (!value) return "Not recorded";
    const date = new Date(`${String(value).split("T")[0]}T00:00:00`);
    return Number.isNaN(date.getTime())
        ? String(value)
        : date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
};

const Detail = ({ icon: Icon, label, children }) => (
    <div className="flex items-start gap-3 border-b border-slate-100 py-2.5 last:border-b-0">
        <Icon size={16} className="mt-0.5 shrink-0 text-violet-600" aria-hidden="true" />
        <div className="min-w-0">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="mt-1 break-words text-sm font-semibold text-slate-800">{children || "Not recorded"}</dd>
        </div>
    </div>
);

const Pagination = ({ currentPage, pageSize, totalItems, onPageChange }) => {
    const totalPages = Math.ceil(totalItems / pageSize);
    if (totalPages <= 1) return null;

    return (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="text-xs font-medium text-slate-500">
                Showing {(currentPage - 1) * pageSize + 1}-
                {Math.min(currentPage * pageSize, totalItems)} of {totalItems}
            </p>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => onPageChange((page) => Math.max(page - 1, 1))}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Previous
                </button>
                <span className="text-xs font-semibold text-slate-600">
                    Page {currentPage} of {totalPages}
                </span>
                <button
                    type="button"
                    onClick={() => onPageChange((page) => Math.min(page + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Next
                </button>
            </div>
        </div>
    );
};

const getAttachmentUrl = (attachment) => {
    if (!attachment) return "";
    if (/^https?:\/\//i.test(attachment)) return attachment;
    const apiUrl = import.meta.env.VITE_API_URL || "";
    const backendUrl = import.meta.env.VITE_BACKEND_URL
        || (/^https?:\/\//i.test(apiUrl) ? apiUrl.replace(/\/api\/?$/, "") : "http://localhost:5000");
    return `${backendUrl.replace(/\/$/, "")}${attachment.startsWith("/") ? attachment : `/${attachment}`}`;
};

const IncomeDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [income, setIncome] = useState(null);
    const [transfers, setTransfers] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reloadKey, setReloadKey] = useState(0);
    const [transferPage, setTransferPage] = useState(1);
    const [expensePage, setExpensePage] = useState(1);
    const transferPageSize = 5;
    const expensePageSize = 10;

    useEffect(() => {
        let isCurrentRequest = true;
        setLoading(true);
        setError("");
        setTransferPage(1);
        setExpensePage(1);

        api.get(`/incomes/${id}/details`)
            .then(({ data }) => {
                if (
                    !data?.income
                    || !Array.isArray(data.transfers)
                    || !Array.isArray(data.expenses)
                ) {
                    throw new Error("The income details response was invalid.");
                }

                if (!isCurrentRequest) return;
                setIncome(data.income);
                setTransfers(data.transfers);
                setExpenses(data.expenses);
            })
            .catch((requestError) => {
                if (!isCurrentRequest) return;
                console.error("Fetch Income Details Error:", requestError);
                setError(requestError.response?.data?.message || requestError.message || "Unable to load this income record.");
            })
            .finally(() => {
                if (isCurrentRequest) setLoading(false);
            });

        return () => {
            isCurrentRequest = false;
        };
    }, [id, reloadKey]);

    if (loading) {
        return <div className="py-16"><Loader title="LIFE LEDGER" subtitle="Loading income details..." fullScreen={false} /></div>;
    }

    if (error || !income) {
        return (
            <section className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10">
                <p className="text-sm font-semibold text-rose-700">{error || "Income record not found."}</p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                    {error !== "Income record not found." && (
                        <button
                            type="button"
                            onClick={() => setReloadKey((key) => key + 1)}
                            className="rounded-lg bg-violet-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-900"
                        >
                            Try again
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => navigate("/admin/more/income")}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        <FiArrowLeft aria-hidden="true" /> All income
                    </button>
                </div>
            </section>
        );
    }

    const totalIncome = Number(income.amount || 0);
    const remainingIncome = Number(income.remaining_amount ?? totalIncome);
    const totalTransferred = transfers.reduce((sum, transfer) => sum + Number(transfer.amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.expense_amount || 0), 0);
    const attachmentUrl = getAttachmentUrl(income.attachment);
    const visibleTransfers = transfers.slice(
        (transferPage - 1) * transferPageSize,
        transferPage * transferPageSize,
    );
    const visibleExpenses = expenses.slice(
        (expensePage - 1) * expensePageSize,
        expensePage * expensePageSize,
    );
    return (
        <div className="mx-auto max-w-7xl space-y-5 pb-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={() => navigate("/admin/more/income")}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                    <FiArrowLeft aria-hidden="true" /> All income
                </button>
            </div>

            <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                <FiTag aria-hidden="true" /> {income.category || "Uncategorized"}
                            </span>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                Income #{income.id}
                            </span>
                            {income.recurring === "Yes" && (
                                <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">Recurring</span>
                            )}
                        </div>
                        <h1 className="break-words text-2xl font-bold text-slate-900 sm:text-3xl">{income.title}</h1>
                        <p className="mt-1 text-sm text-slate-500">Recorded {formatDate(income.income_date)}</p>
                    </div>
                    <div className="min-w-[180px] rounded-lg bg-emerald-50 px-4 py-3 sm:text-right">
                        <p className="text-xs font-bold uppercase text-emerald-700">Income amount</p>
                        <p className="mt-1 break-all text-2xl font-black text-emerald-800">{formatMoney(totalIncome)}</p>
                    </div>
                </div>
                <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl bg-emerald-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Income amount</p>
                        <p className="mt-2 text-lg font-black text-emerald-800">{formatMoney(totalIncome)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Available income</p>
                        <p className="mt-2 text-lg font-black text-slate-800">{formatMoney(remainingIncome)}</p>
                    </div>
                    <div className="rounded-xl bg-violet-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-violet-700">Linked transfers</p>
                        <p className="mt-2 text-lg font-black text-violet-800">{formatMoney(totalTransferred)}</p>
                    </div>
                    <div className="rounded-xl bg-rose-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-rose-700">Expenses from transfers</p>
                        <p className="mt-2 text-lg font-black text-rose-800">{formatMoney(totalExpenses)}</p>
                    </div>
                </div>
            </header>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                <section className="rounded-2xl border border-slate-200 bg-white px-5 shadow-sm sm:px-6">
                    <h2 className="border-b border-slate-100 py-3 text-base font-bold text-slate-900">Income information</h2>
                    <dl>
                        <Detail icon={FiCalendar} label="Date">{formatDate(income.income_date)}</Detail>
                        <Detail icon={FiCreditCard} label="Payment method">{income.payment_method}</Detail>
                        <Detail icon={FiTag} label="Category">{income.category}</Detail>
                        <Detail icon={FiFileText} label="Notes">{income.notes}</Detail>
                    </dl>
                    {attachmentUrl && (
                        <div className="border-t border-slate-100 py-3">
                            <a
                                href={attachmentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-700 transition hover:bg-violet-100"
                            >
                                <FiEye aria-hidden="true" /> Open attachment
                            </a>
                        </div>
                    )}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Transfers from this income</h2>
                            <p className="mt-1 text-sm text-slate-500">Budgets funded by this income and their current balances.</p>
                        </div>
                        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                            {transfers.length} {transfers.length === 1 ? "transfer" : "transfers"}
                        </span>
                    </div>
                    {transfers.length === 0 ? (
                        <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                            No transfers are linked to this income.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[600px] text-left text-sm">
                                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                    <tr>
                                        <th className="px-3 py-3">S No</th>
                                        <th className="px-3 py-3">Transfer</th>
                                        <th className="px-3 py-3">Date</th>
                                        <th className="px-3 py-3 text-right">Amount</th>
                                        <th className="px-3 py-3 text-right">Expenses</th>
                                        <th className="px-3 py-3 text-right">Remaining</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {visibleTransfers.map((transfer, index) => (
                                        <tr key={transfer.id}>
                                            <td className="px-3 py-3 font-semibold text-slate-500">
                                                {(transferPage - 1) * transferPageSize + index + 1}
                                            </td>
                                            <td className="px-3 py-3">
                                                <p className="font-semibold text-slate-800">{transfer.title || transfer.category}</p>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatDate(transfer.transfer_date)}</td>
                                            <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-slate-800">{formatMoney(transfer.amount)}</td>
                                            <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-rose-600">{formatMoney(transfer.total_expense)}</td>
                                            <td className="whitespace-nowrap px-3 py-3 text-right font-bold text-emerald-700">{formatMoney(transfer.remaining_amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <Pagination
                        currentPage={transferPage}
                        pageSize={transferPageSize}
                        totalItems={transfers.length}
                        onPageChange={setTransferPage}
                    />
                </section>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">Expenses from linked transfers</h2>
                        <p className="mt-1 text-sm text-slate-500">Expenses recorded against budgets funded by this income.</p>
                    </div>
                    <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
                        {expenses.length} {expenses.length === 1 ? "expense" : "expenses"}
                    </span>
                </div>
                {expenses.length === 0 ? (
                    <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                        No expenses have been recorded against this income&apos;s transfers.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[680px] text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                <tr>
                                    <th className="px-3 py-3">S No</th>
                                    <th className="px-3 py-3">Expense</th>
                                    <th className="px-3 py-3">Transfer</th>
                                    <th className="px-3 py-3">Category</th>
                                    <th className="px-3 py-3">Date</th>
                                    <th className="px-3 py-3 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {visibleExpenses.map((expense, index) => (
                                    <tr key={expense.id}>
                                        <td className="px-3 py-3 font-semibold text-slate-500">
                                            {(expensePage - 1) * expensePageSize + index + 1}
                                        </td>
                                        <td className="px-3 py-3 font-semibold text-slate-800">{expense.title}</td>
                                        <td className="px-3 py-3 text-slate-600">{expense.linked_transfer_title || "Transfer"}</td>
                                        <td className="px-3 py-3 text-slate-600">{expense.category || "Uncategorized"}</td>
                                        <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatDate(expense.expense_date)}</td>
                                        <td className="whitespace-nowrap px-3 py-3 text-right font-bold text-rose-600">{formatMoney(expense.expense_amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <Pagination
                    currentPage={expensePage}
                    pageSize={expensePageSize}
                    totalItems={expenses.length}
                    onPageChange={setExpensePage}
                />
            </section>
        </div>
    );
};

export default IncomeDetails;
