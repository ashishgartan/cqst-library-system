const express = require("express");
const router = express.Router();
const exportCtrl = require("../../controllers/exportAsCSV.controller");

router.get("/books", exportCtrl.exportBooks);
router.get("/students", exportCtrl.exportStudents);
router.get("/borrow-history", exportCtrl.exportBorrowHistory);


module.exports = router;
