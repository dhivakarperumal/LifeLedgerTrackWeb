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

const isValidDateKey = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const getDateCondition = (dateColumn, startDate, endDate) => {
    const conditions = [];
    const params = [];
    if (startDate) {
        conditions.push(`${dateColumn} >= ?`);
        params.push(startDate);
    }
    if (endDate) {
        conditions.push(`${dateColumn} < DATE_ADD(?, INTERVAL 1 DAY)`);
        params.push(endDate);
    }
    return { clause: conditions.join(" AND "), params };
};

const getExpenseTrend = async (hasExpenses, userId, range, startDate, endDate) => {
    if (!hasExpenses) {
        return [];
    }

    const dateCondition = getDateCondition("expense_date", startDate, endDate);
    const whereClause = [dateCondition.clause, userId ? "user_id = ?" : ""].filter(Boolean).join(" AND ");
    const groupFormat = range === "All" ? "%Y-%m" : "%Y-%m-%d";
    const labelFormat = range === "All" ? "%b %Y" : "%b %e";
    const query = `
        SELECT DATE_FORMAT(expense_date, '${labelFormat}') AS month,
               COALESCE(SUM(expense_amount), 0) AS total
        FROM expenses
        ${whereClause ? `WHERE ${whereClause}` : ""}
        GROUP BY DATE_FORMAT(expense_date, '${groupFormat}')
        ORDER BY MIN(expense_date) ASC
    `;

    const [rows] = await db.query(query, [
        ...dateCondition.params,
        ...(userId ? [userId] : []),
    ]);

    return rows.map((row) => ({
        month: row.month,
        revenue: safeNumber(row.total, 0),
        total: safeNumber(row.total, 0),
    }));
};

const getCategoryBreakdown = async (hasExpenses, userId, startDate, endDate) => {
    if (!hasExpenses) {
        return [];
    }

    const dateCondition = getDateCondition("expense_date", startDate, endDate);
    const whereClause = [dateCondition.clause, userId ? "user_id = ?" : ""].filter(Boolean).join(" AND ");
    const query = `
        SELECT category,
               COALESCE(SUM(expense_amount), 0) AS totalAmount,
               COUNT(*) AS count
        FROM expenses
        ${whereClause ? `WHERE ${whereClause}` : ""}
        GROUP BY category
        ORDER BY totalAmount DESC
        LIMIT 6
    `;

    const [rows] = await db.query(query, [
        ...dateCondition.params,
        ...(userId ? [userId] : []),
    ]);

    return rows.map((row) => ({
        label: row.category || "Uncategorized",
        value: safeNumber(row.totalAmount, 0),
        count: safeNumber(row.count, 0),
    }));
};

const getLowTransferAlerts = async (hasTransfers, userId) => {
    if (!hasTransfers) {
        return [];
    }

    const query = `
        SELECT id,
               title,
               amount,
               remaining_amount,
               category,
               transfer_from,
               transfer_to
        FROM transfers
        WHERE remaining_amount IS NOT NULL
          ${userId ? "AND user_id = ?" : ""}
        ORDER BY remaining_amount ASC, amount DESC
        LIMIT 4
    `;

    const [rows] = await db.query(query, userId ? [userId] : []);

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
        const range = typeof req.query.range === "string" ? req.query.range : "All";
        const startDate = req.query.startDate || "";
        const endDate = req.query.endDate || "";
        if ((startDate && !isValidDateKey(startDate)) || (endDate && !isValidDateKey(endDate))) {
            return res.status(400).json({ message: "Invalid dashboard date range" });
        }
        if (startDate && endDate && startDate > endDate) {
            return res.status(400).json({ message: "Dashboard start date must be on or before the end date" });
        }
        const currentUserId = req.user?.user_id || null;
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
            ? currentUserId
                ? await db.query("SELECT COUNT(*) AS totalCustomers FROM users WHERE user_id = ?", [currentUserId])
                : await db.query("SELECT COUNT(*) AS totalCustomers FROM users")
            : [[defaultUserCount]];

        const categoryDates = getDateCondition("created_at", startDate, endDate);
        const categoryConditions = [
            categoryDates.clause,
            currentUserId ? "(user_id = ? OR user_id IS NULL)" : "",
        ].filter(Boolean).join(" AND ");
        const [[categoryResult]] = hasCategories
            ? await db.query(
                `SELECT COUNT(*) AS totalCategories FROM categories ${categoryConditions ? `WHERE ${categoryConditions}` : ""}`,
                [...categoryDates.params, ...(currentUserId ? [currentUserId] : [])],
            )
            : [[defaultCategoryCount]];

        const incomeDates = getDateCondition("income_date", startDate, endDate);
        const incomeConditions = [incomeDates.clause, currentUserId ? "user_id = ?" : ""].filter(Boolean).join(" AND ");
        const [[incomeResult]] = hasIncome
            ? await db.query(
                `SELECT COALESCE(SUM(amount), 0) AS totalIncome, COUNT(*) AS incomeCount FROM income ${incomeConditions ? `WHERE ${incomeConditions}` : ""}`,
                [...incomeDates.params, ...(currentUserId ? [currentUserId] : [])],
            )
            : [[defaultFinancial]];

        const expenseDates = getDateCondition("expense_date", startDate, endDate);
        const expenseConditions = [expenseDates.clause, currentUserId ? "user_id = ?" : ""].filter(Boolean).join(" AND ");
        const [[expenseResult]] = hasExpenses
            ? await db.query(
                `SELECT COALESCE(SUM(expense_amount), 0) AS totalExpenses, COUNT(*) AS expenseCount FROM expenses ${expenseConditions ? `WHERE ${expenseConditions}` : ""}`,
                [...expenseDates.params, ...(currentUserId ? [currentUserId] : [])],
            )
            : [[defaultFinancial]];

        const transferDates = getDateCondition("transfer_date", startDate, endDate);
        const transferConditions = [transferDates.clause, currentUserId ? "user_id = ?" : ""].filter(Boolean).join(" AND ");
        const [[transferResult]] = hasTransfers
            ? await db.query(
                `SELECT COALESCE(SUM(amount), 0) AS totalTransfers FROM transfers ${transferConditions ? `WHERE ${transferConditions}` : ""}`,
                [...transferDates.params, ...(currentUserId ? [currentUserId] : [])],
            )
            : [[defaultFinancial]];

        const memoryDates = getDateCondition("memory_date", startDate, endDate);
        const memoryConditions = [memoryDates.clause, currentUserId ? "user_id = ?" : ""].filter(Boolean).join(" AND ");
        const [[memoriesResult]] = hasMemories
            ? await db.query(
                `SELECT COUNT(*) AS totalMemories FROM memories ${memoryConditions ? `WHERE ${memoryConditions}` : ""}`,
                [...memoryDates.params, ...(currentUserId ? [currentUserId] : [])],
            )
            : [[{ totalMemories: 0 }]];

        const diaryDates = getDateCondition("entry_date", startDate, endDate);
        const diaryConditions = [diaryDates.clause, currentUserId ? "user_id = ?" : ""].filter(Boolean).join(" AND ");
        const [[diaryResult]] = hasDiary
            ? await db.query(
                `SELECT COUNT(*) AS totalDiary FROM diary_entries ${diaryConditions ? `WHERE ${diaryConditions}` : ""}`,
                [...diaryDates.params, ...(currentUserId ? [currentUserId] : [])],
            )
            : [[{ totalDiary: 0 }]];

        const totalIncome = safeNumber(incomeResult.totalIncome || 0);
        const totalExpenses = safeNumber(expenseResult.totalExpenses || 0);
        const totalTransfers = safeNumber(transferResult.totalTransfers || 0);
        const totalCustomers = safeNumber(customerResult.totalCustomers || 0);
        const totalCategories = safeNumber(categoryResult.totalCategories || 0);
        const totalMemories = safeNumber(memoriesResult.totalMemories || 0);
        const totalDiary = safeNumber(diaryResult.totalDiary || 0);
        const expenseCount = safeNumber(expenseResult.expenseCount || 0);

        const totalRevenue = hasOrders
            ? safeNumber(0)
            : totalIncome + totalTransfers;

        const netBalance = totalIncome - totalExpenses;
        const monthlyIncome = hasIncome ? totalIncome : 0;
        const monthlyExpenses = hasExpenses ? totalExpenses : 0;
        const monthlyExpenseTrends = await getExpenseTrend(hasExpenses, currentUserId, range, startDate, endDate);
        const categoryAnalytics = await getCategoryBreakdown(hasExpenses, currentUserId, startDate, endDate);
        const lowStockAlerts = await getLowTransferAlerts(hasTransfers, currentUserId);

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
                { label: "Categories Created", value: totalCategories.toLocaleString(), trend: "+ 0%", trendUp: true, icon: "tag" },
                { label: "Expense Records", value: expenseCount.toLocaleString(), trend: "+ 0%", trendUp: false, icon: "today_expense" },
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
