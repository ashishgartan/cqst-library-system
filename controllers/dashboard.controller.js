const BorrowHistory = require("../models/BorrowHistory");
const User = require("../models/User");
const Book = require("../models/Book");
const { updateActiveFines } = require("../services/fineService");

exports.getStats = async (req, res) => {
  try {
    const [
      totalStudents,
      totalBooks,
      totalBorrows,
      activeBorrows,
      fineAgg,
      latestBorrow,
      trending,
    ] = await Promise.all([
      User.countDocuments({ role: "student" }),
      Book.countDocuments(),
      BorrowHistory.countDocuments(),
      BorrowHistory.countDocuments({ book_returned: false }),
      BorrowHistory.aggregate([
        { $group: { _id: null, total: { $sum: "$fine_paid" } } },
      ]),
      BorrowHistory.findOne()
        .sort({ created_at: -1 })
        .populate("borrowed_by borrowed_book"),
      BorrowHistory.aggregate([
        { $group: { _id: "$borrowed_book", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
        {
          $lookup: {
            from: "books",
            localField: "_id",
            foreignField: "_id",
            as: "book",
          },
        },
      ]),
    ]);

    res.json({
      totalStudents,
      totalBooks,
      totalBorrows,
      activeBorrows,
      totalFine: fineAgg[0]?.total || 0,
      latestBorrow,
      trendingBook: trending[0]?.book[0] || null,
      trendingCount: trending[0]?.count || 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Dashboard stats failed" });
  }
};
exports.renderDashboard = async (req, res) => {
  // await updateActiveFines();
  res.render("dashboard"); // Renders your dashboard.ejs
};
