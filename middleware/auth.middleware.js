const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Admin = require("../models/Admin"); // FIXED: Import the actual Admin model

exports.injectUserIntoHeader = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    res.locals.user = null;
    return next();
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_PRIVATE_KEY);

    // Find the admin in the database using the ID from the token
    const adminUser = await Admin.findById(decoded.id)
      .select("-password")
      .lean();

    res.locals.user = adminUser || null;
    next();
  } catch (error) {
    res.locals.user = null;
    next();
  }
};

exports.isAuthenticated = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.redirect("/auth/login");

  try {
    const decoded = jwt.verify(token, process.env.JWT_PRIVATE_KEY);

    // Verify this admin actually exists in the DB
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      res.clearCookie("token");
      return res.redirect("/auth/login");
    }

    req.user = admin; // Attach the full admin object to the request
    next();
  } catch (err) {
    res.clearCookie("token");
    return res.redirect("/auth/login");
  }
};

// Simplified: If they passed isAuthenticated, they are an admin
exports.isAdmin = (req, res, next) => {
  if (req.user) {
    next();
  } else {
    return res.status(403).render("403", { message: "Access Denied." });
  }
};
