const ActivityLog = require('../db/models/ActivityLog');

/**
 * Log an activity in the system
 * @param {Object} params - { user, action, entityType, entityId, details, ip }
 */
async function logActivity({ user, action, entityType, entityId, details, ip }) {
  try {
    const log = new ActivityLog({
      user,
      action,
      entityType,
      entityId,
      details,
      ip,
    });
    await log.save();
    return log;
  } catch (err) {
    // Optionally log error elsewhere
    console.error('ActivityLog error:', err);
    return null;
  }
}

/**
 * Get activity logs (optionally filtered)
 * @param {Object} filter - MongoDB filter object
 * @param {Object} options - { limit, skip, sort }
 */
async function getActivityLogs(filter = {}, options = {}) {
  return ActivityLog.find(filter)
    .populate('user', 'name email')
    .sort(options.sort || { timestamp: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 50)
    .lean();
}

module.exports = {
  logActivity,
  getActivityLogs,
};
