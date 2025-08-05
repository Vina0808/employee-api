// config/oracle.js
const oracledb = require('oracledb');
require('dotenv').config();

async function getConnection() {
  try {
    return await oracledb.getConnection({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECTION_STRING,
    });
  } catch (error) {
    console.error('Lỗi kết nối Oracle:', error);
    throw error;
  }
}

module.exports = { getConnection };
