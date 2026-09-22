const db = require("../config/db");

const safeNumber = (value, fallback = 0) => {
    const num = Number(value ?? fallback);
    return Number.isFinite(num) ? num : fallback;
};

const formatCurrency = (value) => `₹${safeNumber(value).toLocaleString("en-IN")}`;

const tableExists = async (tableName) => {
    try {
        const [rows] = await db.query(
            "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?",
            [tableName]
        );
        return rows.length > 0;
    } catch (error) {
        return false;
    }
};

const getLastMonthsExpenseTrend = async (hasExpenses) => {
    if (!hasExpenses) {
        return [];
    }

    const [rows] = await db.query(
        `SELECT DATE_FORMAT(expense_date, '%Y-%m') AS month,
                COALESCE(SUM(expense_amount), 0) AS total
         FROM expenses
         WHERE expense_date >= DATE_SUB(CURDATE(), INTERVAL 11 MONTH)
         GROUP BY DATE_FORMAT(expense_date, '%Y-%m')
         ORDER BY month ASC`
    );

    const monthlyMap = new Map(rows.map((row) => [row.month, safeNumber(row.total, 0)]));
    const trend = [];
    const today = new Date();

    for (let i = 11; i >= 0; i -= 1) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const monthLabel = date.toLocaleDateString("en-US", { month: "short" });
        trend.push({
            month: monthLabel,
            revenue: monthlyMap.get(monthKey) || 0,
            total: monthlyMap.get(monthKey) || 0,
        });
    }

    return trend;
};

const getCategoryBreakdown = async (hasExpenses) => {
    if (!hasExpenses) {
        return [];
    }

    const [rows] = await db.query(
        `SELECT category,
                COALESCE(SUM(expense_amount), 0) AS totalAmount,
                COUNT(*) AS count
         FROM expenses
         GROUP BY category
         ORDER BY totalAmount DESC
         LIMIT 6`
    );

    return rows.map((row) => ({
        label: row.category || "Uncategorized",
        value: safeNumber(row.totalAmount, 0),
        count: safeNumber(row.count, 0),
    }));
};

const getLowTransferAlerts = async (hasTransfers) => {
    if (!hasTransfers) {
        return [];
    }

    const [rows] = await db.query(
        `SELECT id,
                title,
                amount,
                remaining_amount,
                category,
                transfer_from,
                transfer_to
         FROM transfers
         WHERE remaining_amount IS NOT NULL
         ORDER BY remaining_amount ASC, amount DESC
         LIMIT 4`
    );

    return rows.map((row) => ({
        id: row.id,
        name: row.title || `${row.transfer_from || "Transfer"} → ${row.transfer_to || "Account"}`,
        category: row.category || "Transfer",
        amount: safeNumber(row.amount, 0),
        remaining: safeNumber(row.remaining_amount, 0),
        stock: safeNumber(row.remaining_amount, 0),
        img: null,
    }));
};

exports.getDashboardData = async (req, res) => {
    try {
        const hasOrders = await tableExists("orders");
        const hasIncome = await tableExists("income");
        const hasExpenses = await tableExists("expenses");
        const hasUsers = await tableExists("users");
        const hasCategories = await tableExists("categories");
        const hasTransfers = await tableExists("transfers");
        const hasMemories = await tableExists("memories");
        const hasDiary = await tableExists("diary_entries");

        const defaultUserCount = { totalCustomers: 0 };
        const defaultCategoryCount = { totalCategories: 0 };
        const defaultFinancial = { totalIncome: 0, totalExpenses: 0, incomeCount: 0, expenseCount: 0, totalTransfers: 0 };

        const [[customerResult]] = hasUsers
            ? await db.query("SELECT COUNT(*) AS totalCustomers FROM users")
            : [ [defaultUserCount] ];

        const [[categoryResult]] = hasCategories
            ? await db.query("SELECT COUNT(*) AS totalCategories FROM categories")
            : [ [defaultCategoryCount] ];

        const [[incomeResult]] = hasIncome
            ? await db.query("SELECT COALESCE(SUM(amount), 0) AS totalIncome, COUNT(*) AS incomeCount FROM income")
            : [ [defaultFinancial] ];

        const [[expenseResult]] = hasExpenses
            ? await db.query("SELECT COALESCE(SUM(expense_amount), 0) AS totalExpenses, COUNT(*) AS expenseCount FROM expenses")
            : [ [defaultFinancial] ];

        const [[transferResult]] = hasTransfers
            ? await db.query("SELECT COALESCE(SUM(amount), 0) AS totalTransfers FROM transfers")
            : [ [defaultFinancial] ];

        const [[memoriesResult]] = hasMemories
            ? await db.query("SELECT COUNT(*) AS totalMemories FROM memories")
            : [ [{ totalMemories: 0 }] ];

        const [[diaryResult]] = hasDiary
            ? await db.query("SELECT COUNT(*) AS totalDiary FROM diary_entries")
            : [ [{ totalDiary: 0 }] ];

        const totalIncome = safeNumber(incomeResult.totalIncome || 0);
        const totalExpenses = safeNumber(expenseResult.totalExpenses || 0);
        const totalTransfers = safeNumber(transferResult.totalTransfers || 0);
        const totalCustomers = safeNumber(customerResult.totalCustomers || 0);
        const totalCategories = safeNumber(categoryResult.totalCategories || 0);
        const totalMemories = safeNumber(memoriesResult.totalMemories || 0);
        const totalDiary = safeNumber(diaryResult.totalDiary || 0);

        const totalRevenue = hasOrders
            ? safeNumber(0)
            : totalIncome + totalTransfers;

        const netBalance = totalIncome - totalExpenses;
        const monthlyIncome = hasIncome ? totalIncome : 0;
        const monthlyExpenses = hasExpenses ? totalExpenses : 0;
        const monthlyExpenseTrends = await getLastMonthsExpenseTrend(hasExpenses);
        const categoryAnalytics = await getCategoryBreakdown(hasExpenses);
        const lowStockAlerts = await getLowTransferAlerts(hasTransfers);

        const orderStatusCounts = {
            "Order Placed": 0,
            Confirmed: 0,
            Packed: 0,
            Shipped: 0,
            Delivered: 0,
            Cancelled: 0,
        };

        const dashboardData = {
            stats: [
                { label: "Total Income", value: formatCurrency(totalIncome), trend: "+ 0%", trendUp: true, icon: "rupee" },
                { label: "Total Expenses", value: formatCurrency(totalExpenses), trend: "- 0%", trendUp: false, icon: "bag" },
                { label: "Total Memories", value: totalMemories.toLocaleString(), trend: "+ 0%", trendUp: true, icon: "memories" },
                { label: "Total Diary", value: totalDiary.toLocaleString(), trend: "+ 0%", trendUp: true, icon: "diary" },
                { label: "Categories", value: totalCategories.toLocaleString(), trend: "+ 0%", trendUp: true, icon: "tag" },
                { label: "Transactions", value: `${safeNumber(incomeResult.incomeCount || 0) + safeNumber(expenseResult.expenseCount || 0)}`.toString(), trend: "+ 0%", trendUp: true, icon: "truck" },
                { label: "Transfers", value: formatCurrency(totalTransfers), trend: "+ 0%", trendUp: true, icon: "pending" },
                { label: "Monthly Budget", value: formatCurrency(monthlyIncome - monthlyExpenses), trend: "- 0%", trendUp: false, icon: "offer" }
            ],
            orderStatusCounts,
            recentOrders: [],
            topProducts: categoryAnalytics,
            lowStockAlerts,
            categoryAnalytics,
            regionalSales: [],
            revenueTrends: monthlyExpenseTrends
        };

        res.json(dashboardData);
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
};
