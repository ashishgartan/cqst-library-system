const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const uploadController = require("../../controllers/uploads.controller");
const {
  isAuthenticated,
  isAdmin,
} = require("../../middleware/auth.middleware");

// ============================
// Security Gatekeeper
// ============================
router.use(isAuthenticated, isAdmin);

// ============================
// Directory Auto-Creator
// ============================
const uploadDirs = [
  "public/uploads/bookcovers",
  "public/uploads/profilephotos",
  "public/uploads/temp", // Added temp directory
];

uploadDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ============================
// Multer Dynamic Storage
// ============================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let dest = "public/uploads/";

    // 1. Check for CSV files first (Temporary Storage)
    if (
      file.mimetype === "text/csv" ||
      path.extname(file.originalname).toLowerCase() === ".csv"
    ) {
      dest += "temp/";
    }
    // 2. Check for Book Covers
    else if (file.fieldname === "front_page") {
      dest += "bookcovers/";
    }
    // 3. Check for Profile Photos
    else if (file.fieldname === "profile_photo") {
      dest += "profilephotos/";
    }
    // 4. Fallback for any other uploads
    else {
      dest += "temp/";
    }

    cb(null, dest);
  },
  filename: function (req, file, cb) {
    // We use the ID or a custom header/body field passed from the frontend
    // If you pass 'ref_no' in the FormData, we use it here
    console.log(req.body);
    if (req.body.ref_no) {
      const ref_no = req.body.ref_no || Date.now();
      const ext = path.extname(file.originalname);
      // Result: "REF123.jpg" or "ROLL456.png"
      cb(null, ref_no + ext);
    } else if (req.body.roll_no) {
      const roll_no = req.body.roll_no || Date.now();
      const ext = path.extname(file.originalname);
      cb(null, roll_no + ext);
    } else {
      // Fallback to timestamp-based naming
      cb(null, Date.now() + path.extname(file.originalname));
    }
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Increased to 5MB to handle larger CSVs
});

// ============================
// Action Routes (POST)
// ============================

// CSV Uploads (Now automatically routed to public/uploads/temp)
router.post(
  "/books-csv",
  upload.single("file"),
  uploadController.uploadBooksCSV
);
router.post(
  "/students-csv",
  upload.single("file"),
  uploadController.uploadStudentsCSV
);

// Image Uploads (Routed to their specific subfolders)
router.post(
  "/upload-book-cover/:id",
  upload.single("front_page"),
  uploadController.updateBookCover
);
router.post(
  "/profile-photo/:id",
  upload.single("profile_photo"),
  uploadController.updateProfilePhoto
);

// Text-only routes (No file expected)
router.post("/book", upload.none(), uploadController.addBook);
router.post("/student", upload.none(), uploadController.addStudent);

router.get("/", uploadController.renderUploadsPage);
module.exports = router;
