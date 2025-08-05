// src/models/Sales.js

const mongoose = require('mongoose');

const salesSchema = new mongoose.Schema({
    productName: { 
        type: String, 
        required: true, 
        trim: true 
    },  // Tên sản phẩm

    quantity: { 
        type: Number, 
        required: true, 
        min: [1, 'Số lượng phải lớn hơn 0'] 
    },  // Số lượng bán

    price: { 
        type: Number, 
        required: true, 
        min: [0, 'Giá phải là số dương'] 
    },  // Giá bán

    customerName: { 
        type: String, 
        trim: true 
    },  // Tên khách hàng

    saleDate: { 
        type: Date, 
        default: Date.now 
    },  // Ngày bán

    totalAmount: { 
        type: Number, 
        default: function() {
            return this.quantity * this.price;
        },
        min: [0, 'Tổng tiền phải là số dương']
    },  // Tổng tiền (tính từ số lượng * giá)

    createdAt: { 
        type: Date, 
        default: Date.now 
    },  // Ngày tạo

    updatedAt: { 
        type: Date, 
        default: Date.now 
    }  // Ngày cập nhật

}, {
    timestamps: true  // Tự động tạo trường createdAt và updatedAt
});

const Sales = mongoose.model('Sales', salesSchema);

module.exports = Sales;
