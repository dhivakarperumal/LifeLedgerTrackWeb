const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const dashboardController = require("../controllers/dashboardController");

router.use(requireAuth);
router.get("/", dashboardController.getDashboardData);

module.exports = router;
