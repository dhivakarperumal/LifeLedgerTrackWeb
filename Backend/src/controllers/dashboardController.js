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

exports.getDashboardData = async (req, res) => {
    try {
        const hasOrders = await tableExists("orders");
        const hasIncome = await tableExists("income");
        const hasExpenses = await tableExists("expenses");
        const hasUsers = await tableExists("users");
        const hasCategories = await tableExists("categories");
        const hasTransfers = await tableExists("transfers");

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

        const totalIncome = safeNumber(incomeResult.totalIncome || 0);
        const totalExpenses = safeNumber(expenseResult.totalExpenses || 0);
        const totalTransfers = safeNumber(transferResult.totalTransfers || 0);
        const totalCustomers = safeNumber(customerResult.totalCustomers || 0);
        const totalCategories = safeNumber(categoryResult.totalCategories || 0);

        const totalRevenue = hasOrders
            ? safeNumber(0)
            : totalIncome + totalTransfers;

        const netBalance = totalIncome - totalExpenses;
        const monthlyIncome = hasIncome ? totalIncome : 0;
        const monthlyExpenses = hasExpenses ? totalExpenses : 0;

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
                { label: "Net Balance", value: formatCurrency(netBalance), trend: "+ 0%", trendUp: true, icon: "saree" },
                { label: "Customers", value: totalCustomers.toLocaleString(), trend: "+ 0%", trendUp: true, icon: "users" },
                { label: "Categories", value: totalCategories.toLocaleString(), trend: "+ 0%", trendUp: true, icon: "tag" },
                { label: "Transactions", value: `${safeNumber(incomeResult.incomeCount || 0) + safeNumber(expenseResult.expenseCount || 0)}`.toString(), trend: "+ 0%", trendUp: true, icon: "truck" },
                { label: "Transfers", value: formatCurrency(totalTransfers), trend: "+ 0%", trendUp: true, icon: "pending" },
                { label: "Monthly Budget", value: formatCurrency(monthlyIncome - monthlyExpenses), trend: "- 0%", trendUp: false, icon: "offer" }
            ],
            orderStatusCounts,
            recentOrders: [],
            topProducts: [],
            lowStockAlerts: [],
            categoryAnalytics: [],
            regionalSales: [],
            revenueTrends: []
        };

        res.json(dashboardData);
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
};
