/**
 * Logger Utility
 * 
 * Centralized logging for the application
 * Supports file logging and console output
 */

const env = require('../config/env');
const fs = require('fs');
const path = require('path');

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const LOG_LEVEL_NAMES = {
  0: 'ERROR',
  1: 'WARN',
  2: 'INFO',
  3: 'DEBUG',
};

const getCurrentLevel = () => {
  return LOG_LEVELS[env.LOG.LEVEL.toUpperCase()] || LOG_LEVELS.INFO;
};

/**
 * Format log message with timestamp and level
 */
const formatMessage = (level, message, data) => {
  const timestamp = new Date().toISOString();
  const levelName = LOG_LEVEL_NAMES[level];
  let msg = `[${timestamp}] [${levelName}] ${message}`;
  if (data) {
    msg += `\nData: ${JSON.stringify(data, null, 2)}`;
  }
  return msg;
};

/**
 * Write log message to file
 */
const writeToFile = (message) => {
  try {
    const logDir = path.dirname(env.LOG.FILE);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(env.LOG.FILE, message + '\n');
  } catch (err) {
    console.error('Failed to write log file:', err);
  }
};

/**
 * Core logging function
 */
const log = (level, message, data) => {
  const currentLevel = getCurrentLevel();
  if (level > currentLevel) return;

  const formatted = formatMessage(level, message, data);
  
  // Console output based on level
  if (level === LOG_LEVELS.ERROR) {
    console.error(formatted);
  } else if (level === LOG_LEVELS.WARN) {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }

  // File output for errors and warnings only
  if (level <= LOG_LEVELS.WARN) {
    writeToFile(formatted);
  }
};

/**
 * Export logging methods
 */
module.exports = {
  error: (message, data) => log(LOG_LEVELS.ERROR, message, data),
  warn: (message, data) => log(LOG_LEVELS.WARN, message, data),
  info: (message, data) => log(LOG_LEVELS.INFO, message, data),
  debug: (message, data) => log(LOG_LEVELS.DEBUG, message, data),
};\n"
