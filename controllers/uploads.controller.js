const fs = require("fs");
const csv = require("csv-parser");
const Book = require("../models/Book");
const User = require("../models/User");
const path = require("path");

// ============================
// Add single book
// POST /upload/book
// ============================
exports.addBook = async (req, res) => {
  try {
    const {
      ref_no,
      isbn,
      title,
      author,
      publish_year,
      publisher,
      page_count,
      genre,
      subject,
      description,
      front_page,
    } = req.body;

    // Minimum required fields for a valid record
    if (!ref_no || !title || !author) {
      return res.status(400).json({
        success: false,
        message: "Ref No, Title, and Author are mandatory.",
      });
    }

    const book = await Book.create({
      ref_no: ref_no.trim(),
      isbn: isbn?.trim() || "",
      title: title.trim(),
      author: author.trim(),
      publish_year: publish_year?.trim() || "",
      publisher: publisher?.trim() || "",
      page_count: page_count ? Number(page_count) : 0,
      genre: genre?.trim() || "General",
      subject: subject?.trim() || "General",
      description: description?.trim() || "",
      front_page: front_page?.trim() || "", // URL or path to image
    });

    res.json({ success: true, message: "Book added successfully", book });
  } catch (err) {
    const msg =
      err.code === 11000
        ? "Duplicate Error: Ref No already exists"
        : err.message;
    res.status(500).json({ success: false, message: msg });
  }
};

// ============================
// Upload CSV of books
// POST /upload/books-csv
// ============================
exports.uploadBooksCSV = async (req, res) => {
  if (!req.file)
    return res
      .status(400)
      .json({ success: false, message: "No file uploaded" });

  const results = [];
  const errors = [];
  let successCount = 0;

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", async () => {
      for (const b of results) {
        try {
          // Validation: Ensure the unique identifier exists
          if (!b.ref_no || !b.title) {
            errors.push(`Skipped Row: Missing Ref No or Title`);
            continue;
          }

          // Use findOneAndUpdate to prevent duplicate crashes
          await Book.findOneAndUpdate(
            { ref_no: b.ref_no.trim() },
            {
              $set: {
                isbn: b.isbn?.trim() || "",
                title: b.title.trim(),
                author: b.author?.trim() || "Unknown",
                publish_year: b.publish_year?.trim() || "",
                publisher: b.publisher?.trim() || "",
                page_count: b.page_count ? Number(b.page_count) : 0,
                genre: b.genre?.trim() || "",
                subject: b.subject?.trim() || "",
                description: b.description?.trim() || "",
                front_page: b.front_page?.trim() || "",
              },
            },
            { upsert: true, new: true }
          );

          successCount++;
        } catch (err) {
          errors.push(`Book ${b.ref_no || "Unknown"}: ${err.message}`);
        }
      }

      // Cleanup: Delete the temp file from /uploads folder
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

      res.json({
        success: successCount > 0,
        uploaded: successCount,
        errors: errors.length > 0 ? errors : null,
        message: `Successfully processed ${successCount} books.`,
      });
    });
};

// ============================
// Add single student
// POST /upload/student
// ============================
exports.addStudent = async (req, res) => {
  try {
    const { name, roll_no, student_id, stream, email, password, batch, phone } =
      req.body;

    // Validate mandatory fields
    if (!name || !roll_no || !stream || !email) {
      return res.status(400).json({
        success: false,
        message: "Required: Name, Roll No, Stream, and Email.",
      });
    }

    const student = await User.create({
      name: name.trim(),
      roll_no: roll_no.trim(),
      student_id: student_id || `STU-${Date.now()}`, // fallback ID
      stream: stream.trim(),
      email: email.trim(),
      password: password?.trim() || "123456",
      role: "student",
      batch: batch || "Not Assigned",
      phone: phone || "",
      isActive: true,
    });

    res.json({ success: true, message: "Student added successfully", student });
  } catch (err) {
    // Handle Duplicate Key Error (e.g., Roll No already exists)
    const msg =
      err.code === 11000 ? "Roll No or Email already exists" : err.message;
    res.status(500).json({ success: false, message: msg });
  }
};

// ============================
// Upload CSV of students
// POST /upload/students-csv
// ============================
exports.uploadStudentsCSV = async (req, res) => {
  if (!req.file)
    return res
      .status(400)
      .json({ success: false, message: "No file uploaded" });

  const results = [];
  const errors = [];
  let successCount = 0;

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", async () => {
      for (const u of results) {
        try {
          // 1. Minimum Validation
          if (!u.roll_no || !u.name || !u.email) {
            errors.push(`Skipped row: Missing Roll No or Name`);
            continue;
          }

          // 2. Use findOneAndUpdate (Upsert) to prevent duplicate key crashes
          await User.findOneAndUpdate(
            { roll_no: u.roll_no.trim() }, // Search by Roll No
            {
              $set: {
                name: u.name.trim(),
                student_id: u.student_id || u.roll_no,
                stream: u.stream ? u.stream.trim() : "General",
                email: u.email.trim(),
                password: u.password?.trim() || "123456",
                role: "student",
                batch: u.batch || "",
                phone: u.phone || "",
                isActive: u.isActive !== undefined ? u.isActive : true,
              },
            },
            { upsert: true, new: true }
          );

          successCount++;
        } catch (err) {
          errors.push(`Roll No ${u.roll_no}: ${err.message}`);
        }
      }

      // Cleanup: Delete the temp file after processing
      fs.unlinkSync(req.file.path);

      res.json({
        success: successCount > 0,
        count: successCount,
        errors: errors.length > 0 ? errors : null,
        message: `Processed ${successCount} students.`,
      });
    });
};
// ============================
// Upload book cover
// POST /upload/upload-book-cover/:id
// ============================
exports.updateBookCover = async (req, res) => {
  try {
    const bookId = req.params.id;
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No image file uploaded." });
    }

    // 1. Find book
    const book = await Book.findById(bookId);
    if (!book)
      return res
        .status(404)
        .json({ success: false, message: "Book not found" });

    // 2. Delete old file using process.cwd() for accuracy
    if (book.front_page && !book.front_page.includes("default")) {
      const oldPath = path.join(
        process.cwd(),
        "public/uploads/bookcovers",
        book.front_page
      );
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // 3. Update only the image filename
    // NOTE: If you also want to update title/author here, you must add:
    // const { title, author } = req.body;
    await Book.findByIdAndUpdate(bookId, {
      front_page: req.file.filename,
    });

    res.json({
      success: true,
      message: "Cover updated successfully!",
      filename: req.file.filename,
      // Full path for the frontend <img> tag
      imageUrl: `/uploads/bookcovers/${req.file.filename}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================
// Upload profile photo of student
// POST /upload/profile-photo/:id
// ============================
exports.updateProfilePhoto = async (req, res) => {
  try {
    const userId = req.params.id;

    // 1. Check if Multer processed the file
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No image file uploaded." });
    }

    // 2. Find the student/user record
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found." });
    }

    // 3. Delete old file if it exists and isn't the default placeholder
    if (user.profile_photo && !user.profile_photo.includes("default")) {
      // Use process.cwd() to start from the project root folder
      const oldPath = path.join(
        process.cwd(),
        "public/uploads/profilephotos",
        user.profile_photo
      );

      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // 4. Update the database with ONLY the new filename
    await User.findByIdAndUpdate(userId, {
      profile_photo: req.file.filename,
    });

    // 5. Return success with the full path for the frontend to render
    res.json({
      success: true,
      message: "Profile photo updated successfully!",
      filename: req.file.filename,
      imageUrl: `/uploads/profilephotos/${req.file.filename}`,
    });
  } catch (err) {
    console.error("Profile Upload Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================
// UI: Render uploads page
// ============================
exports.renderUploadsPage = (req, res) => {
  res.render("uploads");
};
