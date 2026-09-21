const express = require("express");
const router = express.Router();
const dealerController = require("../controllers/dealerController");

router.post("/", dealerController.createDealer);
router.get("/", dealerController.getAllDealers);
router.get("/:id", dealerController.getDealerById);
router.put("/:id", dealerController.updateDealer);
router.delete("/:id", dealerController.deleteDealer);

module.exports = router;
