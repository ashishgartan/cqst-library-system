const mongoose = require("mongoose");

const borrowHistorySchema = new mongoose.Schema(
  {
    borrowed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    borrowed_book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },
    borrow_date: { type: Date, required: true },
    return_date: { type: Date, required: true },
    actual_return_date: { type: Date },
    status: {
      type: String,
      enum: ["Borrowed", "Returned"],
      default: "Borrowed",
    },
    book_returned: { type: Boolean, default: false },
    fine_imposed: { type: Number, default: 0 }, // calculated per librarySettings
    fine_paid: { type: Number, default: 0 }, // calculated per librarySettings
    is_fined: { type: Boolean, default: false },
    issued_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    received_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

module.exports = mongoose.model("BorrowHistory", borrowHistorySchema);
