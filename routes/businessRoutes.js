const express = require("express");
const router = express.Router();
const businessController = require("../controllers/businessController");
const multer = require("multer");
const auth = require("../middleware/auth");

// configure Multer to save files in /uploads
const upload = multer({ dest: "uploads/" });

// Middleware — block access if not logged in as business
const isBusiness = (req, res, next) => {
  if (req.session.user && req.session.user.user_type === "business") {
    return next();
  }
  res.redirect("/login");
};

// ── Dashboard & Tasks ──────────────────────────────────────
router.get("/dashboard", isBusiness, businessController.getDashboard);
router.get("/post-task", isBusiness, businessController.getPostTask);
router.post("/post-task", isBusiness, businessController.postPostTask);
router.get(
  "/applicants/:task_id",
  isBusiness,
  businessController.getApplicants,
);
router.post(
  "/application/update",
  isBusiness,
  businessController.updateApplicationStatus,
);
router.post("/task/delete/:task_id", isBusiness, businessController.deleteTask);

// ── Feedback ───────────────────────────────────────────────
router.post("/feedback", isBusiness, businessController.postFeedback);

// ── Profile ────────────────────────────────────────────────
router.post(
  "/profile/update",
  isBusiness,
  upload.single("profile_picture"),
  businessController.updateProfile,
);
router.get("/profile/edit", isBusiness, businessController.getEditProfile);
router.post("/profile/delete", isBusiness, businessController.deleteProfile);

// ── Reports ────────────────────────────────────────────────
router.get("/reports/summary", isBusiness, businessController.getSummaryReport);
router.get(
  "/reports/export-pdf",
  isBusiness,
  businessController.exportSummaryPDF,
);

module.exports = router;
