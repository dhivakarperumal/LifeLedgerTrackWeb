const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/cartWishlistController");

// GET    /api/cart/:user_id         → get all cart items for a user
// POST   /api/cart                  → add item to cart (merges qty if same variant)
// PUT    /api/cart/:id              → update quantity of a cart row
// DELETE /api/cart/clear/:user_id   → wipe entire cart for a user  (before /:id)
// DELETE /api/cart/:id              → remove a single cart row

router.get("/:user_id", ctrl.getCart);
router.post("/", ctrl.addToCart);
router.put("/:id", ctrl.updateCartItem);
router.delete("/clear/:user_id", ctrl.clearCart);
router.delete("/:id", ctrl.removeFromCart);

module.exports = router;
