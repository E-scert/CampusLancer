const express = require("express");
const router = express.Router();
const business = require("../controllers/businessController");

// Middleware — block access if not logged in as business
const isBusiness = (req, res, next) => {
  if (req.session.user && req.session.user.user_type === "business") {
    return next();
  }
  res.redirect("/login");
};

router.get("/dashboard", isBusiness, business.getDashboard);
router.get("/post-task", isBusiness, business.getPostTask);
router.post("/post-task", isBusiness, business.postPostTask);
router.get("/applicants/:task_id", isBusiness, business.getApplicants);
router.post(
  "/application/update",
  isBusiness,
  business.updateApplicationStatus,
);
router.post("/task/delete/:task_id", isBusiness, business.deleteTask);

router.post("/feedback", isBusiness, business.postFeedback);

module.exports = router;
