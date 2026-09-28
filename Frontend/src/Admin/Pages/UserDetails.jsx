import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  FiArrowLeft,
  FiCalendar,
  FiDollarSign,
  FiImage,
  FiBookOpen,
  FiRepeat,
  FiTrendingDown,
  FiUser,
  FiActivity,
} from "react-icons/fi";
import api from "../../api";

const sections = [
  { id: "expenses", label: "Expenses", icon: FiTrendingDown },
  { id: "memories", label: "Memories", icon: FiImage },
  { id: "diary", label: "Diary", icon: FiBookOpen },
  { id: "transfers", label: "Transfers", icon: FiRepeat },
  { id: "incomes", label: "Income", icon: FiDollarSign },
  { id: "events", label: "Events", icon: FiCalendar },
];

const recordInfo = {
  expenses: {
    date: "expense_date",
    category: "category",
    amount: "expense_amount",
    description: (record) => record.notes || record.payment_method,
  },
  memories: {
    date: "memory_date",
    category: "category_name",
    description: (record) => [record.description, record.location, record.mood].filter(Boolean).join(" · "),
  },
  diary: {
    date: "entry_date",
    category: "category_name",
    description: (record) => record.content,
  },
  transfers: {
    date: "transfer_date",
    category: "category",
    amount: "amount",
    description: (record) => record.notes || `Spent ${formatCurrency(record.total_expense)}`,
  },
  incomes: {
    date: "income_date",
    category: "category",
    amount: "amount",
    description: (record) => record.notes || record.payment_method,
  },
  events: {
    date: "start_date",
    category: "category",
    description: (record) => [record.start_time, record.location, record.status].filter(Boolean).join(" · "),
  },
};

function formatDate(value) {
  if (!value) return "Date unavailable";
  const date = String(value).split("T")[0];
  const [year, month, day] = date.split("-");
  return year && month && day ? `${day}/${month}/${year}` : date;
}

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const UserDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("expenses");
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get(`/auth/users/${id}/records`)
      .then((response) => {
        if (active) setUserData(response.data);
      })
      .catch((error) => {
        if (!active) return;
        toast.error(error.response?.data?.message || "Unable to load customer details");
        setUserData(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [id]);

  const user = userData?.user;
  const records = userData?.records || {};
  const currentSection = sections.find((section) => section.id === activeSection) || sections[0];
  const currentRecords = records[activeSection] || [];
  const currentInfo = recordInfo[activeSection];
  const ActiveIcon = currentSection.icon;

  return (
    <main className="mx-auto max-w-375 space-y-5 px-1 py-4 sm:px-2">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/admin/users/all")}
            aria-label="Back to customers"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            <FiArrowLeft size={18} />
          </button>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Customer account</p>
            <h1 className="mt-1 text-xl font-black text-slate-800 sm:text-2xl">{loading ? "Loading customer..." : user?.name || "Customer not found"}</h1>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">Loading account records...</div>
      ) : !user ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">This customer could not be found.</div>
      ) : (
        <>
          <section className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-700"><FiUser size={22} /></div>
              <div className="min-w-0">
                <p className="truncate font-bold text-slate-800">{user.name || user.username}</p>
                <p className="truncate text-sm text-slate-500">{user.email}</p>
              </div>
            </div>
            <div className="text-sm"><span className="text-slate-400">Phone</span><p className="mt-0.5 font-semibold text-slate-700">{user.phone || "Not provided"}</p></div>
            <div className="text-sm"><span className="text-slate-400">Role</span><p className="mt-0.5 font-semibold capitalize text-slate-700">{user.role || "user"}</p></div>
            <div className="text-sm"><span className="text-slate-400">Status</span><p className="mt-0.5 font-semibold text-slate-700">{user.status || "Active"}</p></div>
            <div className="text-sm"><span className="text-slate-400">Joined</span><p className="mt-0.5 font-semibold text-slate-700">{formatDate(user.created_at)}</p></div>
          </section>

          <section className="grid min-h-125 grid-cols-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
            <nav aria-label="Customer record categories" className="flex gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm lg:flex-col lg:gap-1 lg:overflow-visible lg:p-3">
              <p className="hidden px-3 pb-2 pt-1 text-[11px] font-black uppercase tracking-wider text-slate-400 lg:block">Record sections</p>
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold transition-colors lg:w-full ${isActive ? "bg-violet-50 text-violet-800" : "text-slate-600 hover:bg-slate-50"}`}
                  >
                    <Icon size={17} />
                    <span className="flex-1">{section.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${isActive ? "bg-white text-violet-800" : "bg-slate-100 text-slate-500"}`}>{(records[section.id] || []).length}</span>
                  </button>
                );
              })}
            </nav>

            <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-700"><ActiveIcon size={18} /></div>
                  <div>
                    <h2 className="font-black text-slate-800">{currentSection.label}</h2>
                    <p className="text-xs text-slate-500">{currentRecords.length} records</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-400"><FiActivity size={14} /> Account activity</div>
              </div>

              {currentRecords.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400"><ActiveIcon size={21} /></div>
                  <p className="mt-3 font-semibold text-slate-700">No {currentSection.label.toLowerCase()} yet</p>
                  <p className="mt-1 text-sm text-slate-400">This account has no records in this section.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {currentRecords.map((record) => {
                    const description = typeof currentInfo.description === "function"
                      ? currentInfo.description(record)
                      : record[currentInfo.description];
                    const date = record[currentInfo.date];
                    const category = record[currentInfo.category];
                    const amount = currentInfo.amount ? record[currentInfo.amount] : null;
                    return (
                      <article key={record.id} className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 px-5 py-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="max-w-full truncate font-bold text-slate-800">{record.title || "Untitled record"}</h3>
                            {category && <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{category}</span>}
                          </div>
                          {description && <p className="mt-1 max-w-3xl truncate text-sm text-slate-500" title={description}>{description}</p>}
                        </div>
                        <div className="ml-auto shrink-0 text-right">
                          {amount !== null && <p className="font-black text-slate-800">{formatCurrency(amount)}</p>}
                          <p className="mt-1 text-xs font-medium text-slate-400">{formatDate(date)}</p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
};

export default UserDetails;
