const Employee = require('../models/Employee');

// Lấy danh sách nhân sự
exports.getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find();
    return res.status(200).json(employees);
  } catch (error) {
    console.error('Lỗi lấy danh sách nhân viên:', error);
    return res.status(500).json({ message: 'Lỗi khi lấy danh sách nhân viên', error: error.message });
  }
};

// Thêm nhân sự mới
exports.addEmployee = async (req, res) => {
  console.log('Request body:', req.body);

  // Lấy các trường cần thiết từ req.body
  const {
    name,
    position,
    department,
    salary,
    dateOfBirth,
    gender,
    email,
    phoneNumber,
    address,
    status
  } = req.body;

  // Validate các trường bắt buộc
  if (
    !name ||
    !position ||
    !department ||
    salary === undefined ||
    salary === null ||
    Number(salary) <= 0 ||
    !dateOfBirth ||
    isNaN(Date.parse(dateOfBirth)) ||
    !gender ||
    !email ||
    !phoneNumber ||
    !address
  ) {
    return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ và hợp lệ thông tin nhân viên.' });
  }

  try {
    const newEmployee = new Employee({
      name,
      position,
      department,
      salary: Number(salary),
      dateOfBirth: new Date(dateOfBirth),  // Lưu dạng Date
      gender,
      email,
      phoneNumber,
      address,
      status: status || 'Active' // Mặc định 'Active' nếu không có
    });

    await newEmployee.save();

    return res.status(201).json({ message: 'Thêm nhân viên thành công', employee: newEmployee });
  } catch (error) {
    console.error('Lỗi khi thêm nhân viên:', error);
    return res.status(500).json({ message: 'Lỗi khi thêm nhân viên', error: error.message });
  }
};

// Cập nhật nhân sự
exports.updateEmployee = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    position,
    department,
    salary,
    dateOfBirth,
    gender,
    email,
    phoneNumber,
    address,
    status
  } = req.body;

  if (
    !name ||
    !position ||
    !department ||
    salary === undefined ||
    salary === null ||
    Number(salary) <= 0 ||
    !dateOfBirth ||
    isNaN(Date.parse(dateOfBirth)) ||
    !gender ||
    !email ||
    !phoneNumber ||
    !address
  ) {
    return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ và hợp lệ thông tin nhân viên.' });
  }

  try {
    const updatedData = {
      name,
      position,
      department,
      salary: Number(salary),
      dateOfBirth: new Date(dateOfBirth),
      gender,
      email,
      phoneNumber,
      address,
      status: status || 'Active'
    };

    const updatedEmployee = await Employee.findByIdAndUpdate(id, updatedData, { new: true });

    if (!updatedEmployee) {
      return res.status(404).json({ message: 'Nhân viên không tồn tại' });
    }

    return res.status(200).json({ message: 'Cập nhật nhân viên thành công', employee: updatedEmployee });
  } catch (error) {
    console.error('Lỗi khi cập nhật nhân viên:', error);
    return res.status(500).json({ message: 'Lỗi khi cập nhật nhân viên', error: error.message });
  }
};

// Xóa nhân sự
exports.deleteEmployee = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedEmployee = await Employee.findByIdAndDelete(id);

    if (!deletedEmployee) {
      return res.status(404).json({ message: 'Nhân viên không tồn tại' });
    }

    return res.status(200).json({ message: 'Nhân viên đã được xóa thành công' });
  } catch (error) {
    console.error('Lỗi khi xóa nhân viên:', error);
    return res.status(500).json({ message: 'Lỗi khi xóa nhân viên', error: error.message });
  }
};
