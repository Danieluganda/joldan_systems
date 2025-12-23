const express = require('express');
const service = require('../services/clarificationService');
const router = express.Router();

router.get('/', (req, res) => res.json(service.list()));
router.post('/', (req, res) => res.status(201).json(service.create(req.body)));
router.get('/:id', (req, res) => res.json(service.get(req.params.id)));
router.put('/:id', (req, res) => res.json(service.update(req.params.id, req.body)));
router.delete('/:id', (req, res) => res.json({ ok: service.remove(req.params.id) }));

module.exports = router;
