const express = require("express");
const transferController = require("../controllers/transferController");

const router = express.Router();

router.get("/", transferController.getAllTransfers);
router.post("/", transferController.createTransfer);

module.exports = router;