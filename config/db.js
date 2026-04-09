const { pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  assword: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

//helper so the rest of the code works the same as before.
//MySQL returns [rows], Postgres returns {rows} - this wrapper
//normalizes it so every awai db.query() call still works.

const db = {
  query: async (text, params) => {
    const res = await pool.query(text, params);
    return [res.rows, res.fields];
  },
};

module.exports = db;
