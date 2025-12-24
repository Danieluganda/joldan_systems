// debarredList.js
const express = require('express');
const router = express.Router();
const debarredListService = require('../services/debarredListService');

router.get('/check', async (req, res) => {
  const { name } = req.query;
  const result = await debarredListService.checkFirm(name);
  res.json({ debarred: !!result });
});

module.exports = router;
