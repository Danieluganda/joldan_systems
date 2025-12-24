// shortlists.js
const express = require('express');
const router = express.Router();
const shortlistService = require('../services/shortlistService');

router.get('/:procurement_id', async (req, res) => {
  const shortlist = await shortlistService.getShortlist(req.params.procurement_id);
  res.json(shortlist);
});

router.post('/', async (req, res) => {
  const entry = await shortlistService.addToShortlist(req.body);
  res.json(entry);
});

module.exports = router;
