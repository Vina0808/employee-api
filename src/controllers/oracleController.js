// controllers/oracleController.js
const oracledb = require('oracledb');
const dbConfig = require('../config/db');

exports.getFactKenhBanGoi = async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const result = await connection.execute(
      `SELECT * FROM FACT_HQKD_KENH_BAN_GOI`,
      [],
      { outFormat: oracledb.OBJECT }
    );

    res.json({ data: result.rows });
  } catch (err) {
    console.error('Oracle Error:', err);
    res.status(500).json({ error: 'Lỗi kết nối Oracle' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
};
