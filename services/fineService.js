// services/fineService.js
const BorrowHistory = require("../models/BorrowHistory");
const Book = require("../models/Book");
const LibrarySettings = require("../models/LibrarySettings");

exports.calculateCurrentFine = async (historyId) => {
  const history = await BorrowHistory.findById(historyId);
  const settings = await LibrarySettings.findOne();

  if (!history) return 0;

  const today = new Date();
  const dueDate = new Date(history.return_date);

  if (today <= dueDate) {
    console.log("FINE CALC: Returned on time. Fine: 0");
    return 0;
  }

  const diffTime = Math.abs(today - dueDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const rate = settings?.fine_per_day || 10;

  const total = diffDays * rate;
  console.log(
    `FINE CALC: Overdue by ${diffDays} days at ₹${rate}/day. Total: ₹${total}`
  );
  return total;
};

exports.finalizeReturnRecord = async (
  historyId,
  imposedFine,
  actualPaid,
  adminId
) => {
  console.log(`SERVICE: Finalizing record ${historyId}...`);

  const history = await BorrowHistory.findByIdAndUpdate(historyId, {
    book_returned: true,
    actual_return_date: new Date(),
    fine_imposed: imposedFine,
    fine_paid: actualPaid,
    received_by: adminId,
    is_fined: imposedFine ? true : false,
  });

  console.log(`SERVICE: Book ID ${history.borrowed_book} marked as AVAILABLE.`);
  return true;
};
