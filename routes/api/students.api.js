const router = require("express").Router();
const ctrl = require("../../controllers/students.controller");
const {
  isAuthenticated,
  isAdmin,
} = require("../../middleware/auth.middleware");

// ==========================================
// ALL STUDENT ROUTES ARE RESTRICTED TO ADMIN
// ==========================================

// Every route here now requires the user to be Logged In AND a Librarian
router.use(isAuthenticated, isAdmin);

// UI Routes
router.get("/", ctrl.renderStudentPage); // Render Directory Page
router.get("/details/:roll_no", ctrl.renderProfilePage); // Render Single Student Profile

// API Routes
router.get("/paginated", ctrl.getStudentsPaginated); // Get list for table
router.get("/search", ctrl.searchStudents); // Search logic
router.get("/batches",ctrl.getAllBatches);
router.get("/by-roll/:roll_no", ctrl.getStudentByRoll); // API fetch by roll

router.put("/update/:roll_no", ctrl.updateStudent); // Update record
router.delete("/delete/:roll_no", ctrl.deleteStudent); // Delete record

module.exports = router;
