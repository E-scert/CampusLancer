require("dotenv").config();

const express = require("express");
const session = require("express-session");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

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

// ── Start ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`CampusLancer running at http://localhost:${PORT}`);
  console.log(
    `Database connected at ${process.env.DB_HOST}:${process.env.DB_PORT}`,
  );
});
