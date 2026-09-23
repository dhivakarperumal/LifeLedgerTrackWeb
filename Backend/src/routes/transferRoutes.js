const express  = require("express");
const path     = require("path");
const fs       = require("fs");
const multer   = require("multer");
const { requireAuth } = require("../middleware/auth");
const transferController = require("../controllers/transferController");

const router = express.Router();

/* ── multer: receipt uploads ────────────────────────────────────────────── */
const uploadDir = path.join(__dirname, "..", "..", "uploads", "transfer-receipts");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename:    (_req, file, cb) => {
        const ext  = path.extname(file.originalname).toLowerCase();
        const safe = file.originalname.replace(ext, "").replace(/[^a-zA-Z0-9_-]/g, "_");
        cb(null, `${Date.now()}-${safe}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },   // 10 MB
    fileFilter: (_req, file, cb) => {
        const allowed = ["image/jpeg","image/png","image/webp","image/jpg","application/pdf"];
        cb(null, allowed.includes(file.mimetype));
    },
});

router.use(requireAuth);

router.get(   "/",    transferController.getAllTransfers);
router.post(  "/",    upload.single("receipt"), transferController.createTransfer);
router.put(   "/:id", upload.single("receipt"), transferController.updateTransfer);
router.delete("/:id", transferController.deleteTransfer);

module.exports = router;
