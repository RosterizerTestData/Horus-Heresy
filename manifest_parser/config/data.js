const mysql = require("mysql");

//Database connection
const pool  = mysql.createPool({
  connectionLimit : 7,
  host            : 'localhost',
  user            : 'root',
  password        : 'root',
  database        : 'wahapedia',
  charset         : "utf8mb4_unicode_ci"
});

module.exports = pool;