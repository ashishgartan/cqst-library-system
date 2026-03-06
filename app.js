require("dotenv").config();
// require("./cron/fines.cron");
const express = require("express");
const cookieParser = require("cookie-parser"); // 1. Import it
const connectDB = require("./config/db");
const morgan = require("morgan"); // ← add this
const { injectUserIntoHeader } = require("./middleware/auth.middleware");
const app = express();
connectDB();
const User = require("./models/User"); // Your Mongoose User model
// HTTP request logger
app.use(morgan("dev")); // ← add this

// To parse URL-encoded form data (for single entry forms)
app.use(express.urlencoded({ extended: true }));

// To parse JSON data (if needed for APIs)
app.use(express.json());

app.use(express.static("public"));
app.use(express.static("public/uploads/bookcovers"));
app.use(express.static("public/uploads/profilephotos"));
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(cookieParser()); // 2. Use it (Must be before routes!)
app.get("/get-all-users", async (req, res) => {
  try {
    // We REMOVE the .select("-password") to include the field
    const users = await User.find({});

    const userList = users.map((user) => ({
      id: user._id,
      email: user.email,
      // If you used bcrypt.hash(), this will be a HASH (cannot be decrypted)
      // If you saved raw text, this will be the PLAIN PASSWORD
      password: user.password,
    }));

    res.status(200).json({
      success: true,
      message: "DEBUG MODE: Passwords included",
      data: userList,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});
app.use(injectUserIntoHeader);
// --- Main routes ---
app.use("/", require("./routes/index"));
// This route is for LOCAL DEVELOPMENT ONLY. Never put this on a real website.

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
