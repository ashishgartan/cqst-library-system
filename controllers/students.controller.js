// controllers/api/students.api.controller.js
const User = require("../models/User");
const BorrowHistory = require("../models/BorrowHistory");

// ============================
// Get paginated students (UI + API)
// Route: GET /students/paginated?page=1
// ============================

exports.getStudentsPaginated = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = req.query.limit;
    const skip = (page - 1) * limit;

    // 1. Fetch the basic student list and total count
    const [rawStudents, total] = await Promise.all([
      User.find({ role: "student" })
        .skip(skip)
        .limit(limit)
        .sort({ created_at: -1 })
        .lean(), // Using lean() for faster processing and to allow adding custom properties
      User.countDocuments({ role: "student" }),
    ]);

    // 2. Map through students to find how many books they currently have (not returned)
    const studentsWithCounts = await Promise.all(
      rawStudents.map(async (student) => {
        // Count documents in BorrowHistory where this student is the borrower
        // and the book has not been returned yet
        const activeIssuesCount = await BorrowHistory.countDocuments({
          borrowed_by: student._id,
          book_returned: false,
        });

        return {
          ...student,
          active_books_count: activeIssuesCount,
        };
      })
    );

    res.json({
      success: true,
      students: studentsWithCounts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalStudents: total,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch students" });
  }
};

// ============================
// Search students (all results, no pagination)
// Route: GET /students/search?q=<query>
// ============================
exports.searchStudents = async (req, res) => {
  try {
    const { q, batch, status, limit, page } = req.query;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    // 1. Build the Match Stage
    let matchStage = { role: "student" };

    // Search Query (Name, ID, or Email)
    if (q) {
      matchStage.$or = [
        { name: { $regex: q, $options: "i" } },
        { student_id: { $regex: q, $options: "i" } }, // Matches EJS student_id
        { email: { $regex: q, $options: "i" } },
      ];
    }

    // Batch Filter (from dropdown)
    if (batch) {
      matchStage.batch = batch;
    }

    // Status Filter (from dropdown)
    if (status) {
      matchStage.status = status;
    }

    // 2. The Aggregation Pipeline
    const pipeline = [
      { $match: matchStage },
      // Lookup borrowed books for each student
      {
        $lookup: {
          from: "borrowhistories",
          localField: "_id",
          foreignField: "borrowed_by",
          as: "borrowHistory",
        },
      },
      // Calculate active_books_count (where book_returned is false)
      {
        $addFields: {
          active_books_count: {
            $size: {
              $filter: {
                input: "$borrowHistory",
                as: "history",
                cond: { $eq: ["$$history.book_returned", false] },
              },
            },
          },
        },
      },
      // Remove the full borrowHistory array to keep the response light
      { $project: { borrowHistory: 0 } },
    ];

    // 3. Execute Pagination and Data Fetching
    const [countResult, students] = await Promise.all([
      User.aggregate([...pipeline, { $count: "total" }]),
      User.aggregate([
        ...pipeline,
        { $sort: { created_at: -1 } },
        { $skip: skip },
        { $limit: limitNum },
      ]),
    ]);

    const totalStudents = countResult[0] ? countResult[0].total : 0;

    res.status(200).json({
      success: true,
      students: students,
      totalStudents: totalStudents,
      totalPages: Math.ceil(totalStudents / limitNum),
      currentPage: pageNum,
    });
  } catch (err) {
    console.error("Student Search Error:", err);
    res.status(500).json({ success: false, message: "Search failed" });
  }
};

exports.getAllBatches = async (req, res) => {
  try {
    // Get unique strings from the 'batch' field
    const batches = await User.distinct("batch");

    // Clean and sort (highest/newest years first)
    const sortedBatches = batches
      .filter((b) => b && b.trim() !== "" && b.trim() != "00-00")
      .sort((a, b) => b.localeCompare(a));

    res.status(200).json({
      success: true,
      batches: sortedBatches,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching batches" });
  }
};
// ============================
// Get student by roll number
// Route: GET /students/by-roll/:roll_no
// ============================
exports.getStudentByRoll = async (req, res) => {
  try {
    const student = await User.findOne({ roll_no: req.params.roll_no });
    if (!student) return res.status(404).json({ message: "Student not found" });

    res.json(student);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch student" });
  }
};

// ============================
// UI: Render students page
// Route: GET /students
// ============================
exports.renderStudentPage = (req, res) => {
  res.render("students"); // students.ejs
};
// Render the Detail Page
exports.renderProfilePage = async (req, res) => {
  try {
    const student = await Student.findOne({ roll_no: req.params.roll_no });
    if (!student) return res.status(404).send("Student not found");
    res.render("studentDetails", { student });
  } catch (err) {
    res.status(500).send("Error loading profile");
  }
};

// Update Student API
exports.updateStudent = async (req, res) => {
  try {
    const updated = await Student.findOneAndUpdate(
      { roll_no: req.params.roll_no },
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: "Update failed" });
  }
};

// Delete Student API
exports.deleteStudent = async (req, res) => {
  try {
    await Student.findOneAndDelete({ roll_no: req.params.roll_no });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
};

// ============================
// UI: Render Profile Details Page
// Route: GET /students/details/:roll_no
// ============================
exports.renderProfilePage = async (req, res) => {
  try {
    const student = await User.findOne({
      roll_no: req.params.roll_no,
      role: "student",
    });
    if (!student) return res.status(404).send("Student profile not found");
    res.render("studentDetails", { student });
  } catch (err) {
    res.status(500).send("Error loading profile");
  }
};

// ============================
// API: Update Student Details & Status
// Route: PUT /students/update/:roll_no
// ============================
exports.updateStudent = async (req, res) => {
  try {
    const { name, email, stream, phone, isActive } = req.body;
    const updated = await User.findOneAndUpdate(
      { roll_no: req.params.roll_no },
      { name, email, stream, phone, isActive },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ error: "Student not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: "Update failed" });
  }
};

// ============================
// API: Delete Student Record
// Route: DELETE /students/delete/:roll_no
// ============================
exports.deleteStudent = async (req, res) => {
  try {
    const deleted = await User.findOneAndDelete({
      roll_no: req.params.roll_no,
    });
    if (!deleted) return res.status(404).json({ error: "Student not found" });
    res.json({ success: true, message: "Record permanently removed" });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
};
