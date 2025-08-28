const express = require('express');
const router = express.Router();
const tradeController = require('../controllers/tradeController');

// GET /trade - แสดงหน้า Trade
router.get('/', tradeController.getTradePage);

module.exports = router; 