// controllers/api/borrow.api.controller.js
const Book = require("../models/Book");
const User = require("../models/User");
const BorrowHistory = require("../models/BorrowHistory");
const LibrarySettings = require("../models/LibrarySettings");
const {
  calculateCurrentFine,
  finalizeReturnRecord,
} = require("../services/fineService");

exports.borrowBook = async (req, res) => {
  try {
    const { book_id, user_id } = req.body;

    const book = await Book.findById(book_id);
    const user = await User.findById(user_id);

    if (!book || !user)
      return res.status(400).json({ message: "Invalid book or user" });

    // 1. CHECK AVAILABILITY: Is this physical book currently with ANYONE?
    // Since there is no 'stock', we check if any active borrow exists for this book ID.
    const isBookUnavailable = await BorrowHistory.findOne({
      borrowed_book: book_id,
      book_returned: false,
    });

    if (isBookUnavailable) {
      return res.status(400).json({
        message: "This book is currently issued to another user.",
      });
    }

    // 2. Fetch Library Settings
    const settings = (await LibrarySettings.findOne()) || {
      borrow_days_limit: 14,
      max_books_per_student: 5,
    };

    // 3. CHECK USER LIMIT: Has this student reached their borrowing limit?
    const activeBorrowsCount = await BorrowHistory.countDocuments({
      borrowed_by: user_id,
      book_returned: false,
    });

    if (activeBorrowsCount >= settings.max_books_per_student) {
      return res.status(400).json({
        message: `User limit reached. Maximum ${settings.max_books_per_student} books allowed.`,
      });
    }

    // 4. Automated Return Date Logic
    const borrowDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(borrowDate.getDate() + settings.borrow_days_limit);

    // 5. Create History
    const history = await BorrowHistory.create({
      borrowed_by: user._id,
      borrowed_book: book._id,
      borrow_date: borrowDate,
      return_date: dueDate,
      issued_by: req.user.id,
      status: "Borrowed", // Matches your Schema enum ['Borrowed', 'Returned']
      book_returned: false,
    });

    // NOTE: We no longer call book.save() because there is no stock to update.
    // This successfully avoids the "description is required" validation error.

    res.json({ success: true, message: "Book issued successfully", history });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ============================
// Borrow book by student (roll_no + ref_no)
// POST /borrow/borrow-by-student
// ============================
exports.borrowBookByStudent = async (req, res) => {
  try {
    const { roll_no, ref_no, borrow_date } = req.body;
    console.log(req.body);
    const student = await User.findOne({ roll_no });
    const book = await Book.findOne({ ref_no });

    if (!student || !book)
      return res.status(400).json({ message: "Invalid student or book" });

    const isBookCurrentlyBorrowed = await BorrowHistory.findOne({
      borrowed_book: book._id,
      book_returned: false,
    });

    if (isBookCurrentlyBorrowed) {
      return res.status(400).json({
        message:
          "This book is currently issued to another student and is unavailable.",
      });
    }

    const settings = (await LibrarySettings.findOne()) || {
      borrow_days_limit: 14,
      max_books_per_student: 5,
    };

    const studentActiveBorrows = await BorrowHistory.countDocuments({
      borrowed_by: student._id,
      book_returned: false,
    });

    if (studentActiveBorrows >= settings.max_books_per_student) {
      return res.status(400).json({
        message: `Limit reached. You can only borrow up to ${settings.max_books_per_student} books.`,
      });
    }

    // USE BACKDATE IF PROVIDED, OTHERWISE USE CURRENT TIME
    const borrowDate = borrow_date ? new Date(borrow_date) : new Date();
    const dueDate = new Date(borrowDate);
    dueDate.setDate(borrowDate.getDate() + settings.borrow_days_limit);
    // 5. Create History with initialized null values
    const history = await BorrowHistory.create({
      borrowed_by: student._id,
      borrowed_book: book._id,
      borrow_date: borrowDate,
      return_date: dueDate,
      issued_by: req.user.id,
      status: "Borrowed",
      book_returned: false,
      // INITIALIZE THESE TO AVOID "UNDEFINED" ISSUES LATER
      received_by: null,
      actual_return_date: null,
      fine: 0,
      is_fined: false,
    });
    console.log(history);
    res.json({ success: true, message: "Book issued successfully", history });
  } catch (err) {
    // res.status(500).json({ message: err.message });
    res.status(500).json({ message: "Some Server Error Occur! Try Again" });
  }
};

// ============================
// Return a book (with Automated Fine)
// POST /borrow/return-book/:id
// ============================
exports.returnBook = async (req, res) => {
  try {
    const borrow = await BorrowHistory.findById(req.params.id);
    if (!borrow) return res.status(404).json({ message: "Record not found" });

    if (borrow.book_returned)
      return res
        .status(400)
        .json({ message: "This book has already been marked as returned." });

    // 1. Fetch Fine Setting from DB
    const settings = (await LibrarySettings.findOne()) || { fine_per_day: 5 };

    const now = new Date();
    const due = new Date(borrow.return_date);
    let fine = 0;

    // 2. Calculate Fine if overdue
    // If current date is past the due date, calculate the difference in days
    if (now > due) {
      const diffTime = Math.abs(now - due);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      fine = diffDays * settings.fine_per_day;
    }

    // 3. Update History Record
    // We update the borrow record to close the transaction
    borrow.actual_return_date = now;
    borrow.book_returned = true;
    borrow.status = "Returned"; // Matches your Schema enum: ["Borrowed", "Returned"]
    borrow.fine = fine;
    borrow.is_fined = fine > 0;
    borrow.received_by = req.user.id;

    await borrow.save();

    // 4. IMPORTANT: No longer updating book.stock or calling book.save()
    // By not touching the Book model, we avoid the 'description required' validation error.
    // The book is now "Available" because its latest BorrowHistory record has book_returned: true.

    res.json({
      success: true,
      message: "Book returned successfully",
      fine: fine,
      days_overdue:
        now > due ? Math.ceil(Math.abs(now - due) / (1000 * 60 * 60 * 24)) : 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Return process failed" });
  }
};

// ============================
// Borrow history (paginated)
// GET /borrow/history?page=1
// ============================
exports.getBorrowHistoryPaginated = async (req, res) => {
  console.log("Fetching borrow history, page:", req.query.page);
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = req.query.limit;
    const skip = (page - 1) * limit;

    const [histories, total] = await Promise.all([
      BorrowHistory.find()
        .populate("borrowed_by", "name roll_no")
        .populate("borrowed_book", "title ref_no author")
        .populate("issued_by", "name")
        .populate("received_by", "name")
        .skip(skip)
        .limit(limit)
        .sort({ created_at: -1 }),
      BorrowHistory.countDocuments(),
    ]);

    res.json({
      histories,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalResults: total,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// GET /borrow/search?q=...

exports.searchHistory = async (req, res) => {
  try {
    const {
      q,
      student_id,
      ref_no,
      status,
      is_fined,
      borrow_date,
      actual_return_date,
      issued_by,
      received_by,
      page = 1, // Default to page 1
      limit = 10, // Items per page
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    let filter = {};

    // 1. QUICK SEARCH (q)
    if (q) {
      const [users, books] = await Promise.all([
        User.find({
          $or: [
            { name: { $regex: q, $options: "i" } },
            { roll_no: { $regex: q, $options: "i" } },
          ],
        }).select("_id"),
        Book.find({
          $or: [
            { title: { $regex: q, $options: "i" } },
            { ref_no: { $regex: q, $options: "i" } },
          ],
        }).select("_id"),
      ]);

      filter.$or = [
        { borrowed_by: { $in: users.map((u) => u._id) } },
        { borrowed_book: { $in: books.map((b) => b._id) } },
      ];
    }

    // 2. SPECIFIC FILTERS
    if (student_id) {
      const student = await User.findOne({
        roll_no: { $regex: student_id, $options: "i" },
      });
      if (student) filter.borrowed_by = student._id;
    }

    if (ref_no) {
      const book = await Book.findOne({
        ref_no: { $regex: ref_no, $options: "i" },
      });
      if (book) filter.borrowed_book = book._id;
    }

    if (status) {
      filter.book_returned = status === "Returned";
    }

    if (is_fined) {
      filter.fine_imposed = is_fined === "true" ? { $gt: 0 } : 0;
    }

    // 3. DATE FILTERS
    if (borrow_date) {
      const start = new Date(borrow_date);
      const end = new Date(borrow_date);
      end.setDate(end.getDate() + 1);
      filter.borrow_date = { $gte: start, $lt: end };
    }

    if (actual_return_date) {
      const start = new Date(actual_return_date);
      const end = new Date(actual_return_date);
      end.setDate(end.getDate() + 1);
      filter.actual_return_date = { $gte: start, $lt: end };
    }

    // 4. ADMIN FILTERS
    if (issued_by) {
      const admins = await User.find({
        name: { $regex: issued_by, $options: "i" },
      }).select("_id");
      filter.issued_by = { $in: admins.map((a) => a._id) };
    }

    if (received_by) {
      const admins = await User.find({
        name: { $regex: received_by, $options: "i" },
      }).select("_id");
      filter.received_by = { $in: admins.map((a) => a._id) };
    }

    // EXECUTE PAGINATED SEARCH
    const [histories, totalResults] = await Promise.all([
      BorrowHistory.find(filter)
        .populate("borrowed_by")
        .populate("borrowed_book")
        .populate("issued_by", "name")
        .populate("received_by", "name")
        .sort({ book_returned: 1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      BorrowHistory.countDocuments(filter), // Get total count for pagination
    ]);

    res.json({
      success: true,
      totalResults,
      totalPages: Math.ceil(totalResults / limit),
      currentPage: parseInt(page),
      histories,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.getBorrowHistory = async (req, res) => {
  try {
    const q = req.query.q || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    let queryFilter = {};

    // 1. If there's a search query, build the filter
    if (q) {
      const [users, books] = await Promise.all([
        User.find({
          $or: [
            { name: { $regex: q, $options: "i" } },
            { roll_no: { $regex: q, $options: "i" } },
          ],
        }).select("_id"),
        Book.find({
          $or: [
            { title: { $regex: q, $options: "i" } },
            { ref_no: { $regex: q, $options: "i" } },
          ],
        }).select("_id"),
      ]);

      queryFilter = {
        $or: [
          { borrowed_by: { $in: users.map((u) => u._id) } },
          { borrowed_book: { $in: books.map((b) => b._id) } },
        ],
      };
    }

    // 2. Execute paginated query (Search or All)
    const [histories, total] = await Promise.all([
      BorrowHistory.find(queryFilter)
        .populate("borrowed_by", "name roll_no")
        .populate("borrowed_book", "title ref_no author")
        .populate("issued_by", "name")
        .populate("received_by", "name")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit),
      BorrowHistory.countDocuments(queryFilter),
    ]);

    res.json({
      histories,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalResults: total, // Useful for showing "X results found"
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getBorrowStats = async (req, res) => {
  const total = await BorrowHistory.countDocuments();
  const returned = await BorrowHistory.countDocuments({ book_returned: true });
  const active = await BorrowHistory.countDocuments({ book_returned: false });
  res.json({ total, returned, active });
};

// GET /borrow/status/:ref
exports.getBorrowStatusByRef = async (req, res) => {
  try {
    const book = await Book.findOne({ ref_no: req.params.ref });
    if (!book) return res.status(404).json({ message: "Book not found" });

    const active = await BorrowHistory.findOne({
      borrowed_book: book._id,
      book_returned: false,
    });

    res.json({
      ref_no: book.ref_no,
      isBorrowed: !!active,
      borrowedBy: active ? active.borrowed_by : null,
      borrowDate: active ? active.borrow_date : null,
      returnDate: active ? active.return_date : null,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to check status" });
  }
};

// ============================
// UI page
// GET /borrow
// ============================
exports.renderBorrowPage = (req, res) => {
  // res.render("oldborrow"); // create borrow.ejs
  res.render("borrow"); // create borrow.ejs
};
// ============================
// UI page
// GET /borrow/return-book/:id
exports.renderReturnBookPage = async (req, res) => {
  console.log("--- [GET] Initiation Return Page ---");
  console.log("History ID:", req.params.id);

  try {
    const history = await BorrowHistory.findById(req.params.id)
      .populate("borrowed_by")
      .populate("borrowed_book");

    if (!history) {
      console.error("FAIL: History record not found for ID:", req.params.id);
      return res.status(404).send("Record not found");
    }

    const rawFine = await calculateCurrentFine(req.params.id);
    console.log(
      `SUCCESS: Loaded ${history.borrowed_by.name} with fine ₹${rawFine}`
    );

    res.render("returnBookPage", {
      history,
      calculatedFine: rawFine,
    });
  } catch (err) {
    console.error("CRITICAL ERROR:", err.message);
    res.status(500).send("Server Error");
  }
};

// POST /borrow/return-book/:id
exports.handleReturnSettlement = async (req, res) => {
  console.log("--- [POST] Processing Settlement ---");
  console.log("Payload Received:", req.body);

  try {
    const historyId = req.params.id;
    const { actualPaid } = req.body;

    // 1. Validation Check
    if (actualPaid === undefined || actualPaid === null) {
      console.error("VALIDATION FAIL: 'actualPaid' is missing from body");
      return res
        .status(400)
        .json({ success: false, message: "Missing payment amount" });
    }

    // 2. Calculation Trace
    const imposedFine = await calculateCurrentFine(historyId);
    console.log(
      `AUDIT: System Fine = ₹${imposedFine} | User Paid = ₹${actualPaid}`
    );

    // 3. Finalize
    await finalizeReturnRecord(historyId, imposedFine, actualPaid, req.user.id);

    console.log(`TRANSACTION COMPLETE: ID ${historyId} closed successfully.`);
    res.json({ success: true, message: "Settlement finalized successfully" });
  } catch (err) {
    console.error("SETTLEMENT FAIL:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};
