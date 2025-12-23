/**
 * Server Utilities Index
 * Central export point for all utility modules
 */

// Date utilities
const dateUtils = require('./dateUtils');

// Validation utilities
const validationUtils = require('./validationUtils');

// Status and configuration
const statusConfig = require('./statusConfig');

// Formatting utilities
const formatUtils = require('./formatUtils');

// API service
const apiService = require('./apiService');

// Procurement-specific helpers
const procurementHelpers = require('./procurementHelpers');

// Export all utilities
module.exports = {
  // Date utilities
  ...dateUtils,

  // Validation utilities
  ...validationUtils,

  // Status and configuration
  ...statusConfig,

  // Formatting utilities
  ...formatUtils,

  // API service
  ...apiService,

  // Procurement helpers
  ...procurementHelpers,

  // Named exports for clarity
  dateUtils,
  validationUtils,
  statusConfig,
  formatUtils,
  apiService,
  procurementHelpers,
};

/**
 * Usage Examples:
 *
 * // Import everything
 * const { formatDate, getStatusConfig, calculateWeightedScore } = require('./utils');
 *
 * // Or import specific modules
 * const { dateUtils } = require('./utils');
 * const formatted = dateUtils.formatDate(new Date());
 *
 * // Or import modules individually
 * const { formatDate } = require('./utils/dateUtils');
 * const { getStatusConfig } = require('./utils/statusConfig');
 *
 * // Common workflows
 * const timeRemaining = dateUtils.calculateTimeRemaining(deadline);
 * const status = statusConfig.getStatusConfig('approved');
 * const score = procurementHelpers.calculateWeightedScore(scores, weights);
 * const validation = validationUtils.validateForm(data, schema);
 * const formatted = formatUtils.formatCurrency(amount);
 * const approvals = await apiService.getApprovals({ status: 'pending' });
 */
