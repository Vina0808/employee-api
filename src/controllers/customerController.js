// src/controllers/customerController.js

const Customer = require('../models/Customer');

// @desc    Lấy tất cả khách hàng
// @route   GET /api/customers
const getAllCustomers = async (req, res) => {
    try {
        const customers = await Customer.find();
        res.status(200).json(customers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Lấy thông tin khách hàng theo ID
// @route   GET /api/customers/:id
const getCustomerById = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (!customer) {
            return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
        }
        res.status(200).json(customer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Thêm khách hàng mới
// @route   POST /api/customers
const addCustomer = async (req, res) => {
    try {
        const { name, phone, email, address } = req.body;

        if (!name || !phone) {
            return res.status(400).json({ message: 'Tên và Số điện thoại là bắt buộc' });
        }

        const newCustomer = new Customer({ name, phone, email, address });
        await newCustomer.save();
        res.status(201).json(newCustomer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Cập nhật thông tin khách hàng
// @route   PUT /api/customers/:id
const updateCustomer = async (req, res) => {
    try {
        const { name, phone, email, address } = req.body;

        const updatedCustomer = await Customer.findByIdAndUpdate(
            req.params.id,
            { name, phone, email, address },
            { new: true }
        );

        if (!updatedCustomer) {
            return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
        }

        res.status(200).json(updatedCustomer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Xóa khách hàng
// @route   DELETE /api/customers/:id
const deleteCustomer = async (req, res) => {
    try {
        const deletedCustomer = await Customer.findByIdAndDelete(req.params.id);
        if (!deletedCustomer) {
            return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
        }
        res.status(200).json({ message: 'Đã xóa khách hàng thành công' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAllCustomers,
    getCustomerById,
    addCustomer,
    updateCustomer,
    deleteCustomer,
};
