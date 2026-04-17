const express = require("express");
const router = express.Router();
const db = require("../config/db");

// renders the main tasks page, showing all open tasks with company info, and allows filtering by skill or industry
router.get("/", async (req, res) => {
  try {
    const [tasks] = await db.query(
      `SELECT t.*, bp.company_name, bp.industry
             FROM tasks t
             JOIN business_profiles bp ON t.business_id = bp.profile_id
             WHERE t.status = 'open'
             ORDER BY t.posted_at DESC`,
    );
    res.render("tasks", { user: req.session.user || null, tasks });
  } catch (err) {
    console.error(err);
    res.send("Could not load tasks.");
  }
});

module.exports = router;
