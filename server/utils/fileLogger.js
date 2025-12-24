// Enhanced file-based logger with log levels, sync error logging, and basic log rotation
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const ERROR_LOG = path.join(LOG_DIR, 'error.log');
const APP_LOG = path.join(LOG_DIR, 'app.log');
const MAX_LOG_SIZE = 1024 * 1024; // 1MB per log file

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function rotateLogIfNeeded(logPath) {
  try {
    if (fs.existsSync(logPath)) {
      const stats = fs.statSync(logPath);
      if (stats.size > MAX_LOG_SIZE) {
        const archive = logPath + '.' + Date.now();
        fs.renameSync(logPath, archive);
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to rotate log:', logPath, e);
  }
}

function logErrorToFile(error) {
  ensureLogDir();
  rotateLogIfNeeded(ERROR_LOG);
  const entry = `[${new Date().toISOString()}] ERROR: ${error && error.stack ? error.stack : error}\n`;
  try {
    // Synchronous write for critical errors
    fs.appendFileSync(ERROR_LOG, entry, 'utf8');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to write to error.log:', err);
  }
}

function logAppEvent(message, level = 'info') {
  ensureLogDir();
  rotateLogIfNeeded(APP_LOG);
  const lvl = level.toUpperCase();
  const entry = `[${new Date().toISOString()}] ${lvl}: ${message}\n`;
  fs.appendFile(APP_LOG, entry, err => {
    if (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to write to app.log:', err);
    }
  });
}


// Log frontend events to a separate file, with human-readable formatting
const FRONTEND_LOG = path.join(LOG_DIR, 'frontend.log');
function logFrontendEvent(message, level = 'info') {
  ensureLogDir();
  rotateLogIfNeeded(FRONTEND_LOG);
  const lvl = level.toUpperCase();
  let entry = '';
  // Try to pretty-print if message is JSON or an object/array
  try {
    let logs = [];
    if (typeof message === 'string') {
      // Try to parse as JSON array/object
      try {
        const parsed = JSON.parse(message);
        if (Array.isArray(parsed.logs)) {
          logs = parsed.logs;
        } else if (Array.isArray(parsed)) {
          logs = parsed;
        } else if (parsed.logs) {
          logs = [parsed.logs];
        } else {
          logs = [parsed];
        }
      } catch (e) {
        // Not JSON, just log as string
        logs = [message];
      }
    } else if (Array.isArray(message)) {
      logs = message;
    } else if (typeof message === 'object' && message !== null) {
      if (Array.isArray(message.logs)) {
        logs = message.logs;
      } else {
        logs = [message];
      }
    } else {
      logs = [String(message)];
    }
    logs.forEach(log => {
      if (typeof log === 'object' && log !== null) {
        entry += `[${log.timestamp || new Date().toISOString()}] ${log.level || lvl}: ${log.message || ''}`;
        if (log.url) entry += `\n  URL: ${log.url}`;
        if (log.userAgent) entry += `\n  UserAgent: ${log.userAgent}`;
        if (log.data && typeof log.data === 'object') entry += `\n  Data: ${JSON.stringify(log.data)}`;
        entry += '\n';
      } else {
        entry += `[${new Date().toISOString()}] ${lvl}: ${log}\n`;
      }
    });
  } catch (err) {
    entry = `[${new Date().toISOString()}] ${lvl}: ${typeof message === 'string' ? message : JSON.stringify(message)}\n`;
  }
  fs.appendFile(FRONTEND_LOG, entry, err => {
    if (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to write to frontend.log:', err);
    }
  });
}

module.exports = { logErrorToFile, logAppEvent, logFrontendEvent };
