const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { isAdmin } = require("../middleware/auth");

router.get("/login", adminController.showAdminLogin);
router.post("/login", adminController.postAdminLogin);

router.get("/dashboard", isAdmin, adminController.dashboard);

router.get(
  "/reports/management-summary",
  isAdmin,
  adminController.managementSummary,
);
router.get("/reports/student-summary", isAdmin, adminController.studentSummary);
router.get("/reports/task-status", isAdmin, adminController.taskStatus);
router.get(
  "/reports/industry-summary",
  isAdmin,
  adminController.industrySummary,
);

router.get(
  "/reports/combined-summary",
  isAdmin,
  adminController.combinedSummary,
);
router.get("/reports/export-pdf", isAdmin, adminController.exportReportsPDF);

module.exports = router;
