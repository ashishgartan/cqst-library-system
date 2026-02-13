const express = require("express");
const router = express.Router();
const { isAuthenticated, isAdmin } = require("../middleware/auth.middleware");

// ============================
// API & UI Route Modules
// ============================

// Public/Guest Routes (Login/Signup handles its own isGuest logic)
router.use("/auth", require("./api/auth.api"));
// Protected Library Routes (Internal logic handles specific isAdmin checks)
router.use("/books", require("./api/books.api"));
router.use("/borrow", require("./api/borrow.api"));
router.use("/students", require("./api/students.api"));
router.use("/upload", require("./api/upload.api"));
router.use("/dashboard", require("./api/dashboard.api"));
router.use("/settings", require("./api/settings.api"));
router.use("/export", require("./api/exportAsCSV.api"));


// ============================
// Main Navigation Logic
// ============================

/**
 * Landing Route (/)
 * Logic:
 * 1. If not logged in -> redirect to login via isAuthenticated
 * 2. If logged in as librarian -> show dashboard
 * 3. If logged in as student -> show books inventory
 */
router.get("/", isAuthenticated, (req, res) => {
  if (req.user.role === "admin") {
    res.redirect("/dashboard");
  } else {
    res.redirect("/books");
  }
});

// Offline fallback for PWA/Service Workers
router.get("/offline", (req, res) => res.render("offline"));

module.exports = router;
