const mongoose = require('mongoose');

const employeeOracleSchema = new mongoose.Schema({
  emp_id: Number,
  name: String,
  department: String,
  position: String,
  // Thêm các trường khác theo cấu trúc Oracle của bạn
}, { timestamps: true });

module.exports = mongoose.model('EmployeeOracle', employeeOracleSchema);
