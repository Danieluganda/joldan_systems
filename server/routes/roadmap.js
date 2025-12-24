const express = require('express');
const router = express.Router();
const roadmapService = require('../services/roadmapService');
const { checkPermission } = require('../middleware/auth');

// Create roadmap
router.post('/', checkPermission('roadmap:create'), async (req, res) => {
  try {
    const roadmap = await roadmapService.createRoadmap(req.body, req.user.id);
    res.status(201).json(roadmap);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update roadmap
router.put('/:id', checkPermission('roadmap:update'), async (req, res) => {
  try {
    const roadmap = await roadmapService.updateRoadmap(req.params.id, req.body, req.user.id);
    res.json(roadmap);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get roadmaps
router.get('/', checkPermission('roadmap:read'), async (req, res) => {
  try {
    const roadmaps = await roadmapService.getRoadmaps(req.query);
    res.json(roadmaps);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
