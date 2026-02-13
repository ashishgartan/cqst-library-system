// const { Parser } = require("json2csv");
// const Book = require("../models/Book");
// const User = require("../models/User");

// // Export Books to CSV with Filters
// exports.exportBooks = async (req, res) => {
//   try {
//     const { q, subject, genre } = req.query;
//     let queryFilter = { isActive: true };

//     // Apply Search/Filter logic
//     if (q) {
//       queryFilter.$or = [
//         { title: { $regex: q, $options: "i" } },
//         { author: { $regex: q, $options: "i" } },
//         { ref_no: { $regex: q, $options: "i" } },
//       ];
//     }
//     if (subject) queryFilter.subject = subject;
//     if (genre) queryFilter.genre = genre;

//     const books = await Book.find(queryFilter).sort({ title: 1 }).lean();

//     const fields = [
//       "ref_no",
//       "title",
//       "author",
//       "subject",
//       "genre",
//       "publisher",
//       "publish_year",
//     ];
//     const json2csvParser = new Parser({ fields });
//     const csv = json2csvParser.parse(books);

//     res.header("Content-Type", "text/csv");
//     res.attachment(
//       `books_export_${new Date().toISOString().split("T")[0]}.csv`
//     );
//     return res.send(csv);
//   } catch (err) {
//     res.status(500).json({ message: "Export failed", error: err.message });
//   }
// };

// // Export Students to CSV with Filters
// exports.exportStudents = async (req, res) => {
//   try {
//     const { q, stream, batch } = req.query;
//     let queryFilter = { role: "student", isActive: true };

//     // Apply Search/Filter logic
//     if (q) {
//       queryFilter.$or = [
//         { name: { $regex: q, $options: "i" } },
//         { roll_no: { $regex: q, $options: "i" } },
//         { student_id: { $regex: q, $options: "i" } },
//       ];
//     }
//     if (stream) queryFilter.stream = stream;
//     if (batch) queryFilter.batch = batch;

//     const students = await User.find(queryFilter).sort({ roll_no: 1 }).lean();

//     const fields = [
//       "name",
//       "roll_no",
//       "student_id",
//       "stream",
//       "email",
//       "batch",
//       "phone",
//     ];
//     const json2csvParser = new Parser({ fields });
//     const csv = json2csvParser.parse(students);

//     res.header("Content-Type", "text/csv");
//     res.attachment(
//       `students_export_${new Date().toISOString().split("T")[0]}.csv`
//     );
//     return res.send(csv);
//   } catch (err) {
//     res.status(500).json({ message: "Export failed", error: err.message });
//   }
// };
const { Parser } = require("json2csv");
const Book = require("../models/Book");
const User = require("../models/User");
const BorrowHistory = require("../models/BorrowHistory");

// Export ALL Book Fields to CSV
exports.exportBooks = async (req, res) => {
  try {
    const { q, subject, genre } = req.query;
    let queryFilter = { isActive: true };

    if (q) {
      queryFilter.$or = [
        { title: { $regex: q, $options: "i" } },
        { author: { $regex: q, $options: "i" } },
        { ref_no: { $regex: q, $options: "i" } },
      ];
    }
    if (subject) queryFilter.subject = subject;
    if (genre) queryFilter.genre = genre;

    // Fetching all books with lean() to get raw JS objects
    const books = await Book.find(queryFilter).sort({ title: 1 }).lean();

    // Passing no 'fields' to Parser automatically includes every key found in the data
    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(books);

    res.header("Content-Type", "text/csv");
    res.attachment(
      `full_books_export_${new Date().toISOString().split("T")[0]}.csv`
    );
    return res.send(csv);
  } catch (err) {
    res.status(500).json({ message: "Export failed", error: err.message });
  }
};

// Export ALL Student Fields to CSV
exports.exportStudents = async (req, res) => {
  try {
    const { q, stream, batch } = req.query;
    let queryFilter = { role: "student", isActive: true };

    if (q) {
      queryFilter.$or = [
        { name: { $regex: q, $options: "i" } },
        { roll_no: { $regex: q, $options: "i" } },
        { student_id: { $regex: q, $options: "i" } },
      ];
    }
    if (stream) queryFilter.stream = stream;
    if (batch) queryFilter.batch = batch;

    const students = await User.find(queryFilter).sort({ roll_no: 1 }).lean();

    // Removing the explicit 'fields' list ensures hidden fields like 'password'
    // and 'profile_photo' are included.
    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(students);

    res.header("Content-Type", "text/csv");
    res.attachment(
      `full_students_export_${new Date().toISOString().split("T")[0]}.csv`
    );
    return res.send(csv);
  } catch (err) {
    res.status(500).json({ message: "Export failed", error: err.message });
  }
};

// Export Book Borrowing History to CSV
exports.exportBorrowHistory = async (req, res) => {
  try {
    const {
      student_id,
      ref_no,
      status,
      is_fined,
      borrow_date,
      return_date,
      actual_return_date,
      issued_by,
      received_by,
    } = req.query;

    let queryFilter = {};

    // --- Database Level Filters (Mongoose) ---
    if (status) queryFilter.status = status;
    if (is_fined) queryFilter.is_fined = is_fined === "true";

    // Date Filters (Exact or Greater Than)
    if (borrow_date) queryFilter.borrow_date = { $gte: new Date(borrow_date) };
    if (return_date) queryFilter.return_date = { $gte: new Date(return_date) };
    if (actual_return_date)
      queryFilter.actual_return_date = { $gte: new Date(actual_return_date) };

    // --- Fetch and Populate ---
    let history = await BorrowHistory.find(queryFilter)
      .populate("borrowed_by", "name student_id roll_no")
      .populate("borrowed_book", "title ref_no")
      .populate("issued_by", "name")
      .populate("received_by", "name")
      .sort({ borrow_date: -1 })
      .lean();

    // --- Post-Fetch Filtering for Nested Fields ---
    if (student_id || ref_no || issued_by || received_by) {
      history = history.filter((item) => {
        const matchStudent = student_id
          ? item.borrowed_by?.student_id?.includes(student_id) ||
            item.borrowed_by?.roll_no?.includes(student_id)
          : true;

        const matchBook = ref_no
          ? item.borrowed_book?.ref_no?.includes(ref_no)
          : true;

        const matchIssued = issued_by
          ? item.issued_by?.name
              ?.toLowerCase()
              .includes(issued_by.toLowerCase())
          : true;

        const matchReceived = received_by
          ? item.received_by?.name
              ?.toLowerCase()
              .includes(received_by.toLowerCase())
          : true;

        return matchStudent && matchBook && matchIssued && matchReceived;
      });
    }

    if (history.length === 0) {
      return res
        .status(404)
        .json({ message: "No data found for these filters" });
    }

    // --- CSV Mapping ---
    const csvData = history.map((record) => ({
      "Student Name": record.borrowed_by?.name || "N/A",
      "Student ID": record.borrowed_by?.student_id || "N/A",
      "Book Title": record.borrowed_book?.title || "N/A",
      "Book Ref No": record.borrowed_book?.ref_no || "N/A",
      "Borrow Date": record.borrow_date
        ? record.borrow_date.toISOString().split("T")[0]
        : "",
      "Return Date": record.return_date
        ? record.return_date.toISOString().split("T")[0]
        : "",
      "Actual Return Date": record.actual_return_date
        ? record.actual_return_date.toISOString().split("T")[0]
        : "Pending",
      Status: record.status,
      Fine: record.fine || 0,
      "Is Fined": record.is_fined ? "Yes" : "No",
      "Fined Imposed": record.fine_imposed ? record.fine_imposed : "N/A",
      "Fine Paid": record.fine_paid ? record.fine_paid : "N/A",
      "Issued By": record.issued_by?.name || "N/A",
      "Received By": record.received_by?.name || "N/A",
    }));

    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(csvData);

    res.header("Content-Type", "text/csv");
    res.attachment(`Borrow_Report_${Date.now()}.csv`);
    return res.send(csv);
  } catch (err) {
    console.error("Export Controller Error:", err);
    res.status(500).json({ message: "Export failed", error: err.message });
  }
};
