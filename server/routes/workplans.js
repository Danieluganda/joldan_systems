// workplans.js
const express = require('express');
const router = express.Router();
const workplanService = require('../services/workplanService');

router.get('/', async (req, res) => {
  const workplans = await workplanService.getWorkplans();
  res.json(workplans);
});

router.post('/', async (req, res) => {
  const workplan = await workplanService.createWorkplan(req.body);
  res.json(workplan);
});

router.put('/:id', async (req, res) => {
  await workplanService.updateWorkplan(req.params.id, req.body);
  res.json({ success: true });
});

module.exports = router;
