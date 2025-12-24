// bidders.js
const express = require('express');
const router = express.Router();
const bidderService = require('../services/bidderService');

router.get('/', async (req, res) => {
  const bidders = await bidderService.getBidders();
  res.json(bidders);
});

router.post('/', async (req, res) => {
  const bidder = await bidderService.createBidder(req.body);
  res.json(bidder);
});

router.put('/:id', async (req, res) => {
  await bidderService.updateBidder(req.params.id, req.body);
  res.json({ success: true });
});

module.exports = router;
