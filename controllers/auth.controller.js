const User = require("../models/User");
const Admin = require("../models/Admin"); // Import your new Admin model
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ============================
// SIGNUP Logic (Admin Restricted)
// ============================
exports.signup = async (req, res) => {
  try {
    const { name, email, password, adminSecret } = req.body;

    // 1. SECURITY GATE: Only allow signup if a secret key is provided
    // Set ADMIN_SIGNUP_SECRET in your .env file
    if (!adminSecret || adminSecret !== process.env.ADMIN_SIGNUP_SECRET) {
      return res.status(403).json({
        message:
          "Registration is restricted. No new students allowed. Admin access required.",
      });
    }

    // 2. Check if Admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    // 3. Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Create New Admin
    const newAdmin = new Admin({
      name,
      email,
      password: hashedPassword,
      role: "admin",
    });

    await newAdmin.save();
    res.status(201).json({ message: "Admin registered successfully" });
  } catch (err) {
    res.status(500).json({ message: "Signup failed", error: err.message });
  }
};


// ============================
// LOGIN Logic (Simplified)
// ============================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await Admin.findOne({ email });

    // Ensure user exists before checking password
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    if (user.isActive === false) {
      return res.status(403).json({ message: "Account disabled." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    // FIX: Only store the ID in the token
    const token = jwt.sign({ id: user._id }, process.env.JWT_PRIVATE_KEY, {
      expiresIn: "1d",
    });

    res.cookie("token", token, { httpOnly: true });

    res.json({
      message: "Login success",
      user: { name: user.name, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ message: "Login error" });
  }
};

// ============================
// PASSWORD & UTILS
// ============================
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { id, role } = req.user; // From your auth middleware

    // Use the correct Model based on the role in the token
    const Model = role === "admin" ? Admin : User;
    const user = await Model.findById(id);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Incorrect current password" });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ success: true, message: "Password updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.logout = (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
};

// ============================
// VIEW RENDERING
// ============================
exports.renderLoginPage = (req, res) => res.render("login");
exports.renderSignupPage = (req, res) => res.render("signup");
exports.renderChangePassword = (req, res) => res.render("changePassword");
