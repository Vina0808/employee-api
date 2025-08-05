const mongoose = require('mongoose');

// Schema linh hoạt, không bắt buộc trường cụ thể
const ExcelDataSchema = new mongoose.Schema({}, { strict: false });

// Tránh lỗi khi model đã được khai báo trước đó (điều này hay xảy ra khi chạy hot reload)
module.exports = mongoose.models.ExcelData || mongoose.model('ExcelData', ExcelDataSchema);
