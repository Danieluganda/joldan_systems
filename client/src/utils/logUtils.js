/**
 * Log Utilities
 * Provides helper functions to manage logs from the browser console
 */

/**
 * Usage in browser console:
 * 
 * logService.sendLogs() - Manually send pending logs to server
 * logService.downloadLogs() - Download current session logs as JSON file
 * logService.clearLogs() - Clear all logs from memory
 * logService.getLogCount() - Get number of logs in memory
 * logService.getLogs() - Get all logs as array
 * 
 * Example:
 * - Type in console: logService.downloadLogs()
 * - Logs will be downloaded as JSON
 */

console.log(`
╔════════════════════════════════════════════════════════════════╗
║         Procurement Discipline System - Logging Active         ║
╚════════════════════════════════════════════════════════════════╝

📝 LOG MANAGEMENT COMMANDS:
  • logService.sendLogs()         - Send pending logs to server
  • logService.downloadLogs()     - Download logs as JSON file
  • logService.clearLogs()        - Clear all logs from memory
  • logService.getLogCount()      - Show number of logs in memory
  • logService.getLogs()          - Display all logs in console
  • logService.exportAsJSON()     - Get logs as JSON string

📊 LOGGING INFO:
  • All console.log, console.warn, console.error are captured
  • Logs auto-send to server every 30 seconds or at 50 entries
  • Session ID: Use sessionStorage.getItem('logSessionId')
  • Log files saved to: server/logs/ directory
  • Consolidated log: server/logs/consolidated.log

🔍 MONITORING:
  • Route changes are logged: 🔀 ROUTE CHANGED
  • Page lifecycle logged: 📄 PAGE MOUNTED/UNMOUNTED
  • Link clicks logged: 🔗 SIDEBAR LINK CLICKED
  • Permission checks logged: ✅ ROUTE ACCESSIBLE / 🚫 ACCESS DENIED
  • Errors logged: ❌ ERROR

💾 BACKEND LOG API:
  • GET  /api/logs                - List all log files
  • GET  /api/logs/:filename      - Read specific log file
  • POST /api/logs                - Save logs (automatic)
  • DELETE /api/logs/:filename    - Delete specific log file
`);
