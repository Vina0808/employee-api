const express = require('express');
const router = express.Router();
const multer = require('multer');
const ExcelJS = require('exceljs');
const oracledb = require('oracledb');
require('dotenv').config();

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Kết nối Oracle
async function getOracleConnection() {
  return await oracledb.getConnection({
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECTION_STRING,
  });
}

// ✅ POST: Upload Excel vào Oracle
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '⚠️ Không có file nào được gửi lên.' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.worksheets[0];

    const headerRow = worksheet.getRow(1);
    const originalHeaders = headerRow.values.slice(1); // Bỏ index 0

    // Lọc bỏ các cột không có tiêu đề
    const validHeaders = originalHeaders
      .map((h, idx) => ({ header: h, index: idx }))
      .filter(h => h.header && String(h.header).trim() !== '');

    if (validHeaders.length !== originalHeaders.length) {
      console.warn('⚠️ Một số cột không có tiêu đề và sẽ bị bỏ qua.');
    }

    const conn = await getOracleConnection();
    let insertedCount = 0;

    // Lấy Tháng DL từ dòng 2
    const thangDLHeader = validHeaders.find(h => h.header === 'Tháng DL');
    if (!thangDLHeader) {
      return res.status(400).json({ message: '⚠️ Không tìm thấy cột "Tháng DL".' });
    }

    const monthDL = worksheet.getRow(2).getCell(thangDLHeader.index + 1).value;

    // Xoá dữ liệu cũ theo THANG_DL
    await conn.execute(`DELETE FROM DHNV_BPC.EXCEL_UPLOAD WHERE THANG_DL = :thangDL`, [monthDL]);

    // Duyệt từng dòng để insert
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      const values = validHeaders.map(h => row.getCell(h.index + 1).value);

      await conn.execute(
        `INSERT INTO DHNV_BPC.EXCEL_UPLOAD (
          STT, HRM_BH, NHAN_VIEN, PHONG_BAN_HRM, SO_TB, USER_BH, NGAY_BH,
          GOI_CUOC, CHU_KY_GOI, GIA_GOI, LOAI_TB_THANG, HINH_THUC_TB, CONG_CU_BAN_GOI,
          THUE_BAO_HVC, LOAI_GIAO_DICH, DICH_VU_VIEN_THONG, THANG_DL, NGAY_CN
        ) VALUES (
          :1, :2, :3, :4, :5, :6, TO_TIMESTAMP(:7, 'DD/MM/YYYY HH24:MI:SS'),
          :8, :9, :10, :11, :12, :13,
          :14, :15, :16, :17, SYSTIMESTAMP
        )`,
        values,
        { autoCommit: false }
      );

      insertedCount++;
    }

    await conn.commit();
    await conn.close();

    res.status(200).json({
      message: '✅ Upload và lưu dữ liệu vào Oracle thành công!',
      insertedCount
    });
  } catch (error) {
    console.error('❌ Lỗi khi upload:', error);
    res.status(500).json({ message: 'Lỗi xử lý file Excel', error: error.message });
  }
});

// ✅ GET: Lấy dữ liệu từ EXCEL_UPLOAD cho frontend
router.get('/data', async (req, res) => {
  try {
    const conn = await getOracleConnection();

    const result = await conn.execute(`
      SELECT
        STT AS stt,
        HRM_BH AS hrm_bh,
        NHAN_VIEN AS nhan_vien,
        PHONG_BAN_HRM AS phong_ban_hrm,
        SO_TB AS so_tb,
        USER_BH AS user_bh,
        TO_CHAR(NGAY_BH, 'YYYY-MM-DD HH24:MI:SS') AS ngay_bh,
        GOI_CUOC AS goi_cuoc,
        CHU_KY_GOI AS chu_ky_goi,
        GIA_GOI AS gia_goi,
        LOAI_TB_THANG AS loai_tb_thang,
        HINH_THUC_TB AS hinh_thuc_tb,
        CONG_CU_BAN_GOI AS cong_cu_ban_goi,
        THUE_BAO_HVC AS thue_bao_hvc,
        LOAI_GIAO_DICH AS loai_giao_dich,
        DICH_VU_VIEN_THONG AS dich_vu_vien_thong,
        THANG_DL AS thang_dl,
        TO_CHAR(NGAY_CN, 'YYYY-MM-DD HH24:MI:SS') AS ngay_cn
      FROM DHNV_BPC.EXCEL_UPLOAD
      ORDER BY NGAY_CN DESC
    `, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

    await conn.close();

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('❌ Lỗi khi lấy dữ liệu:', error);
    res.status(500).json({ message: 'Lỗi truy vấn dữ liệu', error: error.message });
  }
});

module.exports = router;
