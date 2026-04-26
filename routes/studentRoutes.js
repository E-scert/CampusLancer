const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const applicationsController = require("../controllers/applicationsController");
const multer = require("multer");
const auth = require("../middleware/auth");

// configure Multer to save files in /uploads
const upload = multer({ dest: "uploads/" });

// middleware to ensure only logged in students can access these routes
const isStudent = (req, res, next) => {
  if (req.session?.user?.user_type === "student") return next();
  res.redirect("/login");
};

// ── Student dashboard and tasks ─────────────────────────────
router.get("/dashboard", isStudent, studentController.getDashboard);
router.get("/apply/:task_id", isStudent, studentController.getApply);
router.post("/apply", isStudent, studentController.postApply);
router.get("/submit/:application_id", isStudent, studentController.getSubmit);
router.post("/submit", isStudent, studentController.postSubmit);
router.post("/rescan-github", isStudent, studentController.rescanGitHub);

// ── Profile routes ─────────────────────────────────────────
router.get("/profile/edit", isStudent, studentController.getEditProfile);
router.post(
  "/profile/update",
  isStudent,
  upload.single("profile_picture"),
  studentController.updateProfile,
);
router.post("/profile/delete", isStudent, studentController.deleteProfile);

// ── Applications ───────────────────────────────────────────
router.post(
  "/:application_id/cancel",
  isStudent,
  applicationsController.cancelApplication,
);

// ── Reports ────────────────────────────────────────────────
router.get(
  "/reports/summary",
  auth.isStudent,
  studentController.getSummaryReport,
);
router.get(
  "/reports/export-pdf",
  auth.isStudent,
  studentController.exportSummaryPDF,
);

module.exports = router;
