// src/controllers/salesController.js

const Sales = require('../models/Sales');

// @desc    Lấy tất cả sản lượng bán hàng
// @route   GET /api/sales
const getAllSales = async (req, res) => {
    try {
        const sales = await Sales.find();
        res.status(200).json(sales);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Lấy sản lượng bán hàng theo ID
// @route   GET /api/sales/:id
const getSaleById = async (req, res) => {
    try {
        const sale = await Sales.findById(req.params.id);
        if (!sale) {
            return res.status(404).json({ message: 'Không tìm thấy sản lượng bán hàng' });
        }
        res.status(200).json(sale);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Thêm sản lượng bán hàng mới
// @route   POST /api/sales
const addSale = async (req, res) => {
    try {
        const { productName, quantity, price, customerName, saleDate } = req.body;

        if (!productName || !quantity || !price) {
            return res.status(400).json({ message: 'Tên sản phẩm, số lượng và giá là bắt buộc' });
        }

        const newSale = new Sales({ productName, quantity, price, customerName, saleDate });
        await newSale.save();
        res.status(201).json(newSale);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Cập nhật sản lượng bán hàng
// @route   PUT /api/sales/:id
const updateSale = async (req, res) => {
    try {
        const { productName, quantity, price, customerName, saleDate } = req.body;

        const updatedSale = await Sales.findByIdAndUpdate(
            req.params.id,
            { productName, quantity, price, customerName, saleDate },
            { new: true }
        );

        if (!updatedSale) {
            return res.status(404).json({ message: 'Không tìm thấy sản lượng bán hàng' });
        }

        res.status(200).json(updatedSale);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Xóa sản lượng bán hàng
// @route   DELETE /api/sales/:id
const deleteSale = async (req, res) => {
    try {
        const deletedSale = await Sales.findByIdAndDelete(req.params.id);
        if (!deletedSale) {
            return res.status(404).json({ message: 'Không tìm thấy sản lượng bán hàng' });
        }
        res.status(200).json({ message: 'Đã xóa sản lượng bán hàng thành công' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAllSales,
    getSaleById,
    addSale,
    updateSale,
    deleteSale,
};
