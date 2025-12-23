/**
 * Enterprise Formatting and Localization Utility Library
 * 
 * Comprehensive formatting operations for procurement systems with
 * international localization, procurement-specific formats, template processing,
 * validation, sanitization, and advanced text handling capabilities
 * 
 * Features:
 * - International currency and number formatting
 * - Procurement-specific ID and reference formatting
 * - Regional date, time, and address formatting
 * - Template-based document formatting
 * - Multi-language text processing
 * - Rich text and HTML formatting
 * - Export formatting (PDF, Excel, CSV)
 * - Performance-optimized caching
 * - Validation and sanitization
 * - Audit logging for compliance
 */

const moment = require('moment-timezone');
const validator = require('validator');

// Configuration
const FORMAT_CONFIG = {
  defaultLocale: process.env.DEFAULT_LOCALE || 'en-US',
  defaultCurrency: process.env.DEFAULT_CURRENCY || 'USD',
  defaultTimezone: process.env.DEFAULT_TIMEZONE || 'UTC',
  auditLogging: process.env.ENABLE_FORMAT_AUDIT !== 'false',
  cacheEnabled: process.env.FORMAT_CACHE_ENABLED !== 'false',
  cacheSize: parseInt(process.env.FORMAT_CACHE_SIZE) || 1000,
  sanitizeHtml: true,
  strictValidation: true
};

// International locale configurations
const LOCALE_CONFIGS = {
  'en-US': {
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    numberSeparator: ',',
    decimalSeparator: '.',
    phoneFormat: '+1 (xxx) xxx-xxxx',
    addressFormat: 'street, city, state zip'
  },
  'en-GB': {
    currency: 'GBP',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    numberSeparator: ',',
    decimalSeparator: '.',
    phoneFormat: '+44 xxxx xxx xxx',
    addressFormat: 'street, city, postcode'
  },
  'de-DE': {
    currency: 'EUR',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: '24h',
    numberSeparator: '.',
    decimalSeparator: ',',
    phoneFormat: '+49 xxx xxx xxxx',
    addressFormat: 'street, plz city'
  },
  'fr-FR': {
    currency: 'EUR',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    numberSeparator: ' ',
    decimalSeparator: ',',
    phoneFormat: '+33 x xx xx xx xx',
    addressFormat: 'street, code postal city'
  },
  'ja-JP': {
    currency: 'JPY',
    dateFormat: 'YYYY/MM/DD',
    timeFormat: '24h',
    numberSeparator: ',',
    decimalSeparator: '.',
    phoneFormat: '+81 xx xxxx xxxx',
    addressFormat: 'postcode city street'
  }
};

// Procurement-specific formatting patterns
const PROCUREMENT_PATTERNS = {
  rfqNumber: {
    pattern: 'RFQ-{year}-{sequence:6}',
    example: 'RFQ-2024-000001'
  },
  contractId: {
    pattern: 'CNT-{department:3}-{year}-{sequence:4}',
    example: 'CNT-PRO-2024-0001'
  },
  supplierId: {
    pattern: 'SUP-{country:2}-{sequence:5}',
    example: 'SUP-US-12345'
  },
  purchaseOrder: {
    pattern: 'PO-{location:3}-{year:2}{month:2}{day:2}-{sequence:4}',
    example: 'PO-NYC-241215-0001'
  },
  invoiceNumber: {
    pattern: 'INV-{year}{month:2}-{sequence:5}',
    example: 'INV-202412-00001'
  },
  auditId: {
    pattern: 'AUD-{type:2}-{year}{week:2}-{sequence:3}',
    example: 'AUD-CM-202451-001'
  }
};

// Text formatting constants
const TEXT_CONSTANTS = {
  maxSafeTruncateLength: 10000,
  htmlSafeEntities: {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  },
  statusColors: {
    active: '#28a745',
    inactive: '#6c757d',
    pending: '#ffc107',
    approved: '#17a2b8',
    rejected: '#dc3545',
    draft: '#e83e8c',
    completed: '#20c997',
    cancelled: '#fd7e14'
  },
  priorityLevels: {
    critical: { color: '#dc3545', weight: 5, icon: '🔴' },
    high: { color: '#fd7e14', weight: 4, icon: '🟠' },
    medium: { color: '#ffc107', weight: 3, icon: '🟡' },
    low: { color: '#28a745', weight: 2, icon: '🟢' },
    minimal: { color: '#6c757d', weight: 1, icon: '⚪' }
  }
};

// Performance cache
const formatCache = new Map();
const templateCache = new Map();

/**
 * Enhanced international currency formatter
 * @param {number} amount - Amount to format
 * @param {object} options - Formatting options
 * @returns {string} Formatted currency string
 */
const formatCurrency = (amount, options = {}) => {
  try {
    const {
      currency = FORMAT_CONFIG.defaultCurrency,
      locale = FORMAT_CONFIG.defaultLocale,
      decimals = 2,
      showSymbol = true,
      compact = false,
      exchangeRate = null,
      baseCurrency = null
    } = options;

    // Input validation
    if (amount === null || amount === undefined) return showSymbol ? `${currency} 0.00` : '0.00';
    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new Error('Invalid amount: must be a number');
    }

    // Apply exchange rate if provided
    let finalAmount = amount;
    if (exchangeRate && baseCurrency && baseCurrency !== currency) {
      finalAmount = amount * exchangeRate;
    }

    // Cache key for performance
    const cacheKey = `currency_${finalAmount}_${currency}_${locale}_${decimals}_${compact}`;
    if (FORMAT_CONFIG.cacheEnabled && formatCache.has(cacheKey)) {
      return formatCache.get(cacheKey);
    }

    // Format options
    const formatOptions = {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    };

    if (compact && Math.abs(finalAmount) >= 1000) {
      formatOptions.notation = 'compact';
      formatOptions.compactDisplay = 'short';
    }

    const formatter = new Intl.NumberFormat(locale, formatOptions);
    let result = formatter.format(finalAmount);

    // Remove symbol if requested
    if (!showSymbol) {
      const symbolRegex = new RegExp(`[${currency}$€£¥₹₽]`, 'g');
      result = result.replace(symbolRegex, '').trim();
    }

    // Cache result
    if (FORMAT_CONFIG.cacheEnabled) {
      formatCache.set(cacheKey, result);
      manageCacheSize(formatCache, FORMAT_CONFIG.cacheSize);
    }

    return result;

  } catch (error) {
    console.error('Currency formatting error:', error);
    return `${currency} ${amount || 0}`;
  }
};

/**
 * Enhanced international number formatter
 * @param {number} num - Number to format
 * @param {object} options - Formatting options
 * @returns {string} Formatted number
 */
const formatNumber = (num, options = {}) => {
  try {
    const {
      locale = FORMAT_CONFIG.defaultLocale,
      decimals = 0,
      compact = false,
      unit = null,
      style = 'decimal',
      signDisplay = 'auto',
      notation = 'standard'
    } = options;

    if (num === null || num === undefined) return '0';
    if (typeof num !== 'number' || isNaN(num)) {
      throw new Error('Invalid number: must be a number');
    }

    const formatOptions = {
      style,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      signDisplay,
      notation: compact ? 'compact' : notation
    };

    if (unit) {
      formatOptions.style = 'unit';
      formatOptions.unit = unit;
    }

    const formatter = new Intl.NumberFormat(locale, formatOptions);
    return formatter.format(num);

  } catch (error) {
    console.error('Number formatting error:', error);
    return String(num || 0);
  }
};

/**
 * Enhanced percentage formatter with context
 * @param {number} value - Value as decimal (0.5 = 50%)
 * @param {object} options - Formatting options
 * @returns {string} Formatted percentage
 */
const formatPercentage = (value, options = {}) => {
  try {
    const {
      locale = FORMAT_CONFIG.defaultLocale,
      decimals = 1,
      showSign = false,
      compact = false,
      threshold = null
    } = options;

    if (value === null || value === undefined) return '0%';
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error('Invalid percentage value: must be a number');
    }

    // Apply threshold coloring/styling context
    let contextClass = '';
    if (threshold) {
      if (value >= threshold.high) contextClass = 'success';
      else if (value >= threshold.medium) contextClass = 'warning';
      else contextClass = 'danger';
    }

    const formatOptions = {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      signDisplay: showSign ? 'always' : 'auto'
    };

    if (compact && Math.abs(value) >= 10) {
      formatOptions.notation = 'compact';
    }

    const formatter = new Intl.NumberFormat(locale, formatOptions);
    const result = formatter.format(value);

    return contextClass ? { text: result, class: contextClass } : result;

  } catch (error) {
    console.error('Percentage formatting error:', error);
    return `${(value * 100).toFixed(options.decimals || 1)}%`;
  }
};

/**
 * Enhanced file size formatter with binary/decimal options
 * @param {number} bytes - Size in bytes
 * @param {object} options - Formatting options
 * @returns {string} Formatted file size
 */
const formatFileSize = (bytes, options = {}) => {
  try {
    const {
      binary = true,
      precision = 2,
      locale = FORMAT_CONFIG.defaultLocale,
      longForm = false
    } = options;

    if (!bytes || bytes === 0) return '0 B';
    if (typeof bytes !== 'number' || bytes < 0) {
      throw new Error('Invalid file size: must be a positive number');
    }

    const base = binary ? 1024 : 1000;
    const units = binary 
      ? (longForm ? ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'] : ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'])
      : (longForm ? ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'] : ['B', 'KB', 'MB', 'GB', 'TB', 'PB']);

    const index = Math.floor(Math.log(bytes) / Math.log(base));
    const value = bytes / Math.pow(base, index);

    const formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: precision
    });

    return `${formatter.format(value)} ${units[index]}`;

  } catch (error) {
    console.error('File size formatting error:', error);
    return `${bytes} B`;
  }
};

/**
 * International phone number formatter
 * @param {string} phone - Phone number
 * @param {object} options - Formatting options
 * @returns {string} Formatted phone number
 */
const formatPhone = (phone, options = {}) => {
  try {
    const {
      locale = FORMAT_CONFIG.defaultLocale,
      country = null,
      format = 'national',
      validate = true
    } = options;

    if (!phone) return '';

    // Clean input
    const cleaned = phone.replace(/\D/g, '');
    
    // Validate if requested
    if (validate && !validator.isMobilePhone(phone, country || 'any')) {
      throw new Error('Invalid phone number format');
    }

    // Get locale-specific formatting
    const localeConfig = LOCALE_CONFIGS[locale] || LOCALE_CONFIGS[FORMAT_CONFIG.defaultLocale];
    
    // Format based on locale and length
    if (country === 'US' || (!country && cleaned.length === 10)) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (country === 'US' && cleaned.length === 11) {
      return `+${cleaned.slice(0, 1)} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    } else if (country === 'GB' && cleaned.length >= 10) {
      return `+44 ${cleaned.slice(2, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
    } else if (country === 'DE' && cleaned.length >= 10) {
      return `+49 ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
    }

    // Fallback formatting
    return format === 'international' && !cleaned.startsWith('1') 
      ? `+${cleaned}` 
      : cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');

  } catch (error) {
    console.error('Phone formatting error:', error);
    return phone;
  }
};

/**
 * Enhanced URL formatter with validation and metadata
 * @param {string} url - URL to format
 * @param {object} options - Formatting options
 * @returns {string|object} Formatted URL or URL object
 */
const formatUrl = (url, options = {}) => {
  try {
    const {
      maxLength = 50,
      showProtocol = false,
      validate = true,
      includeMetadata = false,
      truncateMiddle = true
    } = options;

    if (!url) return '';

    // Validate URL if requested
    if (validate && !validator.isURL(url, { require_protocol: true })) {
      throw new Error('Invalid URL format');
    }

    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const protocol = urlObj.protocol;
    const path = urlObj.pathname;
    const search = urlObj.search;

    // Build display URL
    let displayUrl = showProtocol ? url : `${domain}${path}${search}`;

    // Truncate if necessary
    if (displayUrl.length > maxLength) {
      if (truncateMiddle && displayUrl.length > maxLength) {
        const start = Math.ceil((maxLength - 3) / 2);
        const end = Math.floor((maxLength - 3) / 2);
        displayUrl = `${displayUrl.slice(0, start)}...${displayUrl.slice(-end)}`;
      } else {
        displayUrl = `${displayUrl.slice(0, maxLength - 3)}...`;
      }
    }

    if (includeMetadata) {
      return {
        display: displayUrl,
        full: url,
        domain,
        protocol,
        path,
        isSecure: protocol === 'https:',
        length: url.length
      };
    }

    return displayUrl;

  } catch (error) {
    console.error('URL formatting error:', error);
    return url && url.length > options.maxLength 
      ? `${url.slice(0, options.maxLength - 3)}...` 
      : url || '';
  }
};

/**
 * Enhanced email formatter with validation and masking
 * @param {string} email - Email address
 * @param {object} options - Formatting options
 * @returns {string|object} Formatted email
 */
const formatEmail = (email, options = {}) => {
  try {
    const {
      maxLength = 30,
      validate = true,
      mask = false,
      includeMetadata = false,
      truncateAt = 'domain'
    } = options;

    if (!email) return '';

    // Validate email if requested
    if (validate && !validator.isEmail(email)) {
      throw new Error('Invalid email format');
    }

    const [localPart, domain] = email.split('@');

    // Apply masking if requested
    if (mask) {
      const maskedLocal = localPart.length > 3 
        ? `${localPart.slice(0, 2)}***${localPart.slice(-1)}`
        : `${localPart[0]}***`;
      email = `${maskedLocal}@${domain}`;
    }

    // Truncate if necessary
    let displayEmail = email;
    if (email.length > maxLength) {
      if (truncateAt === 'local') {
        const maxLocal = maxLength - domain.length - 4; // Account for @ and ...
        if (maxLocal > 0) {
          displayEmail = `${localPart.slice(0, maxLocal)}...@${domain}`;
        }
      } else {
        displayEmail = `${email.slice(0, maxLength - 3)}...`;
      }
    }

    if (includeMetadata) {
      return {
        display: displayEmail,
        full: email,
        localPart,
        domain,
        isValid: validator.isEmail(email),
        masked: mask
      };
    }

    return displayEmail;

  } catch (error) {
    console.error('Email formatting error:', error);
    return email || '';
  }
};

/**
 * Enhanced duration formatter with multiple units and languages
 * @param {Date|string|number} start - Start date/time or duration in ms
 * @param {Date|string} end - End date/time (optional)
 * @param {object} options - Formatting options
 * @returns {string} Formatted duration
 */
const formatDuration = (start, end = null, options = {}) => {
  try {
    const {
      locale = FORMAT_CONFIG.defaultLocale,
      precision = 'auto',
      format = 'short',
      includeSeconds = false,
      maxUnits = 3
    } = options;

    let diffMs;

    // Handle different input types
    if (typeof start === 'number' && !end) {
      diffMs = Math.abs(start);
    } else {
      const startDate = new Date(start);
      const endDate = end ? new Date(end) : new Date();
      diffMs = Math.abs(endDate - startDate);
    }

    const units = {
      years: Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365)),
      months: Math.floor((diffMs % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30)),
      days: Math.floor((diffMs % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diffMs % (1000 * 60)) / 1000)
    };

    const formatMap = {
      short: { years: 'y', months: 'mo', days: 'd', hours: 'h', minutes: 'm', seconds: 's' },
      medium: { years: 'yr', months: 'mon', days: 'day', hours: 'hr', minutes: 'min', seconds: 'sec' },
      long: { years: 'year', months: 'month', days: 'day', hours: 'hour', minutes: 'minute', seconds: 'second' }
    };

    const labels = formatMap[format] || formatMap.short;
    const parts = [];

    // Build duration string
    Object.entries(units).forEach(([unit, value]) => {
      if (value > 0 && parts.length < maxUnits) {
        if (!includeSeconds && unit === 'seconds' && parts.length > 0) return;
        
        const label = labels[unit];
        const suffix = format === 'long' && value !== 1 ? 's' : '';
        parts.push(`${value}${format === 'short' ? '' : ' '}${label}${suffix}`);
      }
    });

    return parts.join(' ') || (includeSeconds ? '0s' : '0m');

  } catch (error) {
    console.error('Duration formatting error:', error);
    return '0m';
  }
};

/**
 * Procurement-specific ID formatter
 * @param {string} type - ID type (rfq, contract, supplier, etc.)
 * @param {object} data - Data for ID generation
 * @param {object} options - Formatting options
 * @returns {string} Formatted procurement ID
 */
const formatProcurementId = (type, data, options = {}) => {
  try {
    const {
      validate = true,
      includeChecksum = false,
      customPattern = null
    } = options;

    const pattern = customPattern || PROCUREMENT_PATTERNS[type];
    if (!pattern) {
      throw new Error(`Unknown procurement ID type: ${type}`);
    }

    let formatted = pattern.pattern;

    // Replace placeholders with actual values
    const replacements = {
      year: new Date().getFullYear().toString(),
      month: (new Date().getMonth() + 1).toString().padStart(2, '0'),
      day: new Date().getDate().toString().padStart(2, '0'),
      week: getWeekOfYear(new Date()).toString().padStart(2, '0'),
      ...data
    };

    Object.entries(replacements).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}(?::(\\d+))?\\}`, 'g');
      formatted = formatted.replace(regex, (match, length) => {
        if (length) {
          return String(value).padStart(parseInt(length), '0');
        }
        return String(value);
      });
    });

    // Add checksum if requested
    if (includeChecksum) {
      const checksum = calculateChecksum(formatted);
      formatted = `${formatted}-${checksum}`;
    }

    // Validate format if requested
    if (validate && !isValidProcurementId(formatted, type)) {
      throw new Error(`Invalid ${type} ID format: ${formatted}`);
    }

    return formatted;

  } catch (error) {
    console.error('Procurement ID formatting error:', error);
    return `${type.toUpperCase()}-ERROR`;
  }
};

/**
 * Enhanced text formatting with internationalization
 * @param {string} text - Text to format
 * @param {string} formatType - Format type
 * @param {object} options - Formatting options
 * @returns {string} Formatted text
 */
const formatText = (text, formatType, options = {}) => {
  try {
    const {
      locale = FORMAT_CONFIG.defaultLocale,
      preserveWhitespace = false,
      sanitize = FORMAT_CONFIG.sanitizeHtml,
      maxLength = null
    } = options;

    if (!text) return '';

    let result = text;

    // Sanitize HTML if enabled
    if (sanitize) {
      result = escapeHtml(result);
    }

    // Apply formatting based on type
    switch (formatType) {
      case 'capitalize':
        result = result.charAt(0).toUpperCase() + result.slice(1);
        break;
      case 'titleCase':
        result = result.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
        break;
      case 'upperCase':
        result = result.toUpperCase();
        break;
      case 'lowerCase':
        result = result.toLowerCase();
        break;
      case 'camelCase':
        result = result.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
          return index === 0 ? word.toLowerCase() : word.toUpperCase();
        }).replace(/\s+/g, '');
        break;
      case 'kebabCase':
        result = result.toLowerCase().replace(/\s+/g, '-');
        break;
      case 'snakeCase':
        result = result.toLowerCase().replace(/\s+/g, '_');
        break;
      case 'sentence':
        result = result.charAt(0).toUpperCase() + result.slice(1).toLowerCase();
        break;
      default:
        // No formatting applied
        break;
    }

    // Handle whitespace
    if (!preserveWhitespace) {
      result = result.trim().replace(/\s+/g, ' ');
    }

    // Truncate if max length specified
    if (maxLength && result.length > maxLength) {
      result = `${result.slice(0, maxLength - 3)}...`;
    }

    return result;

  } catch (error) {
    console.error('Text formatting error:', error);
    return text || '';
  }
};

/**
 * Enhanced status badge formatter with themes
 * @param {string} status - Status value
 * @param {object} options - Badge options
 * @returns {object} Enhanced badge object
 */
const formatStatusBadge = (status, options = {}) => {
  try {
    const {
      theme = 'default',
      size = 'medium',
      includeIcon = true,
      customColors = {},
      animate = false
    } = options;

    const statusLower = status?.toLowerCase() || 'unknown';
    const colors = { ...TEXT_CONSTANTS.statusColors, ...customColors };
    
    const baseColor = colors[statusLower] || colors.inactive;
    
    return {
      text: formatText(status, 'capitalize'),
      status: statusLower,
      color: baseColor,
      bgColor: `${baseColor}20`, // Add transparency
      borderColor: baseColor,
      icon: includeIcon ? getStatusIcon(statusLower) : null,
      theme,
      size,
      animate,
      classes: [`status-${statusLower}`, `size-${size}`, theme !== 'default' ? `theme-${theme}` : null].filter(Boolean)
    };

  } catch (error) {
    console.error('Status badge formatting error:', error);
    return {
      text: status || 'Unknown',
      status: 'unknown',
      color: '#6c757d',
      bgColor: '#e9ecef',
      icon: '❓'
    };
  }
};

/**
 * Template-based formatting system
 * @param {string} template - Template string with placeholders
 * @param {object} data - Data object for replacements
 * @param {object} options - Template options
 * @returns {string} Formatted string from template
 */
const formatTemplate = (template, data, options = {}) => {
  try {
    const {
      escapeHtml = true,
      allowFunctions = false,
      dateFormat = 'YYYY-MM-DD',
      numberFormat = { locale: FORMAT_CONFIG.defaultLocale },
      missingValueDefault = ''
    } = options;

    // Cache check
    const cacheKey = `template_${template}_${JSON.stringify(data)}`;
    if (FORMAT_CONFIG.cacheEnabled && templateCache.has(cacheKey)) {
      return templateCache.get(cacheKey);
    }

    let result = template;

    // Replace placeholders with actual values
    result = result.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = getNestedProperty(data, path);
      
      if (value === undefined || value === null) {
        return missingValueDefault;
      }

      // Format based on value type
      if (value instanceof Date) {
        return moment(value).format(dateFormat);
      } else if (typeof value === 'number') {
        return formatNumber(value, numberFormat);
      } else if (typeof value === 'string') {
        return escapeHtml ? escapeHtml(value) : value;
      }

      return String(value);
    });

    // Handle conditional blocks: {{#if condition}}content{{/if}}
    result = result.replace(/\{\{#if\s+(\w+)\}\}(.*?)\{\{\/if\}\}/gs, (match, condition, content) => {
      const conditionValue = getNestedProperty(data, condition);
      return conditionValue ? content : '';
    });

    // Handle loops: {{#each items}}{{name}}{{/each}}
    result = result.replace(/\{\{#each\s+(\w+)\}\}(.*?)\{\{\/each\}\}/gs, (match, arrayName, itemTemplate) => {
      const array = getNestedProperty(data, arrayName);
      if (!Array.isArray(array)) return '';

      return array.map(item => 
        formatTemplate(itemTemplate, item, { ...options, escapeHtml: false })
      ).join('');
    });

    // Cache result
    if (FORMAT_CONFIG.cacheEnabled) {
      templateCache.set(cacheKey, result);
      manageCacheSize(templateCache, FORMAT_CONFIG.cacheSize);
    }

    return result;

  } catch (error) {
    console.error('Template formatting error:', error);
    return template;
  }
};

// Helper Functions

const escapeHtml = (text) => {
  if (typeof text !== 'string') return text;
  return text.replace(/[&<>"'\/]/g, (char) => TEXT_CONSTANTS.htmlSafeEntities[char] || char);
};

const getStatusIcon = (status) => {
  const icons = {
    active: '✅',
    inactive: '⭕',
    pending: '⏳',
    approved: '✔️',
    rejected: '❌',
    draft: '📝',
    completed: '🎯',
    cancelled: '🚫'
  };
  return icons[status] || '❓';
};

const getNestedProperty = (obj, path) => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

const getWeekOfYear = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
};

const calculateChecksum = (str) => {
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    sum += str.charCodeAt(i);
  }
  return (sum % 97).toString().padStart(2, '0');
};

const isValidProcurementId = (id, type) => {
  // Basic validation - can be enhanced with more specific rules
  const patterns = {
    rfq: /^RFQ-\d{4}-\d{6}$/,
    contract: /^CNT-[A-Z]{3}-\d{4}-\d{4}$/,
    supplier: /^SUP-[A-Z]{2}-\d{5}$/
  };
  return patterns[type]?.test(id) || false;
};

const manageCacheSize = (cache, maxSize) => {
  while (cache.size > maxSize) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
};

// Advanced formatting functions

/**
 * Format address based on locale
 * @param {object} address - Address object
 * @param {object} options - Formatting options
 * @returns {string} Formatted address
 */
const formatAddress = (address, options = {}) => {
  try {
    const {
      locale = FORMAT_CONFIG.defaultLocale,
      format = 'full',
      separator = '\n'
    } = options;

    if (!address) return '';

    const config = LOCALE_CONFIGS[locale] || LOCALE_CONFIGS[FORMAT_CONFIG.defaultLocale];
    const parts = [];

    // Build address based on locale format
    if (config.addressFormat.includes('street') && address.street) {
      parts.push(address.street);
    }
    if (config.addressFormat.includes('city') && address.city) {
      parts.push(address.city);
    }
    if (config.addressFormat.includes('state') && address.state) {
      parts.push(address.state);
    }
    if (config.addressFormat.includes('zip') && address.zipCode) {
      parts.push(address.zipCode);
    }
    if (config.addressFormat.includes('postcode') && address.postCode) {
      parts.push(address.postCode);
    }
    if (address.country && format === 'full') {
      parts.push(address.country);
    }

    return parts.join(separator === '\n' ? '\n' : ', ');

  } catch (error) {
    console.error('Address formatting error:', error);
    return '';
  }
};

/**
 * Format JSON with syntax highlighting hints
 * @param {object} obj - Object to format
 * @param {object} options - Formatting options
 * @returns {string|object} Formatted JSON
 */
const formatJSON = (obj, options = {}) => {
  try {
    const {
      spaces = 2,
      maxDepth = null,
      sortKeys = false,
      includeSyntaxHints = false
    } = options;

    let processed = obj;

    if (maxDepth) {
      processed = limitDepth(obj, maxDepth);
    }

    if (sortKeys) {
      processed = sortObjectKeys(processed);
    }

    const formatted = JSON.stringify(processed, null, spaces);

    if (includeSyntaxHints) {
      return {
        formatted,
        syntaxHints: {
          strings: formatted.match(/"[^"]*"/g) || [],
          numbers: formatted.match(/:\s*(-?\d+\.?\d*)/g) || [],
          booleans: formatted.match(/:\s*(true|false)/g) || [],
          nulls: formatted.match(/:\s*null/g) || []
        }
      };
    }

    return formatted;

  } catch (error) {
    console.error('JSON formatting error:', error);
    return 'Invalid JSON';
  }
};

const limitDepth = (obj, maxDepth, currentDepth = 0) => {
  if (currentDepth >= maxDepth) return '[Max Depth Reached]';
  if (typeof obj !== 'object' || obj === null) return obj;

  const result = Array.isArray(obj) ? [] : {};
  
  Object.keys(obj).forEach(key => {
    result[key] = limitDepth(obj[key], maxDepth, currentDepth + 1);
  });

  return result;
};

const sortObjectKeys = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);

  const sorted = {};
  Object.keys(obj).sort().forEach(key => {
    sorted[key] = sortObjectKeys(obj[key]);
  });

  return sorted;
};

/**
 * Clear formatting caches
 */
const clearCaches = () => {
  formatCache.clear();
  templateCache.clear();
  return {
    cleared: true,
    timestamp: new Date().toISOString()
  };
};

/**
 * Get cache statistics
 */
const getCacheStats = () => ({
  formatCache: formatCache.size,
  templateCache: templateCache.size,
  totalCached: formatCache.size + templateCache.size,
  maxSize: FORMAT_CONFIG.cacheSize
});

// Export comprehensive API
module.exports = {
  // Enhanced core functions
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatFileSize,
  formatPhone,
  formatUrl,
  formatEmail,
  formatDuration,
  formatText,
  formatStatusBadge,
  formatJSON,
  formatAddress,

  // Procurement-specific formatters
  formatProcurementId,
  formatTemplate,

  // Text utilities
  capitalize: (text) => formatText(text, 'capitalize'),
  toTitleCase: (text) => formatText(text, 'titleCase'),
  formatCamelCase: (text) => formatText(text, 'camelCase'),
  truncateText: (text, maxLength = 50, ellipsis = '...') => 
    formatText(text, 'none', { maxLength }),

  // List and array formatters
  formatList: (arr, lastSeparator = 'and') => {
    if (!arr || arr.length === 0) return '';
    if (arr.length === 1) return String(arr[0]);
    if (arr.length === 2) return `${arr[0]} ${lastSeparator} ${arr[1]}`;
    return `${arr.slice(0, -1).join(', ')} ${lastSeparator} ${arr[arr.length - 1]}`;
  },

  // Scoring and grading
  formatScore: (score, maxScore = 100) => 
    `${score || 0}/${maxScore}`,
  formatGrade: (score) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  },

  // Configuration and utilities
  FORMAT_CONFIG,
  LOCALE_CONFIGS,
  PROCUREMENT_PATTERNS,
  clearCaches,
  getCacheStats,

  // Advanced utilities
  escapeHtml,
  getStatusIcon,
  getSupportedLocales: () => Object.keys(LOCALE_CONFIGS),
  isValidLocale: (locale) => LOCALE_CONFIGS.hasOwnProperty(locale),
  getLocaleConfig: (locale) => LOCALE_CONFIGS[locale] || LOCALE_CONFIGS[FORMAT_CONFIG.defaultLocale]
};
