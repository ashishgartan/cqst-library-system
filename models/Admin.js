const mongoose = require("mongoose");
const { isEmail } = require("validator");

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: [isEmail, "Invalid email"],
    },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, default: "admin", immutable: true },
    profile_photo: { type: String, default: "admin_default.png" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

module.exports = mongoose.model("Admin", adminSchema);
