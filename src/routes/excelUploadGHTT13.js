const express = require('express');
const router = express.Router();
const multer = require('multer');
const ExcelJS = require('exceljs');
const oracledb = require('oracledb');
require('dotenv').config();

const storage = multer.memoryStorage();
const upload = multer({ storage });

// 🔗 Kết nối Oracle
async function getOracleConnection() {
  return await oracledb.getConnection({
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECTION_STRING,
  });
}

// ✅ POST /api/upload-ght13: Upload Excel vào Oracle
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '⚠️ Không có file nào được gửi lên.' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.worksheets[0];

    const headerRow = worksheet.getRow(1);
    const originalHeaders = headerRow.values.slice(1); // Bỏ index 0

    const validHeaders = originalHeaders
      .map((h, idx) => ({ header: h, index: idx }))
      .filter(h => h.header && String(h.header).trim() !== '');

    if (validHeaders.length !== originalHeaders.length) {
      console.warn('⚠️ Một số cột không có tiêu đề và sẽ bị bỏ qua.');
    }

    const conn = await getOracleConnection();
    let insertedCount = 0;

    // Tìm giá trị THANG_KT từ dòng 2
    const thangKTHeader = validHeaders.find(h => h.header === 'THANG_KT');
    if (!thangKTHeader) {
      return res.status(400).json({ message: '⚠️ Không tìm thấy cột "THANG_KT".' });
    }

    const thangKTCell = worksheet.getRow(2).getCell(thangKTHeader.index + 1).value;
    const thangKT = (typeof thangKTCell === 'object' && thangKTCell?.text) ? thangKTCell.text : thangKTCell;

    // Xóa dữ liệu cũ theo THANG_KT
    await conn.execute(`DELETE FROM BAOCAO_BPC.EXCEL_UPLOAD_GHTT_13 WHERE THANG_KT = :thangKT`, [thangKT]);

    const columnNames = validHeaders.map(h => h.header);
    const placeholders = validHeaders.map((_, i) => `:${i + 1}`);
    const insertSQL = `
      INSERT INTO BAOCAO_BPC.EXCEL_UPLOAD_GHTT_13 (
        ${columnNames.join(', ')}, NGAY_CN
      ) VALUES (
        ${placeholders.join(', ')}, SYSTIMESTAMP
      )
    `;

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);

      const values = validHeaders.map(h => {
        const cellValue = row.getCell(h.index + 1).value;

        if (cellValue instanceof Date) return cellValue;

        if (typeof cellValue === 'object' && cellValue !== null) {
          if (cellValue.result) {
            const d = new Date(cellValue.result);
            return isNaN(d) ? null : d;
          }
          if (cellValue.text) {
            const text = cellValue.text.trim();
            const parts = text.split('/');
            if (parts.length === 3) {
              const [dd, mm, yyyy] = parts;
              const dateObj = new Date(`${yyyy}-${mm}-${dd}`);
              return isNaN(dateObj) ? text : dateObj;
            }
            return text.length > 4000 ? text.slice(0, 4000) : text;
          }
        }

        if (typeof cellValue === 'string') {
          const text = cellValue.trim();
          const parts = text.split('/');
          if (parts.length === 3) {
            const [dd, mm, yyyy] = parts;
            const dateObj = new Date(`${yyyy}-${mm}-${dd}`);
            return isNaN(dateObj) ? text : dateObj;
          }
          return text.length > 4000 ? text.slice(0, 4000) : text;
        }

        return cellValue ?? null; // giữ null cho ô rỗng
      });

      await conn.execute(insertSQL, values, { autoCommit: false });
      insertedCount++;
    }

    await conn.commit();
    await conn.close();

    res.status(200).json({
      message: '✅ Upload vào bảng GHTT_13 thành công!',
      insertedCount
    });
  } catch (error) {
    console.error('❌ Lỗi khi upload:', error);
    res.status(500).json({ message: 'Lỗi xử lý file Excel', error: error.message });
  }
});

// ✅ GET /api/upload-ght13: Lấy dữ liệu GHTT_13
router.get('/', async (req, res) => {
  try {
    const conn = await getOracleConnection();
    const result = await conn.execute(`
      SELECT * FROM BAOCAO_BPC.EXCEL_UPLOAD_GHTT_13
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
