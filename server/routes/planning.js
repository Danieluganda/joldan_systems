const express = require('express');
const router = express.Router();
const planningService = require('../services/planningService');
const { checkPermission } = require('../middleware/auth');

// Create procurement plan
router.post('/', checkPermission('planning:create'), async (req, res) => {
  try {
    const plan = await planningService.createPlan(req.body, req.user.id);
    res.status(201).json(plan);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update procurement plan
router.put('/:id', checkPermission('planning:update'), async (req, res) => {
  try {
    const plan = await planningService.updatePlan(req.params.id, req.body, req.user.id);
    res.json(plan);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get procurement plans
router.get('/', checkPermission('planning:read'), async (req, res) => {
  try {
    const plans = await planningService.getPlans(req.query);
    res.json(plans);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
