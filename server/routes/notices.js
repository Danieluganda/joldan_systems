// notices.js
const express = require('express');
const router = express.Router();
const noticeService = require('../services/noticeService');

router.get('/:procurement_id', async (req, res) => {
  const notices = await noticeService.getNotices(req.params.procurement_id);
  res.json(notices);
});

router.post('/', async (req, res) => {
  const notice = await noticeService.createNotice(req.body);
  res.json(notice);
});

module.exports = router;
