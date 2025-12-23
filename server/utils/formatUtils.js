/**
 * Formatting Utility Functions
 * Provides common formatting operations for procurement system
 */

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: 'USD')
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted currency string
 */
const formatCurrency = (amount, currency = 'USD', decimals = 2) => {
  if (!amount && amount !== 0) return `${currency} 0.00`;

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return formatter.format(amount);
};

/**
 * Format number with thousand separators
 * @param {number} num - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number
 */
const formatNumber = (num, decimals = 0) => {
  if (!num && num !== 0) return '0';

  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return formatter.format(num);
};

/**
 * Format percentage
 * @param {number} value - Value as decimal (0.5 = 50%)
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage
 */
const formatPercentage = (value, decimals = 1) => {
  if (!value && value !== 0) return '0%';

  return `${(value * 100).toFixed(decimals)}%`;
};

/**
 * Format file size
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted file size
 */
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const index = Math.floor(Math.log(bytes) / Math.log(k));
  const value = (bytes / Math.pow(k, index)).toFixed(2);

  return `${value} ${units[index]}`;
};

/**
 * Format phone number
 * @param {string} phone - Phone number (digits only)
 * @returns {string} Formatted phone number
 */
const formatPhone = (phone) => {
  if (!phone) return '';

  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  if (cleaned.length === 11) {
    return `+${cleaned.slice(0, 1)} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  return phone;
};

/**
 * Format URL
 * @param {string} url - URL to format
 * @returns {string} Formatted URL (truncated if long)
 */
const formatUrl = (url, maxLength = 50) => {
  if (!url) return '';

  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const path = urlObj.pathname.slice(0, maxLength - domain.length);

    return `${domain}${path}`;
  } catch {
    return url.length > maxLength ? `${url.slice(0, maxLength)}...` : url;
  }
};

/**
 * Format email
 * @param {string} email - Email address
 * @param {number} maxLength - Maximum display length
 * @returns {string} Formatted email
 */
const formatEmail = (email, maxLength = 30) => {
  if (!email) return '';

  return email.length > maxLength
    ? `${email.slice(0, maxLength - 3)}...`
    : email;
};

/**
 * Format duration between two dates
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {string} Formatted duration (e.g., "2d 5h 30m")
 */
const formatDuration = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = Math.abs(end - start);

  const seconds = Math.floor((diff / 1000) % 60);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 && parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(' ') || '0s';
};

/**
 * Format text - capitalize first letter
 * @param {string} text - Text to format
 * @returns {string} Formatted text
 */
const capitalize = (text) => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/**
 * Format text - convert to title case
 * @param {string} text - Text to format
 * @returns {string} Formatted text
 */
const toTitleCase = (text) => {
  if (!text) return '';

  return text
    .toLowerCase()
    .split(/[\s_-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Format text - convert camelCase to readable text
 * @param {string} text - Text to format
 * @returns {string} Formatted text
 */
const formatCamelCase = (text) => {
  if (!text) return '';

  return text
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} ellipsis - Ellipsis string (default: '...')
 * @returns {string} Truncated text
 */
const truncateText = (text, maxLength = 50, ellipsis = '...') => {
  if (!text) return '';

  return text.length > maxLength
    ? `${text.slice(0, maxLength)}${ellipsis}`
    : text;
};

/**
 * Format array to comma-separated string
 * @param {array} arr - Array to format
 * @param {string} lastSeparator - Separator for last item (default: 'and')
 * @returns {string} Formatted string
 */
const formatList = (arr, lastSeparator = 'and') => {
  if (!arr || arr.length === 0) return '';
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]} ${lastSeparator} ${arr[1]}`;

  return `${arr.slice(0, -1).join(', ')} ${lastSeparator} ${arr[arr.length - 1]}`;
};

/**
 * Format status badge
 * @param {string} status - Status value
 * @param {object} config - Status configuration from statusConfig
 * @returns {object} Badge object { text, color, bgColor }
 */
const formatStatusBadge = (status, config) => {
  return {
    text: config?.label || status,
    color: config?.color || '#6c757d',
    bgColor: config?.bgColor || '#e9ecef',
    icon: config?.icon || '•',
  };
};

/**
 * Format JSON with indentation
 * @param {object} obj - Object to format
 * @param {number} spaces - Spaces for indentation
 * @returns {string} Formatted JSON
 */
const formatJSON = (obj, spaces = 2) => {
  try {
    return JSON.stringify(obj, null, spaces);
  } catch {
    return 'Invalid JSON';
  }
};

/**
 * Format score range (e.g., "75/100")
 * @param {number} score - Current score
 * @param {number} maxScore - Maximum score (default: 100)
 * @returns {string} Formatted score
 */
const formatScore = (score, maxScore = 100) => {
  if (!score && score !== 0) return '0/100';
  return `${score}/${maxScore}`;
};

/**
 * Format grade based on score
 * @param {number} score - Score (0-100)
 * @returns {string} Letter grade (A, B, C, D, F)
 */
const formatGrade = (score) => {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
};

module.exports = {
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatFileSize,
  formatPhone,
  formatUrl,
  formatEmail,
  formatDuration,
  capitalize,
  toTitleCase,
  formatCamelCase,
  truncateText,
  formatList,
  formatStatusBadge,
  formatJSON,
  formatScore,
  formatGrade,
};
