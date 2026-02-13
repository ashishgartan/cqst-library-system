const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ============================
// SIGNUP Logic
// ============================
exports.signup = async (req, res) => {
  try {
    const { name, email, password, roll_no, stream } = req.body;

    // 1. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }

    // 2. Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Create new user (Role defaults to 'student')
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      roll_no,
      stream,
      role: "student", // Default role
    });

    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Signup failed", error: err.message });
  }
};

// ============================
// LOGIN Logic
// ============================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(req.body);
    const user = await User.findOne({ email });
    console.log(user);

    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    // Check if user is active (Optional but recommended)
    if (user.isActive === false) {
      return res
        .status(403)
        .json({ message: "Account disabled. Contact librarian." });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok)
      return res
        .status(401)
        .json({ message: "Invalid credentials a,sbdlvabs" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_PRIVATE_KEY,
      { expiresIn: "1d" }
    );
    //console.log(token);

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
    });
    console.log("Login success");
    res.json({
      message: "Login success",
      user: { name: user.name, role: user.role },
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Login error" });
  }
};

exports.logout = (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id; // Assuming you have auth middleware

    // 1. Find user and include password (if your schema hides it by default)
    const user = await User.findById(userId).select("+password");

    // 2. Compare current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // 3. Hash the NEW password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
exports.renderLoginPage = (req, res) => {
  res.render("login");
};

exports.renderSignupPage = (req, res) => {
  res.render("signup");
};
exports.renderChangePassword = (req, res) => {
  res.render("changePassword");
};
