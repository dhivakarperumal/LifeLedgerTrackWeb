const db = require("../config/db");

// GET /api/order-addresses?user_id=
exports.getAllAddresses = async (req, res) => {
    try {
        const userId = req.query.user_id || req.query.userId;
        let query = "SELECT * FROM order_addresses";
        const params = [];

        if (userId) {
            query += " WHERE user_id = ?";
            params.push(userId);
        }

        query += " ORDER BY id DESC";

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: "Error fetching addresses", error: err.message });
    }
};

// GET /api/order-addresses/:orderId
exports.getAddressByOrderId = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM order_addresses WHERE order_id = ?", [req.params.orderId]);
        if (rows.length === 0) return res.status(404).json({ message: "Address not found" });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ message: "Error fetching address", error: err.message });
    }
};

// POST /api/order-addresses
exports.createAddress = async (req, res) => {
    try {
        const {
            order_id, user_id, customer_name, customer_email, customer_phone,
            street_address, city, district, state, country, zip_code
        } = req.body;

        const [result] = await db.query(
            `INSERT INTO order_addresses (
                order_id, user_id, customer_name, customer_email, customer_phone, 
                street_address, city, district, state, country, zip_code
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [order_id, user_id, customer_name, customer_email, customer_phone, street_address, city, district, state, country, zip_code]
        );
        res.json({ message: "Address created", id: result.insertId });
    } catch (err) {
        res.status(500).json({ message: "Error creating address", error: err.message });
    }
};

// PUT /api/order-addresses/:id
exports.updateAddress = async (req, res) => {
    try {
        const {
            user_id, customer_name, customer_email, customer_phone,
            street_address, city, district, state, country, zip_code
        } = req.body;

        await db.query(
            `UPDATE order_addresses SET 
                user_id=?, customer_name=?, customer_email=?, customer_phone=?, 
                street_address=?, city=?, district=?, state=?, country=?, zip_code=?
             WHERE id=?`,
            [user_id, customer_name, customer_email, customer_phone, street_address, city, district, state, country, zip_code, req.params.id]
        );
        res.json({ message: "Address updated" });
    } catch (err) {
        res.status(500).json({ message: "Error updating address", error: err.message });
    }
};

// DELETE /api/order-addresses/:id
exports.deleteAddress = async (req, res) => {
    try {
        await db.query("DELETE FROM order_addresses WHERE id = ?", [req.params.id]);
        res.json({ message: "Address deleted" });
    } catch (err) {
        res.status(500).json({ message: "Error deleting address", error: err.message });
    }
};
