const express = require("express");
const router = express.Router();
const db = require("../config/db");

// renders the main tasks page, showing all open tasks with company info, and allows filtering by skill or industry
router.get("/", async (req, res) => {
  try {
    const [tasks] = await db.query(
      `SELECT t.*, bp.company_name, bp.industry,
              COALESCE(accepted_counts.total_accepted, 0) AS accepted_count,
              CASE
                WHEN t.max_applicants IS NOT NULL THEN GREATEST(t.max_applicants - COALESCE(accepted_counts.total_accepted, 0), 0)
                ELSE NULL
              END AS slots_remaining
       FROM tasks t
       JOIN business_profiles bp ON t.business_id = bp.profile_id
       LEFT JOIN (
           SELECT task_id, COUNT(*) AS total_accepted
           FROM applications
           WHERE status = 'accepted'
           GROUP BY task_id
       ) accepted_counts ON t.task_id = accepted_counts.task_id
       WHERE t.status = 'open'
         AND (t.max_applicants IS NULL OR COALESCE(accepted_counts.total_accepted, 0) < t.max_applicants)
       ORDER BY t.posted_at DESC`,
    );
    res.render("tasks", { user: req.session.user || null, tasks });
  } catch (err) {
    console.error(err);
    res.send("Could not load tasks.");
  }
});

module.exports = router;
