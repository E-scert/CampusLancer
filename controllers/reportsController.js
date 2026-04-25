const db = require("../db");

exports.managementSummaryReport = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM business_profiles) AS total_businesses,
        (SELECT COUNT(*) FROM student_profiles) AS total_students,
        (SELECT COUNT(*) FROM tasks WHERE status = 'open') AS open_tasks,
        (SELECT COUNT(*) FROM tasks WHERE status = 'in_progress') AS in_progress_tasks,
        (SELECT COUNT(*) FROM tasks WHERE status = 'closed') AS closed_tasks,
        (SELECT COUNT(*) FROM applications) AS total_applications,
        (SELECT COUNT(*) FROM submissions) AS total_submissions
    `);

    res.render("reports/managementSummary", { data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.send("Could not generate management summary report.");
  }
};
