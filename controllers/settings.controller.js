const LibrarySettings = require("../models/LibrarySettings");

// GET /settings - Render the UI
exports.renderSettingsPage = async (req, res) => {
  try {
    const settings = (await LibrarySettings.findOne()) || new LibrarySettings();
    res.render("settings", { settings });
  } catch (err) {
    res.status(500).send("Error loading settings");
  }
};

// POST /api/settings/update - Update DB values
exports.updateSettings = async (req, res) => {
  try {
    const { fine_per_day, max_books_per_student, borrow_days_limit } = req.body;

    await LibrarySettings.findOneAndUpdate(
      {}, // First document
      { fine_per_day, max_books_per_student, borrow_days_limit },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: "Settings updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
