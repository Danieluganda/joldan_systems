const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * POST /api/logs
 * Receives logs from frontend and saves them to file
 */
router.post('/', (req, res) => {
  try {
    const { logs, sessionId, timestamp } = req.body;

    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({ error: 'Invalid logs format' });
    }

    // Create a log file for this session
    const logFileName = `session_${sessionId}_${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}.log`;
    const logFilePath = path.join(logsDir, logFileName);

    // Format logs for file storage
    const logContent = logs.map(log => {
      return `[${log.timestamp}] [${log.level}] ${log.message} ${JSON.stringify(log.data)}`;
    }).join('\n') + '\n';

    // Append to log file
    fs.appendFileSync(logFilePath, logContent);

    // Also keep a consolidated log file
    const consolidatedPath = path.join(logsDir, 'consolidated.log');
    const consolidatedContent = logs.map(log => {
      return `[${log.timestamp}] [${log.level}] [SESSION: ${sessionId}] ${log.message} ${JSON.stringify(log.data)}`;
    }).join('\n') + '\n';
    fs.appendFileSync(consolidatedPath, consolidatedContent);

    console.log(`📝 Saved ${logs.length} logs to ${logFileName}`);

    res.json({
      success: true,
      message: `Logged ${logs.length} entries`,
      sessionId,
      logFile: logFileName
    });
  } catch (error) {
    console.error('Error saving logs:', error);
    res.status(500).json({ error: 'Failed to save logs' });
  }
});

/**
 * GET /api/logs
 * Retrieve available log files
 */
router.get('/', (req, res) => {
  try {
    const files = fs.readdirSync(logsDir);
    const logFiles = files.filter(f => f.endsWith('.log')).map(f => ({
      name: f,
      path: f,
      size: fs.statSync(path.join(logsDir, f)).size,
      modified: fs.statSync(path.join(logsDir, f)).mtime
    }));

    res.json({
      success: true,
      logFiles,
      totalFiles: logFiles.length
    });
  } catch (error) {
    console.error('Error reading logs:', error);
    res.status(500).json({ error: 'Failed to read logs' });
  }
});

/**
 * GET /api/logs/:filename
 * Download a specific log file
 */
router.get('/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    // Prevent directory traversal
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = path.join(logsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Log file not found' });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    
    res.json({
      success: true,
      filename,
      content,
      lines: content.split('\n').filter(l => l).length
    });
  } catch (error) {
    console.error('Error retrieving log file:', error);
    res.status(500).json({ error: 'Failed to retrieve log file' });
  }
});

/**
 * DELETE /api/logs/:filename
 * Delete a specific log file
 */
router.delete('/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    // Prevent directory traversal
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = path.join(logsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Log file not found' });
    }

    fs.unlinkSync(filePath);
    console.log(`🗑️ Deleted log file: ${filename}`);

    res.json({
      success: true,
      message: `Deleted ${filename}`
    });
  } catch (error) {
    console.error('Error deleting log file:', error);
    res.status(500).json({ error: 'Failed to delete log file' });
  }
});

module.exports = router;
