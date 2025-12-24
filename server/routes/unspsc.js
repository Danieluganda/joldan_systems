// unspsc.js
const express = require('express');
const router = express.Router();
const unspscService = require('../services/unspscService');

router.get('/search', async (req, res) => {
  const { code } = req.query;
  const result = await unspscService.searchCode(code);
  res.json(result);
});

module.exports = router;
