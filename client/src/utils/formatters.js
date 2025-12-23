/**
 * Formatters Utility
 * 
 * Display formatting functions for dates, currency, duration, and other data types.
 * Consistent formatting across the application.
 * 
 * Features:
 * - Date/time formatting (relative, absolute, custom)
 * - Currency formatting
 * - Duration/time period formatting
 * - Percentage formatting
 * - File size formatting
 * - Number formatting
 */

/**
 * Format date to readable string
 * @param {Date|string} date - Date to format
 * @param {string} format - Format type: 'short', 'long', 'relative', 'time'
 * @returns {string} Formatted date
 */
export const formatDate = (date, format = 'short') => {
  if (!date) return '';

  const d = new Date(date);

  if (format === 'relative') {
    return formatRelativeTime(d);
  }

  const options = {
    short: { month: 'short', day: 'numeric', year: '2-digit' },
    long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
    time: { hour: '2-digit', minute: '2-digit', second: '2-digit' },
    datetime: { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }
  };

  return d.toLocaleDateString('en-US', options[format] || options.short);
};

/**
 * Format date as relative time (e.g., "2 days ago")
 */
export const formatRelativeTime = (date) => {
  if (!date) return '';

  const d = new Date(date);
  const now = new Date();
  const seconds = Math.floor((now - d) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo ago`;

  return `${Math.floor(seconds / 31536000)}y ago`;
};

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (USD, EUR, GBP, etc.)
 * @returns {string} Formatted currency
 */
export const formatCurrency = (amount, currency = 'USD') => {
  if (amount === null || amount === undefined) return '';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @param {number} decimals - Decimal places
 * @returns {string} Formatted number
 */
export const formatNumber = (num, decimals = 0) => {
  if (num === null || num === undefined) return '';

  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

/**
 * Format percentage
 * @param {number} value - Value as decimal (0.85 = 85%)
 * @param {number} decimals - Decimal places
 * @returns {string} Formatted percentage
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined) return '';

  return `${(value * 100).toFixed(decimals)}%`;
};

/**
 * Format duration in seconds to readable time
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
export const formatDuration = (seconds) => {
  if (!seconds) return '0s';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
};

/**
 * Format file size in bytes
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';

  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Format score/rating
 * @param {number} score - Score value
 * @param {number} maxScore - Maximum score (default 100)
 * @returns {string} Formatted score with percentage
 */
export const formatScore = (score, maxScore = 100) => {
  if (score === null || score === undefined) return '';

  const percentage = (score / maxScore) * 100;
  return `${score}/${maxScore} (${percentage.toFixed(1)}%)`;
};

/**
 * Format phone number
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';

  // Remove non-digits
  const digits = phone.replace(/\D/g, '');

  // Format as (XXX) XXX-XXXX
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return phone;
};

/**
 * Format email (truncate if too long)
 * @param {string} email - Email address
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Formatted email
 */
export const formatEmail = (email, maxLength = 50) => {
  if (!email) return '';
  if (email.length <= maxLength) return email;

  return email.substring(0, maxLength - 3) + '...';
};

/**
 * Format status with badge colors
 * @param {string} status - Status value
 * @returns {object} {text, color, icon}
 */
export const formatStatus = (status) => {
  const statusMap = {
    // Procurement statuses
    'planning': { text: 'Planning', color: '#3498db', icon: '📝' },
    'template': { text: 'Template', color: '#9b59b6', icon: '📄' },
    'rfq': { text: 'RFQ', color: '#e74c3c', icon: '📬' },
    'clarification': { text: 'Clarification', color: '#f39c12', icon: '💬' },
    'submission': { text: 'Submission', color: '#e67e22', icon: '📮' },
    'evaluation': { text: 'Evaluation', color: '#1abc9c', icon: '⭐' },
    'approval': { text: 'Approval', color: '#16a085', icon: '✓' },
    'award': { text: 'Award', color: '#27ae60', icon: '🏆' },
    'contract': { text: 'Contract', color: '#2980b9', icon: '📋' },

    // General statuses
    'active': { text: 'Active', color: '#27ae60', icon: '✓' },
    'inactive': { text: 'Inactive', color: '#95a5a6', icon: '⊗' },
    'pending': { text: 'Pending', color: '#f39c12', icon: '⏳' },
    'completed': { text: 'Completed', color: '#27ae60', icon: '✓' },
    'failed': { text: 'Failed', color: '#e74c3c', icon: '✕' },
    'approved': { text: 'Approved', color: '#27ae60', icon: '✓' },
    'rejected': { text: 'Rejected', color: '#e74c3c', icon: '✕' },
    'draft': { text: 'Draft', color: '#95a5a6', icon: '📝' }
  };

  return statusMap[status?.toLowerCase()] || {
    text: status || 'Unknown',
    color: '#95a5a6',
    icon: '❓'
  };
};

/**
 * Format priority with visual indicator
 * @param {string} priority - Priority level
 * @returns {object} {text, color, icon, level}
 */
export const formatPriority = (priority) => {
  const priorityMap = {
    'critical': { text: 'Critical', color: '#c0392b', icon: '🔴', level: 4 },
    'high': { text: 'High', color: '#e74c3c', icon: '🔴', level: 3 },
    'medium': { text: 'Medium', color: '#f39c12', icon: '🟡', level: 2 },
    'low': { text: 'Low', color: '#27ae60', icon: '🟢', level: 1 }
  };

  return priorityMap[priority?.toLowerCase()] || {
    text: priority || 'Unknown',
    color: '#95a5a6',
    icon: '⚪',
    level: 0
  };
};

/**
 * Format name (title case)
 * @param {string} name - Name to format
 * @returns {string} Title-cased name
 */
export const formatName = (name) => {
  if (!name) return '';

  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Format date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {string} Formatted date range
 */
export const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return '';

  const start = formatDate(startDate, 'short');
  const end = formatDate(endDate, 'short');

  return `${start} - ${end}`;
};

export default {
  formatDate,
  formatRelativeTime,
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatDuration,
  formatFileSize,
  formatScore,
  formatPhoneNumber,
  formatEmail,
  formatStatus,
  formatPriority,
  formatName,
  truncateText,
  formatDateRange
};
