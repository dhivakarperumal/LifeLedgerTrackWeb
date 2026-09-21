const db = require("../config/db");

exports.createDealer = async (req, res) => {
    try {
        const { name, contact, email, phone, location, image, rating, orders } = req.body;
        console.log(`Received dealer data for: ${name}, image size: ${image ? image.length : 0} characters`);

        const [result] = await db.query(
            "INSERT INTO dealers (name, contact, email, phone, location, image, rating, orders) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [name, contact, email, phone, location, image || "", rating || 0.0, orders || 0]
        );

        res.json({ message: "Dealer added successfully", id: result.insertId });
    } catch (err) {
        console.error("Create Dealer Error:", err);
        res.status(500).json({ message: "Failed to add dealer", error: err.message });
    }
};

exports.getAllDealers = async (req, res) => {
    try {
        const [results] = await db.query("SELECT * FROM dealers ORDER BY created_at DESC");
        res.json(results);
    } catch (err) {
        console.error("Fetch Dealers Error:", err);
        res.status(500).json({ message: "Failed to fetch dealers", error: err.message });
    }
};

exports.getDealerById = async (req, res) => {
    try {
        const [results] = await db.query("SELECT * FROM dealers WHERE id = ?", [req.params.id]);
        if (results.length === 0) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        res.json(results[0]);
    } catch (err) {
        console.error("Fetch Dealer Error:", err);
        res.status(500).json({ message: "Failed to fetch dealer", error: err.message });
    }
};

exports.updateDealer = async (req, res) => {
    try {
        const { name, contact, email, phone, location, status, rating, orders, image } = req.body;

        await db.query(
            "UPDATE dealers SET name=?, contact=?, email=?, phone=?, location=?, status=?, rating=?, orders=?, image=? WHERE id=?",
            [name, contact, email, phone, location, status, rating, orders, image, req.params.id]
        );

        res.json({ message: "Dealer updated successfully" });
    } catch (err) {
        console.error("Update Dealer Error:", err);
        res.status(500).json({ message: "Failed to update dealer", error: err.message });
    }
};

exports.deleteDealer = async (req, res) => {
    try {
        await db.query("DELETE FROM dealers WHERE id = ?", [req.params.id]);
        res.json({ message: "Dealer deleted successfully" });
    } catch (err) {
        console.error("Delete Dealer Error:", err);
        res.status(500).json({ message: "Failed to delete dealer", error: err.message });
    }
};
