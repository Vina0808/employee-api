const express = require('express');
const router = express.Router();
const multer = require('multer');

// Cấu hình multer lưu file lên bộ nhớ tạm (memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Route POST nhận file upload
router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Không có file được tải lên' });
    }
    // Bạn xử lý file ở đây, ví dụ lưu dữ liệu vào DB hoặc ghi file lên server
    // Hiện tại chỉ trả về thành công tạm thời
    res.status(200).json({ message: 'Upload thành công!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
