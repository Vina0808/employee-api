const express = require('express');
const router = express.Router();
const multer = require('multer');
const ExcelJS = require('exceljs');
const mongoose = require('mongoose');

// Cấu hình multer: lưu file Excel trong bộ nhớ RAM
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Định nghĩa Schema động (chấp nhận mọi cột Excel)
const ExcelDataSchema = new mongoose.Schema({}, { strict: false });
const ExcelData = mongoose.model('ExcelData', ExcelDataSchema);

// POST: Upload file Excel
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '⚠️ Không có file nào được gửi lên.' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.worksheets[0];

    const headerRow = worksheet.getRow(1);
    const headers = headerRow.values.slice(1); // Bỏ index 0 rỗng

    const data = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Bỏ dòng tiêu đề

      const rowData = {};
      row.eachCell((cell, colNumber) => {
        const columnName = headers[colNumber - 1];
        rowData[columnName] = cell.value;
      });

      // Thêm ngày cập nhật hiện tại
      rowData.ngay_cn = new Date();

      data.push(rowData);
    });

    // Xoá dữ liệu trùng tháng/năm
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    await ExcelData.deleteMany({
      $expr: {
        $and: [
          { $eq: [{ $month: '$ngay_cn' }, currentMonth] },
          { $eq: [{ $year: '$ngay_cn' }, currentYear] }
        ]
      }
    });

    // Thêm dữ liệu mới vào MongoDB
    await ExcelData.insertMany(data);

    res.status(200).json({
      message: '✅ Upload và lưu dữ liệu thành công!',
      insertedCount: data.length
    });
  } catch (error) {
    console.error('❌ Lỗi khi upload:', error);
    res.status(500).json({ message: 'Lỗi xử lý file Excel', error: error.message });
  }
});

// GET: Lấy dữ liệu từ MongoDB
router.get('/data', async (req, res) => {
  try {
    const data = await ExcelData.find().sort({ ngay_cn: -1 }).lean();
    res.json(data);
  } catch (error) {
    console.error('❌ Lỗi lấy dữ liệu:', error);
    res.status(500).json({ message: 'Lỗi lấy dữ liệu từ DB', error: error.message });
  }
});

// PUT: Cập nhật 3 cột mới theo _id, không ảnh hưởng `ngay_cn`
router.put('/data/:id', async (req, res) => {
  const { id } = req.params;
  const { Nguoi_dieu_chinh, HRM_phoi_hop_OB } = req.body;

  try {
    const updateData = {
      Nguoi_dieu_chinh,
      HRM_phoi_hop_OB,
      Ngay_dieu_chinh: new Date()
    };

    const updated = await ExcelData.findByIdAndUpdate(id, updateData, { new: true });

    if (!updated) {
      return res.status(404).json({ message: 'Không tìm thấy bản ghi cần cập nhật.' });
    }

    res.json({ message: 'Cập nhật thành công', data: updated });
  } catch (err) {
    console.error('❌ Lỗi khi cập nhật:', err);
    res.status(500).json({ message: 'Lỗi máy chủ khi cập nhật dữ liệu.' });
  }
});

module.exports = router;
