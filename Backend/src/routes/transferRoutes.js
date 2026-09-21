const express = require("express");
const transferController = require("../controllers/transferController");

const router = express.Router();

router.get("/", transferController.getAllTransfers);
router.post("/", transferController.createTransfer);
router.put("/:id", transferController.updateTransfer);
router.delete("/:id", transferController.deleteTransfer);

module.exports = router;