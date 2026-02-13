const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema(
  {
    ref_no: { type: String, required: true, unique: true, trim: true },
    isbn: {
      type: String,
      trim: true,
      sparse: true,
      required: false,
    }, // sparse allows multiple nulls
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    publish_year: { type: Number, min: 1000, max: 9999 },
    publisher: { type: String, required: true, trim: true },
    page_count: { type: Number, default: 0 },
    genre: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: false, trim: true },
    front_page: { type: String, default: "default_front_page.png" },
    // back_page: { type: String, default: "default_back_page.png" },
    // stock: { type: Number, default: 1 }, // available copies
    isActive: { type: Boolean, default: true }, // ADD THIS FIELD
    isFake: { type: Boolean, default: true }, // ADD THIS FIELD
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

module.exports = mongoose.model("Book", bookSchema);
