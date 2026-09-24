import React, { useState, useEffect, useMemo } from "react";
import { jsPDF } from "jspdf";
import api from "../../api";
import { toast } from "react-hot-toast";
import {
    FiBarChart2, FiSearch, FiFilter, FiDownload,
    FiTrendingDown, FiSend, FiRepeat, FiCalendar,
    FiTag, FiCreditCard, FiRefreshCw, FiX, FiList, FiGrid,
    FiChevronDown, FiChevronLeft, FiChevronRight, FiCheckCircle, FiAlertCircle,
} from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";

/* ── helpers ──────────────────────────────────────────────────────────────── */
const fmt = (n) =>
    Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) => {
    if (!d) return "—";
    const dt = new Date(d);
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

/* ── badge colours ───────────────────────────────────────────────────────── */
const typeColors = {
    expense: "bg-rose-50 text-rose-600 border-rose-200",
    transfer: "bg-blue-50 text-blue-600 border-blue-200",
};

/* ── main component ───────────────────────────────────────────────────────── */
const Reports = () => {
    /* data */
    const [expenses, setExpenses]   = useState([]);
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading]     = useState(true);

    /* filters */
    const [reportType, setReportType]       = useState("all");   // all | expense | transfer
    const [searchTerm, setSearchTerm]       = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [paymentFilter, setPaymentFilter] = useState("All");
    const [datePreset, setDatePreset]       = useState("All");
    const [dateFrom, setDateFrom]           = useState("");
    const [dateTo, setDateTo]               = useState("");
    const [viewMode, setViewMode]           = useState("table"); // table | grid
    const [currentPage, setCurrentPage]     = useState(1);

    /* ── fetch ────────────────────────────────────────────────────────────── */
    const fetchAll = async () => {
        setLoading(true);
        try {
            const [expRes, trfRes] = await Promise.all([
                api.get("/expenses"),
                api.get("/transfers"),
            ]);
            setExpenses(
                (expRes.data || []).map((e) => ({ ...e, _type: "expense", _date: e.expense_date }))
            );
            setTransfers(
                (trfRes.data || []).map((t) => ({ ...t, _type: "transfer", _date: t.transfer_date }))
            );
        } catch (err) {
            console.error(err);
            toast.error("Failed to load report data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    /* ── merged & filtered list ───────────────────────────────────────────── */
    const allRecords = useMemo(() => {
        const exp = reportType === "transfer" ? [] : expenses;
        const trf = reportType === "expense"  ? [] : transfers;
        return [...exp, ...trf].sort((a, b) => new Date(b._date) - new Date(a._date));
    }, [expenses, transfers, reportType]);

    /* unique categories & payment methods */
    const categories = useMemo(() => {
        const set = new Set(allRecords.map((r) => r.category).filter(Boolean));
        return ["All", ...Array.from(set).sort()];
    }, [allRecords]);

    const paymentMethods = useMemo(() => {
        const set = new Set(
            allRecords.map((r) => r.payment_method || r.paymentMethod).filter(Boolean)
        );
        return ["All", ...Array.from(set).sort()];
    }, [allRecords]);

    const getDateRange = (preset, from, to) => {
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        if (preset === "Custom Range") {
            return {
                from: from ? new Date(from) : null,
                to: to ? new Date(`${to}T23:59:59`) : null,
            };
        }

        if (preset === "All") {
            return { from: null, to: null };
        }

        if (preset === "Today") {
            return {
                from: startOfToday,
                to: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1),
            };
        }

        if (preset === "Yesterday") {
            const start = new Date(startOfToday);
            start.setDate(start.getDate() - 1);
            const end = new Date(start);
            end.setHours(23, 59, 59, 999);
            return { from: start, to: end };
        }

        if (preset === "This Week") {
            const day = startOfToday.getDay();
            const diffToMonday = (day === 0 ? -6 : 1) - day;
            const from = new Date(startOfToday);
            from.setDate(startOfToday.getDate() + diffToMonday);
            const to = new Date(from);
            to.setDate(from.getDate() + 6);
            to.setHours(23, 59, 59, 999);
            return { from, to };
        }

        if (preset === "Last Week") {
            const todayDate = startOfToday.getDate();
            const day = startOfToday.getDay();
            const diffToMonday = (day === 0 ? -6 : 1) - day;
            const currentWeekStart = new Date(startOfToday);
            currentWeekStart.setDate(todayDate + diffToMonday);

            const from = new Date(currentWeekStart);
            from.setDate(currentWeekStart.getDate() - 7);
            const to = new Date(from);
            to.setDate(from.getDate() + 6);
            to.setHours(23, 59, 59, 999);
            return { from, to };
        }

        if (preset === "This Month") {
            const from = new Date(today.getFullYear(), today.getMonth(), 1);
            const to = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
            return { from, to };
        }

        if (preset === "Last Month") {
            const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const to = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
            return { from, to };
        }

        if (preset === "This Year") {
            const from = new Date(today.getFullYear(), 0, 1);
            const to = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
            return { from, to };
        }

        if (preset === "Last Year") {
            const from = new Date(today.getFullYear() - 1, 0, 1);
            const to = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
            return { from, to };
        }

        return { from: null, to: null };
    };

    const activeDateRange = useMemo(() => getDateRange(datePreset, dateFrom, dateTo), [datePreset, dateFrom, dateTo]);

    const visible = useMemo(() => {
        const q = searchTerm.toLowerCase();
        return allRecords.filter((r) => {
            const payment = r.payment_method || r.paymentMethod || "";
            const amount  = r._type === "expense" ? r.expense_amount : r.amount;

            const matchSearch =
                (r.title  || "").toLowerCase().includes(q) ||
                (r.category || "").toLowerCase().includes(q) ||
                (r.notes  || "").toLowerCase().includes(q) ||
                String(amount || "").includes(q);

            const matchCat     = categoryFilter === "All" || r.category === categoryFilter;
            const matchPayment = paymentFilter  === "All" || payment === paymentFilter;

            const rDate = r._date ? new Date(r._date) : null;
            const matchFrom = !activeDateRange.from || (rDate && rDate >= activeDateRange.from);
            const matchTo   = !activeDateRange.to || (rDate && rDate <= activeDateRange.to);

            return matchSearch && matchCat && matchPayment && matchFrom && matchTo;
        });
    }, [allRecords, searchTerm, categoryFilter, paymentFilter, activeDateRange]);

    useEffect(() => {
        setCurrentPage(1);
    }, [reportType, searchTerm, categoryFilter, paymentFilter, datePreset, dateFrom, dateTo]);

    const pageSize = 10;
    const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const paginatedRecords = visible.slice(
        (safeCurrentPage - 1) * pageSize,
        safeCurrentPage * pageSize,
    );

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    /* ── summary stats (from visible rows) ───────────────────────────────── */
    const stats = useMemo(() => {
        const expRows = visible.filter((r) => r._type === "expense");
        const trfRows = visible.filter((r) => r._type === "transfer");
        return {
            totalRecords:   visible.length,
            totalExpense:   expRows.reduce((s, r) => s + Number(r.expense_amount || 0), 0),
            totalTransfer:  trfRows.reduce((s, r) => s + Number(r.amount        || 0), 0),
            totalRemaining: trfRows.reduce((s, r) => s + Number(r.remaining_amount || 0), 0),
            expCount:       expRows.length,
            trfCount:       trfRows.length,
            recurring:      expRows.filter((r) => r.recurring === "Yes").length,
        };
    }, [visible]);

    /* ── reset filters ────────────────────────────────────────────────────── */
    const resetFilters = () => {
        setSearchTerm("");
        setCategoryFilter("All");
        setPaymentFilter("All");
        setDatePreset("All");
        setDateFrom("");
        setDateTo("");
        setReportType("all");
    };

    /* ── PDF export helpers ───────────────────────────────────────────────── */
    const generatePdfBlob = () => {
        const doc = new jsPDF({ unit: "pt", format: "a4" });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const fileName = `life-ledger-report-${new Date().toISOString().split("T")[0]}.pdf`;

        const greenLight = [208, 224, 197];
        const greenMid = [160, 195, 145];
        const greenDark = [59, 110, 76];
        const textDark = [31, 42, 55];
        const softBg = [246, 248, 243];

        doc.setFillColor(...softBg);
        doc.rect(0, 0, pageWidth, pageHeight, "F");

        const drawRoundedCard = (x, y, w, h, fillColor = [255, 255, 255], strokeColor = [220, 228, 221], radius = 12) => {
            doc.setFillColor(...fillColor);
            doc.setDrawColor(...strokeColor);
            doc.setLineWidth(1);
            doc.roundedRect(x, y, w, h, radius, radius, "FD");
        };

        const drawPieSlice = (cx, cy, radius, startAngle, endAngle, fillColor) => {
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;
            const startX = cx + radius * Math.cos(startRad);
            const startY = cy + radius * Math.sin(startRad);
            const endX = cx + radius * Math.cos(endRad);
            const endY = cy + radius * Math.sin(endRad);
            const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
            const slicePath = `M ${cx} ${cy} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;

            doc.setFillColor(...fillColor);
            doc.path(slicePath).fill();
        };

        const drawHeader = () => {
            doc.setFillColor(...greenMid);
            doc.rect(0, 0, pageWidth, 90, "F");
            doc.setFillColor(...greenLight);
            doc.path("M0 90 C120 86, 220 94, 300 88 S490 88, 595 94 L595 112 L0 112 Z").fill();

            doc.setFont("helvetica", "bold");
            doc.setTextColor(35, 60, 42);
            doc.setFontSize(30);
            doc.text("Life Ledger", 30, 58);

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(50, 80, 65);
            doc.text("Expense Management • Memories • Diary", 34, 78);

            doc.setFont("helvetica", "bold");
            doc.setTextColor(35, 60, 42);
            doc.setFontSize(31);
            doc.text("Expense Report", 255, 58);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);
            doc.setTextColor(50, 80, 65);
            doc.text(`01 Sep 2026 - 30 Sep 2026`, 255, 82);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(65, 86, 71);
            doc.text("Generated On", 485, 22);
            doc.text("24 Sep 2026", 485, 36);
            doc.text("User", 485, 54);
            doc.text("Dhivakar P", 485, 68);

            doc.setDrawColor(130, 167, 120);
            doc.setLineWidth(1.2);
            doc.line(0, 95, pageWidth, 95);
        };

        const otherSummaryCards = [];
        const metrics = [
            { label: "Total Expenses", value: `₹${fmt(stats.totalExpense)}`, sub: "↑ 12% from last month" },
            { label: "Average Daily Expense", value: `₹${fmt(stats.totalExpense / Math.max(visible.length || 1, 1))}`, sub: "↓ 8% from last month" },
            { label: "Total Categories", value: String(new Set(visible.map((r) => r.category).filter(Boolean)).size || 0), sub: "2 new categories" },
            { label: "Highest Expense", value: `₹${fmt(Math.max(...visible.map((r) => Number(r.expense_amount || 0)), 0))}`, sub: "Travel (24 Sep 2026)" },
        ];

        drawHeader();

        let currentY = 108;
        const cardWidth = (pageWidth - 80) / 4;
        const cardHeight = 74;

        metrics.forEach((item, index) => {
            const x = 28 + index * cardWidth;
            drawRoundedCard(x, currentY, cardWidth - 12, cardHeight, [255, 255, 255], [214, 225, 206], 10);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(64, 88, 77);
            doc.text(item.label, x + 14, currentY + 22);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(26);
            doc.setTextColor(31, 42, 55);
            doc.text(item.value, x + 14, currentY + 48);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(95, 138, 94);
            doc.text(item.sub, x + 14, currentY + 64);
        });

        currentY += 92;

        const leftChartW = 180;
        const centerChartW = 220;
        const rightChartW = 160;

        const chartCards = [
            { title: "Category Wise Expense", x: 28, y: currentY, w: leftChartW, h: 170 },
            { title: "Monthly Expense Trend", x: 220, y: currentY, w: centerChartW, h: 170 },
            { title: "Payment Method", x: 450, y: currentY, w: rightChartW, h: 170 },
        ];

        chartCards.forEach((card) => {
            drawRoundedCard(card.x, card.y, card.w, card.h, [255, 255, 255], [214, 225, 206], 12);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setTextColor(41, 52, 44);
            doc.text(card.title, card.x + 12, card.y + 18);
        });

        const expenseRows = (visible || []).filter((r) => r._type === "expense");
        const totalExpenseAmount = expenseRows.reduce((sum, row) => sum + Number(row.expense_amount || 0), 0);

        const categoryMap = {};
        expenseRows.forEach((row) => {
            const category = row.category || "Uncategorized";
            categoryMap[category] = (categoryMap[category] || 0) + Number(row.expense_amount || 0);
        });

        const categoryData = Object.entries(categoryMap)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 7)
            .map(([name, amount]) => ({
                name,
                value: totalExpenseAmount ? Math.max(1, Math.round((amount / totalExpenseAmount) * 100)) : 0,
                amount,
            }));

        const pieCenterX = 110;
        const pieCenterY = currentY + 118;
        const pieRadius = 42;
        let startAngle = -90;
        const pieColors = [
            [112, 156, 102], [133, 176, 126], [179, 196, 102], [171, 190, 167], [86, 129, 94], [155, 173, 93], [128, 140, 130],
        ];
        categoryData.forEach((item, index) => {
            const endAngle = startAngle + (item.value / 100) * 360;
            drawPieSlice(pieCenterX, pieCenterY, pieRadius, startAngle, endAngle, pieColors[index]);
            startAngle = endAngle;
        });
        doc.setFillColor(255, 255, 255);
        doc.circle(pieCenterX, pieCenterY, 22, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(39, 42, 55);
        doc.text(`₹${fmt(stats.totalExpense)}`, pieCenterX - 26, pieCenterY - 2);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(92, 92, 92);
        doc.text("Total", pieCenterX - 12, pieCenterY + 10);

        categoryData.forEach((item, index) => {
            const yPos = currentY + 28 + index * 16;
            doc.setFillColor(...pieColors[index]);
            doc.roundedRect(28, yPos, 8, 8, 2, 2, "F");
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(36, 54, 44);
            doc.text(item.name, 42, yPos + 7);
            doc.text(`${item.value}%`, 116, yPos + 7);
        });

        const monthlyMap = {};
        expenseRows.forEach((row) => {
            if (!row._date) return;
            const date = new Date(row._date);
            const label = date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
            const key = label;
            monthlyMap[key] = (monthlyMap[key] || 0) + Number(row.expense_amount || 0);
        });

        const monthLabels = Object.keys(monthlyMap).slice(-5);
        const monthValues = monthLabels.map((label) => Math.max(4, Math.round((monthlyMap[label] / Math.max(totalExpenseAmount, 1)) * 100 * 1.8)));
        const barX = 230;
        const barY = currentY + 110;
        const barWidth = 150;
        const barHeight = 50;
        doc.setDrawColor(200, 210, 198);
        doc.setLineWidth(0.5);
        doc.line(barX, barY + 45, barX + 150, barY + 45);
        monthValues.forEach((value, index) => {
            const x = barX + index * 30;
            const height = Math.max(10, value * 3.2);
            doc.setFillColor(...greenMid);
            doc.roundedRect(x, barY + 45 - height, 18, height, 3, 3, "F");
        });
        monthLabels.forEach((label, index) => {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.setTextColor(80, 90, 82);
            doc.text(label, barX + index * 30, barY + 58);
        });

        const paymentMap = {};
        (visible || []).forEach((row) => {
            const payment = row.payment_method || row.paymentMethod || "Other";
            paymentMap[payment] = (paymentMap[payment] || 0) + Number(row.expense_amount || row.amount || 0);
        });

        const paymentMethods = Object.entries(paymentMap)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([label, amount]) => ({
                label,
                value: totalExpenseAmount ? Math.max(4, Math.round((amount / totalExpenseAmount) * 100)) : 0,
                color: [110, 162, 94],
            }));

        const palette = [
            [110, 162, 94],
            [148, 170, 121],
            [176, 193, 122],
            [205, 217, 155],
            [170, 182, 157],
        ];
        paymentMethods.forEach((item, index) => {
            item.color = palette[index % palette.length];
        });

        const paymentCenterX = 530;
        const paymentCenterY = currentY + 118;
        let paymentStart = -90;
        paymentMethods.forEach((item) => {
            const end = paymentStart + (item.value / 100) * 360;
            drawPieSlice(paymentCenterX, paymentCenterY, 32, paymentStart, end, item.color);
            paymentStart = end;
        });
        doc.setFillColor(255, 255, 255);
        doc.circle(paymentCenterX, paymentCenterY, 13, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(39, 42, 55);
        doc.text(`₹${fmt(stats.totalExpense)}`, paymentCenterX - 18, paymentCenterY + 3);

        paymentMethods.forEach((item, index) => {
            const yPos = currentY + 24 + index * 18;
            doc.setFillColor(...item.color);
            doc.roundedRect(462, yPos, 8, 8, 2, 2, "F");
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(40, 50, 44);
            doc.text(item.label, 474, yPos + 7);
            doc.text(`${item.value}%`, 560, yPos + 7);
        });

        currentY += 185;

        const summaryTableY = currentY + 5;
        drawRoundedCard(28, summaryTableY, 540, 170, [255, 255, 255], [216, 224, 214], 14);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(41, 52, 44);
        doc.text("Category Wise Summary", 42, summaryTableY + 18);

        const tableHeaderY = summaryTableY + 30;
        doc.setFillColor(230, 236, 227);
        doc.rect(28, tableHeaderY, 540, 22, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(38, 46, 40);
        doc.text("#", 40, tableHeaderY + 15);
        doc.text("Category", 72, tableHeaderY + 15);
        doc.text("Transactions", 220, tableHeaderY + 15);
        doc.text("Amount (₹)", 330, tableHeaderY + 15);
        doc.text("Percentage", 450, tableHeaderY + 15);

        const summaryEntries = Object.entries(categoryMap)
            .sort(([, a], [, b]) => b - a)
            .map(([category, amount], index) => ({
                category,
                transactions: expenseRows.filter((row) => (row.category || "Uncategorized") === category).length,
                amount,
                pct: totalExpenseAmount ? Math.round((amount / totalExpenseAmount) * 100) : 0,
                index,
            }));

        summaryEntries.forEach((entry, index) => {
            const rowY = tableHeaderY + 22 + index * 18;
            doc.setDrawColor(220, 228, 220);
            doc.setLineWidth(0.5);
            doc.line(28, rowY + 18, 568, rowY + 18);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(42, 54, 44);
            doc.text(String(index + 1), 40, rowY + 14);
            doc.text(entry.category, 72, rowY + 14);
            doc.text(String(entry.transactions), 224, rowY + 14);
            doc.text(`₹${fmt(entry.amount)}`, 330, rowY + 14);
            doc.text(`${entry.pct}%`, 452, rowY + 14);
            doc.setFillColor(215, 224, 212);
            doc.rect(450, rowY + 4, 90, 8, "F");
            doc.setFillColor(90, 140, 100);
            doc.rect(450, rowY + 4, (entry.pct / 100) * 90, 8, "F");
        });

        doc.setFont("helvetica", "bold");
        doc.setTextColor(42, 54, 44);
        doc.text("Total", 72, tableHeaderY + 22 + summaryEntries.length * 18 + 14);
        doc.text(String(expenseRows.length), 224, tableHeaderY + 22 + summaryEntries.length * 18 + 14);
        doc.text(`₹${fmt(stats.totalExpense)}`, 330, tableHeaderY + 22 + summaryEntries.length * 18 + 14);
        doc.text("100%", 452, tableHeaderY + 22 + summaryEntries.length * 18 + 14);

        currentY += 190;

        drawRoundedCard(28, currentY, 540, 165, [255, 255, 255], [216, 224, 214], 14);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Detailed Transactions", 42, currentY + 18);

        const detailHeaderY = currentY + 28;
        doc.setFillColor(230, 236, 227);
        doc.rect(28, detailHeaderY, 540, 16, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.3);
        doc.setTextColor(38, 46, 40);
        doc.text("#", 36, detailHeaderY + 11);
        doc.text("Date", 62, detailHeaderY + 11);
        doc.text("Category", 112, detailHeaderY + 11);
        doc.text("From", 180, detailHeaderY + 11);
        doc.text("To", 245, detailHeaderY + 11);
        doc.text("Description", 295, detailHeaderY + 11);
        doc.text("Payment", 455, detailHeaderY + 11);
        doc.text("Amount (₹)", 510, detailHeaderY + 11);

        const liveDetailRows = (visible || []).slice(0, 10).map((row, index) => {
            const isExpense = row._type === "expense";
            const rowDate = row._date ? new Date(row._date) : null;
            const formattedDate = rowDate
                ? rowDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                : "—";
            const formattedTime = rowDate
                ? rowDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
                : "";
            const dateTimeText = formattedTime ? `${formattedDate}\n${formattedTime}` : formattedDate;

            return [
                String(index + 1),
                dateTimeText,
                row.category || "—",
                row.title || "—",
                row.notes || "—",
                row.payment_method || row.paymentMethod || "—",
                `₹${fmt(isExpense ? row.expense_amount : row.amount)}`,
            ];
        });

        liveDetailRows.forEach((row, index) => {
            const rowY = detailHeaderY + 18 + index * 14;
            doc.setDrawColor(220, 228, 220);
            doc.setLineWidth(0.4);
            doc.line(28, rowY + 10, 568, rowY + 10);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.6);
            doc.setTextColor(48, 54, 54);
            doc.text(row[0], 38, rowY + 8);
            doc.text(row[1].split("\n")[0], 62, rowY + 8);
            if (row[1].includes("\n")) {
                doc.text(row[1].split("\n")[1], 62, rowY + 14);
            }
            doc.text(row[2], 112, rowY + 8);
            doc.text(row[3], 180, rowY + 8);
            doc.text(row[4], 245, rowY + 8);
            doc.text(row[5], 455, rowY + 8);
            doc.text(row[6], 510, rowY + 8);
        });

        doc.setDrawColor(130, 167, 120);
        doc.setLineWidth(1.2);
        doc.line(0, 720, pageWidth, 720);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(24);
        doc.setTextColor(60, 97, 70);
        doc.text("Life Ledger", 28, 750);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(88, 104, 90);
        doc.text("Expense Management • Memories • Diary", 28, 766);

        doc.setFont("helvetica", "italic");
        doc.text("“Track Today • Plan Tomorrow • Live Better”", 245, 752);

        doc.setFont("helvetica", "normal");
        doc.text("Page 1 of 2", 510, 760);

        return { blob: doc.output("blob"), fileName };
    };

    const exportPDF = () => {
        if (!visible.length) {
            toast.error("No records available to export.");
            return;
        }

        const { blob, fileName } = generatePdfBlob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("PDF report downloaded!");
    };

    const sharePDF = async () => {
        if (!visible.length) {
            toast.error("No records available to share.");
            return;
        }

        try {
            const { blob, fileName } = generatePdfBlob();
            const file = new File([blob], fileName, { type: "application/pdf" });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: "Life Ledger Report",
                    text: "Generated report from Life Ledger.",
                    files: [file],
                });
                toast.success("Report shared successfully!");
                return;
            }

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("Report downloaded. Sharing is not supported in this browser.");
        } catch (error) {
            console.error(error);
            toast.error("Unable to share the PDF right now.");
        }
    };

    /* ── CSV export ───────────────────────────────────────────────────────── */
    const exportCSV = () => {
        const headers = ["#", "Type", "Title", "Category", "Amount (₹)", "Payment Method", "Date", "Notes", "Recurring"];
        const rows = visible.map((r, i) => [
            i + 1,
            r._type === "expense" ? "Expense" : "Transfer",
            `"${(r.title || "").replace(/"/g, '""')}"`,
            r.category || "—",
            r._type === "expense" ? r.expense_amount : r.amount,
            r.payment_method || r.paymentMethod || "—",
            fmtDate(r._date),
            `"${(r.notes || "").replace(/"/g, '""')}"`,
            r._type === "expense" ? (r.recurring || "No") : "—",
        ]);
        const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href = url;
        a.download = `life-ledger-report-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Report exported!");
    };

    /* ═══════════════════════ RENDER ═══════════════════════════════════════ */
    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700 min-h-screen pb-20">

            {/* ── PAGE HEADER ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#240046] to-[#7b2cbf] flex items-center justify-center text-white shadow-lg shadow-purple-900/30">
                        <FiBarChart2 size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-800 leading-none">Reports</h1>
                        <p className="text-xs text-gray-400 font-medium mt-0.5">Expense &amp; Transfer event history with filters</p>
                    </div>
                </div>
                <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:flex-wrap">
                    <button
                        onClick={exportPDF}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/30 transition-all hover:from-violet-600 hover:to-purple-700 active:scale-95 md:w-auto"
                    >
                        <FiDownload size={15} /> Export PDF
                    </button>

                    <button
                        onClick={sharePDF}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:from-blue-600 hover:to-indigo-700 active:scale-95 md:w-auto"
                    >
                        <FiSend size={15} /> Share PDF
                    </button>

                    <button
                        onClick={exportCSV}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition-all hover:from-emerald-600 hover:to-teal-600 active:scale-95 md:w-auto"
                    >
                        <FiDownload size={15} /> Export CSV
                    </button>
                </div>
            </div>

            {/* ── STAT CARDS ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {[
                    { label: "Total Records",    value: stats.totalRecords,             icon: <FiList size={18} />,        gradient: "from-[#240046] to-[#7b2cbf]" },
                    { label: "Expenses",         value: stats.expCount,                 icon: <FiTrendingDown size={18} />, gradient: "from-rose-500 to-pink-500" },
                    { label: "Transfers",        value: stats.trfCount,                 icon: <FiSend size={18} />,        gradient: "from-blue-500 to-indigo-500" },
                    { label: "Total Spent",      value: `₹${fmt(stats.totalExpense)}`,  icon: <FaRupeeSign size={16} />,   gradient: "from-rose-400 to-rose-600" },
                    { label: "Total Transferred",value: `₹${fmt(stats.totalTransfer)}`, icon: <FiRepeat size={18} />,      gradient: "from-amber-400 to-orange-500" },
                    { label: "Remaining",        value: `₹${fmt(stats.totalRemaining)}`,icon: <FiCheckCircle size={18} />, gradient: "from-emerald-400 to-teal-500" },
                ].map((s, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-all min-w-0 min-h-[92px]">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-white shadow-sm shrink-0`}>
                            {s.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] text-gray-400 font-medium truncate">{s.label}</p>
                            <p className="mt-1 text-[1.05rem] font-black text-slate-800 leading-tight break-words">{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── FILTER BAR ── */}
            <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    {/* Search */}
                    <div className="relative w-full md:flex-1">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                        <input
                            type="text"
                            placeholder="Search by title, category, notes..."
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-[#7b2cbf] focus:bg-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex w-full items-center justify-between gap-2 md:w-auto">
                        {/* Report type tabs */}
                        <div className="flex flex-1 gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1 md:flex-none">
                            {[
                                { value: "all", label: "All" },
                                { value: "expense", label: "Expenses" },
                                { value: "transfer", label: "Transfers" },
                            ].map((t) => (
                                <button
                                    key={t.value}
                                    onClick={() => setReportType(t.value)}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                                        reportType === t.value
                                            ? "bg-white text-[#7b2cbf] shadow-sm"
                                            : "text-gray-400 hover:text-slate-600"
                                    }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {/* View mode */}
                        <div className="flex rounded-xl border border-gray-200 bg-gray-100 p-1">
                            <button onClick={() => setViewMode("table")} className={`rounded-lg p-2 transition-all ${viewMode === "table" ? "bg-white text-[#7b2cbf] shadow-sm" : "text-gray-400 hover:text-slate-600"}`}>
                                <FiList size={16} />
                            </button>
                            <button onClick={() => setViewMode("grid")} className={`rounded-lg p-2 transition-all ${viewMode === "grid" ? "bg-white text-[#7b2cbf] shadow-sm" : "text-gray-400 hover:text-slate-600"}`}>
                                <FiGrid size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Second row of filters */}
                <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-slate-600 outline-none transition-all hover:border-[#7b2cbf] cursor-pointer md:w-auto"
                    >
                        {categories.map((c) => <option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>)}
                    </select>

                    <select
                        value={paymentFilter}
                        onChange={(e) => setPaymentFilter(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-slate-600 outline-none transition-all hover:border-[#7b2cbf] cursor-pointer md:w-auto"
                    >
                        {paymentMethods.map((m) => <option key={m} value={m}>{m === "All" ? "All Payment Methods" : m}</option>)}
                    </select>

                    <select
                        value={datePreset}
                        onChange={(e) => {
                            const nextPreset = e.target.value;
                            setDatePreset(nextPreset);
                            if (nextPreset !== "Custom Range") {
                                setDateFrom("");
                                setDateTo("");
                            }
                        }}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-slate-600 outline-none transition-all hover:border-[#7b2cbf] cursor-pointer md:w-auto"
                    >
                        {[
                            "All",
                            "Today",
                            "Yesterday",
                            "This Week",
                            "Last Week",
                            "This Month",
                            "Last Month",
                            "This Year",
                            "Last Year",
                            "Custom Range",
                        ].map((preset) => (
                            <option key={preset} value={preset}>{preset}</option>
                        ))}
                    </select>

                    {datePreset === "Custom Range" && (
                        <>
                            <div className="flex w-full items-center gap-2 md:w-auto">
                                <label className="whitespace-nowrap text-xs font-medium text-gray-400">From</label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => {
                                        setDateFrom(e.target.value);
                                        setDatePreset("Custom Range");
                                    }}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-slate-600 outline-none transition-all focus:border-[#7b2cbf] md:w-auto"
                                />
                            </div>

                            <div className="flex w-full items-center gap-2 md:w-auto">
                                <label className="whitespace-nowrap text-xs font-medium text-gray-400">To</label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => {
                                        setDateTo(e.target.value);
                                        setDatePreset("Custom Range");
                                    }}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-slate-600 outline-none transition-all focus:border-[#7b2cbf] md:w-auto"
                                />
                            </div>
                        </>
                    )}

                    {/* Reset */}
                    {(searchTerm || categoryFilter !== "All" || paymentFilter !== "All" || datePreset !== "All" || dateFrom || dateTo || reportType !== "all") && (
                        <button
                            onClick={resetFilters}
                            className="flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-500 transition-all hover:bg-red-100"
                        >
                            <FiX size={13} /> Reset Filters
                        </button>
                    )}

                    <span className="ml-0 text-right text-xs font-medium text-gray-400 md:ml-auto">
                        Showing <span className="font-bold text-slate-700">{visible.length}</span> records
                    </span>
                </div>
            </div>

            {/* ── CONTENT ── */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="w-10 h-10 border-4 border-[#7b2cbf]/20 border-t-[#7b2cbf] rounded-full animate-spin mb-4" />
                    <p className="text-gray-400 font-bold text-sm">Loading report data...</p>
                </div>
            ) : visible.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <FiAlertCircle size={40} className="text-gray-300 mb-3" />
                    <p className="text-gray-400 font-bold text-sm">No records found</p>
                    <p className="text-gray-300 text-xs mt-1">Try adjusting your filters</p>
                </div>
            ) : viewMode === "table" ? (

                /* ═══════════════ TABLE VIEW ═══════════════ */
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-gradient-to-r from-[#1F0A3C] to-[#3c096c]">
                                    {["S No", "Type", "Title", "Category", "Amount", "Payment", "Date", "Recurring / Remaining", "Notes"].map((h) => (
                                        <th key={h} className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {paginatedRecords.map((r, i) => {
                                    const isExp    = r._type === "expense";
                                    const amount   = isExp ? r.expense_amount : r.amount;
                                    const payment  = r.payment_method || r.paymentMethod || "—";

                                    return (
                                        <tr key={`${r._type}-${r.id}`} className="hover:bg-[#240046]/5 transition-colors">
                                            <td className="px-4 py-3.5 text-gray-500 font-medium text-xs">{(safeCurrentPage - 1) * pageSize + i + 1}</td>

                                            {/* Type badge */}
                                            <td className="px-4 py-3.5">
                                                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${typeColors[r._type]}`}>
                                                    {isExp ? "Expense" : "Transfer"}
                                                </span>
                                            </td>

                                            {/* Title */}
                                            <td className="px-4 py-3.5">
                                                <p className="font-bold text-slate-800 max-w-[160px] truncate">{r.title}</p>
                                            </td>

                                            {/* Category */}
                                            <td className="px-4 py-3.5">
                                                {r.category
                                                    ? <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#240046]/10 text-[#7b2cbf] border border-[#7b2cbf]/20">{r.category}</span>
                                                    : <span className="text-gray-300 text-xs">—</span>
                                                }
                                            </td>

                                            {/* Amount */}
                                            <td className="px-4 py-3.5">
                                                <p className={`font-black ${isExp ? "text-rose-600" : "text-blue-600"}`}>
                                                    ₹{fmt(amount)}
                                                </p>
                                            </td>

                                            {/* Payment Method */}
                                            <td className="px-4 py-3.5">
                                                <span className="px-2 py-1 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-600">{payment}</span>
                                            </td>

                                            {/* Date */}
                                            <td className="px-4 py-3.5 text-gray-600 font-medium text-xs whitespace-nowrap">
                                                {fmtDate(r._date)}
                                            </td>

                                            {/* Recurring / Remaining */}
                                            <td className="px-4 py-3.5">
                                                {isExp ? (
                                                    r.recurring === "Yes"
                                                        ? <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">Recurring</span>
                                                        : <span className="text-gray-300 text-xs">—</span>
                                                ) : (
                                                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${Number(r.remaining_amount) > 0 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-500 border-red-100"}`}>
                                                        ₹{fmt(r.remaining_amount)}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Notes */}
                                            <td className="px-4 py-3.5 text-gray-400 text-xs max-w-[160px] truncate">
                                                {r.notes || "—"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>

                            {/* Totals footer */}
                            <tfoot>
                                <tr className="bg-gradient-to-r from-[#1F0A3C]/5 to-[#3c096c]/5 border-t-2 border-[#1F0A3C]/10">
                                    <td colSpan={4} className="px-4 py-3 text-xs font-bold text-slate-600">
                                        Totals ({visible.length} records)
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="space-y-0.5">
                                            {stats.expCount > 0 && <p className="text-xs font-black text-rose-600">-₹{fmt(stats.totalExpense)}</p>}
                                            {stats.trfCount > 0 && <p className="text-xs font-black text-blue-600">₹{fmt(stats.totalTransfer)}</p>}
                                        </div>
                                    </td>
                                    <td colSpan={4} />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

            ) : (

                /* ═══════════════ GRID VIEW ═══════════════ */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {paginatedRecords.map((r) => {
                        const isExp   = r._type === "expense";
                        const amount  = isExp ? r.expense_amount : r.amount;
                        const payment = r.payment_method || r.paymentMethod || "—";

                        return (
                            <div
                                key={`${r._type}-${r.id}`}
                                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all flex flex-col gap-3"
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-800 truncate">{r.title}</p>
                                        <p className="text-[11px] text-gray-400 mt-0.5">{fmtDate(r._date)}</p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border shrink-0 ${typeColors[r._type]}`}>
                                        {isExp ? "Expense" : "Transfer"}
                                    </span>
                                </div>

                                {/* Amount */}
                                <div className={`text-2xl font-black ${isExp ? "text-rose-600" : "text-blue-600"}`}>
                                    ₹{fmt(amount)}
                                </div>

                                {/* Tags */}
                                <div className="flex flex-wrap gap-2">
                                    {r.category && (
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#240046]/10 text-[#7b2cbf] border border-[#7b2cbf]/20">
                                            {r.category}
                                        </span>
                                    )}
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 text-gray-600">
                                        {payment}
                                    </span>
                                    {isExp && r.recurring === "Yes" && (
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                            Recurring
                                        </span>
                                    )}
                                </div>

                                {/* Transfer remaining */}
                                {!isExp && (
                                    <div className="flex items-center justify-between border-t border-gray-50 pt-2">
                                        <span className="text-[11px] text-gray-400">Remaining</span>
                                        <span className={`text-sm font-black ${Number(r.remaining_amount) > 0 ? "text-emerald-600" : "text-red-500"}`}>
                                            ₹{fmt(r.remaining_amount)}
                                        </span>
                                    </div>
                                )}

                                {/* Notes */}
                                {r.notes && (
                                    <p className="text-[11px] text-gray-400 border-t border-gray-50 pt-2 line-clamp-2">{r.notes}</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {visible.length > 0 && (
                <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm md:flex-row">
                    <div className="text-sm text-slate-500">
                        Showing {Math.min((safeCurrentPage - 1) * pageSize + 1, visible.length)}-
                        {Math.min(safeCurrentPage * pageSize, visible.length)} of {visible.length}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                            disabled={safeCurrentPage === 1}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-violet-300 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Previous page"
                        >
                            <FiChevronLeft size={16} />
                        </button>

                        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                            <button
                                key={pageNumber}
                                type="button"
                                onClick={() => setCurrentPage(pageNumber)}
                                className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold transition ${
                                    safeCurrentPage === pageNumber
                                        ? "bg-gradient-to-r from-[#240046] to-[#7b2cbf] text-white shadow-md"
                                        : "border border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700"
                                }`}
                            >
                                {pageNumber}
                            </button>
                        ))}

                        <button
                            type="button"
                            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                            disabled={safeCurrentPage === totalPages}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-violet-300 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Next page"
                        >
                            <FiChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;
