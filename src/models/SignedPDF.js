const mongoose = require('mongoose');

const SignedPDFSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
  },
  buffer: {
    type: Buffer,
    required: true,
  },
  contentType: {
    type: String,
    required: true,
  },
  hrmId: {
    type: String,
    default: '', // hoặc có thể required nếu cần
  },
  hrmName: {
    type: String,
    default: '',
  },
  thangNam: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('SignedPDF', SignedPDFSchema);
