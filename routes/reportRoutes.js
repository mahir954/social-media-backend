const express = require("express");
const Report = require("../models/Report");

const router = express.Router();

// CREATE REPORT
router.post("/", async (req, res) => {
try {
const {
reporter,
type,
reportedItem,
reportedModel,
reason,
} = req.body;

const newReport = new Report({
  reporter,
  type,
  reportedItem,
  reportedModel,
  reason,
});

await newReport.save();

res.status(201).json({
  message: "Report submitted successfully",
  report: newReport,
});

} catch (error) {
console.error("Report Error:", error);

res.status(500).json({
  message: "Failed to submit report",
});

}
});

module.exports = router;
