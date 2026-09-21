const db = require("../config/db");

// ─── CART ────────────────────────────────────────────────────────────────────

// GET /api/cart/:user_id
exports.getCart = async (req, res) => {
    try {
        const { user_id } = req.params;
        const [rows] = await db.query(
            `SELECT c.id, c.product_id, c.variant_color, c.variant_size, c.image, c.quantity, c.email, c.price as saved_price, c.total_price as saved_total,
                    p.name, p.offer_price, p.price, p.mrp, p.variants
             FROM cart c
             JOIN products p ON c.product_id = p.id
             WHERE c.user_id = ?`,
            [user_id]
        );

        const items = rows.map(row => {
            // Parse variants and find the matching variant
            const variants = row.variants ? JSON.parse(row.variants) : [];
            const variant = variants.find(v =>
                v.color === row.variant_color || v.colorName === row.variant_color
            ) || variants[0];

            // Use saved image first; fallback to extracting from product variants
            let image = row.image || null;
            if (!image && variant) {
                image = variant?.images?.[0] || null;
            }

            const price = parseFloat(row.saved_price || row.offer_price || row.price || 0);
            return {
                id: row.id,
                product_id: row.product_id,
                email: row.email,
                name: row.name,
                price: price,
                total_price: parseFloat(row.saved_total || price * row.quantity),
                mrp: parseFloat(row.mrp || 0),
                image,
                colorName: row.variant_color,
                colorHex: variant?.color || null,
                size: row.variant_size,
                quantity: row.quantity,
            };
        });

        res.json(items);
    } catch (err) {
        console.error("Get Cart Error:", err);
        res.status(500).json({ message: "Failed to fetch cart", error: err.message });
    }
};

// POST /api/cart
exports.addToCart = async (req, res) => {
    try {
        const { user_id, product_id: rawProductId, productId, id, variant_color, variant_size, image, quantity, email, price, total_price } = req.body;
        const product_id = Number(rawProductId ?? productId ?? id);

        if (!user_id || !Number.isInteger(product_id) || product_id < 1) {
            return res.status(400).json({ message: "A valid product_id is required" });
        }

        const [productRows] = await db.query("SELECT id, total_stock FROM products WHERE id = ?", [product_id]);
        if (productRows.length === 0) {
            return res.status(404).json({ message: "Product not found" });
        }
        if (Number(productRows[0].total_stock ?? 0) < 1) {
            return res.status(409).json({ message: "Product is out of stock" });
        }

        // Check if same item already exists
        const [existing] = await db.query(
            "SELECT id, quantity FROM cart WHERE user_id=? AND product_id=? AND variant_color=? AND variant_size=?",
            [user_id, product_id, variant_color || "", variant_size || ""]
        );

        if (existing.length > 0) {
            const newQty = existing[0].quantity + (parseInt(quantity) || 1);
            const newTotal = (parseFloat(price) || 0) * newQty;

            // Also update image and other fields if provided
            const updateFields = ["quantity=?"];
            const updateValues = [newQty];

            if (image) { updateFields.push("image=?"); updateValues.push(image); }
            if (email) { updateFields.push("email=?"); updateValues.push(email); }
            if (price) { updateFields.push("price=?"); updateValues.push(price); }
            if (total_price || price) { updateFields.push("total_price=?"); updateValues.push(total_price || newTotal); }

            updateValues.push(existing[0].id);

            await db.query(`UPDATE cart SET ${updateFields.join(', ')} WHERE id=?`, updateValues);
            return res.json({ message: "Cart quantity updated", id: existing[0].id });
        }

        const [result] = await db.query(
            "INSERT INTO cart (user_id, product_id, variant_color, variant_size, image, quantity, email, price, total_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [user_id, product_id, variant_color || "", variant_size || "", image || null, parseInt(quantity) || 1, email || "", parseFloat(price) || 0, parseFloat(total_price) || 0]
        );
        res.json({ message: "Added to cart", id: result.insertId });
    } catch (err) {
        console.error("Add to Cart Error:", err);
        res.status(500).json({ message: "Failed to add to cart", error: err.message });
    }
};

// PUT /api/cart/:id
exports.updateCartItem = async (req, res) => {
    try {
        const { quantity, price } = req.body;
        if (!quantity || parseInt(quantity) < 1) {
            return res.status(400).json({ message: "Quantity must be at least 1" });
        }

        let query = "UPDATE cart SET quantity=?";
        let params = [parseInt(quantity)];

        if (price) {
            query += ", total_price=?";
            params.push(parseFloat(price) * parseInt(quantity));
        }

        query += " WHERE id=?";
        params.push(req.params.id);

        await db.query(query, params);
        res.json({ message: "Cart item updated" });
    } catch (err) {
        console.error("Update Cart Error:", err);
        res.status(500).json({ message: "Failed to update cart item", error: err.message });
    }
};

// DELETE /api/cart/:id
exports.removeFromCart = async (req, res) => {
    try {
        await db.query("DELETE FROM cart WHERE id=?", [req.params.id]);
        res.json({ message: "Item removed from cart" });
    } catch (err) {
        console.error("Remove Cart Error:", err);
        res.status(500).json({ message: "Failed to remove cart item", error: err.message });
    }
};

// DELETE /api/cart/clear/:user_id
exports.clearCart = async (req, res) => {
    try {
        await db.query("DELETE FROM cart WHERE user_id=?", [req.params.user_id]);
        res.json({ message: "Cart cleared" });
    } catch (err) {
        console.error("Clear Cart Error:", err);
        res.status(500).json({ message: "Failed to clear cart", error: err.message });
    }
};

// ─── WISHLIST ─────────────────────────────────────────────────────────────────

// GET /api/wishlist/:user_id
exports.getWishlist = async (req, res) => {
    try {
        const { user_id } = req.params;
        const [rows] = await db.query(
                `SELECT w.id, w.product_id, w.variant_color, w.variant_size, w.image, w.email, w.price as saved_price, w.total_price as saved_total,
                    p.name, p.offer_price, p.price, p.mrp, p.category, p.variants, p.status, p.total_stock
             FROM wishlist w
             JOIN products p ON w.product_id = p.id
             WHERE w.user_id = ?`,
            [user_id]
        );

        const items = rows.map(row => {
            const variants = row.variants ? JSON.parse(row.variants) : [];
            // Find the variant matching the color name
            const variant = variants.find(v =>
                v.color === row.variant_color || v.colorName === row.variant_color
            ) || variants[0];
            
            // Use saved image first; fallback to extracting from product variants
            let image = row.image || null;
            if (!image && variant) {
                image = variant?.images?.[0] || null;
            }
            const price = parseFloat(row.saved_price || row.offer_price || row.price || 0);

            return {
                id: row.id,
                product_id: row.product_id,
                email: row.email,
                name: row.name,
                price: price,
                total_price: parseFloat(row.saved_total || price),
                offer_price: row.offer_price,
                mrp: parseFloat(row.mrp || 0),
                category: row.category,
                status: row.status,
                total_stock: row.total_stock,
                image,
                colorName: row.variant_color || "",
                colorHex: variant?.color || null,
                size: row.variant_size || "",
                variants,
            };
        });

        res.json(items);
    } catch (err) {
        console.error("Get Wishlist Error:", err);
        res.status(500).json({ message: "Failed to fetch wishlist", error: err.message });
    }
};

// POST /api/wishlist
exports.addToWishlist = async (req, res) => {
    try {
        const { user_id, product_id, variant_color, variant_size, image, email, price, total_price } = req.body;

        // Prevent duplicate
        const [existing] = await db.query(
            "SELECT id FROM wishlist WHERE user_id=? AND product_id=?",
            [user_id, product_id]
        );

        if (existing.length > 0) {
            // Update variant info + image + email/price if re-added
            const updateFields = ["variant_color=?", "variant_size=?"];
            const updateValues = [variant_color || "", variant_size || ""];

            if (image) { updateFields.push("image=?"); updateValues.push(image); }
            if (email) { updateFields.push("email=?"); updateValues.push(email); }
            if (price) { updateFields.push("price=?"); updateValues.push(price); }
            if (total_price || price) { updateFields.push("total_price=?"); updateValues.push(total_price || price); }

            updateValues.push(existing[0].id);

            await db.query(
                `UPDATE wishlist SET ${updateFields.join(', ')} WHERE id=?`,
                updateValues
            );
            return res.json({ message: "Already in wishlist (updated)", id: existing[0].id });
        }

        const [result] = await db.query(
            "INSERT INTO wishlist (user_id, product_id, variant_color, variant_size, image, email, price, total_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [user_id, product_id, variant_color || "", variant_size || "", image || null, email || "", parseFloat(price) || 0, parseFloat(total_price) || 0]
        );
        res.json({ message: "Added to wishlist", id: result.insertId });
    } catch (err) {
        console.error("Add Wishlist Error:", err);
        res.status(500).json({ message: "Failed to add to wishlist", error: err.message });
    }
};

// DELETE /api/wishlist/:user_id/:product_id
exports.removeFromWishlist = async (req, res) => {
    try {
        const { user_id, product_id } = req.params;
        await db.query(
            "DELETE FROM wishlist WHERE user_id=? AND product_id=?",
            [user_id, product_id]
        );
        res.json({ message: "Removed from wishlist" });
    } catch (err) {
        console.error("Remove Wishlist Error:", err);
        res.status(500).json({ message: "Failed to remove from wishlist", error: err.message });
    }
};
