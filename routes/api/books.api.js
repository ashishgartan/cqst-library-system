const router = require("express").Router();
const ctrl = require("../../controllers/books.controller");
const multer = require("multer");
const upload = multer(); // No storage config needed for .none()
const {
  isAuthenticated,
  isAdmin,
} = require("../../middleware/auth.middleware");

// ============================
// PUBLIC TO ALL LOGGED-IN USERS
// ============================
// Everyone (Students & Librarians) can view the collection
router.get("/", isAuthenticated, ctrl.renderBooksPage);
router.get("/paginated", isAuthenticated, ctrl.getPaginatedBooks);
router.get("/search", isAuthenticated, ctrl.searchBooks);
router.get("/subjects", isAuthenticated, ctrl.getAllSubjects);
router.get("/by-ref/:ref_no", isAuthenticated, ctrl.getBookByRef);
router.get("/details/:id", isAuthenticated, ctrl.renderDetailsPage);

// ============================
// RESTRICTED TO LIBRARIANS ONLY
// ============================
// Only Admin/Librarian can modify the database
router.get("/stats", isAuthenticated, isAdmin, ctrl.getBookStats);
router.post("/", isAuthenticated, isAdmin, ctrl.createBook);
router.put("/:id", isAuthenticated, upload.none(), isAdmin, ctrl.updateBook);
router.delete("/:id", isAuthenticated, isAdmin, ctrl.deleteBook);

module.exports = router;
