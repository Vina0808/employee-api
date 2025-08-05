// oracleClient.js
const oracledb = require('oracledb');
require('dotenv').config();

async function queryOracle(sql, params = []) {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectionString: process.env.ORACLE_CONNECTION_STRING,
    });

    const result = await connection.execute(sql, params, {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });

    return result.rows;
  } catch (err) {
    console.error('Oracle error:', err);
    throw err;
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

module.exports = { queryOracle };
