// NoObjection Routes
const express = require('express');
const router = express.Router();
const noObjectionService = require('../services/noObjectionService');
const { verifyToken } = require('../middleware/auth');

// Create No-Objection Request
router.post('/', verifyToken, async (req, res) => {
  try {
    const noObj = await noObjectionService.create({
      ...req.body,
      requester: req.user.id
    });
    res.status(201).json(noObj);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get No-Objection by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const noObj = await noObjectionService.getById(req.params.id);
    res.json(noObj);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// Get No-Objections for a Procurement
router.get('/procurement/:procurementId', verifyToken, async (req, res) => {
  try {
    const list = await noObjectionService.getByProcurement(req.params.procurementId);
    res.json(list);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// Update Status
router.put('/:id/status', verifyToken, async (req, res) => {
  try {
    const noObj = await noObjectionService.updateStatus(req.params.id, req.body.status, req.body.comment);
    res.json(noObj);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Add Comment
router.post('/:id/comment', verifyToken, async (req, res) => {
  try {
    const noObj = await noObjectionService.addComment(req.params.id, req.body.comment);
    res.json(noObj);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
