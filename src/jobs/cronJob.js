const cron = require('node-cron');
const oracledb = require('oracledb');
require('dotenv').config();

async function getOracleConnection() {
  return await oracledb.getConnection({
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECTION_STRING,
  });
}

// Hàm xử lý dữ liệu tự động
async function fetchAndLogData() {
  let connection;
  try {
    connection = await getOracleConnection();

    const result = await connection.execute(`
      SELECT COUNT(*) AS TOTAL FROM VNP_BPC.FACT_HQKD_KENH_BAN_GOI_2025
    `);

    console.log(`🕒 [CronJob] Tổng số dòng hiện tại:`, result.rows[0].TOTAL);

    // Sau này bạn có thể thêm logic lưu vào MongoDB, gửi thông báo, ghi log, v.v.

  } catch (err) {
    console.error('❌ CronJob Error:', err);
  } finally {
    if (connection) await connection.close();
  }
}

// Lên lịch chạy mỗi ngày lúc 01:00 sáng
cron.schedule('0 1 * * *', () => {
  console.log('🚀 Cron job đang chạy lúc 01:00 sáng...');
  fetchAndLogData();
});

module.exports = { fetchAndLogData };
