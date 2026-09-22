const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { requireAuth } = require("../middleware/auth");
const expenseController = require("../controllers/expenseController");

const router = express.Router();
const uploadDir = path.join(__dirname, "..", "..", "uploads", "expense-receipts");
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
    storage: multer.diskStorage({
        destination: uploadDir,
        filename: (req, file, callback) =>
            callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname).toLowerCase()}`),
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, callback) => {
        const allowed = file.mimetype.startsWith("image/") || file.mimetype === "application/pdf";
        callback(allowed ? null : new Error("Only images and PDF receipts are allowed."), allowed);
    },
});

router.use(requireAuth);

router.get("/", expenseController.getAllExpenses);
router.get("/stats", expenseController.getExpenseStats);
router.post("/", (req, res, next) => {
    upload.single("attachment")(req, res, (error) => {
        if (error) return res.status(400).json({ message: error.message || "Receipt upload failed." });
        next();
    });
}, expenseController.createExpense);
router.put("/:id", (req, res, next) => {
    upload.single("attachment")(req, res, (error) => {
        if (error) return res.status(400).json({ message: error.message || "Receipt upload failed." });
        next();
    });
}, expenseController.updateExpense);
router.delete("/:id", expenseController.deleteExpense);

module.exports = router;
