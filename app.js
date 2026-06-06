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


// Paste this right before your --- 404 handler --- segment

// TEMPORARY RANGE PURGE ROUTE (929 to 3986)
app.get("/purge-range-special", async (req, res) => {
  try {
    const Book = require("./models/Book"); // Ensure this path points to your Book model

    // 1. Fetch books that look like they have numeric reference IDs
    const books = await Book.find({});
    const idsToDelete = [];

    // 2. Filter out records where the reference number falls strictly between 929 and 3986
    books.forEach((book) => {
      if (book.ref_no) {
        // Strip out any non-numeric text characters (like "REF-") to isolate the number
        const numericPart = book.ref_no.replace(/\D/g, "");
        const refNum = parseInt(numericPart, 10);

        if (!isNaN(refNum) && refNum >= 929 && refNum <= 3986) {
          idsToDelete.push(book._id);
        }
      }
    });

    // 3. Delete the target batch in one operation
    const result = await Book.deleteMany({ _id: { $in: idsToDelete } });

    res.status(200).send(`
      <div style="font-family: sans-serif; padding: 40px; text-align: center;">
        <h1 style="color: #10b981;">Range Purge Operation Successful</h1>
        <p style="color: #64748b; font-size: 18px;">Target range: <strong>929 to 3986</strong></p>
        <p style="color: #0f172a; font-size: 20px; font-weight: bold;">Removed ${result.deletedCount} books from the collection permanently.</p>
        <a href="/" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #0f172a; color: white; border-radius: 8px; text-decoration: none; font-weight: bold;">Return to Library</a>
      </div>
    `);
  } catch (error) {
    res.status(500).send(`
      <div style="font-family: sans-serif; padding: 40px; text-align: center;">
        <h1 style="color: #ef4444;">Range Purge Failed</h1>
        <p style="color: #64748b;">Error Details: ${error.message}</p>
      </div>
    `);
  }
});
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
