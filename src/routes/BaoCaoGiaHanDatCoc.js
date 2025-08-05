const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const sql = require('mssql');
require('dotenv').config();

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

async function getOracleConnection() {
  return await oracledb.getConnection({
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECTION_STRING,
  });
}

async function getSqlServerConnection() {
  return await sql.connect({
    user: 'iocdhnv',
    password: 'DhnvD@shB0qrd',
    server: '10.77.129.67',
    database: 'IOCDashBoard',
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  });
}

// ✅ THÊM 2 HÀM XỬ LÝ NGÀY DỰ PHÒNG
  function convertThangToLastDate(thangNumber) {
    const thangStr = String(thangNumber || '').padStart(6, '0');
    const year = parseInt(thangStr.slice(0, 4), 10);
    const month = parseInt(thangStr.slice(4, 6), 10);
    if (!year || !month || month > 12) return null;

    const lastDate = new Date(year, month, 0); // Lấy ngày cuối tháng
    const day = String(lastDate.getDate()).padStart(2, '0');
    const mm = String(lastDate.getMonth() + 1).padStart(2, '0'); // month là 0-based
    const yyyy = lastDate.getFullYear();

    return `${day}/${mm}/${yyyy}`; // dd/mm/yyyy
  }

  function normalizeGiaHanDates(rows) {
  const formatLastDayISO = (thangRaw) => {
    const thang = typeof thangRaw === 'string' ? parseInt(thangRaw, 10) : thangRaw;
    if (!thang || isNaN(thang)) return null;

    const year = Math.floor(thang / 100);
    const month = thang % 100;

    if (month < 1 || month > 12) return null;

    const lastDate = new Date(year, month, 0);
    return lastDate.toLocaleDateString('en-CA'); // yyyy-mm-dd
  };

  const convertOracleDate = (value) => {
    if (value instanceof Date) {
      return value.toLocaleDateString('en-CA'); // yyyy-mm-dd
    }
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

function buildWhereClause(query, binds) {
  const clauses = ['MA_TB IS NOT NULL', 'TO_NUMBER(THANG) >= 202501'];

  if (query.thang?.trim()) {
    const thangs = query.thang.split(',').map((t, i) => {
      const key = `thang${i}`;
      binds[key] = t.trim();
      return `:${key}`;
    });
    clauses.push(`THANG IN (${thangs.join(',')})`);
  }

  if (query.ma_tb?.trim()) {
    binds.ma_tb = `%${query.ma_tb.trim()}%`;
    clauses.push(`MA_TB LIKE :ma_tb`);
  }

  if (query.ten_kh?.trim()) {
    binds.ten_kh = `%${query.ten_kh.trim()}%`;
    clauses.push(`TEN_KH LIKE :ten_kh`);
  }

  if (query.ten_dvvt?.trim()) {
    const tenDvvtList = query.ten_dvvt.split(',').map((t, i) => {
      const key = `ten_dvvt${i}`;
      binds[key] = `%${t.trim().toLowerCase()}%`;
      return `LOWER(TEN_DVVT) LIKE :${key}`;
    });
    clauses.push(`(${tenDvvtList.join(' OR ')})`);
  }

  if (query.nguoi_cn?.trim()) {
    const nguoiCns = query.nguoi_cn.split(',').map((t, i) => {
      const key = `nguoi_cn${i}`;
      binds[key] = t.trim();
      return `:${key}`;
    });
    clauses.push(`NGUOI_CN IN (${nguoiCns.join(',')})`);
  }

  if (query.sotien?.trim()) {
    binds.sotien = parseFloat(query.sotien.trim());
    clauses.push(`SOTIEN = :sotien`);
  }

  if (query.sothang?.trim()) {
    binds.sothang = parseInt(query.sothang.trim());
    clauses.push(`SOTHANG = :sothang`);
  }

  return clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
}

// === MAIN DATA API ===
router.get('/giahan-datcoc', async (req, res) => {
  let connection;
  try {
    connection = await getOracleConnection();

    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;

    const binds = {};
    const whereClause = buildWhereClause(req.query, binds);

    const mainQuery = `
      SELECT MA_TB, TEN_KH, SOTIEN, SOTHANG, TEN_DV, NGUOI_CN, MA_NV_MG, TEN_NV_MG,
             THANG, HT_TRA, LOAIHINH_TB, LOAI_DC,
             NGAY_BDDC, NGAY_KTDC, TEN_DVVT, NGAY_CN, THANG_BD, THANG_KT
      FROM BAOCAO_BPC.DS_TB_GIAHAN_DATCOC
      ${whereClause}
    `;

    const countResult = await connection.execute(`SELECT COUNT(*) AS TOTAL FROM (${mainQuery})`, binds);
    const total = countResult.rows[0]?.TOTAL || 0;

    const dataResult = await connection.execute(`
      SELECT * FROM (
        SELECT t.*, ROW_NUMBER() OVER (ORDER BY NGAY_CN DESC) AS RN
        FROM (${mainQuery}) t
      )
      WHERE RN > :offset AND RN <= :offset_plus_pageSize
    `, {
      ...binds,
      offset,
      offset_plus_pageSize: offset + pageSize,
    });

    let pageData = normalizeGiaHanDates(dataResult.rows);
    const allResult = await connection.execute(mainQuery, binds);
    let allData = normalizeGiaHanDates(allResult.rows);

    const sqlConn = await getSqlServerConnection();
    const sqlResult = await sqlConn.request().query(`SELECT DISTINCT Eload, MANV FROM KENH_BAN_HANG`);
    const sqlMap = {};
    sqlResult.recordset.forEach(row => {
      if (row.Eload) sqlMap[row.Eload.toLowerCase()] = row.MANV;
    });

    pageData = pageData.map(r => ({ ...r, MANV: sqlMap[r.NGUOI_CN?.toLowerCase()] || null }));
    allData = allData.map(r => ({ ...r, MANV: sqlMap[r.NGUOI_CN?.toLowerCase()] || null }));

    const manvs = [...new Set([...pageData, ...allData].map(r => r.MANV).filter(Boolean))];
    let nhanvienMap = {};
    if (manvs.length) {
      const manvBinds = manvs.reduce((acc, manv, i) => {
        const key = `manv${i}`;
        acc.keys.push(`:${key}`);
        acc.binds[key] = manv;
        return acc;
      }, { keys: [], binds: {} });

      const nhanvienSql = `
        SELECT MA_NV, HO_TEN AS TEN_NV, PHONG_BAN AS DIACHI_NV 
        FROM VNP_BPC.HRM_CBNV_DONVI
        WHERE MA_NV IN (${manvBinds.keys.join(',')})
      `;
      const nhanvienResult = await connection.execute(nhanvienSql, manvBinds.binds);
      nhanvienResult.rows.forEach(r => {
        nhanvienMap[r.MA_NV] = { TEN_NV: r.TEN_NV, DIACHI_NV: r.DIACHI_NV };
      });
    }

    pageData = pageData.map(row => ({
      ...row,
      TEN_NV: nhanvienMap[row.MANV]?.TEN_NV || null,
      DIACHI_NV: nhanvienMap[row.MANV]?.DIACHI_NV || null,
    }));

    allData = allData.map(row => ({
      ...row,
      TEN_NV: nhanvienMap[row.MANV]?.TEN_NV || null,
      DIACHI_NV: nhanvienMap[row.MANV]?.DIACHI_NV || null,
    }));

    const getUniqueValues = (arr, col) => [...new Set(arr.map((item) => item[col]))].filter(Boolean);

    res.json({
      message: '✅ Lấy dữ liệu thành công',
      total,
      page,
      pageSize,
      dataCount: pageData.length,
      data: pageData,
      all: allData,
      filters: {
        thang: getUniqueValues(allData, 'THANG'),
        ten_dvvt: getUniqueValues(allData, 'TEN_DVVT'),  // ✅ THÊM DÒNG NÀY
        nguoi_cn: getUniqueValues(allData, 'NGUOI_CN'),
        ma_tb: getUniqueValues(allData, 'MA_TB'),
      },
    });
  } catch (err) {
    console.error('❌ Lỗi Oracle:', err);
    res.status(500).json({ error: 'Không thể lấy dữ liệu Gia hạn Đặt cọc', details: err.message });
  } finally {
    if (connection) await connection.close().catch((e) => console.error('❌ Close error:', e));
  }
});

// === EXPORT TO EXCEL ===
router.get('/giahan-datcoc/export', async (req, res) => {
  let connection;
  try {
    connection = await getOracleConnection();
    const binds = {};
    const whereClause = buildWhereClause(req.query, binds);

    const exportQuery = `
      SELECT MA_TB, TEN_KH, SOTIEN, SOTHANG, TEN_DV, NGUOI_CN, MA_NV_MG,
             THANG, HT_TRA, LOAIHINH_TB, LOAI_DC,
             NGAY_BDDC, NGAY_KTDC, TEN_DVVT, NGAY_CN, THANG_BD, THANG_KT, TEN_DVVT
      FROM BAOCAO_BPC.DS_TB_GIAHAN_DATCOC
      ${whereClause}
      ORDER BY NGAY_CN DESC
    `;
    const result = await connection.execute(exportQuery, binds);
    const mapped = normalizeGiaHanDates(result.rows);

    const sqlConn = await getSqlServerConnection();
    const sqlResult = await sqlConn.request().query(`SELECT DISTINCT Eload, MANV FROM KENH_BAN_HANG`);
    const sqlMap = {};
    sqlResult.recordset.forEach(row => {
      if (row.Eload) sqlMap[row.Eload.toLowerCase()] = row.MANV;
    });

    const withManv = mapped.map(r => ({ ...r, MANV: sqlMap[r.NGUOI_CN?.toLowerCase()] || null }));

    const manvs = [...new Set(withManv.map(r => r.MANV).filter(Boolean))];
    let nhanvienMap = {};
    if (manvs.length) {
      const manvBinds = manvs.reduce((acc, manv, i) => {
        const key = `manv${i}`;
        acc.keys.push(`:${key}`);
        acc.binds[key] = manv;
        return acc;
      }, { keys: [], binds: {} });

      const nhanvienSql = `
        SELECT MA_NV, HO_TEN AS TEN_NV, PHONG_BAN AS DIACHI_NV 
        FROM VNP_BPC.HRM_CBNV_DONVI
        WHERE MA_NV IN (${manvBinds.keys.join(',')})
      `;
      const nhanvienResult = await connection.execute(nhanvienSql, manvBinds.binds);
      nhanvienResult.rows.forEach(r => {
        nhanvienMap[r.MA_NV] = { TEN_NV: r.TEN_NV, DIACHI_NV: r.DIACHI_NV };
      });
    }

    const finalMapped = withManv.map(row => ({
      ...row,
      TEN_NV: nhanvienMap[row.MANV]?.TEN_NV || null,
      DIACHI_NV: nhanvienMap[row.MANV]?.DIACHI_NV || null,
    }));

    res.json({ data: finalMapped });
  } catch (err) {
    console.error('❌ Lỗi export:', err);
    res.status(500).json({ error: 'Không thể xuất Excel', details: err.message });
  } finally {
    if (connection) await connection.close().catch((e) => console.error('❌ Close error:', e));
  }
});

// === API LƯƠNG TIỀN CỌC ===
router.get('/luong-tien-coc', async (req, res) => {
  let connection;
  try {
    connection = await getOracleConnection();

    const query = `
      SELECT MA_TB, SOTIEN, THANG, HT_TRA, NGUOI_CN, NGAY_BDDC, NGAY_KTDC, THANG_BD, THANG_KT, TEN_DVVT
      FROM BAOCAO_BPC.DS_TB_GIAHAN_DATCOC
      WHERE MA_TB IS NOT NULL AND TO_NUMBER(THANG) >= 202501
    `;

    const result = await connection.execute(query);
    let data = normalizeGiaHanDates(result.rows);

    const sqlConn = await getSqlServerConnection();
    const sqlResult = await sqlConn.request().query(`SELECT DISTINCT Eload, MANV FROM KENH_BAN_HANG`);
    const sqlMap = {};
    sqlResult.recordset.forEach(row => {
      if (row.Eload) sqlMap[row.Eload.toLowerCase()] = row.MANV;
    });

    data = data.map(row => ({ ...row, MANV: sqlMap[row.NGUOI_CN?.toLowerCase()] || null }));

    const manvs = [...new Set(data.map(r => r.MANV).filter(Boolean))];
    let nhanvienMap = {};
    if (manvs.length) {
      const manvBinds = manvs.reduce((acc, manv, i) => {
        const key = `manv${i}`;
        acc.keys.push(`:${key}`);
        acc.binds[key] = manv;
        return acc;
      }, { keys: [], binds: {} });

      const nhanvienSql = `
        SELECT MA_NV, HO_TEN AS TEN_NV, PHONG_BAN AS DIACHI_NV 
        FROM VNP_BPC.HRM_CBNV_DONVI
        WHERE MA_NV IN (${manvBinds.keys.join(',')})
      `;
      const nhanvienResult = await connection.execute(nhanvienSql, manvBinds.binds);
      nhanvienResult.rows.forEach(r => {
        nhanvienMap[r.MA_NV] = { TEN_NV: r.TEN_NV, DIACHI_NV: r.DIACHI_NV };
      });
    }

    data = data.map(row => ({
      ...row,
      TEN_NV: nhanvienMap[row.MANV]?.TEN_NV || null,
      DIACHI_NV: nhanvienMap[row.MANV]?.DIACHI_NV || null,
    }));

    res.json({
      message: '✅ Lấy dữ liệu lương tiền cọc thành công',
      data,
    });
  } catch (err) {
    console.error('❌ Lỗi khi lấy dữ liệu lương tiền cọc:', err);
    res.status(500).json({ error: 'Không thể lấy dữ liệu lương tiền cọc', details: err.message });
  } finally {
    if (connection) await connection.close().catch((e) => console.error('❌ Close error:', e));
  }
});

module.exports = router;
