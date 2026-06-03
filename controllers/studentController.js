const db = require("../config/db");
const scanGitHub = require("../config/githubScanner");
const { decideApplicationStatus } = require("../config/autoApplicationDecider");
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
      `SELECT a.*, t.title, t.required_skill, t.task_type, t.max_applicants, t.min_skill_score, bp.company_name
             FROM applications a
             JOIN tasks t ON a.task_id = t.task_id
             JOIN business_profiles bp ON t.business_id = bp.profile_id
             WHERE a.student_id = $1
             ORDER BY a.applied_at DESC`,
      [profile.profile_id],
    );

    const [recommended] = await db.query(
      `SELECT t.*, bp.company_name,
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
         AND t.min_skill_score <= $1
         AND NOT EXISTS (
           SELECT 1 FROM applications a
           WHERE a.task_id = t.task_id
             AND a.student_id = $2
         )
         AND (t.max_applicants IS NULL OR COALESCE(accepted_counts.total_accepted, 0) < t.max_applicants)
       ORDER BY t.posted_at ASC
       LIMIT 4`,
      [profile.ai_skill_score, profile.profile_id],
    );

    const [submissions] = await db.query(
      `SELECT s.submission_id, s.submission_url, s.notes, s.feedback, s.endorsement_rating,
          s.endorsement_status, s.endorsed_at, s.submitted_at,
          a.application_id, t.title AS task_title, bp.company_name
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
      submittedApplicationIds: submissions.map((s) => s.application_id),
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

  //gurd : only students can apply
  if (!req.session.user || req.session.user.user_type !== "student") {
    return res.status(403).send("Only studnets can apply for tasks.");
  }
  try {
    const [rows] = await db.query(
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
       WHERE t.task_id = $1`,
      [task_id],
    );
    const task = rows[0];
    if (
      !task ||
      task.status !== "open" ||
      (task.max_applicants !== null && task.slots_remaining <= 0)
    ) {
      return res.render("apply", {
        user: req.session.user,
        task: task || {},
        error: "This task is no longer accepting applications.",
      });
    }
    res.render("apply", { user: req.session.user, task, error: null });
  } catch (err) {
    console.error(err);
    res.send("Task not found.");
  }
};

exports.postApply = async (req, res) => {
  const { task_id } = req.body;

  if (!req.session.user || req.session.user.user_type !== "student") {
    return res.status(403).send("Only studnets can apply for tasks");
  }
  const user_id = req.session.user.user_id;
  try {
    const [pRows] = await db.query(
      "SELECT profile_id, github_username FROM student_profiles WHERE user_id = $1",
      [user_id],
    );
    const studentProfile = pRows[0];

    // Verify task is still open and check max applicants if configured
    const [tRows] = await db.query(
      "SELECT required_skill, status, max_applicants FROM tasks WHERE task_id = $1",
      [task_id],
    );
    const task = tRows[0];
    if (!task || task.status !== "open") {
      return res.render("apply", {
        user: req.session.user,
        task: task || {},
        error: "This task is no longer open.",
      });
    }

    const [acceptedRows] = await db.query(
      "SELECT COUNT(*) AS accepted_count FROM applications WHERE task_id = $1 AND status = 'accepted'",
      [task_id],
    );
    const acceptedCount = Number(acceptedRows[0].accepted_count || 0);
    if (
      task.max_applicants !== null &&
      task.max_applicants !== undefined &&
      acceptedCount >= task.max_applicants
    ) {
      await db.query("UPDATE tasks SET status = 'closed' WHERE task_id = $1", [
        task_id,
      ]);
      return res.render("apply", {
        user: req.session.user,
        task,
        error: "This task has reached its applicant limit.",
      });
    }

    const requiredSkillString = task.required_skill;
    const requiredSkills = requiredSkillString
      ? requiredSkillString.split(",").map((s) => s.trim())
      : [];

    // Auto-decide status before inserting the application
    let status = "rejected";
    let statusReason = null;
    if (studentProfile.github_username) {
      try {
        const decision = await decideApplicationStatus(
          studentProfile.github_username,
          requiredSkills,
        );
        status = decision.status || "rejected";
        statusReason = decision.reason || null;
      } catch (err) {
        console.error("Auto-decision failed:", err.message);
        statusReason = "GitHub skill matching failed.";
      }
    } else {
      console.warn(
        "No GitHub username found for student profile",
        studentProfile.profile_id,
      );
      statusReason = "GitHub username is missing.";
    }

    const [insertResult] = await db.query(
      "INSERT INTO applications (task_id, student_id, status, status_reason) VALUES ($1, $2, $3, $4) RETURNING application_id",
      [task_id, studentProfile.profile_id, status, statusReason],
    );
    const application_id = insertResult.application_id;

    if (status === "accepted" && task.max_applicants != null) {
      const [newAcceptedRows] = await db.query(
        "SELECT COUNT(*) AS accepted_count FROM applications WHERE task_id = $1 AND status = 'accepted'",
        [task_id],
      );
      const newAcceptedCount = Number(newAcceptedRows[0].accepted_count || 0);
      if (newAcceptedCount >= task.max_applicants) {
        await db.query(
          "UPDATE tasks SET status = 'closed' WHERE task_id = $1",
          [task_id],
        );
      }
    }

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
      `SELECT a.*, t.title,
              EXISTS(SELECT 1 FROM submissions s WHERE s.application_id = a.application_id) AS has_submission
         FROM applications a
         JOIN tasks t ON a.task_id = t.task_id
        WHERE a.application_id = $1`,
      [application_id],
    );
    const application = rows[0];
    if (!application) {
      return res.send("Application not found.");
    }
    if (application.has_submission) {
      return res.redirect("/student/dashboard");
    }
    if (application.status !== "accepted") {
      return res.render("submit", {
        user: req.session.user,
        application,
        error: "Only accepted applications can be submitted.",
      });
    }
    res.render("submit", {
      user: req.session.user,
      application,
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
    const [rows] = await db.query(
      `SELECT a.*, t.title,
              EXISTS(SELECT 1 FROM submissions s WHERE s.application_id = a.application_id) AS has_submission
         FROM applications a
         JOIN tasks t ON a.task_id = t.task_id
        WHERE a.application_id = $1`,
      [application_id],
    );
    const application = rows[0];
    if (!application) {
      return res.render("submit", {
        user: req.session.user,
        application: { application_id },
        error: "Application not found.",
      });
    }
    if (application.has_submission) {
      return res.render("submit", {
        user: req.session.user,
        application,
        error: "This application already has a submission.",
      });
    }
    if (application.status !== "accepted") {
      return res.render("submit", {
        user: req.session.user,
        application,
        error: "Only accepted applications can be submitted.",
      });
    }

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
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const absoluteHtmlContent = String(htmlContent).replace(
      /(href|src)=["']\//g,
      `$1="${baseUrl}/`,
    );

    const options = { format: "A4" };
    const file = { content: absoluteHtmlContent };
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
