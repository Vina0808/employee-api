const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
require('dotenv').config();

// Route GET lấy dữ liệu bán hàng theo nhân viên từ Oracle DB
router.get('/', async (req, res) => {
  let connection;

  try {
    // Kết nối Oracle DB với biến môi trường đúng
    connection = await oracledb.getConnection({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECTION_STRING
    });
    console.log('✅ Đã kết nối Oracle thành công');

    // Câu SQL lấy dữ liệu, nhớ ghi rõ schema nếu cần
    const sql = `
      SELECT 
        So_dien_thoai_bh, 
        Thoi_gian_giao_dich, 
        So_eload_bh, 
        Hrm_bh, 
        Nhan_vien_bh, 
        Don_vi_bh, 
        Ten_goi_cuoc, 
        Doanh_thu_goi, 
        So_thang, 
        Loai_goi, 
        Don_gia 
      FROM DHNV_BPC.BAN_HANG_NHAN_VIEN
    `;
    console.log('SQL:', sql);

    // Thực thi truy vấn
    const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('Số dòng trả về:', result.rows.length);

    // Trả dữ liệu JSON về client
    res.json(result.rows);

  } catch (err) {
    console.error('Oracle DB query error:', err);
    res.status(500).json({ error: 'Lỗi truy vấn Oracle DB' });
  } finally {
    // Đóng kết nối Oracle dù có lỗi hay không
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing Oracle DB connection:', err);
      }
    }
  }
});

module.exports = router;
