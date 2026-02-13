require("dotenv").config();
// require("./cron/fines.cron");
const express = require("express");
const cookieParser = require("cookie-parser"); // 1. Import it
const connectDB = require("./config/db");
const morgan = require("morgan"); // ← add this
const { injectUserIntoHeader } = require("./middleware/auth.middleware");
const app = express();
connectDB();

// HTTP request logger
app.use(morgan("dev")); // ← add this

// To parse URL-encoded form data (for single entry forms)
app.use(express.urlencoded({ extended: true }));

// To parse JSON data (if needed for APIs)
app.use(express.json());

app.use(express.static("public"));
app.use(express.static("public/uploads/bookcovers"));
app.use(express.static("public/uploads/profilephotos"));

app.set("view engine", "ejs");
app.use(cookieParser()); // 2. Use it (Must be before routes!)
app.use(injectUserIntoHeader);
// --- Main routes ---
app.use("/", require("./routes/index"));

// --- 404 handler ---
app.use((req, res) => {
  res.render("404");
});
// Global middleware to pass user to all EJS templates
app.use((req, res, next) => {
  res.locals.user = req.session.user || null; // Or req.user if using Passport.js
  next();
});
app.listen(process.env.PORT, () =>
  console.log(`Server running on http://localhost:${process.env.PORT}`)
);
