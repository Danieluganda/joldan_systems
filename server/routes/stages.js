// stages.js
const express = require('express');
const router = express.Router();
const stageService = require('../services/stageService');

router.get('/:procurement_id', async (req, res) => {
  const stages = await stageService.getStages(req.params.procurement_id);
  res.json(stages);
});

router.put('/:id', async (req, res) => {
  await stageService.updateStage(req.params.id, req.body);
  res.json({ success: true });
});

module.exports = router;
