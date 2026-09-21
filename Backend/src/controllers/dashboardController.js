const db = require("../config/db");

exports.getDashboardData = async (req, res) => {
    try {
        // 1. Total Revenue
        const [[revenueResult]] = await db.query(
            "SELECT SUM(total_amount) as totalRevenue FROM orders WHERE status = 'Delivered'"
        );
        const totalRevenue = revenueResult.totalRevenue || 0;

        // 2. Active Orders
        const [[activeOrdersResult]] = await db.query(
            "SELECT COUNT(*) as activeOrders FROM orders WHERE status IN ('Order Placed', 'Packing', 'Shipping', 'Out for Delivery')"
        );
        const activeOrders = activeOrdersResult.activeOrders || 0;

        // 3. New Customers (Total Users for now)
        const [[customersResult]] = await db.query(
            "SELECT COUNT(*) as totalCustomers FROM users"
        );
        const newCustomers = customersResult.totalCustomers || 0;

        // 4. Total Products
        const [[productsResult]] = await db.query(
            "SELECT COUNT(*) as totalProducts FROM products"
        );
        const totalProducts = productsResult.totalProducts || 0;

        // 5. Recent Orders
        const [recentOrders] = await db.query(`
            SELECT 
                o.id as orderIdStr, 
                oa.customer_name as customer, 
                GROUP_CONCAT(p.name SEPARATOR ', ') as product, 
                o.total_amount as amount, 
                o.status, 
                o.created_at as rawDate
            FROM orders o
            LEFT JOIN order_addresses oa ON o.id = oa.order_id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT 5
        `);

        // Format recent orders
        const formattedRecentOrders = recentOrders.map(order => ({
            id: `#ORD-0${order.orderIdStr}`,
            customer: order.customer || 'Guest',
            product: order.product || 'Product Removed',
            amount: `₹${parseFloat(order.amount || 0).toLocaleString()}`,
            status: order.status,
            date: order.rawDate instanceof Date
                ? order.rawDate.toISOString()
                : String(order.rawDate || '').replace(' ', 'T')
        }));

        // 6. Top Products
        const [topProducts] = await db.query(`
             SELECT 
                p.id,
                p.name, 
                p.category as cat, 
                SUM(oi.quantity) as sales,
                SUM(oi.quantity * oi.price) as total_rev,
                p.variants,
                p.images
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.status = 'Delivered'
            GROUP BY p.id
            ORDER BY sales DESC
            LIMIT 4
        `);

        const formattedTopProducts = topProducts.map(p => {
            let imgUrl = "https://via.placeholder.com/100";
            try {
                // Try variants first
                if (p.variants) {
                    const variants = typeof p.variants === 'string' ? JSON.parse(p.variants) : p.variants;
                    if (variants && variants.length > 0 && variants[0].images && variants[0].images.length > 0) {
                        imgUrl = variants[0].images[0] || imgUrl;
                    }
                }
                
                // Fallback to images column if still placeholder
                if (imgUrl.includes("placeholder") && p.images) {
                    const imagesArr = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
                    if (Array.isArray(imagesArr) && imagesArr.length > 0) {
                        imgUrl = imagesArr[0];
                    } else if (typeof imagesArr === 'string') {
                        imgUrl = imagesArr; // Direct path might be stored
                    }
                }
            } catch (e) { }

            return {
                name: p.name || "Deleted Product",
                cat: p.cat || 'General',
                sales: parseInt(p.sales || 0),
                rev: `₹${(p.total_rev / 1000).toFixed(1)}k`,
                grow: "+0%",
                img: imgUrl
            }
        });


        // 7. Low Stock Alerts
        const [lowStock] = await db.query(`
            SELECT id, name, category, total_stock as stock, variants, images
            FROM products
            WHERE total_stock < 10
            ORDER BY total_stock ASC
            LIMIT 4
        `);

        const formattedLowStock = lowStock.map(p => {
            let imgUrl = "https://via.placeholder.com/100";
            try {
                // Try variants first
                if (p.variants) {
                    const variants = typeof p.variants === 'string' ? JSON.parse(p.variants) : p.variants;
                    if (variants && variants.length > 0 && variants[0].images && variants[0].images.length > 0) {
                        imgUrl = variants[0].images[0] || imgUrl;
                    }
                }

                // Fallback to images column
                if (imgUrl.includes("placeholder") && p.images) {
                    const imagesArr = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
                    if (Array.isArray(imagesArr) && imagesArr.length > 0) {
                        imgUrl = imagesArr[0];
                    } else if (typeof imagesArr === 'string') {
                        imgUrl = imagesArr;
                    }
                }
            } catch (e) { }

            let colorStr = "text-amber-500";
            if (p.stock <= 3) colorStr = "text-red-500";
            else if (p.stock <= 7) colorStr = "text-amber-500";
            else colorStr = "text-amber-400";


            return {
                name: p.name,
                cat: p.category || 'General',
                stock: p.stock,
                color: colorStr,
                img: imgUrl
            }
        });

        // 8. Category Performance
        const [categoryData] = await db.query(`
            SELECT 
                p.category as name,
                COUNT(DISTINCT o.id) as orders_count,
                SUM(oi.quantity * oi.price) as revenue
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.status = 'Delivered'
            GROUP BY p.category
            ORDER BY revenue DESC
            LIMIT 4
        `);

        const colorMap = ["bg-blue-500", "bg-indigo-400", "bg-emerald-400", "bg-amber-400"];
        
        const formattedCategories = categoryData.map((cat, index) => {
            const revNum = Number(cat.revenue);
            // Calculate percentage relative to overall totalRevenue
            const pct = totalRevenue > 0 ? Math.round((revNum / totalRevenue) * 100) : 0;
            return {
                name: cat.name || 'General',
                items: `${cat.orders_count} orders`,
                rev: `₹${(revNum / 1000).toFixed(1)}k`,
                pct: pct,
                color: colorMap[index % colorMap.length]
            };
        });

        // 9. Regional Sales Geographic Data
        const [regionalData] = await db.query(`
            SELECT 
                state, 
                COUNT(*) as orders_count, 
                SUM(total_amount) as revenue
            FROM orders
            WHERE status != 'Cancelled' AND state IS NOT NULL AND state != ''
            GROUP BY state
            ORDER BY revenue DESC
            LIMIT 4
        `);

        const totalRegRev = regionalData.reduce((acc, curr) => acc + Number(curr.revenue), 0);
        const geoColors = ["bg-blue-500", "bg-indigo-400", "bg-blue-400", "bg-blue-300"];
        
        const formattedRegional = regionalData.map((reg, i) => ({
            state: reg.state,
            orders: reg.orders_count,
            rev: `₹${(Number(reg.revenue) / 1000).toFixed(1)}k`,
            pct: totalRegRev > 0 ? Math.round((Number(reg.revenue) / totalRegRev) * 100) : 0,
            color: geoColors[i % geoColors.length]
        }));

        // 10. Revenue Trends (This Week, This Month, or All Time)
        const requestedRange = ["week", "month", "all"].includes(req.query.range)
            ? req.query.range
            : "month";
        const rangeConfig = {
            week: {
                expression: "DATE_FORMAT(created_at, '%Y-%m-%d')",
                label: "DATE_FORMAT(created_at, '%a %d')",
                filter: "created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)",
                groupBy: "DATE(created_at)"
            },
            month: {
                expression: "DATE_FORMAT(created_at, '%Y-%m-%d')",
                label: "DATE_FORMAT(created_at, '%d %b')",
                filter: "created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')",
                groupBy: "DATE(created_at)"
            },
            all: {
                expression: "DATE_FORMAT(created_at, '%Y-%m-01')",
                label: "DATE_FORMAT(created_at, '%b %Y')",
                filter: "1 = 1",
                groupBy: "YEAR(created_at), MONTH(created_at)"
            }
        }[requestedRange];
        const [trendsData] = await db.query(`
            SELECT
                ${rangeConfig.expression} as period,
                ${rangeConfig.label} as month,
                SUM(total_amount) as revenue
            FROM orders
            WHERE status != 'Cancelled' AND ${rangeConfig.filter}
            GROUP BY ${rangeConfig.groupBy}
            ORDER BY period ASC
        `);

        const trendMap = new Map(trendsData.map(t => [
            String(t.period).slice(0, 10),
            Number(t.revenue || 0)
        ]));
        const now = new Date();
        const slotCount = requestedRange === "week"
            ? 7
            : requestedRange === "month"
                ? new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
                : 0;
        const formattedTrends = slotCount > 0
            ? Array.from({ length: slotCount }, (_, index) => {
                const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (slotCount - 1 - index));
                const key = [
                    date.getFullYear(),
                    String(date.getMonth() + 1).padStart(2, '0'),
                    String(date.getDate()).padStart(2, '0')
                ].join('-');
                return {
                    month: requestedRange === "week"
                        ? date.toLocaleString('en-US', { weekday: 'short' })
                        : date.getDate().toString().padStart(2, '0'),
                    revenue: trendMap.get(key) || 0
                };
            })
            : trendsData.map(t => ({ month: t.month, revenue: Number(t.revenue || 0) }));

        // 7. Low Stock Alerts
        const [[lowStockCountResult]] = await db.query(
            "SELECT COUNT(*) as lowStockCount FROM products WHERE total_stock < 10"
        );
        const lowStockCount = lowStockCountResult.lowStockCount || 0;

        // Extra real stats
        const today = new Date().toISOString().split('T')[0];

        const [[todayOrdersResult]] = await db.query(
            "SELECT COUNT(*) as cnt FROM orders WHERE DATE(created_at) = ?", [today]
        );
        const todayOrders = todayOrdersResult.cnt || 0;

        const [[pendingResult]] = await db.query(
            "SELECT COUNT(*) as cnt FROM orders WHERE status = 'Order Placed'"
        );
        const pendingOrders = pendingResult.cnt || 0;

        const [[deliveredResult]] = await db.query(
            "SELECT COUNT(*) as cnt FROM orders WHERE status = 'Delivered'"
        );
        const deliveredOrders = deliveredResult.cnt || 0;

        const [[activeOffersResult]] = await db.query(
            "SELECT COUNT(*) as cnt FROM offers WHERE status = 'active'"
        ).catch(() => [[{ cnt: 0 }]]);
        const activeOffers = activeOffersResult.cnt || 0;

        // Order status breakdown for doughnut chart
        const [orderStatusCounts] = await db.query(`
            SELECT status, COUNT(*) as cnt
            FROM orders
            GROUP BY status
        `);
        const statusMap = {};
        orderStatusCounts.forEach(r => { statusMap[r.status] = r.cnt; });

        // Construct the final response object
        const dashboardData = {
            stats: [
                { label: "Total Sarees",       value: totalProducts.toLocaleString(),   trend: "+ 12.5%", trendUp: true,  icon: "saree" },
                { label: "Today's Orders",     value: todayOrders.toLocaleString(),     trend: "+ 8.4%",  trendUp: true,  icon: "bag" },
                { label: "Total Sales",        value: `₹${Number(totalRevenue).toLocaleString('en-IN')}`, trend: "+ 15.3%", trendUp: true, icon: "rupee" },
                { label: "Pending Orders",     value: pendingOrders.toLocaleString(),   trend: "- 5.2%",  trendUp: false, icon: "pending" },
                { label: "Delivered Orders",   value: deliveredOrders.toLocaleString(), trend: "+ 10.8%", trendUp: true,  icon: "truck" },
                { label: "Total Customers",    value: newCustomers.toLocaleString(),    trend: "+ 9.7%",  trendUp: true,  icon: "users" },
                { label: "Low Stock Products", value: lowStockCount.toLocaleString(),   trend: "- 3.1%",  trendUp: false, icon: "lowstock" },
                { label: "Active Offers",      value: activeOffers.toLocaleString(),    trend: "+ 2 this week", trendUp: true, icon: "offer" }
            ],
            orderStatusCounts: statusMap,
            recentOrders: formattedRecentOrders,
            topProducts: formattedTopProducts,
            lowStockAlerts: formattedLowStock,
            categoryAnalytics: formattedCategories,
            regionalSales: formattedRegional,
            revenueTrends: formattedTrends
        };

        res.json(dashboardData);

    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
};
