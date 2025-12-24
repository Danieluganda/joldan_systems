// publications.js
const express = require('express');
const router = express.Router();
const publicationService = require('../services/publicationService');

router.post('/publish', async (req, res) => {
  const result = await publicationService.publishNotice(req.body);
  res.json(result);
});

module.exports = router;
