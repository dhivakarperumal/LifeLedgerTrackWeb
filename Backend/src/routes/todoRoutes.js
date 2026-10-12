const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const todoController = require("../controllers/todoController");

router.use(requireAuth);

router.get("/", todoController.getTasks);
router.post("/", todoController.createTask);
router.put("/:id", todoController.updateTask);
router.delete("/:id", todoController.deleteTask);

module.exports = router;
