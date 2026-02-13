const router = require("express").Router();
const ctrl = require("../../controllers/settings.controller");
const {
  isAuthenticated,
  isAdmin,
} = require("../../middleware/auth.middleware");

// UI Route
router.get("/", isAuthenticated, isAdmin, ctrl.renderSettingsPage);

// API Route
router.post("/update", isAuthenticated, isAdmin, ctrl.updateSettings);

module.exports = router;
