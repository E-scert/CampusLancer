// controllers/adminController.js
const puppeteer = require("puppeteer");
const db = require("../config/db");
const bcrypt = require("bcryptjs");
const { jsPDF } = require("jspdf");
const { JSDOM } = require("jsdom");
const ejs = require("ejs");
const path = require("path");
const pdf = require("html-pdf-node");

// Admin dashboard
exports.dashboard = (req, res) => {
  res.render("admin_dashboard", { user: req.session.user });
};

// Management summary report
exports.managementSummary = async (req, res) => {
  try {
    const [rows, fields] = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM business_profiles) AS total_businesses,
        (SELECT COUNT(*) FROM student_profiles) AS total_students,
        (SELECT COUNT(*) FROM tasks WHERE status = 'open') AS open_tasks,
        (SELECT COUNT(*) FROM tasks WHERE status = 'in_progress') AS in_progress_tasks,
        (SELECT COUNT(*) FROM tasks WHERE status = 'closed') AS closed_tasks,
        (SELECT COUNT(*) FROM applications) AS total_applications,
        (SELECT COUNT(*) FROM submissions) AS total_submissions
    `);

    res.render("managementSummary", { data: rows[0] });
  } catch (err) {
    console.error(err);
    res.send("Could not generate management summary report.");
  }
};

// Student summary report
exports.studentSummary = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM student_profiles) AS total_students,
        (SELECT COUNT(*) FROM applications) AS total_applications,
        (SELECT COUNT(*) FROM submissions) AS total_submissions
    `);

    res.render("studentSummary", { data: rows[0] });
  } catch (err) {
    console.error(err);
    res.send("Could not generate student summary report.");
  }
};
// admin login
exports.showAdminLogin = (req, res) => {
  res.render("admin_login", { error: null });
};

exports.postAdminLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.query(
      "SELECT * FROM users WHERE email = $1 AND user_type = 'admin'",
      [email],
    );

    if (rows.length === 0) {
      return res.render("admin_login", { error: "Admin email not found." });
    }

    const admin = rows[0];
    const match = await bcrypt.compare(password, admin.password_hash);

    if (!match) {
      return res.render("admin_login", { error: "Incorrect password." });
    }

    req.session.user = {
      user_id: admin.user_id,
      email: admin.email,
      user_type: admin.user_type,
    };

    res.redirect("/admin/dashboard");
  } catch (err) {
    console.error(err);
    res.render("admin_login", { error: "Error during admin login." });
  }
};

// Task status report
exports.taskStatus = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM tasks WHERE status = 'open') AS open_tasks,
        (SELECT COUNT(*) FROM tasks WHERE status = 'in_progress') AS in_progress_tasks,
        (SELECT COUNT(*) FROM tasks WHERE status = 'closed') AS closed_tasks
    `);

    res.render("taskStatus", { data: rows[0] });
  } catch (err) {
    console.error(err);
    res.send("Could not generate task status report.");
  }
};

// Industry summary report
exports.industrySummary = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        bp.industry,
        COUNT(DISTINCT bp.profile_id) AS total_businesses,
        COUNT(t.task_id) AS total_tasks
      FROM business_profiles bp
      LEFT JOIN tasks t ON bp.user_id = t.business_id
      GROUP BY bp.industry
      ORDER BY bp.industry;
    `);

    res.render("industrySummary", { data: rows });
  } catch (err) {
    console.error(err);
    res.send("Could not generate industry summary report.");
  }
};

exports.combinedSummary = async (req, res) => {
  try {
    const [management] = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM business_profiles) AS total_businesses,
        (SELECT COUNT(*) FROM student_profiles) AS total_students,
        (SELECT COUNT(*) FROM tasks) AS total_tasks,
        (SELECT COUNT(*) FROM applications) AS total_applications,
        (SELECT COUNT(*) FROM submissions) AS total_submissions
    `);

    const [student] = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM student_profiles) AS total_students,
        (SELECT COUNT(*) FROM applications) AS total_applications,
        (SELECT COUNT(*) FROM submissions) AS total_submissions
    `);

    const [tasks] = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM tasks WHERE status = 'open') AS open,
        (SELECT COUNT(*) FROM tasks WHERE status = 'in_progress') AS in_progress,
        (SELECT COUNT(*) FROM tasks WHERE status = 'closed') AS closed
    `);

    const [industry] = await db.query(`
      SELECT 
        bp.industry,
        COUNT(DISTINCT bp.profile_id) AS total_businesses,
        COUNT(t.task_id) AS total_tasks
      FROM business_profiles bp
      LEFT JOIN tasks t ON bp.user_id = t.business_id
      GROUP BY bp.industry
      ORDER BY bp.industry;
    `);

    res.render("combinedSummary", {
      management: management[0],
      student: student[0],
      tasks: tasks[0],
      industry: industry,
    });
  } catch (err) {
    console.error(err);
    res.send("Could not generate combined summary.");
  }
};

exports.exportReportsPDF = async (req, res) => {
  try {
    // Fetch data just like combinedSummary
    const [managementRows] = await db.query(`
      SELECT  
        (SELECT COUNT(*) FROM business_profiles) AS total_businesses,
        (SELECT COUNT(*) FROM student_profiles) AS total_students,
        (SELECT COUNT(*) FROM tasks) AS total_tasks,
        (SELECT COUNT(*) FROM applications) AS total_applications,
        (SELECT COUNT(*) FROM submissions) AS total_submissions
    `);

    const [studentRows] = await db.query(`
      SELECT  
        (SELECT COUNT(*) FROM student_profiles) AS total_students,
        (SELECT COUNT(*) FROM applications) AS total_applications,
        (SELECT COUNT(*) FROM submissions) AS total_submissions
    `);

    const [taskRows] = await db.query(`
      SELECT  
        (SELECT COUNT(*) FROM tasks WHERE status = 'open') AS open,
        (SELECT COUNT(*) FROM tasks WHERE status = 'in_progress') AS in_progress,
        (SELECT COUNT(*) FROM tasks WHERE status = 'closed') AS closed
    `);

    const [industryRows] = await db.query(`
      SELECT  
        bp.industry,
        COUNT(DISTINCT bp.profile_id) AS total_businesses,
        COUNT(t.task_id) AS total_tasks
      FROM business_profiles bp
      LEFT JOIN tasks t ON bp.user_id = t.business_id
      GROUP BY bp.industry
      ORDER BY bp.industry;
    `);

    // Render template with actual data
    const templatePath = path.join(__dirname, "../views/combinedSummary.ejs");
    const htmlContent = await ejs.renderFile(templatePath, {
      management: managementRows[0],
      student: studentRows[0],
      tasks: taskRows[0],
      industry: industryRows,
    });

    // Generate PDF with html-pdf-node (recommended for Node)
    const pdf = require("html-pdf-node");
    const options = { format: "A4" };
    const file = { content: htmlContent };
    const pdfBuffer = await pdf.generatePdf(file, options);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=CampusLancer_Report.pdf",
    );
    res.send(pdfBuffer);
  } catch (err) {
    console.error("PDF generation error:", err);
    res.status(500).send("Could not generate PDF report.");
  }
};
