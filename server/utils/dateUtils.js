/**
 * Date and Time Utility Functions
 * Provides common date/time operations for procurement system
 */

/**
 * Format date to readable string
 * @param {Date|string} date - Date object or ISO string
 * @param {string} format - Format pattern (default: 'YYYY-MM-DD HH:mm:ss')
 * @returns {string} Formatted date string
 */
const formatDate = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';

  const pad = (num) => String(num).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

/**
 * Calculate time remaining until a deadline
 * @param {Date|string} deadline - Deadline date
 * @returns {object} { days, hours, minutes, seconds, total, isOverdue, formatted }
 */
const calculateTimeRemaining = (deadline) => {
  const now = new Date();
  const due = new Date(deadline);
  const diff = due - now;

  const isOverdue = diff < 0;
  const absDiff = Math.abs(diff);

  const seconds = Math.floor((absDiff / 1000) % 60);
  const minutes = Math.floor((absDiff / (1000 * 60)) % 60);
  const hours = Math.floor((absDiff / (1000 * 60 * 60)) % 24);
  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));

  const formatted = isOverdue
    ? `Overdue by ${days}d ${hours}h`
    : days > 0
      ? `${days}d ${hours}h remaining`
      : hours > 0
        ? `${hours}h ${minutes}m remaining`
        : `${minutes}m remaining`;

  return {
    days,
    hours,
    minutes,
    seconds,
    total: absDiff,
    isOverdue,
    formatted,
  };
};

/**
 * Get relative time string (e.g., "2 hours ago")
 * @param {Date|string} date - Date to compare
 * @returns {string} Relative time string
 */
const getRelativeTime = (date) => {
  const now = new Date();
  const d = new Date(date);
  const seconds = Math.floor((now - d) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;

  return formatDate(d, 'YYYY-MM-DD');
};

/**
 * Check if date is within business hours
 * @param {Date|string} date - Date to check (default: now)
 * @returns {boolean} True if within business hours (9-17)
 */
const isBusinessHours = (date = new Date()) => {
  const d = new Date(date);
  const hour = d.getHours();
  const day = d.getDay();

  return day > 0 && day < 6 && hour >= 9 && hour < 17;
};

/**
 * Add business days to a date
 * @param {Date|string} date - Start date
 * @param {number} days - Number of business days to add
 * @returns {Date} New date
 */
const addBusinessDays = (date, days) => {
  const d = new Date(date);
  let added = 0;

  while (added < days) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day > 0 && day < 6) added++;
  }

  return d;
};

/**
 * Get next business day
 * @param {Date|string} date - Start date (default: now)
 * @returns {Date} Next business day
 */
const getNextBusinessDay = (date = new Date()) => {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);

  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }

  return d;
};

/**
 * Get business day count between two dates
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {number} Number of business days
 */
const getBusinessDaysBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;

  const current = new Date(start);
  while (current <= end) {
    if (current.getDay() > 0 && current.getDay() < 6) count++;
    current.setDate(current.getDate() + 1);
  }

  return count;
};

/**
 * Parse date string in various formats
 * @param {string} dateString - Date string
 * @returns {Date} Parsed date or null
 */
const parseDate = (dateString) => {
  if (!dateString) return null;

  // Try common formats
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/, // ISO
    /^(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})/, // MM/DD/YYYY
    /^(\d{1,2})\s(\w+)\s(\d{4})/, // DD Month YYYY
  ];

  const d = new Date(dateString);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Get start of day
 * @param {Date|string} date - Date (default: now)
 * @returns {Date} Start of day (00:00:00)
 */
const getStartOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get end of day
 * @param {Date|string} date - Date (default: now)
 * @returns {Date} End of day (23:59:59)
 */
const getEndOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Check if two dates are same day
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {boolean} True if same day
 */
const isSameDay = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);

  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

module.exports = {
  formatDate,
  calculateTimeRemaining,
  getRelativeTime,
  isBusinessHours,
  addBusinessDays,
  getNextBusinessDay,
  getBusinessDaysBetween,
  parseDate,
  getStartOfDay,
  getEndOfDay,
  isSameDay,
};
