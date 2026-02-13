const mongoose = require("mongoose");
const { isEmail } = require("validator");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    roll_no: { type: String, required: true, trim: true, index: true }, // for fast search
    stream: { type: String, required: true, trim: true },
    student_id: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      // lowercase: true,
      trim: true,
      validate: [isEmail, "Invalid email"],
    },
    password: { type: String, default: "123456", minlength: 6, trim: true },
    role: { type: String, enum: ["admin", "student"], default: "student" }, // scalable roles
    profile_photo: { type: String, default: "default_profile_photo.png" },
    isActive: { type: Boolean, default: true },
    batch: { type: String }, // e.g., 2022-2026
    phone: { type: String },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

module.exports = mongoose.model("User", userSchema);
