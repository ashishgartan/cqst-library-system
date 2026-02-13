const router = require("express").Router();
const dashboard = require("../../controllers/dashboard.controller");
const {
  isAuthenticated,
  isAdmin,
} = require("../../middleware/auth.middleware");

// Only Librarians should have access to the Dashboard data and UI
// We use both middleware to ensure the user is logged in AND is an admin
router.get("/stats", isAuthenticated, isAdmin, dashboard.getStats);

// If you have a UI route for the dashboard, protect it here too:
router.get("/", isAuthenticated, isAdmin, dashboard.renderDashboard);

module.exports = router;
