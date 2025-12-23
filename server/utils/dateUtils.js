/**
 * Enterprise Date and Time Utility Library
 * 
 * Comprehensive date/time operations for procurement systems with timezone support,
 * internationalization, holiday handling, and business logic validation
 * 
 * Features:
 * - Timezone-aware date operations
 * - International business calendar support
 * - Holiday and working day calculations
 * - Procurement-specific date validations
 * - Performance-optimized date parsing
 * - Localization and formatting
 * - SLA and deadline management
 * - Audit trail timestamping
 */

const moment = require('moment-timezone');
const { format, parseISO, isValid, differenceInDays, addDays, startOfDay, endOfDay } = require('date-fns');

// Configuration
const DATE_CONFIG = {
  defaultTimezone: process.env.DEFAULT_TIMEZONE || 'UTC',
  businessHours: {
    start: parseInt(process.env.BUSINESS_HOURS_START) || 9,
    end: parseInt(process.env.BUSINESS_HOURS_END) || 17
  },
  weekends: [0, 6], // Sunday, Saturday
  defaultLocale: process.env.DEFAULT_LOCALE || 'en-US',
  dateFormats: {
    short: 'YYYY-MM-DD',
    long: 'YYYY-MM-DD HH:mm:ss',
    display: 'MMM DD, YYYY',
    iso: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
    audit: 'YYYY-MM-DD HH:mm:ss UTC'
  }
};

// Procurement-specific date constants
const PROCUREMENT_CONSTANTS = {
  defaultSubmissionPeriod: 14, // days
  defaultEvaluationPeriod: 7,  // days
  defaultApprovalPeriod: 5,    // days
  defaultContractPeriod: 30,   // days
  minimumLeadTime: 2,          // days
  maxAdvanceNotice: 365,       // days
  slaBufferHours: 2            // hours
};

// Holiday calendars (expandable per region)
const HOLIDAY_CALENDARS = {
  'US': [
    { name: 'New Year\'s Day', date: '01-01' },
    { name: 'Independence Day', date: '07-04' },
    { name: 'Christmas Day', date: '12-25' },
    // Add more holidays as needed
  ],
  'UK': [
    { name: 'New Year\'s Day', date: '01-01' },
    { name: 'Christmas Day', date: '12-25' },
    { name: 'Boxing Day', date: '12-26' },
    // Add more holidays as needed
  ],
  'CA': [
    { name: 'New Year\'s Day', date: '01-01' },
    { name: 'Canada Day', date: '07-01' },
    { name: 'Christmas Day', date: '12-25' },
    // Add more holidays as needed
  ]
};

// Time zone mapping for major business regions
const TIMEZONE_REGIONS = {
  'US_EASTERN': 'America/New_York',
  'US_CENTRAL': 'America/Chicago', 
  'US_MOUNTAIN': 'America/Denver',
  'US_PACIFIC': 'America/Los_Angeles',
  'UK': 'Europe/London',
  'EU_CENTRAL': 'Europe/Berlin',
  'ASIA_SINGAPORE': 'Asia/Singapore',
  'ASIA_TOKYO': 'Asia/Tokyo',
  'AUSTRALIA': 'Australia/Sydney'
};

// Cache for performance optimization
const dateCache = new Map();
const holidayCache = new Map();

/**
 * Enhanced date formatter with timezone and locale support
 * @param {Date|string|number} date - Date to format
 * @param {string} format - Format pattern or preset name
 * @param {object} options - Formatting options
 * @returns {string} Formatted date string
 */
const formatDate = (date, format = 'long', options = {}) => {
  try {
    const {
      timezone = DATE_CONFIG.defaultTimezone,
      locale = DATE_CONFIG.defaultLocale,
      utc = false
    } = options;

    if (!date) return '';

    // Handle various input types
    let dateObj;
    if (typeof date === 'string') {
      dateObj = parseISO(date);
    } else if (typeof date === 'number') {
      dateObj = new Date(date);
    } else {
      dateObj = date;
    }

    if (!isValid(dateObj)) {
      return 'Invalid Date';
    }

    // Use preset formats or custom format
    const formatPattern = DATE_CONFIG.dateFormats[format] || format;

    // Apply timezone conversion
    if (utc || timezone === 'UTC') {
      return moment.utc(dateObj).format(formatPattern);
    } else {
      return moment.tz(dateObj, timezone).format(formatPattern);
    }

  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Format Error';
  }
};

/**
 * Enhanced time remaining calculator with SLA tracking
 * @param {Date|string} deadline - Deadline date
 * @param {object} options - Calculation options
 * @returns {object} Comprehensive time remaining data
 */
const calculateTimeRemaining = (deadline, options = {}) => {
  try {
    const {
      timezone = DATE_CONFIG.defaultTimezone,
      businessDaysOnly = false,
      includeHolidays = true,
      region = 'US',
      slaBuffer = PROCUREMENT_CONSTANTS.slaBufferHours
    } = options;

    const now = moment.tz(timezone);
    const due = moment.tz(deadline, timezone);
    
    if (!due.isValid()) {
      return { error: 'Invalid deadline date' };
    }

    const diff = due.diff(now);
    const isOverdue = diff < 0;
    const absDiff = Math.abs(diff);

    // Basic time units
    const duration = moment.duration(absDiff);
    const days = duration.days();
    const hours = duration.hours();
    const minutes = duration.minutes();
    const seconds = duration.seconds();

    // Business days calculation if requested
    let businessDays = days;
    if (businessDaysOnly) {
      businessDays = getBusinessDaysBetween(now.toDate(), due.toDate(), {
        region,
        includeHolidays
      });
    }

    // SLA status calculation
    const slaStatus = calculateSLAStatus(diff, slaBuffer);

    // Risk assessment
    const riskLevel = assessDeadlineRisk(diff, businessDaysOnly ? businessDays : days);

    // Formatted strings
    const formatted = formatTimeRemaining(isOverdue, days, hours, minutes, businessDaysOnly);
    const businessFormatted = businessDaysOnly ? 
      `${businessDays} business day${businessDays !== 1 ? 's' : ''}` : null;

    return {
      days,
      hours,
      minutes,
      seconds,
      businessDays,
      totalMilliseconds: absDiff,
      isOverdue,
      formatted,
      businessFormatted,
      sla: slaStatus,
      risk: riskLevel,
      deadline: due.toISOString(),
      calculatedAt: now.toISOString(),
      timezone,
      precision: 'millisecond'
    };

  } catch (error) {
    console.error('Time remaining calculation error:', error);
    return { error: error.message };
  }
};

/**
 * Enhanced relative time with business context
 * @param {Date|string} date - Date to compare
 * @param {object} options - Formatting options
 * @returns {string} Enhanced relative time string
 */
const getRelativeTime = (date, options = {}) => {
  try {
    const {
      timezone = DATE_CONFIG.defaultTimezone,
      businessContext = false,
      precise = false
    } = options;

    const now = moment.tz(timezone);
    const target = moment.tz(date, timezone);
    
    if (!target.isValid()) {
      return 'Invalid Date';
    }

    const diff = now.diff(target);
    const absDiff = Math.abs(diff);
    const isPast = diff > 0;
    const suffix = isPast ? 'ago' : 'from now';

    const duration = moment.duration(absDiff);

    // Business context formatting
    if (businessContext) {
      const businessDays = getBusinessDaysBetween(
        isPast ? target.toDate() : now.toDate(),
        isPast ? now.toDate() : target.toDate(),
        { region: options.region || 'US' }
      );

      if (businessDays > 0) {
        return `${businessDays} business day${businessDays !== 1 ? 's' : ''} ${suffix}`;
      }
    }

    // Precise formatting
    if (precise) {
      if (duration.asYears() >= 1) {
        return `${Math.floor(duration.asYears())}y ${duration.months()}mo ${suffix}`;
      } else if (duration.asMonths() >= 1) {
        return `${Math.floor(duration.asMonths())}mo ${duration.days()}d ${suffix}`;
      } else if (duration.asDays() >= 1) {
        return `${Math.floor(duration.asDays())}d ${duration.hours()}h ${suffix}`;
      } else if (duration.asHours() >= 1) {
        return `${Math.floor(duration.asHours())}h ${duration.minutes()}m ${suffix}`;
      }
    }

    // Standard formatting
    if (duration.asSeconds() < 60) return 'just now';
    if (duration.asMinutes() < 60) return `${Math.floor(duration.asMinutes())}m ${suffix}`;
    if (duration.asHours() < 24) return `${Math.floor(duration.asHours())}h ${suffix}`;
    if (duration.asDays() < 7) return `${Math.floor(duration.asDays())}d ${suffix}`;
    if (duration.asWeeks() < 4) return `${Math.floor(duration.asWeeks())}w ${suffix}`;

    return formatDate(target.toDate(), 'display', { timezone });

  } catch (error) {
    console.error('Relative time calculation error:', error);
    return 'Time Error';
  }
};

/**
 * Enhanced business hours checker with regional support
 * @param {Date|string} date - Date to check
 * @param {object} options - Check options
 * @returns {object} Business hours status with details
 */
const isBusinessHours = (date = new Date(), options = {}) => {
  try {
    const {
      timezone = DATE_CONFIG.defaultTimezone,
      region = 'US',
      customHours = null
    } = options;

    const momentDate = moment.tz(date, timezone);
    const hour = momentDate.hour();
    const day = momentDate.day(); // 0 = Sunday, 6 = Saturday
    
    // Use custom hours or default
    const businessHours = customHours || DATE_CONFIG.businessHours;
    
    // Check if it's a weekend
    const isWeekend = DATE_CONFIG.weekends.includes(day);
    
    // Check if it's a holiday
    const isHoliday = isHolidayDate(momentDate.toDate(), region);
    
    // Check if within business hours
    const withinHours = hour >= businessHours.start && hour < businessHours.end;
    
    const isBusinessTime = !isWeekend && !isHoliday && withinHours;

    return {
      isBusinessHours: isBusinessTime,
      isWeekend,
      isHoliday,
      withinHours,
      currentHour: hour,
      businessStart: businessHours.start,
      businessEnd: businessHours.end,
      dayOfWeek: momentDate.format('dddd'),
      nextBusinessHour: getNextBusinessHour(momentDate, options),
      timezone
    };

  } catch (error) {
    console.error('Business hours check error:', error);
    return { error: error.message };
  }
};

/**
 * Enhanced business days calculator with holiday support
 * @param {Date|string} startDate - Start date
 * @param {number} days - Number of business days to add
 * @param {object} options - Calculation options
 * @returns {Date} New date after adding business days
 */
const addBusinessDays = (startDate, days, options = {}) => {
  try {
    const {
      timezone = DATE_CONFIG.defaultTimezone,
      region = 'US',
      includeHolidays = true
    } = options;

    let current = moment.tz(startDate, timezone);
    let added = 0;

    // Cache key for performance
    const cacheKey = `businessDays_${current.format('YYYY-MM-DD')}_${days}_${region}`;
    if (dateCache.has(cacheKey)) {
      return dateCache.get(cacheKey);
    }

    while (added < days) {
      current.add(1, 'day');
      
      const day = current.day();
      const isWeekend = DATE_CONFIG.weekends.includes(day);
      const isHoliday = includeHolidays ? isHolidayDate(current.toDate(), region) : false;
      
      if (!isWeekend && !isHoliday) {
        added++;
      }
    }

    const result = current.toDate();
    dateCache.set(cacheKey, result);
    
    return result;

  } catch (error) {
    console.error('Business days addition error:', error);
    return null;
  }
};

/**
 * Enhanced business days counter with holiday awareness
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date  
 * @param {object} options - Counting options
 * @returns {number} Number of business days
 */
const getBusinessDaysBetween = (startDate, endDate, options = {}) => {
  try {
    const {
      timezone = DATE_CONFIG.defaultTimezone,
      region = 'US',
      includeHolidays = true,
      inclusive = false
    } = options;

    const start = moment.tz(startDate, timezone);
    const end = moment.tz(endDate, timezone);

    if (!start.isValid() || !end.isValid()) {
      throw new Error('Invalid start or end date');
    }

    if (start.isAfter(end)) {
      return 0;
    }

    // Cache key for performance
    const cacheKey = `businessDaysBetween_${start.format('YYYY-MM-DD')}_${end.format('YYYY-MM-DD')}_${region}`;
    if (dateCache.has(cacheKey)) {
      return dateCache.get(cacheKey);
    }

    let count = 0;
    const current = start.clone();
    const endDate = inclusive ? end.clone().add(1, 'day') : end;

    while (current.isBefore(endDate)) {
      const day = current.day();
      const isWeekend = DATE_CONFIG.weekends.includes(day);
      const isHoliday = includeHolidays ? isHolidayDate(current.toDate(), region) : false;
      
      if (!isWeekend && !isHoliday) {
        count++;
      }
      
      current.add(1, 'day');
    }

    dateCache.set(cacheKey, count);
    return count;

  } catch (error) {
    console.error('Business days counting error:', error);
    return 0;
  }
};

/**
 * Holiday checker with regional support
 * @param {Date|string} date - Date to check
 * @param {string} region - Region code (US, UK, CA, etc.)
 * @returns {boolean|object} Holiday status
 */
const isHolidayDate = (date, region = 'US') => {
  try {
    const momentDate = moment.tz(date, DATE_CONFIG.defaultTimezone);
    const dateString = momentDate.format('MM-DD');
    const year = momentDate.year();

    // Cache key
    const cacheKey = `holiday_${dateString}_${year}_${region}`;
    if (holidayCache.has(cacheKey)) {
      return holidayCache.get(cacheKey);
    }

    const holidays = HOLIDAY_CALENDARS[region] || [];
    const holiday = holidays.find(h => h.date === dateString);

    const result = holiday ? {
      isHoliday: true,
      name: holiday.name,
      date: dateString,
      region
    } : false;

    holidayCache.set(cacheKey, result);
    return result;

  } catch (error) {
    console.error('Holiday check error:', error);
    return false;
  }
};

/**
 * Get next business day with timezone support
 * @param {Date|string} date - Start date
 * @param {object} options - Options
 * @returns {Date} Next business day
 */
const getNextBusinessDay = (date = new Date(), options = {}) => {
  try {
    const {
      timezone = DATE_CONFIG.defaultTimezone,
      region = 'US'
    } = options;

    let current = moment.tz(date, timezone).add(1, 'day');
    
    while (true) {
      const day = current.day();
      const isWeekend = DATE_CONFIG.weekends.includes(day);
      const isHoliday = isHolidayDate(current.toDate(), region);
      
      if (!isWeekend && !isHoliday) {
        return current.toDate();
      }
      
      current.add(1, 'day');
      
      // Prevent infinite loops
      if (current.diff(moment.tz(date, timezone), 'days') > 14) {
        throw new Error('Unable to find next business day within 14 days');
      }
    }

  } catch (error) {
    console.error('Next business day calculation error:', error);
    return null;
  }
};

// Helper functions for enhanced functionality

const calculateSLAStatus = (diffMs, bufferHours) => {
  const bufferMs = bufferHours * 60 * 60 * 1000;
  
  if (diffMs < 0) {
    return { status: 'breached', severity: 'critical' };
  } else if (diffMs < bufferMs) {
    return { status: 'at_risk', severity: 'warning' };
  } else if (diffMs < bufferMs * 2) {
    return { status: 'approaching', severity: 'info' };
  } else {
    return { status: 'on_track', severity: 'success' };
  }
};

const assessDeadlineRisk = (diffMs, days) => {
  if (diffMs < 0) return 'high';
  if (days <= 1) return 'high';
  if (days <= 3) return 'medium';
  if (days <= 7) return 'low';
  return 'minimal';
};

const formatTimeRemaining = (isOverdue, days, hours, minutes, businessOnly = false) => {
  const prefix = isOverdue ? 'Overdue by ' : '';
  const suffix = isOverdue ? '' : ' remaining';
  const dayText = businessOnly ? 'business day' : 'day';
  
  if (isOverdue) {
    if (days > 0) return `${prefix}${days} ${dayText}${days !== 1 ? 's' : ''}, ${hours}h`;
    if (hours > 0) return `${prefix}${hours}h ${minutes}m`;
    return `${prefix}${minutes}m`;
  } else {
    if (days > 0) return `${days} ${dayText}${days !== 1 ? 's' : ''}, ${hours}h${suffix}`;
    if (hours > 0) return `${hours}h ${minutes}m${suffix}`;
    return `${minutes}m${suffix}`;
  }
};

const getNextBusinessHour = (momentDate, options = {}) => {
  const businessHours = options.customHours || DATE_CONFIG.businessHours;
  let next = momentDate.clone();
  
  // If it's outside business hours but same day
  if (next.hour() < businessHours.start) {
    next.hour(businessHours.start).minute(0).second(0);
    return next.toDate();
  }
  
  // If it's after business hours or weekend/holiday
  next = moment.tz(getNextBusinessDay(next.toDate(), options), options.timezone || DATE_CONFIG.defaultTimezone);
  next.hour(businessHours.start).minute(0).second(0);
  
  return next.toDate();
};

/**
 * Procurement-specific date utilities
 */

/**
 * Calculate procurement timeline with standard phases
 * @param {Date|string} startDate - Procurement start date
 * @param {object} options - Timeline options
 * @returns {object} Complete procurement timeline
 */
const calculateProcurementTimeline = (startDate, options = {}) => {
  try {
    const {
      submissionPeriod = PROCUREMENT_CONSTANTS.defaultSubmissionPeriod,
      evaluationPeriod = PROCUREMENT_CONSTANTS.defaultEvaluationPeriod,
      approvalPeriod = PROCUREMENT_CONSTANTS.defaultApprovalPeriod,
      contractPeriod = PROCUREMENT_CONSTANTS.defaultContractPeriod,
      timezone = DATE_CONFIG.defaultTimezone,
      region = 'US'
    } = options;

    const start = moment.tz(startDate, timezone);
    
    const timeline = {
      start: start.toDate(),
      phases: {
        planning: {
          start: start.toDate(),
          end: addBusinessDays(start.toDate(), 2, { timezone, region })
        },
        rfqPublication: {
          start: addBusinessDays(start.toDate(), 2, { timezone, region }),
          end: addBusinessDays(start.toDate(), 4, { timezone, region })
        },
        submissionPeriod: {
          start: addBusinessDays(start.toDate(), 4, { timezone, region }),
          end: addBusinessDays(start.toDate(), 4 + submissionPeriod, { timezone, region })
        },
        evaluation: {
          start: addBusinessDays(start.toDate(), 4 + submissionPeriod, { timezone, region }),
          end: addBusinessDays(start.toDate(), 4 + submissionPeriod + evaluationPeriod, { timezone, region })
        },
        approval: {
          start: addBusinessDays(start.toDate(), 4 + submissionPeriod + evaluationPeriod, { timezone, region }),
          end: addBusinessDays(start.toDate(), 4 + submissionPeriod + evaluationPeriod + approvalPeriod, { timezone, region })
        },
        contract: {
          start: addBusinessDays(start.toDate(), 4 + submissionPeriod + evaluationPeriod + approvalPeriod, { timezone, region }),
          end: addBusinessDays(start.toDate(), 4 + submissionPeriod + evaluationPeriod + approvalPeriod + contractPeriod, { timezone, region })
        }
      },
      totalBusinessDays: 4 + submissionPeriod + evaluationPeriod + approvalPeriod + contractPeriod,
      estimatedCompletion: addBusinessDays(start.toDate(), 4 + submissionPeriod + evaluationPeriod + approvalPeriod + contractPeriod, { timezone, region })
    };

    return timeline;

  } catch (error) {
    console.error('Procurement timeline calculation error:', error);
    return { error: error.message };
  }
};

/**
 * Validate procurement dates for business rules
 * @param {object} dates - Date object to validate
 * @param {object} options - Validation options
 * @returns {object} Validation results
 */
const validateProcurementDates = (dates, options = {}) => {
  try {
    const {
      timezone = DATE_CONFIG.defaultTimezone,
      region = 'US',
      strictMode = false
    } = options;

    const errors = [];
    const warnings = [];

    // Validate required dates exist
    const requiredDates = ['startDate', 'submissionDeadline'];
    requiredDates.forEach(dateField => {
      if (!dates[dateField]) {
        errors.push(`${dateField} is required`);
      }
    });

    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    // Convert dates to moment objects for comparison
    const start = moment.tz(dates.startDate, timezone);
    const submissionDeadline = moment.tz(dates.submissionDeadline, timezone);
    const evaluationDate = dates.evaluationDate ? moment.tz(dates.evaluationDate, timezone) : null;
    const awardDate = dates.awardDate ? moment.tz(dates.awardDate, timezone) : null;

    // Business rule validations
    const now = moment.tz(timezone);

    // Check if start date is in the future (with minimum lead time)
    const minLeadTime = now.clone().add(PROCUREMENT_CONSTANTS.minimumLeadTime, 'days');
    if (start.isBefore(minLeadTime)) {
      if (strictMode) {
        errors.push(`Start date must be at least ${PROCUREMENT_CONSTANTS.minimumLeadTime} days in the future`);
      } else {
        warnings.push(`Start date should be at least ${PROCUREMENT_CONSTANTS.minimumLeadTime} days in the future`);
      }
    }

    // Check submission deadline is after start date
    const minSubmissionPeriod = getBusinessDaysBetween(start.toDate(), submissionDeadline.toDate(), { timezone, region });
    if (minSubmissionPeriod < PROCUREMENT_CONSTANTS.defaultSubmissionPeriod) {
      warnings.push(`Submission period (${minSubmissionPeriod} business days) is shorter than recommended (${PROCUREMENT_CONSTANTS.defaultSubmissionPeriod} days)`);
    }

    // Check evaluation date sequencing
    if (evaluationDate && evaluationDate.isBefore(submissionDeadline)) {
      errors.push('Evaluation date cannot be before submission deadline');
    }

    // Check award date sequencing
    if (awardDate) {
      if (awardDate.isBefore(submissionDeadline)) {
        errors.push('Award date cannot be before submission deadline');
      }
      if (evaluationDate && awardDate.isBefore(evaluationDate)) {
        errors.push('Award date cannot be before evaluation date');
      }
    }

    // Check for weekend/holiday conflicts
    const keyDates = { submissionDeadline, evaluationDate, awardDate };
    Object.entries(keyDates).forEach(([name, date]) => {
      if (date) {
        const businessHoursCheck = isBusinessHours(date.toDate(), { timezone, region });
        if (businessHoursCheck.isWeekend || businessHoursCheck.isHoliday) {
          warnings.push(`${name} falls on ${businessHoursCheck.isHoliday ? 'a holiday' : 'weekend'}`);
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalBusinessDays: getBusinessDaysBetween(start.toDate(), awardDate ? awardDate.toDate() : submissionDeadline.toDate(), { timezone, region }),
        submissionPeriod: getBusinessDaysBetween(start.toDate(), submissionDeadline.toDate(), { timezone, region }),
        timezone,
        region
      }
    };

  } catch (error) {
    console.error('Date validation error:', error);
    return { valid: false, errors: [error.message], warnings: [] };
  }
};

/**
 * Generate audit timestamp with timezone and precision
 * @param {object} options - Timestamp options
 * @returns {string} Audit timestamp
 */
const generateAuditTimestamp = (options = {}) => {
  try {
    const {
      timezone = 'UTC',
      precision = 'second',
      includeOffset = true
    } = options;

    const now = moment.tz(timezone);
    
    let format = 'YYYY-MM-DD HH:mm:ss';
    if (precision === 'millisecond') {
      format = 'YYYY-MM-DD HH:mm:ss.SSS';
    }
    
    if (includeOffset) {
      format += ' Z';
    }

    return now.format(format);

  } catch (error) {
    console.error('Audit timestamp generation error:', error);
    return new Date().toISOString();
  }
};

// Enhanced parsing with multiple format support
const parseDate = (dateString, options = {}) => {
  try {
    if (!dateString) return null;

    const {
      timezone = DATE_CONFIG.defaultTimezone,
      formats = [
        'YYYY-MM-DD',
        'YYYY-MM-DDTHH:mm:ss',
        'YYYY-MM-DDTHH:mm:ss.SSSZ',
        'MM/DD/YYYY',
        'DD/MM/YYYY',
        'MMM DD, YYYY',
        'DD MMM YYYY'
      ]
    } = options;

    // Try each format
    for (const format of formats) {
      const parsed = moment.tz(dateString, format, timezone);
      if (parsed.isValid()) {
        return parsed.toDate();
      }
    }

    // Fallback to native parsing
    const fallback = moment.tz(dateString, timezone);
    return fallback.isValid() ? fallback.toDate() : null;

  } catch (error) {
    console.error('Date parsing error:', error);
    return null;
  }
};

// Enhanced utility functions with timezone support
const getStartOfDay = (date = new Date(), timezone = DATE_CONFIG.defaultTimezone) => {
  return moment.tz(date, timezone).startOf('day').toDate();
};

const getEndOfDay = (date = new Date(), timezone = DATE_CONFIG.defaultTimezone) => {
  return moment.tz(date, timezone).endOf('day').toDate();
};

const isSameDay = (date1, date2, timezone = DATE_CONFIG.defaultTimezone) => {
  const d1 = moment.tz(date1, timezone);
  const d2 = moment.tz(date2, timezone);
  return d1.isSame(d2, 'day');
};

// Cache management
const clearDateCache = () => {
  dateCache.clear();
  holidayCache.clear();
};

const getCacheStats = () => ({
  dateCache: dateCache.size,
  holidayCache: holidayCache.size,
  totalCached: dateCache.size + holidayCache.size
});

module.exports = {
  // Enhanced core functions
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

  // New enterprise functions
  isHolidayDate,
  calculateProcurementTimeline,
  validateProcurementDates,
  generateAuditTimestamp,

  // Configuration and utilities
  TIMEZONE_REGIONS,
  PROCUREMENT_CONSTANTS,
  DATE_CONFIG,
  clearDateCache,
  getCacheStats,

  // Advanced utilities
  formatTimestamp: (date, timezone = 'UTC') => generateAuditTimestamp({ timezone }),
  getBusinessQuarter: (date) => Math.ceil((moment(date).month() + 1) / 3),
  isWorkingDay: (date, region = 'US') => {
    const day = moment(date).day();
    return !DATE_CONFIG.weekends.includes(day) && !isHolidayDate(date, region);
  },
  addWorkingDays: (date, days, region = 'US') => addBusinessDays(date, days, { region }),
  subtractBusinessDays: (date, days, region = 'US') => {
    return addBusinessDays(date, -days, { region });
  }
};
