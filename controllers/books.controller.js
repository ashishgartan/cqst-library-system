// controllers/books.controller.js
const Book = require("../models/Book"); // Ensure paths are correct
const BorrowHistory = require("../models/BorrowHistory");

// ============================
// API & UI: Get paginated books
// Route: GET /api/books/paginated?page=1
// ============================
// exports.getPaginatedBooks = async (req, res) => {
//   try {
//     // 1. Parse query parameters
//     const { q, category, status, limit } = req.query;
//     const page = parseInt(req.query.page) || 1;
//     const pageLimit = parseInt(limit) || 10;
//     const skip = (page - 1) * pageLimit;

//     // 2. Build the Dynamic Filter Object
//     let query = {};

//     // Search by Title, Author, or ISBN
//     if (q) {
//       query.$or = [
//         { title: { $regex: q, $options: "i" } },
//         { author: { $regex: q, $options: "i" } },
//         { isbn: { $regex: q, $options: "i" } },
//       ];
//     }

//     // Filter by Category (e.g., "Computer Science", "Fiction")
//     if (category) {
//       query.category = category;
//     }

//     // Filter by Availability Status
//     // If status is 'available', we look for books where 'available_copies' > 0
//     if (status === "available") {
//       query.available_copies = { $gt: 0 };
//     } else if (status === "out_of_stock") {
//       query.available_copies = { $eq: 0 };
//     }

//     // 3. Execute Database Operations
//     const [books, total] = await Promise.all([
//       Book.find(query)
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(pageLimit)
//         .lean(), // Lean makes the query faster
//       Book.countDocuments(query),
//     ]);

//     // 4. Send Response
//     res.json({
//       success: true,
//       books,
//       totalPages: Math.ceil(total / pageLimit),
//       currentPage: page,
//       totalBooks: total,
//     });
//   } catch (err) {
//     console.error("Book Pagination Error:", err);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch books from catalog",
//     });
//   }
// };
exports.getPaginatedBooks = async (req, res) => {
  try {
    // 1. Destructure all possible query parameters from the URL
    const { q, limit, status, subject, genre, isActive, page } = req.query;

    const currentPage = parseInt(page) || 1;
    const pageLimit = parseInt(limit) || 10;
    const skip = (currentPage - 1) * pageLimit;

    // 2. Build the Dynamic Filter Object
    let query = {};

    // General Search (Title/Author)
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: "i" } },
        { author: { $regex: q, $options: "i" } },
      ];
    }

    // Exact Match Filters
    if (subject) query.subject = subject;
    if (genre) query.genre = genre;

    // Handle isActive (Convert string "true" to Boolean)
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    // Availability Logic based on the 'status' param
    if (status === "available") {
      query.available_copies = { $gt: 0 };
    } else if (status === "out_of_stock") {
      query.available_copies = { $eq: 0 };
    }

    // 3. Parallel Execution for Speed
    const [books, total] = await Promise.all([
      Book.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit)
        .lean(),
      Book.countDocuments(query),
    ]);

    // 4. Structured JSON Response
    res.json({
      success: true,
      books,
      totalBooks: total,
      totalPages: Math.ceil(total / pageLimit),
      currentPage: currentPage,
      limit: pageLimit,
      activeFilters: { subject, genre, status }, // Useful for frontend debugging
    });
  } catch (err) {
    console.error("Pagination Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error while filtering catalog",
    });
  }
};
// ============================
// API: Search books (all results, no pagination)
// Route: GET /books/search?q=query
// ============================
exports.searchBooks = async (req, res) => {
  try {
    const { q, status, subject, isActive, limit, page } = req.query;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    // 1. Initial Match Stage (Filters for the Book collection)
    let matchStage = {};

    // Quick Search (Title, Author, or Ref No)
    if (q) {
      matchStage.$or = [
        { title: { $regex: q, $options: "i" } },
        { author: { $regex: q, $options: "i" } },
        { ref_no: { $regex: q, $options: "i" } },
      ];
    }

    // Advanced Category Filters
    if (subject) matchStage.subject = subject;

    // Convert string "true"/"false" to actual boolean
    if (isActive !== undefined && isActive !== "") {
      matchStage.isActive = isActive === "true";
    }

    // 2. The Aggregation Pipeline
    const pipeline = [
      { $match: matchStage },
      // Look up current borrowing status in BorrowHistory
      {
        $lookup: {
          from: "borrowhistories", // Collection name in MongoDB (usually plural)
          localField: "_id",
          foreignField: "borrowed_book",
          as: "historyRecords",
        },
      },
      // Add a field 'isBorrowed' by checking if any record has book_returned: false
      {
        $addFields: {
          isBorrowed: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: "$historyRecords",
                    as: "h",
                    cond: { $eq: ["$$h.book_returned", false] },
                  },
                },
              },
              0,
            ],
          },
        },
      },
    ];

    // 3. Filter by Status (calculated from the lookup above)
    if (status === "available") {
      pipeline.push({ $match: { isBorrowed: false } });
    } else if (status === "borrowed") {
      pipeline.push({ $match: { isBorrowed: true } });
    }

    // 4. Execution for Pagination & Data
    // We run two pipelines: one for total count (matching filters) and one for data
    const [countResult, books] = await Promise.all([
      Book.aggregate([...pipeline, { $count: "total" }]),
      Book.aggregate([
        ...pipeline,
        { $sort: { created_at: -1 } },
        { $skip: skip },
        { $limit: limitNum },
        // Remove historyRecords from response to keep it light
        { $project: { historyRecords: 0 } },
      ]),
    ]);

    const totalBooks = countResult[0] ? countResult[0].total : 0;

    res.status(200).json({
      success: true,
      books,
      totalBooks: totalBooks,
      totalPages: Math.ceil(totalBooks / limitNum),
      currentPage: pageNum,
    });
  } catch (error) {
    console.error("Advanced Registry Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error during filtering" });
  }
};
exports.getAllSubjects = async (req, res) => {
  try {
    // .distinct('subject') returns an array of unique strings
    // e.g., ["Science", "Arts", "History"]
    const subjects = await Book.distinct("subject");

    // Filter out any null or empty strings if they exist
    const cleanSubjects = subjects.filter((s) => s && s.trim() !== "");

    res.status(200).json({
      success: true,
      subjects: cleanSubjects.sort(), // Alphabetical order
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching subjects" });
  }
};
// ============================
// API: Get stats
// Route: GET /api/books/stats
// ============================
exports.getBookStats = async (req, res) => {
  const total = await Book.countDocuments();
  res.json({ total });
};

// ============================
// API: Create a book
// Route: POST /api/books
// ============================
exports.createBook = async (req, res) => {
  try {
    const book = await Book.create(req.body);
    res.json(book);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
exports.getBookByRef = async (req, res) => {
  try {
    const book = await Book.findOne({ ref_no: req.params.ref_no });
    if (!book) return res.status(404).json({ message: "Book not found" });

    res.json(book);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch book" });
  }
};
// ============================
// UI: Render books page
// Route: GET /books
// ============================
exports.renderBooksPage = (req, res) => {
  res.render("books"); // we'll create books.ejs next
};

// ============================
// UI: Render Book Details Page
// Route: GET /api/books/details/:id
// ============================
exports.renderDetailsPage = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).send("Book not found");
    res.render("bookDetails", { book });
  } catch (err) {
    res.status(500).send("Error loading book details");
  }
};

// ============================
// API: Update Book (Details & Status)
// Route: PUT /books/:id
// ============================
exports.updateBook = async (req, res) => {
  try {
    // Spread req.body into a new plain object to remove the "null prototype"
    const updateData = { ...req.body };
    console.log("Update Data Received:", req.body);

    // Manual Fix: Multer/Forms send booleans as strings "true"/"false"
    if (updateData.isActive) {
      updateData.isActive = updateData.isActive === "true";
    }

    const updatedBook = await Book.findByIdAndUpdate(
      req.params.id,
      { $set: updateData }, // Using $set ensures we only touch sent fields
      { new: true, runValidators: true }
    );
    console.log("Updated Book:", updatedBook);
    if (!updatedBook) return res.status(404).json({ error: "Book not found" });
    res.json(updatedBook);
  } catch (err) {
    console.error("Update Error:", err);
    res.status(400).json({
      error:
        err.name === "ValidationError"
          ? err.message
          : "Failed to update record.",
    });
  }
};

// ============================
// API: Delete Book
// Route: DELETE /api/books/:id
// ============================
exports.deleteBook = async (req, res) => {
  try {
    await Book.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Book deleted" });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
};
