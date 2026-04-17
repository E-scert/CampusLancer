const db = require("../config/db");
const bcrypt = require("bcryptjs");
const scanGitHub = require("../config/githubScanner");

exports.getLanding = (req, res) => res.render("landing");
exports.getLogin = (req, res) => {
  res.render("login", {
    error: null,
    deleted: req.query.deleted || null,
  });
};

// login authentication
exports.postLogin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (rows.length === 0) {
      return res.render("login", {
        error: "Email not found.",
        deleted: req.query.deleted || null,
      });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.render("login", {
        error: "Incorrect password.",
        deleted: req.query.deleted || null,
      });
    }

    req.session.user = {
      user_id: user.user_id,
      email: user.email,
      user_type: user.user_type,
    };

    return user.user_type === "student"
      ? res.redirect("/student/dashboard")
      : res.redirect("/business/dashboard");
  } catch (err) {
    console.error(err);
    res.render("login", {
      error: "Something went wrong. Try again.",
      deleted: req.query.deleted || null,
    });
  }
};

//choice register
exports.getRegisterChoice = (req, res) => res.render("register_choice");
exports.getRegisterStudent = (req, res) =>
  res.render("register_student", { error: null });

exports.postRegisterStudent = async (req, res) => {
  const {
    first_name,
    last_name,
    email,
    password,
    institution,
    course,
    github_username,
    bio,
  } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);

    const [userRows] = await db.query(
      "INSERT INTO users (email, password_hash, user_type) VALUES ($1, $2, $3) RETURNING user_id",
      [email, hash, "student"],
    );
    const user_id = userRows[0].user_id;

    // ── GitHub scan ──────────────────────────────────────
    let ai_skill_score = 0;
    let top_languages = null;
    let ai_suggestions = null;

    if (github_username && github_username.trim() !== "") {
      console.log(`Scanning GitHub for: ${github_username}...`);
      const result = await scanGitHub(github_username.trim());
      ai_skill_score = result.score;
      top_languages = JSON.stringify(result.languages);
      ai_suggestions = JSON.stringify(result.suggestions);
      console.log(`Scan complete. Score: ${ai_skill_score}`);
    }

    //inserts the profile(user data/info) into the data
    await db.query(
      `INSERT INTO student_profiles
             (user_id, first_name, last_name, institution, course, github_username, ai_skill_score, top_languages, ai_suggestions,bio)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,$10)`,
      [
        user_id,
        first_name,
        last_name,
        institution,
        course,
        github_username || null,
        ai_skill_score,
        top_languages,
        ai_suggestions,
        bio || null,
      ],
    );

    req.session.user = { user_id, email, user_type: "student" };
    res.redirect("/student/dashboard");
  } catch (err) {
    console.error(err);
    const error =
      err.code === "23505"
        ? "That email is already registered."
        : "Registration failed. Try again.";
    res.render("register_student", { error });
  }
};

//register bussiness profile
exports.getRegisterBusiness = (req, res) =>
  res.render("register_business", { error: null });

exports.postRegisterBusiness = async (req, res) => {
  const {
    company_name,
    company_email,
    email,
    password,
    industry,
    description,
  } = req.body;
  //insert business info into database of users and profiles
  try {
    const hash = await bcrypt.hash(password, 10);
    const [userRows] = await db.query(
      "INSERT INTO users (email, password_hash, user_type) VALUES ($1, $2, $3) RETURNING user_id",
      [email, hash, "business"],
    );
    const user_id = userRows[0].user_id;
    await db.query(
      `INSERT INTO business_profiles (user_id, company_name, company_email, industry, description)
             VALUES ($1, $2, $3, $4, $5)`,
      [user_id, company_name, company_email, industry, description || null],
    );
    req.session.user = { user_id, email, user_type: "business" };
    res.redirect("/business/dashboard");
  } catch (err) {
    console.error(err);
    const error =
      err.code === "23505"
        ? "That email is already registered."
        : "Registration failed. Try again.";
    res.render("register_business", { error });
  }
};
//returns to landing page //log out.
exports.logout = (req, res) => {
  req.session.destroy();
  res.redirect("/");
};
