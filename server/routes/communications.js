// communications.js
const express = require('express');
const router = express.Router();
const communicationService = require('../services/communicationService');

router.get('/:procurement_id', async (req, res) => {
  const logs = await communicationService.getCommunications(req.params.procurement_id);
  res.json(logs);
});

router.post('/', async (req, res) => {
  const log = await communicationService.logCommunication(req.body);
  res.json(log);
});

module.exports = router;
