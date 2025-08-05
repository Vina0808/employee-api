const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { getConnection } = require('../config/oracle');
const { authenticate } = require('../middleware/authMiddleware');
const { getRoleFilterOracle } = require('../utils/roleFilter');

const DEFAULT_PASSWORD = 'Vnpt@123456';

// ✅ Từ khóa chức danh để nhận diện admin
const adminChucDanhKeywords = ['giám đốc', 'trưởng phòng', 'phó phòng', 'điều hành', 'quản lý', 'chính sách'];

// ✅ API Đăng nhập
router.post('/login', async (req, res) => {
  const { ma_nv, password } = req.body;

  if (!ma_nv || !password) {
    return res.status(400).json({ message: 'Thiếu mã nhân viên hoặc mật khẩu' });
  }

  try {
    const connection = await getConnection();

    const result = await connection.execute(
      `
      SELECT MA_NV, TEN_NV, EMAIL, SO_DT, DONVI_ID, DONVI_DL_ID, CHUCDANH, NHANVIEN_ID, DIACHI_NV
      FROM ADMIN_BPC.NHANVIEN
      WHERE UPPER(MA_NV) = UPPER(:ma_nv)
      `,
      [ma_nv],
      { outFormat: require('oracledb').OUT_FORMAT_OBJECT }
    );

    await connection.close();

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Mã nhân viên không tồn tại' });
    }

    const user = result.rows[0];

    if (password !== DEFAULT_PASSWORD) {
      return res.status(401).json({ message: 'Mật khẩu sai' });
    }
        let role = 'user';

    const chucdanh = (user.CHUCDANH || '').trim();
    const chucdanhLower = chucdanh.toLowerCase();

    const managerTitles = [
      'giám đốc trung tâm',
      'phó giám đốc trung tâm',
      'giám đốc phòng bán hàng',
      'phó giám đốc phòng bán hàng'
    ];

    const adminChucDanhKeywords = [
      'giám đốc',
      'trưởng phòng',
      'phó phòng',
      'điều hành',
      'quản lý',
      'chính sách'
    ];

    const isManagerByTitle = managerTitles.some(title =>
      chucdanhLower.includes(title)
    );

    const isAdminByChucDanh = adminChucDanhKeywords.some(keyword =>
      chucdanhLower.includes(keyword)
    );

    // ✅ Gán quyền theo độ ưu tiên
    if (isManagerByTitle) {
      role = 'manager';
    } else if (isAdminByChucDanh) {
      role = 'admin';
    }

// ✅ Trường hợp đặc biệt hardcode
if (user.MA_NV.toUpperCase() === 'VNP019482') {
  role = 'admin';
}

      // ✅ Gán cứng mã đặc biệt làm admin
      if (user.MA_NV.toUpperCase() === 'VNP019482') {
        role = 'admin';
      }

    // ✅ Sinh token
    const token = jwt.sign(
      {
        ma_nv: user.MA_NV,
        ten_nv: user.TEN_NV,
        role,
        donvi_id: user.DONVI_ID || '',
        donvi_dl_id: user.DONVI_DL_ID || '',
        chuc_danh: user.CHUCDANH || ''
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.json({
      token,
      user: {
        ma_nv: user.MA_NV,
        ten_nv: user.TEN_NV,
        email: user.EMAIL || '',
        so_dt: user.SO_DT || '',
        donvi_id: user.DONVI_ID || '',
        donvi_dl_id: user.DONVI_DL_ID || '',
        chuc_danh: user.CHUCDANH || '',
        nhanvien_id: user.NHANVIEN_ID,
        dia_chi: user.DIACHI_NV || '',
        role
      }
    });
  } catch (error) {
    console.error('Lỗi đăng nhập HRM:', error);
    return res.status(500).json({ message: 'Lỗi server' });
  }
});

// ✅ API lấy danh sách nhân viên theo phân quyền (có xác thực)
router.get('/employees', authenticate, async (req, res) => {
  try {
    const connection = await getConnection();

    const { condition, binds } = getRoleFilterOracle(req.user);

    const query = `
      SELECT MA_NV, TEN_NV, EMAIL, SO_DT, DONVI_ID, DONVI_DL_ID, CHUCDANH, NHANVIEN_ID, DIACHI_NV
      FROM ADMIN_BPC.NHANVIEN
      WHERE ${condition}
    `;

    const result = await connection.execute(query, binds, {
      outFormat: require('oracledb').OUT_FORMAT_OBJECT
    });

    await connection.close();

    const users = result.rows.map(user => ({
      ma_nv: user.MA_NV,
      ten_nv: user.TEN_NV,
      email: user.EMAIL || '',
      so_dt: user.SO_DT || '',
      donvi_id: user.DONVI_ID || '',
      donvi_dl_id: user.DONVI_DL_ID || '',
      chuc_danh: user.CHUCDANH || '',
      nhanvien_id: user.NHANVIEN_ID,
      dia_chi: user.DIACHI_NV || ''
    }));

    return res.json(users);
  } catch (error) {
    console.error('Lỗi lấy danh sách nhân viên:', error);
    return res.status(500).json({ message: 'Lỗi server' });
  }
});

// ✅ API lấy thông tin 1 nhân viên (không yêu cầu xác thực)
router.get('/employees/:ma_nv', async (req, res) => {
  const { ma_nv } = req.params;

  try {
    const connection = await getConnection();

    const result = await connection.execute(
      `
      SELECT MA_NV, TEN_NV, EMAIL, SO_DT, DONVI_ID, DONVI_DL_ID, CHUCDANH, NHANVIEN_ID, DIACHI_NV
      FROM ADMIN_BPC.NHANVIEN
      WHERE UPPER(MA_NV) = UPPER(:ma_nv)
      `,
      [ma_nv],
      { outFormat: require('oracledb').OUT_FORMAT_OBJECT }
    );

    await connection.close();

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
    }

    const user = result.rows[0];

    return res.json({
      ma_nv: user.MA_NV,
      ten_nv: user.TEN_NV,
      email: user.EMAIL || '',
      so_dt: user.SO_DT || '',
      donvi_id: user.DONVI_ID || '',
      donvi_dl_id: user.DONVI_DL_ID || '',
      chuc_danh: user.CHUCDANH || '',
      nhanvien_id: user.NHANVIEN_ID,
      dia_chi: user.DIACHI_NV || ''
    });
  } catch (error) {
    console.error('Lỗi lấy thông tin nhân viên:', error);
    return res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;
