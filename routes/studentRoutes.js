const express = require("express");
const router = express.Router();
const student = require("../controllers/studentController");
// middleware to ensure only logged in students can access these routes
const isStudent = (req, res, next) => {
  if (req.session.user && req.session.user.user_type === "student")
    return next();
  res.redirect("/login");
};

router.get("/dashboard", isStudent, student.getDashboard);
router.get("/apply/:task_id", isStudent, student.getApply);
router.post("/apply", isStudent, student.postApply);
router.get("/submit/:application_id", isStudent, student.getSubmit);
router.post("/submit", isStudent, student.postSubmit);
router.post("/rescan-github", isStudent, student.rescanGitHub);

module.exports = router;
