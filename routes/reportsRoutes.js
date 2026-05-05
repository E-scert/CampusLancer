const express = require("express");
const router = express.Router();
const reportsController = require("../controllers/reportsController");

//management summary
router.get("/management-summary", reportsController.managementSummaryReport);
// Later we’ll add more reports here (student activity, task status, industry, etc.)

module.exports = router;
