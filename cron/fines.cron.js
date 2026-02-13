const cron = require("node-cron");
const BorrowHistory = require("../models/BorrowHistory");
const { calculateFine } = require("../utils/fineCalculator");

cron.schedule("0 0 * * *", async () => {
  console.log("Running daily fine calculation...");

  const overdue = await BorrowHistory.find({
    status: "Borrowed",
    return_date: { $lt: new Date() },
  });

  for (const record of overdue) {
    const fine = calculateFine(record.return_date);

    record.fine = fine;
    record.is_fined = fine > 0;
    await record.save();
  }

  console.log(`Updated ${overdue.length} overdue records`);
});
