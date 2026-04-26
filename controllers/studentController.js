const db = require("../config/db");
const scanGitHub = require("../config/githubScanner");
const path = require("path");
const ejs = require("ejs");
const pdf = require("html-pdf-node");

//renders the student dashboard, showing their profile info, applications, recommended tasks, and AI suggestions based on their GitHub scan
exports.getDashboard = async (req, res) => {
  const user_id = req.session.user.user_id;
  try {
    const [profileRows] = await db.query(
      "SELECT * FROM student_profiles WHERE user_id = $1",
      [user_id],
    );
    const profile = profileRows[0];

    // Parse stored JSON fields
    const languages = profile.top_languages
      ? JSON.parse(profile.top_languages)
      : [];
    const suggestions = profile.ai_suggestions
      ? JSON.parse(profile.ai_suggestions)
      : [];

    const [applications] = await db.query(
      `SELECT a.*, t.title, t.required_skill, t.task_type, bp.company_name
             FROM applications a
             JOIN tasks t ON a.task_id = t.task_id
             JOIN business_profiles bp ON t.business_id = bp.profile_id
             WHERE a.student_id = $1
             ORDER BY a.applied_at DESC`,
      [profile.profile_id],
    );
    const [recommended] = await db.query(
      `SELECT t.*, bp.company_name
             FROM tasks t
             JOIN business_profiles bp ON t.business_id = bp.profile_id
             WHERE t.status = 'open' AND t.min_skill_score <= $1
             ORDER BY t.posted_at DESC LIMIT 5`,
      [profile.ai_skill_score],
    );

    const [submissions] = await db.query(
      `SELECT s.submission_id, s.submission_url, s.notes, s.feedback, s.submitted_at,
          t.title AS task_title, bp.company_name
   FROM submissions s
   JOIN applications a ON s.application_id = a.application_id
   JOIN tasks t ON a.task_id = t.task_id
   JOIN business_profiles bp ON t.business_id = bp.profile_id
   WHERE a.student_id = $1
   ORDER BY s.submitted_at DESC`,
      [profile.profile_id],
    );

    res.render("student_dashboard", {
      user: req.session.user,
      profile,
      applications,
      recommended,
      languages,
      suggestions,
      submissions,
    });
  } catch (err) {
    console.error(err);
    res.send("Error loading dashboard.");
  }
};

// rescan the student's GitHub profile to update their AI skill score, top languages, and suggestions, then redirect back to the dashboard
exports.rescanGitHub = async (req, res) => {
  const user_id = req.session.user.user_id;
  try {
    const [profileRows] = await db.query(
      "SELECT profile_id, github_username FROM student_profiles WHERE user_id = $1",
      [user_id],
    );
    const profile = profileRows[0];
    if (!profile.github_username) return res.redirect("/student/dashboard");

    console.log(`Rescanning GitHub for: ${profile.github_username}...`);
    const result = await scanGitHub(profile.github_username);
    console.log(`Rescan complete. New score: ${result.score}`);

    await db.query(
      `UPDATE student_profiles
             SET ai_skill_score = $1, top_languages = $2, ai_suggestions = $3
             WHERE profile_id = $4`,
      [
        result.score,
        JSON.stringify(result.languages),
        JSON.stringify(result.suggestions),
        profile.profile_id,
      ],
    );
    res.redirect("/student/dashboard");
  } catch (err) {
    console.error(err);
    res.redirect("/student/dashboard");
  }
};

//renders business tasks to apply for

exports.getApply = async (req, res) => {
  const { task_id } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT t.*, bp.company_name, bp.industry
             FROM tasks t JOIN business_profiles bp ON t.business_id = bp.profile_id
             WHERE t.task_id = $1`,
      [task_id],
    );
    res.render("apply", { user: req.session.user, task: rows[0], error: null });
  } catch (err) {
    console.error(err);
    res.send("Task not found.");
  }
};

exports.postApply = async (req, res) => {
  const { task_id, cover_note } = req.body;
  const user_id = req.session.user.user_id;
  try {
    const [pRows] = await db.query(
      "SELECT profile_id FROM student_profiles WHERE user_id = $1",
      [user_id],
    );
    await db.query(
      "INSERT INTO applications (task_id, student_id, cover_note) VALUES ($1, $2, $3)",
      [task_id, pRows[0].profile_id, cover_note],
    );
    res.redirect("/student/dashboard");
  } catch (err) {
    console.error(err);
    const [tRows] = await db.query("SELECT * FROM tasks WHERE task_id = $1", [
      task_id,
    ]);
    res.render("apply", {
      user: req.session.user,
      task: tRows[0],
      error: "You have already applied to this task.",
    });
  }
};

exports.getSubmit = async (req, res) => {
  const { application_id } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT a.*, t.title FROM applications a
             JOIN tasks t ON a.task_id = t.task_id WHERE a.application_id = $1`,
      [application_id],
    );
    res.render("submit", {
      user: req.session.user,
      application: rows[0],
      error: null,
    });
  } catch (err) {
    console.error(err);
    res.send("Application not found.");
  }
};

exports.postSubmit = async (req, res) => {
  const { application_id, submission_url, notes } = req.body;
  try {
    await db.query(
      "INSERT INTO submissions (application_id, submission_url, notes) VALUES ($1, $2, $3)",
      [application_id, submission_url, notes || null],
    );
    res.redirect("/student/dashboard");
  } catch (err) {
    console.error(err);
    res.render("submit", {
      user: req.session.user,
      application: { application_id },
      error: "Submission failed.",
    });
  }
};
// Render edit profile page
exports.getEditProfile = async (req, res) => {
  console.log("Hit /student/profile/edit route");
  const user_id = req.session.user.user_id;
  try {
    const [pRows] = await db.query(
      "SELECT * FROM student_profiles WHERE user_id = $1",
      [user_id],
    );
    const profile = pRows[0];
    res.render("edit_student_profile", {
      user: req.session.user,
      profile,
    });
  } catch (err) {
    console.error(err);
    res.send("Error loading profile edit page.");
  }
};

// Handle profile update
// Handle profile update (text + picture)
exports.updateProfile = async (req, res) => {
  const {
    student_id,
    first_name,
    last_name,
    institution,
    course,
    bio,
    github_username,
  } = req.body;

  console.log("File received:", req.file); // debug log

  // If a file was uploaded, build the URL; otherwise keep the existing one
  const profilePicUrl = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    await db.query(
      `UPDATE student_profiles 
       SET first_name=$1, last_name=$2, institution=$3, course=$4, bio=$5, github_username=$6,
           profile_pic_url = COALESCE($7, profile_pic_url)
       WHERE profile_id=$8`,
      [
        first_name,
        last_name,
        institution,
        course,
        bio,
        github_username,
        profilePicUrl,
        student_id,
      ],
    );

    // Update session info so changes reflect immediately
    req.session.user.first_name = first_name;
    req.session.user.last_name = last_name;

    res.redirect("/student/dashboard");
  } catch (err) {
    console.error(err);
    res.send("Could not update profile.");
  }
};

// Handle student profile deletion
exports.deleteProfile = async (req, res) => {
  const { student_id } = req.body;
  try {
    // Step 1: Get the user_id before deleting the profile
    const [rows] = await db.query(
      "SELECT user_id FROM student_profiles WHERE profile_id = $1",
      [student_id],
    );
    if (!rows.length) {
      // No profile found
      req.session.destroy();
      return res.redirect("/login?error=noprofile");
    }
    const user_id = rows[0].user_id;

    // Step 2: Delete submissions linked to applications
    await db.query(
      `DELETE FROM submissions 
       WHERE application_id IN (SELECT application_id FROM applications WHERE student_id = $1)`,
      [student_id],
    );

    // Step 3: Delete applications
    await db.query("DELETE FROM applications WHERE student_id = $1", [
      student_id,
    ]);

    // Step 4: Delete student profile
    await db.query("DELETE FROM student_profiles WHERE profile_id = $1", [
      student_id,
    ]);

    // Step 5: Delete the user account itself
    await db.query("DELETE FROM users WHERE user_id = $1", [user_id]);

    // Step 6: Clear session
    req.session.destroy();

    res.redirect("/login?deleted=student");
  } catch (err) {
    console.error(err);
    res.send("Error deleting student profile.");
  }
};

// controllers/studentController.js

exports.getSummaryReport = async (req, res) => {
  const user_id = req.session.user.user_id;
  try {
    // Get student profile_id
    const [profileRows] = await db.query(
      "SELECT profile_id, first_name, last_name, institution, course FROM student_profiles WHERE user_id = $1",
      [user_id],
    );
    const profile = profileRows[0];

    // Handle date filters (default: current month)
    let { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      startDate = startDate || firstDay.toISOString().split("T")[0];
      endDate = endDate || lastDay.toISOString().split("T")[0];
    }

    // Total applications
    const [applicationsCount] = await db.query(
      "SELECT COUNT(*) AS total_applications FROM applications WHERE student_id = $1 AND applied_at BETWEEN $2 AND $3",
      [profile.profile_id, startDate, endDate],
    );

    // Applications by status
    const [statusBreakdown] = await db.query(
      `SELECT status, COUNT(*) AS count 
       FROM applications 
       WHERE student_id = $1 AND applied_at BETWEEN $2 AND $3
       GROUP BY status`,
      [profile.profile_id, startDate, endDate],
    );

    // Total submissions
    const [submissionsCount] = await db.query(
      `SELECT COUNT(*) AS total_submissions 
       FROM submissions s 
       JOIN applications a ON s.application_id = a.application_id 
       WHERE a.student_id = $1 AND s.submitted_at BETWEEN $2 AND $3`,
      [profile.profile_id, startDate, endDate],
    );

    // Recent activity (last 5 applications)
    const [recentApplications] = await db.query(
      `SELECT a.application_id, a.status, a.applied_at, t.title, bp.company_name
       FROM applications a
       JOIN tasks t ON a.task_id = t.task_id
       JOIN business_profiles bp ON t.business_id = bp.profile_id
       WHERE a.student_id = $1 AND a.applied_at BETWEEN $2 AND $3
       ORDER BY a.applied_at DESC
       LIMIT 5`,
      [profile.profile_id, startDate, endDate],
    );

    res.render("student_summary", {
      user: req.session.user,
      profile,
      applicationsCount: applicationsCount[0],
      submissionsCount: submissionsCount[0],
      statusBreakdown,
      recentApplications,
      startDate,
      endDate,
      generatedAt: new Date().toLocaleString(),
    });
  } catch (err) {
    console.error(err);
    res.send("Could not generate student summary report.");
  }
};

// Export student summary as PDF with date filters
exports.exportSummaryPDF = async (req, res) => {
  const user_id = req.session.user.user_id;
  try {
    // Get student profile
    const [profileRows] = await db.query(
      "SELECT profile_id, first_name, last_name, institution, course FROM student_profiles WHERE user_id = $1",
      [user_id],
    );
    const profile = profileRows[0];

    // Handle date filters (default: current month)
    let { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      startDate = startDate || firstDay.toISOString().split("T")[0];
      endDate = endDate || lastDay.toISOString().split("T")[0];
    }

    // Applications count
    const [applicationsCount] = await db.query(
      "SELECT COUNT(*) AS total_applications FROM applications WHERE student_id = $1 AND applied_at BETWEEN $2 AND $3",
      [profile.profile_id, startDate, endDate],
    );

    // Submissions count
    const [submissionsCount] = await db.query(
      `SELECT COUNT(*) AS total_submissions 
       FROM submissions s 
       JOIN applications a ON s.application_id = a.application_id 
       WHERE a.student_id = $1 AND s.submitted_at BETWEEN $2 AND $3`,
      [profile.profile_id, startDate, endDate],
    );

    // Applications by status
    const [statusBreakdown] = await db.query(
      `SELECT status, COUNT(*) AS count 
       FROM applications 
       WHERE student_id = $1 AND applied_at BETWEEN $2 AND $3
       GROUP BY status`,
      [profile.profile_id, startDate, endDate],
    );

    // Recent applications
    const [recentApplications] = await db.query(
      `SELECT a.application_id, a.status, a.applied_at, t.title, bp.company_name
       FROM applications a
       JOIN tasks t ON a.task_id = t.task_id
       JOIN business_profiles bp ON t.business_id = bp.profile_id
       WHERE a.student_id = $1 AND a.applied_at BETWEEN $2 AND $3
       ORDER BY a.applied_at DESC
       LIMIT 5`,
      [profile.profile_id, startDate, endDate],
    );

    // Render the same EJS template into HTML
    const templatePath = path.join(__dirname, "../views/student_summary.ejs");
    const htmlContent = await ejs.renderFile(templatePath, {
      user: req.session.user,
      profile,
      applicationsCount: applicationsCount[0],
      submissionsCount: submissionsCount[0],
      statusBreakdown,
      recentApplications,
      startDate,
      endDate,
      generatedAt: new Date().toLocaleString(),
    });

    // Generate PDF
    const options = { format: "A4" };
    const file = { content: String(htmlContent) };
    const pdfBuffer = await pdf.generatePdf(file, options);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Student_Summary_Report.pdf",
    );
    res.send(pdfBuffer);
  } catch (err) {
    console.error("PDF generation error:", err);
    res.status(500).send("Could not generate student summary PDF.");
  }
};
