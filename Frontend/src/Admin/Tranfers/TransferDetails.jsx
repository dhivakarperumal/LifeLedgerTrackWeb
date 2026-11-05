import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    FiArrowLeft,
    FiCalendar,
    FiCreditCard,
    FiEye,
    FiFileText,
    FiRefreshCw,
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

const formatDateTime = (value) => {
    if (!value) return "Not recorded";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? String(value)
        : date.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
};

const Detail = ({ icon: Icon, label, children }) => (
    <div className="flex items-start gap-3 border-b border-slate-100 py-4 last:border-b-0">
        <Icon size={16} className="mt-0.5 shrink-0 text-violet-600" aria-hidden="true" />
        <div className="min-w-0">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="mt-1 break-words text-sm font-semibold text-slate-800">{children || "Not recorded"}</dd>
        </div>
    </div>
);

const getRemainingAmount = (transfer) => Math.max(
    Number(transfer.remaining_amount ?? (
        Number(transfer.amount || 0)
        - Number(transfer.total_expense || 0)
        - Number(transfer.total_transferred || 0)
        - Number(transfer.total_returned || 0)
    )),
    0,
);

const TransferDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [transfer, setTransfer] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let isCurrentRequest = true;
        setLoading(true);
        setError("");

        Promise.all([
            api.get("/transfers"),
            api.get(`/transfers/${id}/history`),
        ])
            .then(([transfersResponse, historyResponse]) => {
                if (!Array.isArray(transfersResponse.data) || !Array.isArray(historyResponse.data)) {
                    throw new Error("The transfer details response was invalid.");
                }
                const selected = transfersResponse.data.find((item) => String(item.id) === String(id));
                if (!isCurrentRequest) return;
                if (!selected) {
                    setTransfer(null);
                    setHistory([]);
                    setError("Transfer not found.");
                    return;
                }
                setTransfer(selected);
                setHistory(historyResponse.data);
            })
            .catch((requestError) => {
                if (!isCurrentRequest) return;
                console.error("Fetch Transfer Details Error:", requestError);
                setError(requestError.response?.data?.message || requestError.message || "Unable to load this transfer.");
            })
            .finally(() => {
                if (isCurrentRequest) setLoading(false);
            });

        return () => {
            isCurrentRequest = false;
        };
    }, [id, reloadKey]);

    if (loading) {
        return <div className="py-16"><Loader title="LIFE LEDGER" subtitle="Loading transfer history..." fullScreen={false} /></div>;
    }

    if (error || !transfer) {
        return (
            <section className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10">
                <p className="text-sm font-semibold text-rose-700">{error || "Transfer not found."}</p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                    {error !== "Transfer not found." && (
                        <button
                            type="button"
                            onClick={() => setReloadKey((key) => key + 1)}
                            className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800"
                        >
                            <FiRefreshCw aria-hidden="true" /> Try again
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => navigate("/admin/more/transfer")}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        <FiArrowLeft aria-hidden="true" /> All transfers
                    </button>
                </div>
            </section>
        );
    }

    const remaining = getRemainingAmount(transfer);
    const receiptUrl = transfer.receipt
        ? `${(import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "")}${transfer.receipt}`
        : "";

    return (
        <div className="mx-auto max-w-6xl space-y-5 pb-8">
            <header className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="bg-gradient-to-r from-[#1F0A3C] to-[#3c096c] px-5 py-6 text-white sm:px-7">
                    <button
                        type="button"
                        onClick={() => navigate("/admin/more/transfer")}
                        className="mb-5 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                    >
                        <FiArrowLeft aria-hidden="true" /> All transfers
                    </button>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white">
                                    <FiTag aria-hidden="true" /> {transfer.category || "Uncategorized"}
                                </span>
                                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
                                    Transfer #{transfer.id}
                                </span>
                            </div>
                            <h1 className="break-words text-2xl font-black sm:text-3xl">{transfer.title}</h1>
                            <p className="mt-2 text-sm text-white/75">Transfer details and complete activity history</p>
                        </div>
                        <div className="min-w-[180px] rounded-xl bg-white/10 px-4 py-3 sm:text-right">
                            <p className="text-xs font-bold uppercase tracking-wide text-white/70">Transfer amount</p>
                            <p className="mt-1 break-all text-2xl font-black">{formatMoney(transfer.amount)}</p>
                        </div>
                    </div>
                </div>
                <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-6">
                    <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Total expenses</p>
                        <p className="mt-2 text-lg font-black text-rose-600">{formatMoney(transfer.total_expense)}</p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Remaining</p>
                        <p className="mt-2 text-lg font-black text-emerald-800">{formatMoney(remaining)}</p>
                    </div>
                    <div className="rounded-xl bg-violet-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-violet-700">History events</p>
                        <p className="mt-2 text-lg font-black text-violet-800">{history.length}</p>
                    </div>
                </div>
            </header>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                <section className="rounded-2xl border border-slate-200 bg-white px-5 shadow-sm sm:px-6">
                    <h2 className="border-b border-slate-100 py-4 text-base font-bold text-slate-900">Transfer information</h2>
                    <dl>
                        <Detail icon={FiCalendar} label="Date">{formatDate(transfer.transfer_date)}</Detail>
                        <Detail icon={FiCreditCard} label="Payment method">{transfer.payment_method}</Detail>
                        <Detail icon={FiTag} label="Category">{transfer.category}</Detail>
                        <Detail icon={FiFileText} label="Notes">{transfer.notes}</Detail>
                    </dl>
                    {receiptUrl && (
                        <div className="border-t border-slate-100 py-4">
                            <a
                                href={receiptUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-700 transition hover:bg-violet-100"
                            >
                                <FiEye aria-hidden="true" /> View receipt
                            </a>
                        </div>
                    )}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-label="Transfer history">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Transfer history</h2>
                            <p className="mt-1 text-sm text-slate-500">Amounts added, allocated, and returned over time.</p>
                        </div>
                        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                            {history.length} {history.length === 1 ? "event" : "events"}
                        </span>
                    </div>
                    {history.length === 0 ? (
                        <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                            No transfer history has been recorded yet.
                        </p>
                    ) : (
                        <ol className="space-y-3">
                            {history.map((entry) => {
                                const eventType = entry.event_type || entry.purpose || "Transfer update";
                                const isOutflow = eventType === "Transfer Allocation" || eventType === "Returned to Income";
                                return (
                                    <li
                                        key={entry.history_key || `${entry.event_type}-${entry.id}-${entry.created_at}`}
                                        className="rounded-xl border border-slate-200 p-4"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-800">{eventType}</p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {formatDate(entry.transfer_date)} · {formatDateTime(entry.created_at)}
                                                    {entry.created_by_name ? ` · ${entry.created_by_name}` : ""}
                                                </p>
                                            </div>
                                            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${isOutflow ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                                                {isOutflow ? "−" : "+"}{formatMoney(entry.amount)}
                                            </span>
                                        </div>
                                        <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-xs">
                                            <p>
                                                <span className="block text-slate-500">Before</span>
                                                <b className="mt-1 block text-slate-800">{entry.previous_amount == null ? "—" : formatMoney(entry.previous_amount)}</b>
                                            </p>
                                            <p>
                                                <span className="block text-slate-500">{isOutflow ? "Change" : "Added"}</span>
                                                <b className="mt-1 block text-slate-800">{formatMoney(entry.amount)}</b>
                                            </p>
                                            <p>
                                                <span className="block text-slate-500">After</span>
                                                <b className="mt-1 block text-slate-800">{entry.remaining_amount == null ? "—" : formatMoney(entry.remaining_amount)}</b>
                                            </p>
                                        </div>
                                        {(entry.income_title || entry.reason) && (
                                            <div className="mt-3 space-y-1 text-xs text-slate-600">
                                                {entry.income_title && <p><span className="font-semibold text-slate-700">Income:</span> {entry.income_title}</p>}
                                                {entry.reason && <p className="leading-5">{entry.reason}</p>}
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </section>
            </div>
        </div>
    );
};

export default TransferDetails;
