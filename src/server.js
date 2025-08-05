const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Kết nối MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Kết nối MongoDB thành công'))
.catch((error) => console.error('❌ Lỗi kết nối MongoDB:', error));

// Import route files
const authRoutes = require('./routes/auth');                     // Đăng nhập Mongo
const uploadRoutes = require('./routes/uploadRoutes');           // Upload Excel
const excelDataRoutes = require('./routes/excelData');           // Dữ liệu Excel
const oracleRoutes = require('./routes/oracleRoutes');           // Dữ liệu Oracle
const hrmLoginRoutes = require('./routes/hrmLogin');             // Đăng nhập HRM từ Oracle
const pdfUploadRoutes = require('./routes/pdfUpload');           // ✅ Route lưu PDF đã ký MongoDB
const giaHanDatCocRoutes = require('./routes/BaoCaoGiaHanDatCoc'); // Báo cáo Gia hạn Đặt cọc
const hetHanDatCocRoutes = require('./routes/BaoCaoHetHanDatCoc'); // Báo cáo Hết Hạn Đặt cọc
const uploadOracleRoutes = require('./routes/upload-oracle'); // Upload File Excel Lương điều chỉnh tổng Kênh
const excelUploadGHTT13 = require('./routes/excelUploadGHTT13');


// Mount các route vào đường dẫn API
app.use('/api/auth', authRoutes);
app.use('/api/upload-excel', uploadRoutes);
app.use('/api/exceldatas', excelDataRoutes);
app.use('/api/oracle', oracleRoutes);
app.use('/api/hrm-login', hrmLoginRoutes);                       // Route đăng nhập HRM từ Oracle
app.use('/api/pdf', pdfUploadRoutes);                            // ✅ Route PDF ký tên lưu vào Mongo
app.use('/api/baocao', giaHanDatCocRoutes); // Mount báo cáo Cọc vào /api/baocao
app.use('/api/baocao-hethan', hetHanDatCocRoutes); // Route mặc định
app.use('/api/oracle-upload', uploadOracleRoutes);
app.use('/api/upload-ght13', excelUploadGHTT13); // Uload GHTT_13
app.get('/', (req, res) => {
  res.send('🚀 API đang chạy...');
});

// 🕒 Khởi chạy CronJob
require('./jobs/cronJob');

// Khởi động server
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
