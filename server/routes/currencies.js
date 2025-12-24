// currencies.js
const express = require('express');
const router = express.Router();
const currencyService = require('../services/currencyService');

router.get('/rates', async (req, res) => {
  const rates = await currencyService.getRates();
  res.json(rates);
});

module.exports = router;
