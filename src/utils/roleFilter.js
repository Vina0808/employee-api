function getRoleFilterMongo({ role, ma_nv, donvi_dl_id }) {
  if (role === 'user') return { ma_nv };
  if (role === 'manager') return { donvi_dl_id };
  return {}; // admin → xem tất cả
}

function getRoleFilterOracle(user) {
  const role = (user?.role || '').toLowerCase();
  const chucDanh = (user?.chuc_danh || '').toLowerCase();

  const isUserRole = role === 'user';
  const isManagerRole = role === 'manager';

  // ✅ Từ khóa chức danh admin thực thụ
  const adminChucDanhKeywords = ['giám đốc', 'trưởng phòng', 'phó phòng', 'điều hành', 'quản lý', 'chính sách'];
  const isAdminByChucDanh = adminChucDanhKeywords.some(keyword => chucDanh.includes(keyword));

  // 👤 User thường → chỉ xem chính mình
  if (isUserRole && !isAdminByChucDanh && user?.ma_nv) {
    return {
      condition: 'TRIM(UPPER(USER_BH)) = :ma_nv',
      binds: { ma_nv: user.ma_nv.trim().toUpperCase() }
    };
  }

  // 👔 Manager → xem theo DONVI_DL_ID
  if (isManagerRole && user?.donvi_dl_id) {
    return {
      condition: 'DONVI_DL_ID = :donvi_dl_id',
      binds: { donvi_dl_id: user.donvi_dl_id }
    };
  }

  // 🛡 Admin → xem tất cả
  return {
    condition: '1=1',
    binds: {}
  };
}

module.exports = {
  getRoleFilterMongo,
  getRoleFilterOracle
};
