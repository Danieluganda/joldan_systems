// Simple file-based logger for errors
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const ERROR_LOG = path.join(LOG_DIR, 'errors.log');
const APP_LOG = path.join(LOG_DIR, 'app.log');

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function logErrorToFile(error) {
  ensureLogDir();
  const entry = `[${new Date().toISOString()}] ${error.stack || error}\n`;
  fs.appendFile(ERROR_LOG, entry, err => {
    if (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to write to errors.log:', err);
    }
  });
}

function logAppEvent(message) {
  ensureLogDir();
  const entry = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFile(APP_LOG, entry, err => {
    if (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to write to app.log:', err);
    }
  });
}

module.exports = { logErrorToFile, logAppEvent };
