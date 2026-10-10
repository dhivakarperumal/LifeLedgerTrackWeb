const express = require("express");
const { requireAuth } = require("../middleware/auth");
const controller = require("../controllers/appLockController");

const router = express.Router();
router.use(requireAuth);

router.get("/status", controller.status);
router.put("/settings", controller.configure);
router.post("/unlock", controller.unlock);
router.post("/lock", controller.lock);
router.post("/logout", controller.logout);
router.post("/webauthn/register/options", controller.registrationOptions);
router.post("/webauthn/register/verify", controller.registrationVerify);
router.post("/webauthn/authenticate/options", controller.authenticationOptions);
router.post("/webauthn/authenticate/verify", controller.authenticationVerify);

module.exports = router;