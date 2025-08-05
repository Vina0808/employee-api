const express = require('express');
const multer = require('multer');
const SignedPDF = require('../models/SignedPDF');
const router = express.Router();

// Sử dụng multer lưu PDF tạm thời trên RAM
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/upload-signed', upload.single('signedPDF'), async (req, res) => {
  try {
    const { hrmId, hrmName, thangNam } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Chưa gửi file PDF' });
    }

    const pdf = new SignedPDF({
      filename: req.file.originalname,
      buffer: req.file.buffer,
      contentType: req.file.mimetype,
      hrmId,
      hrmName,
      thangNam
    });
console.log('📄 File name:', req.file.originalname);
console.log('📦 Buffer length:', req.file.buffer.length);

    await pdf.save();

    res.json({ message: '✅ Lưu PDF đã ký thành công' });
  } catch (err) {
    console.error('❌ Lỗi lưu PDF:', err);
    res.status(500).json({ error: 'Không thể lưu file PDF' });
  }
});

module.exports = router;
