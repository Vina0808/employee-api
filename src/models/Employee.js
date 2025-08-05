const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    position: { type: String, required: true },
    department: { type: String, required: true },
    salary: { type: Number, required: true },
    dateOfJoining: { type: Date, default: Date.now },
    dateOfBirth: { type: Date, required: true }, // Ngày sinh
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true }, // Giới tính
    email: { type: String, required: true, unique: true }, // Email
    phoneNumber: { type: String, required: true, unique: true }, // Số điện thoại
    address: { type: String, required: true }, // Địa chỉ
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' } // Trạng thái (hoạt động/không hoạt động)
    
});

module.exports = mongoose.model('Employee', employeeSchema);
