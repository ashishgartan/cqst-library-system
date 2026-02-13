// middleware/auth.middleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");
// Middleware to inject user data into all templates
exports.injectUserIntoHeader = async (req, res, next) => {
  // 1. Get token from cookies (common for web apps) or headers
  const token =
    req.cookies.token ||
    (req.headers.authorization && req.headers.authorization.split(" ")[1]);

  if (!token) {
    res.locals.user = null;
    return next();
  }
  try {
    // 2. Verify Token
    const decoded = jwt.verify(token, process.env.JWT_PRIVATE_KEY);

    // 3. Find user and attach to res.locals (excluding password)
    // Using .lean() makes the query faster for header display
    const user = await User.findById(decoded.id).select("-password").lean();

    res.locals.user = user || null;
    next();
  } catch (error) {
    console.error("JWT Middleware Error:", error.message);
    res.locals.user = null;
    next();
  }
};
exports.isAuthenticated = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.redirect("/auth/login");

  try {
    const decoded = jwt.verify(token, process.env.JWT_PRIVATE_KEY);
    req.user = decoded; // Contains id and role
    console.log(req.user.id);
    next();
  } catch (err) {
    res.clearCookie("token");
    return res.redirect("/auth/login");
  }
};

// NEW: Check if the user is a librarian/admin
exports.isAdmin = (req, res, next) => {
  // Check if req.user exists (from isAuthenticated) and if role is librarian
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    // If not admin, send a 403 Forbidden or redirect
    return res.status(403).render("403", {
      message: "Access Denied: Librarians only.",
    });
  }
};

exports.isGuest = (req, res, next) => {
  const token = req.cookies.token;
  if (token) return res.redirect("/books");
  next();
};
