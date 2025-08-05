const express = require('express');
const router = express.Router();
const ExcelData = require('../models/ExcelData');
const mongoose = require('mongoose');

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { Nguoi_dieu_chinh, HRM_phoi_hop_OB } = req.body;

  // Kiểm tra id hợp lệ
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'ID không hợp lệ' });
  }

  try {
    const updateData = {
      Nguoi_dieu_chinh,
      HRM_phoi_hop_OB,
      Ngay_dieu_chinh: new Date(),  // thời gian hiện tại máy chủ
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

router.get('/', async (req, res) => {
  try {
    const data = await ExcelData.find().sort({ Thoi_gian_giao_dich: -1 });
    res.json(data);
  } catch (err) {
    console.error('❌ Lỗi khi lấy danh sách dữ liệu:', err);
    res.status(500).json({ message: 'Lỗi máy chủ khi lấy dữ liệu.' });
  }
});

module.exports = router;
