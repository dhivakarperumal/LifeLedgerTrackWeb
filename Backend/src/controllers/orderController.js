const db = require("../config/db");

exports.createOrder = async (req, res) => {
    try {
        const {
            user_id, customer_name, customer_email, customer_phone,
            address, street_address, city, district, state, country, zip_code,
            total_amount, subtotal, order_type, payment_method, payment_id, payment_status, status, items, created_at
        } = req.body;
        const orderUserId = user_id || `GUEST-${Date.now()}`;

        // Start transaction
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const queryFields = [
                'user_id', 'total_amount', 'subtotal', 'order_type', 'payment_method',
                'payment_id', 'payment_status', 'status',
                'customer_name', 'customer_email', 'customer_phone',
                'street_address', 'city', 'district', 'state', 'country', 'zip_code'
            ];
            const queryParams = [
                orderUserId, total_amount, subtotal || total_amount, order_type || 'Shop',
                payment_method || 'Showroom', payment_id || null, payment_status || 'Pending', status || 'Order Placed',
                customer_name, customer_email || null, customer_phone,
                street_address || null, city || null, district || null,
                state || null, country || 'India', zip_code || null
            ];

            if (created_at) {
                queryFields.push('created_at');
                queryParams.push(created_at);
            }

            const [result] = await connection.query(
                `INSERT INTO orders (${queryFields.join(', ')}) VALUES (${queryFields.map(() => '?').join(', ')})`,
                queryParams
            );

            const orderId = result.insertId;

            // Insert into order_addresses
            await connection.query(
                `INSERT INTO order_addresses (
                    order_id, user_id, customer_name, customer_email, customer_phone, 
                    street_address, city, district, state, country, zip_code
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    orderId, orderUserId, customer_name, customer_email || null, customer_phone,
                    street_address || null, city || null, district || null,
                    state || null, country || 'India', zip_code || null
                ]
            );

            for (const item of items) {
                // Insert order item
                await connection.query(
                    "INSERT INTO order_items (order_id, user_id, email, product_id, quantity, price, variant_color, variant_size, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    [orderId, orderUserId, customer_email || null, item.product_id, item.quantity, item.price, item.variant_color || null, item.variant_size || null, item.image || null]
                );

                // Reduce Stock
                const [productRows] = await connection.query("SELECT variants, total_stock FROM products WHERE id = ?", [item.product_id]);
                if (productRows.length > 0) {
                    let { variants, total_stock } = productRows[0];
                    let variantsArr = variants ? (typeof variants === 'string' ? JSON.parse(variants) : variants) : [];
                    let updatedTotalStock = (parseInt(total_stock) || 0) - item.quantity;

                    // Update variant-specific stock if variant info is provided
                    if (item.variant_color && item.variant_size) {
                        variantsArr = variantsArr.map(v => {
                            if (v.color === item.variant_color || v.colorName === item.variant_color) {
                                const currentSizeStock = parseInt(v.sizesStock?.[item.variant_size] || 0);
                                return {
                                    ...v,
                                    sizesStock: {
                                        ...v.sizesStock,
                                        [item.variant_size]: Math.max(0, currentSizeStock - item.quantity)
                                    }
                                };
                            }
                            return v;
                        });
                    }

                    await connection.query(
                        "UPDATE products SET variants = ?, total_stock = ? WHERE id = ?",
                        [JSON.stringify(variantsArr), updatedTotalStock, item.product_id]
                    );
                }
            }

            await connection.commit();
            res.json({
                message: "Order created successfully",
                id: orderId,
                order_id: `ORD${String(orderId).padStart(5, "0")}`
            });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    } catch (err) {
        console.error("Create Order Error:", err);
        res.status(500).json({ message: "Failed to create order", error: err.message });
    }
};

exports.getAllOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || null;
        const limit = parseInt(req.query.limit) || null;
        const { status, search } = req.query;
        let query = `
            FROM orders o
            LEFT JOIN order_addresses oa ON o.id = oa.order_id
            WHERE 1=1
        `;
        let params = [];

        if (status && status !== 'All') {
            query += " AND o.status = ?";
            params.push(status);
        }

        if (search) {
            query += " AND (oa.customer_name LIKE ? OR oa.customer_phone LIKE ? OR o.id LIKE ?)";
            const s = `%${search}%`;
            params.push(s, s, s);
        }

        // Get total count
        const [[{ total }]] = await db.query("SELECT COUNT(*) as total " + query, params);

        let finalQuery = "SELECT o.*, CONCAT('ORD', LPAD(o.id, 5, '0')) AS order_id, oa.customer_name, oa.customer_email, oa.customer_phone " + query;
        finalQuery += " ORDER BY o.created_at DESC";

        if (page !== null && limit !== null) {
            const offset = (page - 1) * limit;
            finalQuery += " LIMIT ? OFFSET ?";
            params.push(limit, offset);
        }

        const [results] = await db.query(finalQuery, params);

        if (page === null) {
            return res.json(results);
        }

        res.json({
            orders: results,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error("Fetch Orders Error:", err);
        res.status(500).json({ message: "Failed to fetch orders", error: err.message });
    }
};

exports.getOrderById = async (req, res) => {
    try {
        const rawOrderId = String(req.params.id).trim();
        const formattedId = rawOrderId.match(/^#?ORD-?0*(\d+)$/i);
        const orderId = formattedId ? formattedId[1] : rawOrderId;
        const [order] = await db.query(
            `SELECT o.*, CONCAT('ORD', LPAD(o.id, 5, '0')) AS order_id, oa.customer_name, oa.customer_email, oa.customer_phone, 
                    oa.street_address, oa.city, oa.district, oa.state, oa.country, oa.zip_code
             FROM orders o
             LEFT JOIN order_addresses oa ON o.id = oa.order_id
             WHERE o.id = ?`,
            [orderId]
        );
        if (order.length === 0) return res.status(404).json({ message: "Order not found" });

        const [items] = await db.query(
            "SELECT oi.*, p.name as product_name, p.variants FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?",
            [orderId]
        );

        const processedItems = items.map(item => ({
            ...item,
            product_name: item.product_name,
            size: item.variant_size,
            color: item.variant_color,
            variants: item.variants ? JSON.parse(item.variants) : []
        }));

        res.json({ ...order[0], items: processedItems });
    } catch (err) {
        console.error("Fetch Order Detail Error:", err);
        res.status(500).json({ message: "Failed to fetch order details", error: err.message });
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const { status, created_at, tracking_number, courier_name, cancellation_reason, shipped_at, cancelled_at } = req.body;
        let query = "UPDATE orders SET status = ?";
        let params = [status];

        if (created_at) {
            query += ", created_at = ?";
            params.push(created_at);
        }

        if (tracking_number) {
            query += ", tracking_number = ?";
            params.push(tracking_number);
        }

        if (courier_name) {
            query += ", courier_name = ?";
            params.push(courier_name);
        }

        if (shipped_at) {
            query += ", shipped_at = ?";
            params.push(shipped_at);
        }

        if (cancellation_reason) {
            query += ", cancellation_reason = ?";
            params.push(cancellation_reason);
        }

        if (cancelled_at) {
            query += ", cancelled_at = ?";
            params.push(cancelled_at);
        }

        query += " WHERE id = ?";
        params.push(req.params.id);

        await db.query(query, params);
        res.json({ message: "Order updated successfully" });
    } catch (err) {
        console.error("Update Order Status Error:", err);
        res.status(500).json({ message: "Failed to update order status", error: err.message });
    }
};
