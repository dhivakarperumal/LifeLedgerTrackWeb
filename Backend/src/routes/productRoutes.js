const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const router = express.Router();
const productController = require("../controllers/productController");

const uploadDir = path.join(__dirname, "..", "..", "uploads", "products");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || ".jpg";
    const safeName = file.originalname.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9_.-]/g, "");
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName || "product"}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed."));
    }
  }
});

router.post("/upload", (req, res, next) => {
  upload.array("images", 5)(req, res, (error) => {
    if (error) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ message: "Each image must be 10 MB or smaller." });
      }
      return res.status(400).json({ message: error.message || "Image upload failed." });
    }
    next();
  });
}, productController.uploadProductImages);
router.post("/", productController.createProduct);
router.get("/", productController.getAllProducts);
router.get("/latest-code", productController.getLatestProductCode);
router.get("/:id", productController.getProductById);
router.put("/:id", productController.updateProduct);
router.delete("/:id", productController.deleteProduct);

module.exports = router;
