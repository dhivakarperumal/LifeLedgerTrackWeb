const db = require("../config/db");

exports.getReportsData = async (req, res) => {
    try {
        // 1. Gross Profit
        const [[profitResult]] = await db.query(
            "SELECT SUM(total_amount) as grossProfit, COUNT(*) as deliveredOrders FROM orders WHERE status = 'Delivered'"
        );
        const grossProfit = profitResult.grossProfit || 0;
        const deliveredOrders = profitResult.deliveredOrders || 0;

        // 2. New Customers
        const [[customersResult]] = await db.query(
            "SELECT COUNT(*) as totalCustomers FROM users"
        );
        const newCustomers = customersResult.totalCustomers || 0;

        // 3. Avg Order Value
        const avgOrderValue = deliveredOrders > 0 ? (grossProfit / deliveredOrders) : 0;

        // 4. Refund/Cancellation Rate
        const [[ordersCountResult]] = await db.query(
            "SELECT COUNT(*) as totalOrders, SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelledOrders FROM orders"
        );
        const totalOrders = ordersCountResult.totalOrders || 0;
        const cancelledOrders = ordersCountResult.cancelledOrders || 0;
        const refundRate = totalOrders > 0 ? ((cancelledOrders / totalOrders) * 100).toFixed(1) : 0;

        // 5. Sales Comparison (monthly for the last 12 months)
        // Simplified mapping relative to month index
        const [monthly] = await db.query(`
            SELECT 
                MONTH(created_at) as month,
                SUM(total_amount) as sales
            FROM orders
            WHERE status = 'Delivered' AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY MONTH(created_at)
        `);
        let monthlyData = new Array(12).fill(0);
        monthly.forEach(item => {
            let idx = item.month - 1;
            monthlyData[idx] = parseFloat(item.sales);
        });

        // 6. Category Distribution
        const [categoryData] = await db.query(`
            SELECT 
                p.category as name,
                SUM(oi.quantity * oi.price) as revenue
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.status = 'Delivered'
            GROUP BY p.category
        `);

        let totalCatRev = 0;
        categoryData.forEach(c => totalCatRev += Number(c.revenue));

        const colorMap = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-gray-300", "bg-indigo-500", "bg-purple-500"];
        const categories = categoryData.map((cat, index) => {
            const revNum = Number(cat.revenue);
            const percent = totalCatRev > 0 ? Math.round((revNum / totalCatRev) * 100) : 0;
            return {
                label: cat.name || 'General',
                percent: percent,
                color: colorMap[index % colorMap.length]
            };
        }).sort((a, b) => b.percent - a.percent).slice(0, 5); // top 5

        const reportsData = {
            stats: [
                { label: "Gross Profit", value: `₹${Number(grossProfit).toLocaleString()}`, trend: "+12.5%", color: "text-emerald-500" },
                { label: "New Customers", value: newCustomers.toLocaleString(), trend: "+8.2%", color: "text-blue-500" },
                { label: "Avg. Order Value", value: `₹${Number(avgOrderValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, trend: "-2.4%", color: "text-red-500" },
                { label: "Cancel Rate", value: `${refundRate}%`, trend: "-0.5%", color: "text-emerald-500" },
            ],
            monthlySales: monthlyData,
            categoryDistribution: categories.length > 0 ? categories : [
                { label: "No Data", percent: 100, color: "bg-gray-200" }
            ]
        };

        res.json(reportsData);

    } catch (error) {
        console.error("Error fetching reports data:", error);
        res.status(500).json({ message: "Failed to fetch reports data" });
    }
};
