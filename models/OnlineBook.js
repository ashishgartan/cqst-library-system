const mongoose = require("mongoose");

const onlineBookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    author: { type: String, required: true },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    file: { type: String, required: true }, // pdf filename
    uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // admin who uploaded
  },
  { timestamps: true }
);

module.exports = mongoose.model("OnlineBook", onlineBookSchema);
