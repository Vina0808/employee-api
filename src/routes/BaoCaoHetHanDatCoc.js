const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
require('dotenv').config();

// Kết nối Oracle
async function getOracleConnection() {
  return await oracledb.getConnection({
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECTION_STRING,
  });
}

// ======= HÀM XỬ LÝ NGÀY =======
function convertThangToLastDate(thangNumber) {
  const thangStr = String(thangNumber || '').padStart(6, '0');
  const year = parseInt(thangStr.slice(0, 4), 10);
  const month = parseInt(thangStr.slice(4, 6), 10);
  if (!year || !month || month > 12) return null;
  const lastDate = new Date(year, month, 0);
  const day = String(lastDate.getDate()).padStart(2, '0');
  const mm = String(lastDate.getMonth() + 1).padStart(2, '0');
  const yyyy = lastDate.getFullYear();
  return `${day}/${mm}/${yyyy}`;
}

function normalizeGiaHanDates(rows) {
  const formatLastDayISO = (thangRaw) => {
    const thang = typeof thangRaw === 'string' ? parseInt(thangRaw, 10) : thangRaw;
    if (!thang || isNaN(thang)) return null;
    const year = Math.floor(thang / 100);
    const month = thang % 100;
    if (month < 1 || month > 12) return null;
    const lastDate = new Date(year, month, 0);
    return lastDate.toLocaleDateString('en-CA');
  };

  const convertOracleDate = (value) => {
    if (value instanceof Date) return value.toLocaleDateString('en-CA');
    if (typeof value === 'string' && value.includes('/')) {
      const [dd, mm, yyyy] = value.split('/');
      return `${yyyy}-${mm}-${dd}`;
    }
    return null;
  };

  return rows.map(row => ({
    ...row,
    NGAY_BDDC: convertOracleDate(row.NGAY_BDDC) || formatLastDayISO(row.THANG_BD),
    NGAY_KTDC: convertOracleDate(row.NGAY_KTDC) || formatLastDayISO(row.THANG_KT),
  }));
}

function normalizeHetHanDates(rows) {
  const formatLastDayISO = (thangRaw) => {
    const thang = typeof thangRaw === 'string' ? parseInt(thangRaw, 10) : thangRaw;
    if (!thang || isNaN(thang)) return null;
    const year = Math.floor(thang / 100);
    const month = thang % 100;
    if (month < 1 || month > 12) return null;
    const lastDate = new Date(year, month, 0);
    return lastDate.toLocaleDateString('en-CA');
  };

  const convertOracleDate = (value) => {
    if (value instanceof Date) return value.toLocaleDateString('en-CA');
    if (typeof value === 'string' && value.includes('/')) {
      const [dd, mm, yyyy] = value.split('/');
      return `${yyyy}-${mm}-${dd}`;
    }
    return null;
  };

  return rows.map(row => ({
    ...row,
    NGAY_BD: convertOracleDate(row.NGAY_BD) || formatLastDayISO(row.THANG_BD),
    NGAY_KT: convertOracleDate(row.NGAY_KT) || formatLastDayISO(row.THANG_KT),
  }));
}

// ==== API LẤY DỮ LIỆU HẾT HẠN VÀ ĐÁNH DẤU ĐÃ GIA HẠN ====
router.get('/hethancoc', async (req, res) => {
  let connection;
  try {
    connection = await getOracleConnection();

    // 1. Lấy danh sách hết hạn
    const hetHanQuery = `
      SELECT MA_TB, TEN_TB, NGAY_BD, NGAY_KT, THANG_BD, THANG_KT, TEN_DV, NVKT
      FROM BAOCAO_BPC.DS_HET_HAN_DAT_COC
      WHERE MA_TB IS NOT NULL AND TO_NUMBER(THANG_KT) >= 202501
    `;
    const hetHanResult = await connection.execute(hetHanQuery);
    const hetHanData = normalizeHetHanDates(hetHanResult.rows);

    // 2. Lấy danh sách đã gia hạn
    const giaHanQuery = `
      SELECT MA_TB, NGAY_BDDC, NGAY_KTDC, THANG_BD, THANG_KT
      FROM BAOCAO_BPC.DS_TB_GIAHAN_DATCOC
      WHERE MA_TB IS NOT NULL AND TO_NUMBER(THANG_BD) >= 202501
    `;
    const giaHanResult = await connection.execute(giaHanQuery);
    const processedGiaHanRows = normalizeGiaHanDates(giaHanResult.rows);

    // 3. Map MA_TB -> danh sách ngày gia hạn
    const giaHanMap = {};
    processedGiaHanRows.forEach(row => {
      if (row.MA_TB && row.NGAY_BDDC) {
        if (!giaHanMap[row.MA_TB]) giaHanMap[row.MA_TB] = [];
        giaHanMap[row.MA_TB].push(row.NGAY_BDDC);
      }
    });

    // 4. Gắn cờ ĐÃ_GIA_HẠN và format kết quả
    const result = hetHanData.map(row => {
      const ngayKT = new Date(row.NGAY_KT);
      const ngaySoSanh = new Date(ngayKT);
      ngaySoSanh.setDate(ngaySoSanh.getDate() + 1); // ngày bắt đầu gia hạn

      const daGiaHan = giaHanMap[row.MA_TB]?.some(ngayGiaHan => {
        return new Date(ngayGiaHan) >= ngaySoSanh;
      });

      return {
        ...row,
        DA_GIA_HAN: daGiaHan ? 'ĐÃ GIA HẠN' : 'CHƯA GIA HẠN',
      };
    });

    res.json({
      message: '✅ Lấy danh sách hết hạn và tình trạng gia hạn thành công',
      data: result,
    });
  } catch (err) {
    console.error('❌ Lỗi hethancoc:', err);
    res.status(500).json({ error: 'Không thể lấy dữ liệu hết hạn đặt cọc', details: err.message });
  } finally {
    if (connection) await connection.close().catch(e => console.error('❌ Close error:', e));
  }
});

module.exports = router;
