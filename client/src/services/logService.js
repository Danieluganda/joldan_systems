/**
 * Logging Service
 * Collects logs and sends them to backend for file storage
 * Batches logs for efficient transmission
 */

class LogService {
  constructor() {
    this.logs = [];
    this.maxLogsBeforeSend = 50; // Send logs to server after 50 entries
    this.batchInterval = 30000; // Send logs every 30 seconds
    this.backendUrl = '/api/logs';
    
    // Start batch sending
    this.startBatchSending();
    
    // Override console methods
    this.interceptConsoleMethods();
  }

  /**
   * Add a log entry
   */
  log(level, message, data = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      url: window.location.pathname,
      userAgent: navigator.userAgent
    };

    this.logs.push(entry);

    // Send immediately if we reach the threshold
    if (this.logs.length >= this.maxLogsBeforeSend) {
      this.sendLogs();
    }

    return entry;
  }

  /**
   * Intercept console methods to capture all logs
   */
  interceptConsoleMethods() {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalInfo = console.info;

    console.log = (...args) => {
      originalLog(...args);
      this.log('INFO', args.join(' '), { type: 'console.log' });
    };

    console.warn = (...args) => {
      originalWarn(...args);
      this.log('WARN', args.join(' '), { type: 'console.warn' });
    };

    console.error = (...args) => {
      originalError(...args);
      this.log('ERROR', args.join(' '), { type: 'console.error' });
    };

    console.info = (...args) => {
      originalInfo(...args);
      this.log('INFO', args.join(' '), { type: 'console.info' });
    };
  }

  /**
   * Send logs to backend
   */
  async sendLogs() {
    if (this.logs.length === 0) return;

    const logsToSend = [...this.logs];
    this.logs = []; // Clear logs after copying

    try {
      const response = await fetch(this.backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logs: logsToSend,
          sessionId: this.getSessionId(),
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        console.warn('⚠️ Failed to send logs to server:', response.status);
        // Put logs back if failed
        this.logs = [...logsToSend, ...this.logs];
      } else {
        console.log(`📤 Sent ${logsToSend.length} logs to server`);
      }
    } catch (error) {
      console.error('❌ Error sending logs:', error);
      // Put logs back if network error
      this.logs = [...logsToSend, ...this.logs];
    }
  }

  /**
   * Start periodic batch sending
   */
  startBatchSending() {
    setInterval(() => {
      if (this.logs.length > 0) {
        this.sendLogs();
      }
    }, this.batchInterval);
  }

  /**
   * Get or create session ID
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem('logSessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('logSessionId', sessionId);
    }
    return sessionId;
  }

  /**
   * Export logs as JSON (for download)
   */
  exportAsJSON() {
    const data = {
      sessionId: this.getSessionId(),
      exportTime: new Date().toISOString(),
      logs: this.logs
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * Download logs as file
   */
  downloadLogs() {
    const json = this.exportAsJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
    console.log('🗑️ Logs cleared');
  }

  /**
   * Get current logs
   */
  getLogs() {
    return [...this.logs];
  }

  /**
   * Get log count
   */
  getLogCount() {
    return this.logs.length;
  }
}

// Create singleton instance
const logService = new LogService();

export default logService;
