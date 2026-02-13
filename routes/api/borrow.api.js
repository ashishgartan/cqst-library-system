const router = require("express").Router();
const borrowController = require("../../controllers/borrow.controller");
const {
  isAuthenticated,
  isAdmin,
} = require("../../middleware/auth.middleware");

// ==========================================
// RESTRICTED TO LIBRARIANS ONLY (Management)
// ==========================================

// UI page for borrow management
router.get("/", isAuthenticated, isAdmin, borrowController.renderBorrowPage);

// Transaction Routes
router.post(
  "/borrow-book",
  isAuthenticated,
  isAdmin,
  borrowController.borrowBook
);
router.post(
  "/borrow-by-student",
  isAuthenticated,
  isAdmin,
  borrowController.borrowBookByStudent
);
router.get(
  "/return-book/:id",
  isAuthenticated,
  isAdmin,
  borrowController.renderReturnBookPage
);
router.post(
  "/return-book/:id",
  isAuthenticated,
  isAdmin,
  borrowController.handleReturnSettlement
);

// Global Data & Stats
router.get(
  "/history",
  isAuthenticated,
  isAdmin,
  borrowController.getBorrowHistoryPaginated
);
router.get("/search", isAuthenticated, isAdmin, borrowController.searchHistory);
router.get("/stats", isAuthenticated, isAdmin, borrowController.getBorrowStats);

// ==========================================
// ACCESSIBLE BY ALL LOGGED-IN USERS
// ==========================================

// Students might need to check if a specific book is currently out
router.get(
  "/status/:ref",
  isAuthenticated,
  borrowController.getBorrowStatusByRef
);

module.exports = router;
