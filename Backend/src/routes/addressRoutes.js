const express = require("express");
const router = express.Router();
const addressController = require("../controllers/addressController");

router.get("/", addressController.getAllAddresses);
router.post("/", addressController.createAddress);
router.put("/:id", addressController.updateAddress);
router.delete("/:id", addressController.deleteAddress);
router.get("/:orderId", addressController.getAddressByOrderId);

module.exports = router;
