// controllers/applicationsController.js
const db = require("../config/db"); // adjust path if your db connection file is elsewhere

// Cancel application handler
exports.cancelApplication = async (req, res) => {
  const { application_id } = req.params;
  const user_id = req.session.user.user_id;

  try {
    // Verify the application belongs to this student
    const [rows] = await db.query(
      `SELECT a.application_id
       FROM applications a
       JOIN student_profiles sp ON a.student_id = sp.profile_id
       WHERE a.application_id = $1 AND sp.user_id = $2`,
      [application_id, user_id],
    );

    if (!rows.length) {
      return res.status(403).send("Not authorized to cancel this application.");
    }

    // Update status to cancelled
    await db.query(
      "UPDATE applications SET status = 'cancelled' WHERE application_id = $1",
      [application_id],
    );

    res.redirect("/student/dashboard");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error cancelling application.");
  }
};
