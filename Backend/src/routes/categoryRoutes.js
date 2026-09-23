const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");

const {
    getAllCategories,
    addCategory,
    updateCategory,
    deleteCategory
} = require("../controllers/categoryController");

router.get("/", requireAuth, getAllCategories);
router.post("/", requireAuth, addCategory);
router.put("/:id", requireAuth, updateCategory);
router.delete("/:id", requireAuth, deleteCategory);

module.exports = router;
