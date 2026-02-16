const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User"); // Path to your User model

const seedAdmin = async () => {
  try {
    const adminEmail = "karan@codequotient.com";

    // Check if admin exists
    const adminExists = await User.findOne({ email: adminEmail });

    if (!adminExists) {
      console.log("🚀 Creating admin account...");

      const hashedPassword = await bcrypt.hash("123456", 12);

      await User.create({
        name: "Amit",
        email: adminEmail,
        password: hashedPassword,
        role: "admin", // Crucial for your access control
        // Placeholders for required student fields
        roll_no: "ADMIN_001",
        stream: "STAFF",
        student_id: "ADMIN_ID",
        isActive: true,
      });

      console.log("✅ Admin seeded: amit@codequotient.com / 123456");
    } else {
      console.log("ℹ️ Admin already exists. No seeding required.");
    }
  } catch (error) {
    console.error("❌ Seeding Error:", error);
  }
};

module.exports = seedAdmin;
