// config/mssql.js
const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  server: process.env.MSSQL_SERVER,
  database: process.env.MSSQL_DATABASE,
  port: parseInt(process.env.MSSQL_PORT, 10),
  options: {
    encrypt: false, // dùng false nếu là mạng nội bộ
    trustServerCertificate: true,
  },
};

async function getSqlServerConnection() {
  try {
    const pool = await sql.connect(config);
    return pool;
  } catch (err) {
    console.error('❌ MSSQL Connection Error:', err);
    throw err;
  }
}

module.exports = { getSqlServerConnection };
