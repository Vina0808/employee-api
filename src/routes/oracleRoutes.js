const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { authenticate } = require('../middleware/authMiddleware');
const { getRoleFilterOracle } = require('../utils/roleFilter');
require('dotenv').config();

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

async function getOracleConnection() {
  return await oracledb.getConnection({
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECTION_STRING,
  });
}

router.get('/fact-hqkd-kenh-ban-goi', authenticate, async (req, res) => {
  let connection;
  try {
    connection = await getOracleConnection();

    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;

    const {
      soTB,
      thangNam,
      nhanVien,
      phongBanHRM,
      congcubangoi,
      thuebaohvc,
      loaigiaodich,
      hinhthuctb,
      dichvuvienthong,
     maHRMLogin
    } = req.query;

    const whereClauses = [`SO_TB IS NOT NULL`];
    const binds = {};

    const { condition: roleCondition, binds: roleBinds } = getRoleFilterOracle(req.user);
    if (roleCondition !== '1=1') {
      whereClauses.push(roleCondition);
      Object.assign(binds, roleBinds);
    }

    if (soTB?.trim()) {
      whereClauses.push(`SO_TB LIKE :soTB`);
      binds.soTB = `%${soTB.trim()}%`;
    }
    if (nhanVien?.trim()) {
      whereClauses.push(`NHAN_VIEN_BH = :nhanVien`);
      binds.nhanVien = nhanVien.trim();
    }
    if (congcubangoi?.trim()) {
      whereClauses.push(`CONG_CU_BG = :congcubangoi`);
      binds.congcubangoi = congcubangoi.trim();
    }
    if (thuebaohvc?.trim()) {
      whereClauses.push(`THUEBAO_HVC = :thuebaohvc`);
      binds.thuebaohvc = thuebaohvc.trim();
    }
    if (thangNam?.trim()) {
      const [month, year] = thangNam.split('/');
      if (!month || !year) {
        return res.status(400).json({ error: 'Sai định dạng thangNam. Ví dụ: 01/2025' });
      }
      whereClauses.push(`EXTRACT(MONTH FROM NGAY_BH) = :month AND EXTRACT(YEAR FROM NGAY_BH) = :year`);
      binds.month = parseInt(month);
      binds.year = parseInt(year);
    }
    if (loaigiaodich?.trim()) {
      whereClauses.push(`LOAI_GIAO_DICH = :loaigiaodich`);
      binds.loaigiaodich = loaigiaodich.trim();
    }
    if (hinhthuctb?.trim()) {
      whereClauses.push(`HINHTHUC_TB = :hinhthuctb`);
      binds.hinhthuctb = hinhthuctb.trim();
    }
    if (dichvuvienthong?.trim()) {
      whereClauses.push(`TEN_DVVT = :dichvuvienthong`);
      binds.dichvuvienthong = dichvuvienthong.trim();
    }
    if (phongBanHRM?.trim()) {
      whereClauses.push(`PHONG_BAN_HRM = :phongBanHRM`);
      binds.phongBanHRM = phongBanHRM.trim();
    }
    if (maHRMLogin?.trim()) {
      whereClauses.push(`HRM_BH = :maHRMLogin`);
      binds.maHRMLogin = maHRMLogin.trim();
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const unionSql = `
WITH ALL_DATA AS (
  SELECT 
    f.*,
    hrm.PHONG_BAN AS PHONG_BAN_HRM,
    nvm.DONVI_DL_ID AS DONVI_DL_ID
  FROM (
    SELECT 
      SO_TB,MA_HRM_NGUOI_QL_DK_TTTB AS HRM_BH, HOTEN_NGUOI_QL_DK_TTTB AS NHAN_VIEN_BH, NGAY_KH AS NGAY_BH,
      MA_HRM_NGUOI_QL_DK_GOI AS USER_BH, TEN_GOI AS TEN_GOI_CUOC, DT_GOI AS GIA_GOI_CUOC, CHUKY_GOI AS CHU_KY_GOI,
      HINHTHUC_HM AS LOAI_TB_THANG, 'DD_TRATRUOC' AS HINHTHUC_TB, CONGCU_DK_TTTB AS CONG_CU_BG, LOAI_SIM AS THUEBAO_HVC,
      HINHTHUC_HM AS LOAI_GIAO_DICH, 'DIDONG' AS TEN_DVVT, THANGDL, 'DDTT' AS SOURCE_TYPE
    FROM VNP_BPC.FACT_HQKD_KENH_CT_DDTT_2025

    UNION ALL

    SELECT 
      SO_TB, MA_NGUOI_GT AS HRM_BH, TEN_NGUOI_GT AS NHAN_VIEN_BH, NGAY_HT AS NGAY_BH,
      USER_HT_HD AS USER_BH, GOICUOC AS TEN_GOI_CUOC, DT_GOI AS GIA_GOI_CUOC, '0' AS CHU_KY_GOI,
      LOAI_HM AS LOAI_TB_THANG, 'DD_TRASAU' AS HINHTHUC_TB, DIEM_CHAM_TT AS CONG_CU_BG, LOAI_TB AS THUEBAO_HVC,
      LOAI_HM AS LOAI_GIAO_DICH, 'DIDONG' AS TEN_DVVT, THANGDL, 'DDTS' AS SOURCE_TYPE
    FROM VNP_BPC.FACT_HQKD_KENH_CT_DDTS_2025

    UNION ALL

    SELECT 
      SO_TB, MA_HRM_KB AS HRM_BH, HOTEN_NV_QL_KB AS NHAN_VIEN_BH, NGAY_DL AS NGAY_BH,
      MA_HRM_KB AS USER_BH, MA_GOI AS TEN_GOI_CUOC, DT_BANGOI AS GIA_GOI_CUOC, CHUKY_GOI AS CHU_KY_GOI,
      LOAI_TB_THANG, HINHTHUC_TB, CONGCU_BG AS CONG_CU_BG, THUBAO_HVC AS THUEBAO_HVC,
      LOAI_GD AS LOAI_GIAO_DICH, 'DIDONG' AS TEN_DVVT, THANGDL, 'BAN_GOI' AS SOURCE_TYPE
    FROM VNP_BPC.FACT_HQKD_KENH_BAN_GOI_2025

    UNION ALL

    SELECT 
      pt.MA_TB AS SO_TB, nv.MA_NV AS HRM_BH, pt.TEN_NHANVIEN_PT AS NHAN_VIEN_BH, pt.NGAY_HT AS NGAY_BH, nv.MA_NV AS USER_BH, pt.TENGOI_CUOC AS TEN_GOI_CUOC,
      pt.GIAGOI_CUOC AS GIA_GOI_CUOC, TO_CHAR(pt.SOTHANG_DC) AS CHU_KY_GOI, pt.LOAI_HOPDONG AS LOAI_TB_THANG, pt.TENLOAI_TB AS HINHTHUC_TB, pt.KIEU_LAPDAT AS CONG_CU_BG,pt.DOITUONG AS THUEBAO_HVC, pt.LOAI_HOPDONG AS LOAI_GIAO_DICH, TEN_DVVT, pt.THANG AS THANGDL,'PHATTRIEN_MOI' AS SOURCE_TYPE
    FROM BAOCAO_BPC.DS_PHATTRIEN_MOI pt
    LEFT JOIN ADMIN_BPC.NHANVIEN nv ON pt.NVPT_ID = nv.NHANVIEN_ID
    WHERE pt.MA_TB IS NOT NULL AND TO_NUMBER(pt.THANG) >= 202501
  ) f
  LEFT JOIN VNP_BPC.HRM_CBNV_DONVI hrm 
    ON TRIM(UPPER(f.HRM_BH)) = TRIM(UPPER(hrm.MA_NV))
  LEFT JOIN ADMIN_BPC.NHANVIEN nvm 
    ON TRIM(UPPER(f.HRM_BH)) = TRIM(UPPER(nvm.MA_NV))
)
SELECT * FROM ALL_DATA
${whereClause}
`;

    const countSql = `SELECT COUNT(*) AS TOTAL FROM (${unionSql})`;
    const countResult = await connection.execute(countSql, binds);
    const total = countResult.rows[0].TOTAL;
    console.log('✅ DEBUG countSql:', countSql);
    console.log('✅ DEBUG binds:', binds);
    console.log('✅ DEBUG countResult:', countResult);

    const dataSql = `
      SELECT * FROM (
        SELECT t.*, ROW_NUMBER() OVER (ORDER BY NGAY_BH DESC) AS RN
        FROM (${unionSql}) t
      )
      WHERE RN > :offset AND RN <= :offset_plus_pageSize
    `;
    const dataBinds = {
      ...binds,
      offset,
      offset_plus_pageSize: offset + pageSize,
    };

    const dataResult = await connection.execute(dataSql, dataBinds);
    const formattedData = dataResult.rows;

    const [
      congcubangoiResult,
      thuebaohvcResult,
      nhanVienResult,
      loaiGiaoDichResult,
      hinhthuctbResult,
      dichvuvienthongResult,
      thangNamResult,
      phongBanHRMResult
    ] = await Promise.all([
      connection.execute(`SELECT DISTINCT CONG_CU_BG FROM (${unionSql}) WHERE CONG_CU_BG IS NOT NULL ORDER BY CONG_CU_BG`, binds),
      connection.execute(`SELECT DISTINCT THUEBAO_HVC FROM (${unionSql}) WHERE THUEBAO_HVC IS NOT NULL ORDER BY THUEBAO_HVC`, binds),
      connection.execute(`SELECT DISTINCT NHAN_VIEN_BH FROM (${unionSql}) WHERE NHAN_VIEN_BH IS NOT NULL ORDER BY NHAN_VIEN_BH`, binds),
      connection.execute(`SELECT DISTINCT LOAI_GIAO_DICH FROM (${unionSql}) WHERE LOAI_GIAO_DICH IS NOT NULL ORDER BY LOAI_GIAO_DICH`, binds),
      connection.execute(`SELECT DISTINCT HINHTHUC_TB FROM (${unionSql}) WHERE HINHTHUC_TB IS NOT NULL ORDER BY HINHTHUC_TB`, binds),
      connection.execute(`SELECT DISTINCT TEN_DVVT FROM (${unionSql}) WHERE TEN_DVVT IS NOT NULL ORDER BY TEN_DVVT`, binds),
      connection.execute(`
        SELECT DISTINCT TO_CHAR(NGAY_BH, 'MM/YYYY') AS THANG_NAM
        FROM (${unionSql})
        WHERE NGAY_BH IS NOT NULL
        ORDER BY TO_DATE(TO_CHAR(NGAY_BH, 'MM/YYYY'), 'MM/YYYY') DESC
      `, binds),
      connection.execute(`
        SELECT DISTINCT PHONG_BAN_HRM
        FROM (${unionSql})
        WHERE PHONG_BAN_HRM IS NOT NULL
        ORDER BY PHONG_BAN_HRM
      `, binds)
    ]);

    res.json({
      message: '✅ Lấy dữ liệu thành công',
      total,
      page,
      pageSize,
      dataCount: formattedData.length,
      data: formattedData,
      filters: {
        congcubangoi: congcubangoiResult.rows.map(r => r.CONG_CU_BG),
        thuebaohvc: thuebaohvcResult.rows.map(r => r.THUEBAO_HVC),
        nhanVien: nhanVienResult.rows.map(r => r.NHAN_VIEN_BH),
        loaigiaodich: loaiGiaoDichResult.rows.map(r => r.LOAI_GIAO_DICH),
        hinhthuctb: hinhthuctbResult.rows.map(r => r.HINHTHUC_TB),
        dichvuvienthong: dichvuvienthongResult.rows.map(r => r.TEN_DVVT),
        thangNam: thangNamResult.rows.map(r => r.THANG_NAM),
        phongBanHRM: phongBanHRMResult.rows.map(r => r.PHONG_BAN_HRM)
      }
    });

  } catch (err) {
    console.error('❌ Lỗi Oracle:', err);
    res.status(500).json({ error: 'Không thể lấy dữ liệu', details: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeErr) {
        console.error('❌ Lỗi khi đóng kết nối Oracle:', closeErr);
      }
    }
  }
});

module.exports = router;
