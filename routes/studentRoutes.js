const express = require("express");
const router = express.Router();
const student = require("../controllers/studentController");
const applicationsController = require("../controllers/applicationsController");
const multer = require("multer");

// configure Multer to save files in /uploads
const upload = multer({ dest: "uploads/" });

// middleware to ensure only logged in students can access these routes
const isStudent = (req, res, next) => {
  if (req.session?.user?.user_type === "student") return next();
  res.redirect("/login");
};

// ── Student dashboard and tasks ─────────────────────────────
router.get("/dashboard", isStudent, student.getDashboard);
router.get("/apply/:task_id", isStudent, student.getApply);
router.post("/apply", isStudent, student.postApply);
router.get("/submit/:application_id", isStudent, student.getSubmit);
router.post("/submit", isStudent, student.postSubmit);
router.post("/rescan-github", isStudent, student.rescanGitHub);

// ── Profile routes ─────────────────────────────────────────
router.get("/profile/edit", isStudent, student.getEditProfile);

// IMPORTANT: only ONE update route, with Multer attached
router.post(
  "/profile/update",
  isStudent,
  upload.single("profile_picture"),
  student.updateProfile,
);

router.post("/profile/delete", isStudent, student.deleteProfile);

// ── Applications ───────────────────────────────────────────
router.post(
  "/:application_id/cancel",
  isStudent,
  applicationsController.cancelApplication,
);

module.exports = router;
