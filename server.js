require("dotenv").config();

const express = require("express");
const session = require("express-session");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const businessRoutes = require("./routes/businessRoutes");
const taskRoutes = require("./routes/taskRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 24 hours
  }),
);

// ── View engine ─────────────────────────────────────────────
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ── Routes ──────────────────────────────────────────────────
app.use("/", authRoutes);
app.use("/student", studentRoutes);
app.use("/business", businessRoutes);
app.use("/tasks", taskRoutes);
app.use("/admin", adminRoutes);
// ── Start ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`CampusLancer running at http://localhost:${PORT}`);
  console.log(
    `Database connected at ${process.env.DB_HOST}:${process.env.DB_PORT}`,
  );
});
