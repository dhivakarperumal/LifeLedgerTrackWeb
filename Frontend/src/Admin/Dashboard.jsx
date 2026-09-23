import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../PrivateRouter/AuthContext";
import { useAdmin } from "../PrivateRouter/AdminContext";
import api from "../api";
import { toast, Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
    FiShoppingBag,
    FiUsers,
    FiBox,
    FiClock,
    FiCheckCircle,
    FiAlertTriangle,
    FiMapPin,
    FiTrendingUp,
    FiTrendingDown,
    FiEye,
    FiTag,
    FiBook,
    FiImage,
    FiSend,
    FiRepeat,
    FiCalendar,
    FiArrowRight,
} from "react-icons/fi";
import { FaRupeeSign, FaTshirt, FaTruck } from "react-icons/fa";
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
    BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';

const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");

const getDashboardImageUrl = (image) => {
    if (!image || /^(https?:|data:|blob:)/i.test(image)) return image;
    return `${backendUrl}${image.startsWith("/") ? image : `/${image}`}`;
};

const formatOrderDate = (value) => {
    if (!value) return "Date unavailable";

    let date = new Date(value);
    if (Number.isNaN(date.getTime()) && typeof value === "string") {
        date = new Date(value.replace(" ", "T"));
    }

    return Number.isNaN(date.getTime())
        ? "Date unavailable"
        : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

ChartJS.register(
  CategoryScale,
  LinearScale,
    BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

const Dashboard = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const { dashboardData, setDashboardCached } = useAdmin();
    const [loading, setLoading] = useState(!dashboardData);
    const [salesRange, setSalesRange] = useState("week");

    // ── Recent Activity State ───────────────────────────────────────────
    const [recentExpenses,  setRecentExpenses]  = useState([]);
    const [recentTransfers, setRecentTransfers] = useState([]);
    const [recentMemories,  setRecentMemories]  = useState([]);
    const [recentDiary,     setRecentDiary]     = useState([]);
    const [recentEvents,    setRecentEvents]    = useState([]);
    const [activityLoading, setActivityLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData("week");
        fetchRecentActivity();
    }, []);

    const getLocalDateKey = (value) => {
        if (!value) return "";

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            const str = String(value).trim();
            const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (match) {
                return `${match[1]}-${match[2]}-${match[3]}`;
            }
            return "";
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    const getTodayItems = (items, dateFields = []) => {
        const list = Array.isArray(items) ? items : [];
        const todayKey = getLocalDateKey(new Date());

        return list.filter((item) => {
            if (!item) return false;
            return dateFields.some((field) => {
                const val = item[field];
                if (!val) return false;
                return getLocalDateKey(val) === todayKey;
            });
        });
    };

    const fetchRecentActivity = async () => {
        setActivityLoading(true);
        try {
            const [expRes, trfRes, memRes, diaRes, eveRes] = await Promise.allSettled([
                api.get("/expenses"),
                api.get("/transfers"),
                api.get("/memories"),
                api.get("/diary"),
                api.get("/calendar/events"),
            ]);

            if (expRes.status === "fulfilled") {
                const all = expRes.value.data || [];
                setRecentExpenses(getTodayItems(all, ["expense_date", "created_at"]).slice(0, 5));
            }
            if (trfRes.status === "fulfilled") {
                const all = trfRes.value.data || [];
                setRecentTransfers(getTodayItems(all, ["transfer_date", "created_at"]).slice(0, 5));
            }
            if (memRes.status === "fulfilled") {
                const all = memRes.value.data || [];
                setRecentMemories(getTodayItems(all, ["created_at", "memory_date"]).slice(0, 4));
            }
            if (diaRes.status === "fulfilled") {
                const raw = diaRes.value.data;
                const all = Array.isArray(raw) ? raw : (raw?.entries || raw?.data || []);
                setRecentDiary(getTodayItems(all, ["entry_date", "created_at", "date"]).slice(0, 4));
            }
            if (eveRes.status === "fulfilled") {
                const payload = eveRes.value?.data || [];
                const all = Array.isArray(payload)
                    ? payload
                    : Array.isArray(payload?.data)
                        ? payload.data
                        : Array.isArray(payload?.events)
                            ? payload.events
                            : [];
                setRecentEvents(getTodayItems(all, ["startDate", "start_date", "createdAt", "created_at"]).slice(0, 5));
            }
        } catch (err) {
            console.error("Fetch Recent Activity Error:", err);
        } finally {
            setActivityLoading(false);
        }
    };

    const fetchDashboardData = async (range = salesRange) => {
        if (!dashboardData) setLoading(true);
        try {
            const response = await api.get('/dashboard', { params: { range } });
            setDashboardCached(response.data);
        } catch (error) {
            console.error("Fetch Dashboard Error:", error);
            toast.error("Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case "Delivered": return "bg-green-100 text-green-700";
            case "Confirmed": return "bg-blue-100 text-blue-700";
            case "Shipped": return "bg-orange-100 text-orange-700";
            case "Packed": return "bg-purple-100 text-purple-700";
            case "Pending": return "bg-yellow-100 text-yellow-700";
            case "Cancelled": return "bg-red-100 text-red-700";
            default: return "bg-gray-100 text-gray-700";
        }
    };

    const getStatIcon = (iconStr) => {
        switch (iconStr) {
            case "saree": return <FaTshirt className="text-white" size={22} />;
            case "bag": return <FiShoppingBag className="text-white" size={22} />;
            case "rupee": return <FaRupeeSign className="text-white" size={22} />;
            case "pending": return <FiClock className="text-white" size={22} />;
            case "truck": return <FaTruck className="text-white" size={22} />;
            case "users": return <FiUsers className="text-white" size={22} />;
            case "lowstock": return <FiBox className="text-white" size={22} />;
            case "offer": return <FiTag className="text-white" size={22} />;
            case "memories": return <FiImage className="text-white" size={22} />;
            case "diary": return <FiBook className="text-white" size={22} />;
            case "today_expense": return <FiTrendingDown className="text-white" size={22} />;
            default: return <FiBox className="text-white" size={22} />;
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4 h-[60vh]">
                <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-gray-300 font-bold text-sm">Loading Dashboard...</p>
            </div>
        )
    }

    if (!dashboardData) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <p className="text-gray-400 font-bold text-sm">No data available</p>
            </div>
        )
    }

    const { stats, recentOrders, topProducts, lowStockAlerts, revenueTrends = [], categoryAnalytics = [] } = dashboardData;

    // ── Bar Chart: Real Expense Trends ──────────────────────────────
    const expenseSeries = revenueTrends.length > 0
        ? revenueTrends.map((item) => Number(item.total ?? item.revenue ?? 0))
        : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    const barChartData = {
        labels: revenueTrends.length > 0
            ? revenueTrends.map((item) => item.month || item.label || 'Month')
            : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
            label: 'Expenses',
            data: expenseSeries,
            backgroundColor: '#8B5CF6',
            borderColor: '#7C3AED',
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false,
            categoryPercentage: 0.7,
            barPercentage: 0.8,
        }]
    };

    const barChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#fff',
                titleColor: '#333',
                bodyColor: '#333',
                borderColor: '#eee',
                borderWidth: 1,
                callbacks: {
                    label: (context) => `Expense: ₹${context.parsed.y.toLocaleString('en-IN')}`
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: (value) => `₹${(value / 1000).toFixed(0)}k`,
                    color: '#9ca3af',
                    font: { size: 10 }
                },
                grid: { color: '#f3f4f6', drawBorder: false }
            },
            x: {
                ticks: { color: '#9ca3af', font: { size: 10 } },
                grid: { display: false, drawBorder: false }
            }
        }
    };

    const salesRangeOptions = [
        { value: "week", label: "This Week" },
        { value: "month", label: "This Month" },
        { value: "all", label: "All Time" },
    ];

    // ── Doughnut Chart: Expense Category Breakdown ──────────────────
    const categoryColors = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];
    const categoryLabels = categoryAnalytics.length > 0
        ? categoryAnalytics.map((item) => item.label)
        : ['Food', 'Travel', 'Bills', 'Shopping', 'Health'];
    const categoryValues = categoryAnalytics.length > 0
        ? categoryAnalytics.map((item) => Number(item.value || 0))
        : [0, 0, 0, 0, 0];
    const totalCategoryValue = categoryValues.reduce((sum, value) => sum + value, 0);

    const doughnutData = {
        labels: categoryLabels,
        datasets: [{
            data: categoryValues,
            backgroundColor: categoryColors,
            borderWidth: 0,
            cutout: '70%',
        }]
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
    };

    const categoryStats = categoryLabels.map((label, i) => ({
        label,
        count: categoryAnalytics[i]?.count || 0,
        amount: categoryValues[i] || 0,
        pct: totalCategoryValue > 0 ? `${((categoryValues[i] / totalCategoryValue) * 100).toFixed(1)}%` : '0%',
        color: categoryColors[i % categoryColors.length]
    }));

    const cardStyles = [
        { gradient: "from-[#6C3DE8] to-[#A855F7]", icon_bg: "bg-white/20" },
        { gradient: "from-[#2563EB] to-[#0EA5E9]", icon_bg: "bg-white/20" },
        { gradient: "from-[#059669] to-[#10B981]", icon_bg: "bg-white/20" },
        { gradient: "from-[#F59E0B] to-[#FBBF24]", icon_bg: "bg-white/20" },
        { gradient: "from-[#EF4444] to-[#F97316]", icon_bg: "bg-white/20" },
        { gradient: "from-[#0891B2] to-[#06B6D4]", icon_bg: "bg-white/20" },
        { gradient: "from-[#DB2777] to-[#EC4899]", icon_bg: "bg-white/20" },
        { gradient: "from-[#7C3AED] to-[#6D28D9]", icon_bg: "bg-white/20" },
    ];

    const savedMonthlyBudget = Number(localStorage.getItem("lifeLedgerMonthlyBudget") || 0);
    const dashboardStats = stats.map((stat) => {
        if (stat.label === "Monthly Budget") {
            const budgetValue = Number.isFinite(savedMonthlyBudget) && savedMonthlyBudget > 0 ? savedMonthlyBudget : 0;
            return {
                ...stat,
                value: `₹${budgetValue.toLocaleString("en-IN")}`,
            };
        }
        return stat;
    });

    return (
        <div className="space-y-6 pb-12 bg-slate-50 min-h-screen">
            <Toaster position="top-right" />

            {/* Top Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {dashboardStats.map((stat, i) => {
                    const style = cardStyles[i % cardStyles.length];
                    return (
                        <div key={i} className={`relative bg-gradient-to-br ${style.gradient} rounded-2xl p-4 overflow-hidden shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer`}>
                            {/* Decorative circle background */}
                            <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
                            <div className="absolute -bottom-8 -right-2 w-24 h-24 bg-white/5 rounded-full" />

                            {/* Top row: icon + trend */}
                            <div className="flex items-center justify-between mb-3 relative z-10">
                                <div className={`w-11 h-11 ${style.icon_bg} backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30`}>
                                    {getStatIcon(stat.icon)}
                                </div>
                                <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
                                    {stat.trendUp ? <FiTrendingUp size={10} /> : <FiTrendingDown size={10} />}
                                    {stat.trend.replace('+', '').replace('↓', '').trim()}
                                </span>
                            </div>

                            {/* Value */}
                            <div className="relative z-10">
                                <h3 className="text-3xl font-black text-white leading-none">{stat.value}</h3>
                                <p className="text-white/70 text-xs font-semibold mt-1">{stat.label}</p>
                            </div>

                            {/* Bottom divider */}
                            <div className="mt-3 pt-3 border-t border-white/20 relative z-10">
                                <p className="text-white/60 text-[10px] font-medium">
                                    {stat.trendUp ? '▲' : '▼'} {stat.trend.replace('+', '').replace('↓', '').trim()} vs last month
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Quick Actions</h3>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Shortcuts</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-8 gap-3">
                    {[
                        { label: "All Expenses",   icon: <FiBox size={20} />,          color: "from-[#6C3DE8] to-[#A855F7]", path: "/admin/expensive/all" },
                        { label: "Categories",     icon: <FiTag size={20} />,          color: "from-[#2563EB] to-[#0EA5E9]", path: "/admin/expensive/category" },
                        { label: "Income",         icon: <FaRupeeSign size={20} />,    color: "from-[#059669] to-[#10B981]", path: "/admin/more/income" },
                        { label: "Transfer",       icon: <FaTruck size={20} />,       color: "from-[#F59E0B] to-[#FBBF24]", path: "/admin/more/transfer" },
                        { label: "Customers",      icon: <FiUsers size={20} />,       color: "from-[#EF4444] to-[#F97316]", path: "/admin/users/all" },
                        { label: "Reports",        icon: <FiTrendingUp size={20} />,  color: "from-[#DB2777] to-[#EC4899]", path: "/admin/reports" },
                        { label: "Memories",       icon: <FiEye size={20} />,         color: "from-[#0891B2] to-[#06B6D4]", path: "/admin/users/memories" },
                        { label: "My Diary",       icon: <FiClock size={20} />,       color: "from-[#7C3AED] to-[#6D28D9]", path: "/admin/users/diary" },
                    ].map((action, i) => (
                        <button
                            key={i}
                            onClick={() => navigate(action.path)}
                            className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl border border-gray-100 hover:border-transparent hover:shadow-lg transition-all duration-200 group hover:-translate-y-0.5 bg-white min-h-[120px]"
                        >
                            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform duration-200`}>
                                {action.icon}
                            </div>
                            <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 text-center leading-tight">{action.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ══════════ TODAY'S ACTIVITY SECTION ══════════ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#240046] to-[#7b2cbf] flex items-center justify-center text-white">
                            <FiCalendar size={15} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Today's Activity</h3>
                            <p className="text-[10px] text-gray-400 font-medium">
                                {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={fetchRecentActivity}
                        className="text-xs font-bold text-purple-600 border border-purple-100 px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-all"
                    >
                        ↻ Refresh
                    </button>
                </div>

                {activityLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-4 border-[#7b2cbf]/20 border-t-[#7b2cbf] rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">

                        {/* ── Recent Events ── */}
                        <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white shadow-sm">
                                        <FiCalendar size={14} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-800">Events</p>
                                        <p className="text-[10px] text-gray-400">{recentEvents.length} record{recentEvents.length !== 1 ? "s" : ""}</p>
                                    </div>
                                </div>
                                <button onClick={() => navigate("/admin/planner/calendar")} className="text-[10px] text-violet-500 font-bold hover:underline flex items-center gap-1">
                                    View All <FiArrowRight size={10} />
                                </button>
                            </div>
                            <div className="space-y-2">
                                {recentEvents.length === 0 ? (
                                    <p className="text-center text-gray-300 text-xs py-4 font-semibold">No events today</p>
                                ) : recentEvents.map((event) => (
                                    <div key={event.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 shadow-sm border border-violet-100/60">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-700 truncate">{event.title}</p>
                                            <p className="text-[10px] text-gray-400 truncate">{event.category || "General"}</p>
                                        </div>
                                        <div className="text-right shrink-0 ml-2">
                                            <p className="text-[10px] font-bold text-violet-600">{event.startTime || "All day"}</p>
                                            <p className="text-[10px] text-gray-400">{event.location || "No place"}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── Recent Expenses ── */}
                        <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-4 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-sm">
                                        <FiRepeat size={14} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-800">Expenses</p>
                                        <p className="text-[10px] text-gray-400">{recentExpenses.length} record{recentExpenses.length !== 1 ? "s" : ""}</p>
                                    </div>
                                </div>
                                <button onClick={() => navigate("/admin/expensive/all")} className="text-[10px] text-rose-500 font-bold hover:underline flex items-center gap-1">
                                    View All <FiArrowRight size={10} />
                                </button>
                            </div>
                            <div className="space-y-2">
                                {recentExpenses.length === 0 ? (
                                    <p className="text-center text-gray-300 text-xs py-4 font-semibold">No expense records today</p>
                                ) : recentExpenses.map((e) => (
                                    <div key={e.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 shadow-sm border border-rose-100/60">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-700 truncate">{e.title}</p>
                                            <p className="text-[10px] text-gray-400 truncate">{e.category || "—"}</p>
                                        </div>
                                        <div className="text-right shrink-0 ml-2">
                                            <p className="text-xs font-black text-rose-600">₹{Number(e.expense_amount || 0).toLocaleString("en-IN")}</p>
                                            <p className="text-[10px] text-gray-400">{e.payment_method || "Cash"}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {recentExpenses.length > 0 && (
                                <div className="bg-white rounded-lg px-3 py-2 border border-rose-100 flex items-center justify-between mt-auto">
                                    <span className="text-[10px] text-gray-400 font-semibold">Total Spent</span>
                                    <span className="text-xs font-black text-rose-600">
                                        ₹{recentExpenses.reduce((s, e) => s + Number(e.expense_amount || 0), 0).toLocaleString("en-IN")}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* ── Recent Transfers ── */}
                        <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-sm">
                                        <FiSend size={14} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-800">Transfers</p>
                                        <p className="text-[10px] text-gray-400">{recentTransfers.length} record{recentTransfers.length !== 1 ? "s" : ""}</p>
                                    </div>
                                </div>
                                <button onClick={() => navigate("/admin/more/transfer")} className="text-[10px] text-blue-500 font-bold hover:underline flex items-center gap-1">
                                    View All <FiArrowRight size={10} />
                                </button>
                            </div>
                            <div className="space-y-2">
                                {recentTransfers.length === 0 ? (
                                    <p className="text-center text-gray-300 text-xs py-4 font-semibold">No transfer records today</p>
                                ) : recentTransfers.map((t) => (
                                    <div key={t.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 shadow-sm border border-blue-100/60">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-700 truncate">{t.title}</p>
                                            <p className="text-[10px] text-gray-400 truncate">{t.category || "—"}</p>
                                        </div>
                                        <div className="text-right shrink-0 ml-2">
                                            <p className="text-xs font-black text-blue-600">₹{Number(t.amount || 0).toLocaleString("en-IN")}</p>
                                            <p className="text-[10px] text-emerald-500 font-semibold">Rem: ₹{Number(t.remaining_amount || 0).toLocaleString("en-IN")}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {recentTransfers.length > 0 && (
                                <div className="bg-white rounded-lg px-3 py-2 border border-blue-100 flex items-center justify-between mt-auto">
                                    <span className="text-[10px] text-gray-400 font-semibold">Total Transferred</span>
                                    <span className="text-xs font-black text-blue-600">
                                        ₹{recentTransfers.reduce((s, t) => s + Number(t.amount || 0), 0).toLocaleString("en-IN")}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* ── Recent Memories ── */}
                        <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-sm">
                                        <FiImage size={14} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-800">Memories</p>
                                        <p className="text-[10px] text-gray-400">{recentMemories.length} record{recentMemories.length !== 1 ? "s" : ""}</p>
                                    </div>
                                </div>
                                <button onClick={() => navigate("/admin/users/memories")} className="text-[10px] text-amber-500 font-bold hover:underline flex items-center gap-1">
                                    View All <FiArrowRight size={10} />
                                </button>
                            </div>
                            <div className="space-y-2">
                                {recentMemories.length === 0 ? (
                                    <p className="text-center text-gray-300 text-xs py-4 font-semibold">No memory records today</p>
                                ) : recentMemories.map((m) => (
                                    <div key={m.id} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 shadow-sm border border-amber-100/60">
                                        {m.thumbnail_url || m.cover_image ? (
                                            <img
                                                src={`${(import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "")}${m.thumbnail_url || m.cover_image}`}
                                                className="w-8 h-8 rounded-lg object-cover border border-amber-100 shrink-0"
                                                alt={m.title}
                                                onError={(ev) => { ev.currentTarget.style.display = "none"; }}
                                            />
                                        ) : (
                                            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                                                <FiImage size={14} className="text-amber-400" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-700 truncate">{m.title || "Untitled"}</p>
                                            <p className="text-[10px] text-gray-400 truncate">{m.category_name || m.location || "—"}</p>
                                        </div>
                                        {m.is_favorite && <span className="text-amber-400 text-sm shrink-0">★</span>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── Recent Diary Entries ── */}
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-sm">
                                        <FiBook size={14} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-800">My Diary</p>
                                        <p className="text-[10px] text-gray-400">{recentDiary.length} entr{recentDiary.length !== 1 ? "ies" : "y"}</p>
                                    </div>
                                </div>
                                <button onClick={() => navigate("/admin/users/diary")} className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-1">
                                    View All <FiArrowRight size={10} />
                                </button>
                            </div>
                            <div className="space-y-2">
                                {recentDiary.length === 0 ? (
                                    <p className="text-center text-gray-300 text-xs py-4 font-semibold">No diary entries today</p>
                                ) : recentDiary.map((d) => (
                                    <div key={d.id} className="bg-white rounded-lg px-3 py-2 shadow-sm border border-emerald-100/60">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <p className="text-xs font-bold text-slate-700 truncate flex-1">{d.title || "Untitled Entry"}</p>
                                            {d.mood && (
                                                <span className="text-sm ml-1 shrink-0">{
                                                    d.mood === "happy" ? "😊" :
                                                    d.mood === "sad" ? "😢" :
                                                    d.mood === "angry" ? "😠" :
                                                    d.mood === "excited" ? "🤩" :
                                                    d.mood === "anxious" ? "😰" : "📝"
                                                }</span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-gray-400 line-clamp-1">
                                            {d.content ? d.content.replace(/<[^>]*>/g, "").slice(0, 60) : d.category_name || "—"}
                                        </p>
                                        {d.tags && d.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {(Array.isArray(d.tags) ? d.tags : []).slice(0, 2).map((tag, ti) => (
                                                    <span key={ti} className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-600 font-semibold">#{tag}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                )}
            </div>

            {/* Middle Section: Charts & Low Stock */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Sales Overview Bar Chart */}
                <div className="lg:col-span-6 bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-slate-800">Expense Overview</h3>
                        <label className="flex items-center gap-2 text-xs text-gray-500 border border-gray-200 rounded px-2 py-1">
                            <FiClock />
                            <select
                                value={salesRange}
                                onChange={(event) => {
                                    const range = event.target.value;
                                    setSalesRange(range);
                                    fetchDashboardData(range);
                                }}
                                className="bg-transparent text-xs text-gray-600 outline-none cursor-pointer"
                            >
                                {salesRangeOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <div className="flex-1 min-h-[250px]">
                        <Bar data={barChartData} options={barChartOptions} />
                    </div>
                </div>

                {/* Category Overview Pie Chart */}
                <div className="lg:col-span-3 bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Category Overview</h3>
                    <div className="flex flex-col flex-1">
                        <div className="relative h-40 flex items-center justify-center mb-6">
                            <Doughnut data={doughnutData} options={doughnutOptions} />
                            <div className="absolute flex flex-col items-center">
                                <span className="text-xl font-bold text-slate-800">₹{totalCategoryValue.toLocaleString('en-IN')}</span>
                                <span className="text-xs text-gray-500">Total Spend</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {categoryStats.map((item, i) => (
                                <div key={i} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <div className="w-2 h-2 rounded" style={{ backgroundColor: item.color }}></div>
                                        {item.label}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-800">₹{item.amount.toLocaleString('en-IN')}</span>
                                        <span className="text-gray-400">({item.pct})</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Low Transfer Balance */}
                <div className="lg:col-span-3 bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-slate-800">Low Transfer Balance</h3>
                        <button onClick={() => navigate('/admin/more/transfer')} className="text-xs font-bold text-purple-600 hover:underline">View All</button>
                    </div>
                    <div className="flex-1 space-y-4 overflow-y-auto max-h-[300px]">
                        {lowStockAlerts.length > 0 ? lowStockAlerts.map((item, i) => (
                            <div key={item.id || i} className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-black shrink-0">
                                    {(item.name || 'T').charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                                    <p className="text-xs text-gray-500">Remaining: <span className="text-red-500 font-bold">₹{Number(item.remaining || item.stock || 0).toLocaleString('en-IN')}</span></p>
                                </div>
                                <span className="text-[10px] bg-red-50 text-red-500 px-2 py-1 rounded font-semibold whitespace-nowrap">Low</span>
                            </div>
                        )) : (
                            <p className="text-center text-gray-400 text-sm font-semibold py-8">No low transfer balances</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Section: Recent Orders & Top Selling */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Recent Orders */}
                <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-center mb-5">
                        <h3 className="text-base font-black text-slate-800">Recent Orders</h3>
                        <button onClick={() => navigate('/admin/orders/all')} className="text-xs font-bold text-purple-600 hover:underline">View All →</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-[11px] text-gray-400 uppercase tracking-wider border-b border-gray-100">
                                    <th className="pb-3 font-bold">Order ID</th>
                                    <th className="pb-3 font-bold">Customer</th>
                                    <th className="pb-3 font-bold">Date</th>
                                    <th className="pb-3 font-bold">Amount</th>
                                    <th className="pb-3 font-bold">Status</th>
                                    <th className="pb-3 font-bold text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {recentOrders && recentOrders.length > 0 ? recentOrders.map((order, i) => (
                                    <tr key={i} className="hover:bg-slate-50/60 transition-colors group">
                                        <td className="py-3 font-bold text-purple-600 text-xs">{order.id}</td>
                                        <td className="py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-black shrink-0">
                                                    {(order.customer || 'G').charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-semibold text-slate-800 text-xs truncate max-w-[100px]">{order.customer}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 text-gray-400 text-xs">{formatOrderDate(order.date)}</td>
                                        <td className="py-3 font-bold text-slate-800 text-xs">{order.amount}</td>
                                        <td className="py-3">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${getStatusStyle(order.status)}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="py-3 text-center">
                                            <button
                                                onClick={() => navigate(`/admin/orders/${order.id.replace('#ORD-0', '')}`)}
                                                className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mx-auto hover:bg-purple-600 hover:text-white transition-all"
                                            >
                                                <FiEye size={13} />
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="py-10 text-center text-gray-400 text-sm font-semibold">No recent orders found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Top Expense Categories */}
                <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-center mb-5">
                        <h3 className="text-base font-black text-slate-800">Top Expense Categories</h3>
                        <button onClick={() => navigate('/admin/expensive/category')} className="text-xs font-bold text-purple-600 hover:underline">View All →</button>
                    </div>
                    <div className="space-y-3">
                        {topProducts && topProducts.length > 0 ? topProducts.map((item, i) => (
                            <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors group">
                                <div className="relative shrink-0">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center font-black text-xs">
                                        {item.label?.slice(0, 2).toUpperCase() || 'EX'}
                                    </div>
                                    <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white text-[9px] font-black flex items-center justify-center shadow">
                                        {i + 1}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-800 truncate">{item.label || item.name}</p>
                                    <p className="text-[10px] text-gray-400 font-medium">{item.count || 0} entries</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-black text-purple-600">₹{Number(item.value || item.sales || 0).toLocaleString('en-IN')}</p>
                                    <p className="text-[10px] text-gray-400">spent</p>
                                </div>
                            </div>
                        )) : (
                            <p className="text-center text-gray-400 text-sm font-semibold py-8">No expense data available</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
