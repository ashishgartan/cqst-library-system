const mongoose = require("mongoose");

const librarySettingsSchema = new mongoose.Schema(
  {
    fine_per_day: { type: Number, default: 5 },
    max_books_per_student: { type: Number, default: 3 },
    borrow_days_limit: { type: Number, default: 14 },
    reminder_before_days: { type: Number, default: 2 },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } } // timestamps for tracking changes
);

module.exports = mongoose.model("LibrarySettings", librarySettingsSchema);
