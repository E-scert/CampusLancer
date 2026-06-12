const bcrypt = require("bcryptjs");
const db = require("./config/db"); // adjust path if needed

async function createAdmin() {
  const email = "admin@yourdomain.com";
  const password = "12345678"; // plain text
  const hash = await bcrypt.hash(password, 10);

  const [rows] = await db.query(
    "INSERT INTO users (email, password_hash, user_type) VALUES ($1, $2, $3) RETURNING user_id",
    [email, hash, "admin"],
  );

  console.log("Admin created with ID:", rows[0].user_id);
  process.exit();
}

createAdmin();
