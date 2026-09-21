const path = require("path");
const db = require("../config/db");

const numericStock = (value) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, parsed);
};

const getDerivedStatus = (stockValue) => {
    const value = numericStock(stockValue);
    if (value <= 0) return "Out of Stock";
    if (value < 10) return "Low Stock";
    return "Active";
};

exports.uploadProductImages = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: "No product images uploaded" });
        }

        const imageUrls = req.files.map(file => {
            const filename = path.basename(file.path);
            return `/uploads/products/${filename}`;
        });

        return res.status(200).json({ images: imageUrls });
    } catch (error) {
        console.error("Upload Product Image Error:", error);
        return res.status(500).json({ message: "Failed to upload product images", error: error.message });
    }
};

exports.createProduct = async (req, res) => {
    try {
        const {
            name, description, category, subcategory, mrp, offer, offer_price,
            total_stock, rating, status, material, wash_care, saree_length,
            blouse_length, top_length, bottom_length, dupatta_length,
            gown_length, sleeve_type, neck_type, fit_type,
            work_type, zari_color, variants, product_code, age
        } = req.body;

        const stockNum = numericStock(total_stock);
        const calculatedStatus = getDerivedStatus(stockNum);

        const [result] = await db.query(
            "INSERT INTO products (name, description, category, subcategory, mrp, offer, offer_price, total_stock, rating, status, material, wash_care, saree_length, blouse_length, top_length, bottom_length, dupatta_length, gown_length, sleeve_type, neck_type, fit_type, work_type, zari_color, variants, product_code, price, age) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                name || "Untitled Creation",
                description || "",
                category || "General",
                subcategory || "",
                parseFloat(mrp) || 0,
                parseFloat(offer) || 0,
                parseFloat(offer_price) || 0,
                stockNum,
                parseInt(rating) || 5,
                calculatedStatus,
                material || "",
                wash_care || "Dry Clean Only",
                saree_length || "",
                blouse_length || "",
                top_length || "",
                bottom_length || "",
                dupatta_length || "",
                gown_length || "",
                sleeve_type || "",
                neck_type || "",
                fit_type || "",
                work_type || "",
                zari_color || "",
                JSON.stringify(variants || []),
                product_code || null,
                parseFloat(mrp) || 0,
                age || ""
            ]
        );

        if (!result.insertId || result.insertId < 1) {
            throw new Error("Products table id must be AUTO_INCREMENT. Run fix-product-ids.js before adding products.");
        }

        res.json({ message: "Product added successfully", id: result.insertId });
    } catch (err) {
        console.error("Add Product Error (DETAILED):", {
            code: err.code,
            errno: err.errno,
            sqlMessage: err.sqlMessage,
            sqlState: err.sqlState
        });
        res.status(500).json({ message: "Failed to add product", error: err.sqlMessage || err.message });
    }
};

exports.getAllProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || null;
        const limit = parseInt(req.query.limit) || null;
        const search = req.query.search || "";
        const status = req.query.status || "";

        let query = "SELECT * FROM products WHERE id > 0";
        const params = [];

        if (search) {
            query += " AND (name LIKE ? OR product_code LIKE ?)";
            params.push(`%${search}%`, `%${search}%`);
        }

        if (status && status !== "All") {
            if (status === "Low Stock") {
                query += " AND (status = 'Low Stock' OR status = 'Out of Stock')";
            } else {
                query += " AND status = ?";
                params.push(status);
            }
        }

        query += " ORDER BY created_at DESC";

        if (page !== null && limit !== null) {
            const offset = (page - 1) * limit;
            query += " LIMIT ? OFFSET ?";
            params.push(limit, offset);
        }

        const [results] = await db.query(query, params);

        // Get total count for pagination info
        let countQuery = "SELECT COUNT(*) as total FROM products WHERE id > 0";
        const countParams = [];
        if (search) {
            countQuery += " AND (name LIKE ? OR product_code LIKE ?)";
            countParams.push(`%${search}%`, `%${search}%`);
        }
        if (status && status !== "All") {
            if (status === "Low Stock") {
                countQuery += " AND (status = 'Low Stock' OR status = 'Out of Stock')";
            } else {
                countQuery += " AND status = ?";
                countParams.push(status);
            }
        }
        const [[{ total }]] = await db.query(countQuery, countParams);

        // Get overall stats (regardless of current filters)
        const [[stats]] = await db.query(`
            SELECT 
                COUNT(*) as totalProducts,
                SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as activeCount,
                SUM(CASE WHEN status = 'Low Stock' THEN 1 ELSE 0 END) as lowStockCount,
                SUM(CASE WHEN status = 'Out of Stock' THEN 1 ELSE 0 END) as outOfStockCount
            FROM products
        `);

        const processedResults = results.map(p => {
            let variants = [];
            let images = [];
            try {
                if (p.variants) {
                    variants = typeof p.variants === 'string' ? JSON.parse(p.variants) : p.variants;
                }
                if (p.images) {
                    images = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
                }
            } catch (e) {
                console.error("JSON Parse Error for Product:", p.id, e);
            }
            return {
                ...p,
                variants: Array.isArray(variants) ? variants : [],
                images: Array.isArray(images) ? images : []
            };
        });
        if (page === null) {
            return res.json(processedResults);
        }

        res.json({
            products: processedResults,
            stats: {
                total: stats.totalProducts || 0,
                active: stats.activeCount || 0,
                lowStock: stats.lowStockCount || 0,
                outOfStock: stats.outOfStockCount || 0
            },
            pagination: {
                total,
                page: page || 1,
                limit: limit || total,
                totalPages: limit ? Math.ceil(total / limit) : 1
            }
        });
    } catch (err) {
        console.error("Fetch Products Error:", err);
        res.status(500).json({ message: "Failed to fetch products", error: err.message });
    }
};

exports.getProductById = async (req, res) => {
    try {
        const productId = Number(req.params.id);
        if (!Number.isInteger(productId) || productId < 1) {
            return res.status(400).json({ message: "Invalid product id" });
        }

        const [results] = await db.query("SELECT * FROM products WHERE id = ? AND id > 0", [productId]);
        if (results.length === 0) {
            return res.status(404).json({ message: "Product not found" });
        }
        const product = results[0];
        product.variants = product.variants ? JSON.parse(product.variants) : [];
        product.images = product.images ? (typeof product.images === 'string' ? JSON.parse(product.images) : product.images) : [];
        res.json(product);
    } catch (err) {
        console.error("Fetch Product Error:", err);
        res.status(500).json({ message: "Failed to fetch product", error: err.message });
    }
};

exports.getLatestProductCode = async (req, res) => {
    try {
        const [results] = await db.query("SELECT product_code FROM products WHERE product_code LIKE 'SP%'");
        let nextNum = 1;
        if (results.length > 0) {
            const codes = results
                .map(r => r.product_code)
                .map(c => parseInt(c.replace("SP", "")) || 0);
            if (codes.length > 0) {
                nextNum = Math.max(...codes) + 1;
            } else {
                nextNum = results.length + 1;
            }
         }
         res.json({ latestCode: `SP${nextNum.toString().padStart(3, '0')}` });
    } catch (err) {
         console.error("Fetch Latest Code Error:", err);
         res.status(500).json({ message: "Failed to fetch latest code", error: err.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const {
            name, description, category, subcategory, mrp, offer, offer_price,
            total_stock, rating, status, material, wash_care, saree_length,
            blouse_length, top_length, bottom_length, dupatta_length,
            gown_length, sleeve_type, neck_type, fit_type,
            work_type, zari_color, variants, product_code, age
        } = req.body;

        const stockNum = numericStock(total_stock);
        const calculatedStatus = getDerivedStatus(stockNum);

        await db.query(
            "UPDATE products SET name=?, description=?, category=?, subcategory=?, mrp=?, offer=?, offer_price=?, total_stock=?, rating=?, status=?, material=?, wash_care=?, saree_length=?, blouse_length=?, top_length=?, bottom_length=?, dupatta_length=?, gown_length=?, sleeve_type=?, neck_type=?, fit_type=?, work_type=?, zari_color=?, variants=?, product_code=?, price=?, age=? WHERE id=?",
            [
                name,
                description,
                category,
                subcategory,
                parseFloat(mrp) || 0,
                parseFloat(offer) || 0,
                parseFloat(offer_price) || 0,
                stockNum,
                parseInt(rating) || 5,
                calculatedStatus,
                material,
                wash_care,
                saree_length,
                blouse_length,
                top_length,
                bottom_length,
                dupatta_length,
                gown_length,
                sleeve_type,
                neck_type,
                fit_type,
                work_type,
                zari_color,
                JSON.stringify(variants || []),
                product_code,
                parseFloat(mrp) || 0,
                age,
                req.params.id
            ]
        );

        res.json({ message: "Product updated successfully" });
    } catch (err) {
        console.error("Update Product Error:", err);
        res.status(500).json({ message: "Failed to update product", error: err.message });
    }
};

exports.deleteProduct = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const productId = req.params.id;

        // Step 1: Nullify product_id references in related tables to avoid FK constraint errors
        await connection.query(
            "UPDATE order_items SET product_id = NULL WHERE product_id = ?",
            [productId]
        );

        // Nullify in cart table (ignore if not applicable)
        try {
            await connection.query(
                "UPDATE cart SET product_id = NULL WHERE product_id = ?",
                [productId]
            );
        } catch (e) {}

        // Nullify in wishlist table (ignore if not applicable)
        try {
            await connection.query(
                "UPDATE wishlist SET product_id = NULL WHERE product_id = ?",
                [productId]
            );
        } catch (e) {}

        // Step 2: Now safely delete the product
        await connection.query("DELETE FROM products WHERE id = ?", [productId]);

        await connection.commit();
        res.json({ message: "Product deleted successfully" });
    } catch (err) {
        await connection.rollback();
        console.error("Delete Product Error:", err);
        res.status(500).json({ message: "Failed to delete product", error: err.message });
    } finally {
        connection.release();
    }
};
