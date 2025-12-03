// db.js
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "localhost",
  user: "root",         // change if different
  password: "Akanksha26@", // change
  database: "RFP",        // the DB you created
});

module.exports = pool;
