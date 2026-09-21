const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/cartWishlistController");

// GET    /api/wishlist/:user_id               → get all wishlist items for a user
// POST   /api/wishlist                        → add product to wishlist
// DELETE /api/wishlist/:user_id/:product_id   → remove product from wishlist

router.get("/:user_id", ctrl.getWishlist);
router.post("/", ctrl.addToWishlist);
router.delete("/:user_id/:product_id", ctrl.removeFromWishlist);

module.exports = router;
