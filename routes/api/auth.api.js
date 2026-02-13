const router = require("express").Router();
const ctrl = require("../../controllers/auth.controller");
const {
  isGuest,
  isAuthenticated,
} = require("../../middleware/auth.middleware");

// --- API Routes ---
router.post("/signup", ctrl.signup);
router.post("/login", ctrl.login);
router.post("/logout", ctrl.logout);

// Only LOGGED IN users can change their password
router.post("/change-password", isAuthenticated, ctrl.changePassword);

// --- UI Routes ---
router.get("/login", isGuest, ctrl.renderLoginPage);
router.get("/signup", isGuest, ctrl.renderSignupPage);

// 1. New middleware: isAuthenticated
// 2. New function: renderChangePassword (to show the EJS)
router.get("/change-password", isAuthenticated, ctrl.renderChangePassword);

module.exports = router;
