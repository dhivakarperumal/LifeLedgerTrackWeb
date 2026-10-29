import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiCalendar, FiClock, FiCreditCard, FiEdit2, FiFileText, FiMapPin, FiPaperclip, FiRepeat, FiTag } from "react-icons/fi";
import api from "../../api";
import Loader from "../../Components/CommenComponents/Loader";
import { formatDateOnly } from "../../utils/date";

const formatMoney = (value) => Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const formatDate = (value) => value
    ? formatDateOnly(value, "en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "Not recorded";

const getMediaUrl = (value) => {
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;
    const apiBase = import.meta.env.VITE_API_URL || "/api";
    const backendBase = apiBase.replace(/\/api\/?$/, "").replace(/\/$/, "");
    return `${backendBase}${value.startsWith("/") ? value : `/${value}`}`;
};

const Detail = ({ icon: Icon, label, children }) => (
    <div className="min-w-0 border-b border-slate-100 py-4 last:border-b-0 sm:grid sm:grid-cols-[minmax(130px,0.7fr)_1.3fr] sm:gap-4">
        <dt className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <Icon size={15} aria-hidden="true" /> {label}
        </dt>
        <dd className="mt-1 break-words text-sm font-semibold text-slate-800 sm:mt-0">{children || "Not recorded"}</dd>
    </div>
);

const ExpenseDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [expense, setExpense] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError("");
        api.get(`/expenses/${id}`)
            .then(({ data }) => active && setExpense(data))
            .catch((requestError) => {
                if (!active) return;
                setError(requestError.response?.data?.message || "Unable to load this expense.");
            })
            .finally(() => active && setLoading(false));
        return () => { active = false; };
    }, [id]);

    if (loading) {
        return <div className="py-16"><Loader title="LIFE LEDGER" subtitle="Loading expense details..." fullScreen={false} /></div>;
    }

    if (error || !expense) {
        return (
            <section className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10">
                <p className="text-sm font-semibold text-rose-700">{error || "Expense not found."}</p>
                <button type="button" onClick={() => navigate("/admin/expensive/all")} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#53633b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#414f2e]">
                    <FiArrowLeft aria-hidden="true" /> Back to expenses
                </button>
            </section>
        );
    }

    const hasTransfer = expense.transfer_amount !== null && expense.transfer_amount !== undefined;
    const receiptUrl = getMediaUrl(expense.attachment);
    const isPdf = /\.pdf(?:$|\?)/i.test(expense.attachment || "");
    const isImage = /\.(png|jpe?g|gif|webp|bmp)(?:$|\?)/i.test(expense.attachment || "");

    return (
        <div className="mx-auto max-w-7xl space-y-5 pb-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <button type="button" onClick={() => navigate("/admin/expensive/all")} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                    <FiArrowLeft aria-hidden="true" /> All expenses
                </button>
                <button type="button" onClick={() => navigate("/admin/expensive/all", { state: { editExpense: expense } })} className="inline-flex items-center gap-2 rounded-lg bg-[#53633b] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#414f2e]">
                    <FiEdit2 aria-hidden="true" /> Edit expense
                </button>
            </div>

            <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700"><FiTag aria-hidden="true" />{expense.category || "Uncategorized"}</span>
                            {expense.recurring === "Yes" && <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"><FiRepeat aria-hidden="true" />Recurring</span>}
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Expense #{expense.id}</span>
                        </div>
                        <h1 className="break-words text-2xl font-bold text-slate-900 sm:text-3xl">{expense.title}</h1>
                        <p className="mt-1 text-sm text-slate-500">Recorded {formatDate(expense.expense_date)}</p>
                    </div>
                    <div className="min-w-[180px] rounded-lg bg-rose-50 px-4 py-3 text-right">
                        <p className="text-xs font-bold uppercase text-rose-600">Expense amount</p>
                        <p className="mt-1 break-all text-2xl font-black text-rose-700">{formatMoney(expense.expense_amount)}</p>
                    </div>
                </div>
            </header>

            <section className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white px-5 shadow-sm sm:px-6">
                    <h2 className="border-b border-slate-100 py-4 text-base font-bold text-slate-900">Transaction details</h2>
                    <dl>
                        <Detail icon={FiCalendar} label="Date">{formatDate(expense.expense_date)}</Detail>
                        <Detail icon={FiClock} label="Time">{expense.expense_time ? String(expense.expense_time).slice(0, 5) : null}</Detail>
                        <Detail icon={FiCreditCard} label="Payment method">{expense.payment_method}</Detail>
                        <Detail icon={FiMapPin} label="Location">{expense.location}</Detail>
                        {expense.from && <Detail icon={FiMapPin} label="From">{expense.from}</Detail>}
                        {expense.to && <Detail icon={FiMapPin} label="To">{expense.to}</Detail>}
                    </dl>
                </div>

                <div className="space-y-5">
                    {hasTransfer && (
                        <section className="rounded-xl border border-slate-200 bg-white px-5 shadow-sm sm:px-6">
                            <h2 className="border-b border-slate-100 py-4 text-base font-bold text-slate-900">Transfer breakdown</h2>
                            <dl>
                                <Detail icon={FiRepeat} label="Transfer amount">{formatMoney(expense.transfer_amount)}</Detail>
                                <Detail icon={FiFileText} label="Remaining balance">{formatMoney(expense.remaining_amount)}</Detail>
                            </dl>
                        </section>
                    )}

                    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><FiFileText aria-hidden="true" /> Notes</h2>
                        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{expense.notes || "No notes were added for this expense."}</p>
                    </section>
                </div>
            </section>

            {expense.attachment && (
                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><FiPaperclip aria-hidden="true" /> Receipt</h2>
                        <a href={receiptUrl} target="_blank" rel="noreferrer" crossOrigin="use-credentials" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Open receipt</a>
                    </div>
                    {isImage && <img src={receiptUrl} alt={`Receipt for ${expense.title}`} crossOrigin="use-credentials" className="mt-4 max-h-[560px] w-full rounded-lg bg-slate-50 object-contain" />}
                    {isPdf && <iframe title={`Receipt for ${expense.title}`} src={receiptUrl} className="mt-4 h-[65vh] min-h-[360px] w-full rounded-lg border border-slate-200" />}
                    {!isImage && !isPdf && <p className="mt-3 text-sm text-slate-500">Receipt is attached. Use “Open receipt” to view it.</p>}
                </section>
            )}
        </div>
    );
};

export default ExpenseDetails;
