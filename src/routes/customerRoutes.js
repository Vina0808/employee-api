// src/routes/customerRoutes.js

const express = require('express');
const {
    getAllCustomers,
    getCustomerById,
    addCustomer,
    updateCustomer,
    deleteCustomer,
} = require('../controllers/customerController');

const router = express.Router();

router.get('/', getAllCustomers);
router.get('/:id', getCustomerById);
router.post('/', addCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

module.exports = router;
