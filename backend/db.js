// db.js
const mysql = require("mysql2");

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "root",
  database: process.env.DB_NAME || "flightdb",
  port: 3306
});

function connectWithRetry() {
  db.connect((err) => {
    if (err) {
      console.error("❌ MySQL not ready, retrying in 5 seconds...");
      setTimeout(connectWithRetry, 5000);
    } else {
      console.log("✅ MySQL Connected");
    }
  });
}

connectWithRetry();

module.exports = db;
