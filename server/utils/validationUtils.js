/**
 * Validation Utility Functions
 * Provides common validation for procurement system
 */

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {object} { isValid, error }
 */
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email);

  return {
    isValid,
    error: !isValid ? 'Invalid email format' : null,
  };
};

/**
 * Validate phone number
 * @param {string} phone - Phone to validate
 * @returns {object} { isValid, error }
 */
const validatePhone = (phone) => {
  const phoneRegex = /^[\d\s\-\(\)\+]{10,}$/;
  const isValid = phoneRegex.test(phone?.replace(/\s/g, ''));

  return {
    isValid,
    error: !isValid ? 'Invalid phone number' : null,
  };
};

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {object} { isValid, error }
 */
const validateUrl = (url) => {
  try {
    new URL(url);
    return { isValid: true, error: null };
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }
};

/**
 * Validate required field
 * @param {*} value - Value to check
 * @param {string} fieldName - Field name for error message
 * @returns {object} { isValid, error }
 */
const validateRequired = (value, fieldName = 'Field') => {
  const isValid = value !== null && value !== undefined && value !== '';

  return {
    isValid,
    error: !isValid ? `${fieldName} is required` : null,
  };
};

/**
 * Validate minimum length
 * @param {string} value - Value to check
 * @param {number} minLength - Minimum length
 * @param {string} fieldName - Field name for error message
 * @returns {object} { isValid, error }
 */
const validateMinLength = (value, minLength, fieldName = 'Field') => {
  const isValid = value && value.length >= minLength;

  return {
    isValid,
    error: !isValid
      ? `${fieldName} must be at least ${minLength} characters`
      : null,
  };
};

/**
 * Validate maximum length
 * @param {string} value - Value to check
 * @param {number} maxLength - Maximum length
 * @param {string} fieldName - Field name for error message
 * @returns {object} { isValid, error }
 */
const validateMaxLength = (value, maxLength, fieldName = 'Field') => {
  const isValid = !value || value.length <= maxLength;

  return {
    isValid,
    error: !isValid
      ? `${fieldName} cannot exceed ${maxLength} characters`
      : null,
  };
};

/**
 * Validate numeric value
 * @param {*} value - Value to check
 * @param {object} options - { min, max }
 * @param {string} fieldName - Field name for error message
 * @returns {object} { isValid, error }
 */
const validateNumber = (value, options = {}, fieldName = 'Field') => {
  const num = parseFloat(value);
  const isNumeric = !isNaN(num);

  if (!isNumeric) {
    return {
      isValid: false,
      error: `${fieldName} must be a number`,
    };
  }

  const { min, max } = options;

  if (min !== undefined && num < min) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${min}`,
    };
  }

  if (max !== undefined && num > max) {
    return {
      isValid: false,
      error: `${fieldName} cannot exceed ${max}`,
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate score (0-10 range)
 * @param {number} score - Score to validate
 * @returns {object} { isValid, error }
 */
const validateScore = (score) => {
  const scoreNum = parseFloat(score);

  if (isNaN(scoreNum)) {
    return {
      isValid: false,
      error: 'Score must be a number',
    };
  }

  if (scoreNum < 0 || scoreNum > 10) {
    return {
      isValid: false,
      error: 'Score must be between 0 and 10',
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate date
 * @param {Date|string} date - Date to validate
 * @param {object} options - { min, max, canBePast }
 * @returns {object} { isValid, error }
 */
const validateDate = (date, options = {}) => {
  const d = new Date(date);

  if (isNaN(d.getTime())) {
    return {
      isValid: false,
      error: 'Invalid date format',
    };
  }

  const now = new Date();

  if (options.canBePast === false && d < now) {
    return {
      isValid: false,
      error: 'Date cannot be in the past',
    };
  }

  if (options.min && d < new Date(options.min)) {
    return {
      isValid: false,
      error: `Date cannot be before ${options.min}`,
    };
  }

  if (options.max && d > new Date(options.max)) {
    return {
      isValid: false,
      error: `Date cannot be after ${options.max}`,
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate currency amount
 * @param {*} amount - Amount to validate
 * @param {string} currency - Currency code (default: 'USD')
 * @returns {object} { isValid, error, formatted }
 */
const validateCurrency = (amount, currency = 'USD') => {
  const num = parseFloat(amount);

  if (isNaN(num)) {
    return {
      isValid: false,
      error: 'Invalid currency amount',
      formatted: null,
    };
  }

  if (num < 0) {
    return {
      isValid: false,
      error: 'Amount cannot be negative',
      formatted: null,
    };
  }

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  });

  return {
    isValid: true,
    error: null,
    formatted: formatter.format(num),
  };
};

/**
 * Validate form data
 * @param {object} data - Form data
 * @param {object} schema - Validation schema
 * @returns {object} { isValid, errors }
 */
const validateForm = (data, schema) => {
  const errors = {};

  Object.keys(schema).forEach((field) => {
    const rules = schema[field];
    const value = data[field];

    if (rules.required) {
      const validation = validateRequired(value, rules.label || field);
      if (!validation.isValid) {
        errors[field] = validation.error;
        return;
      }
    }

    if (rules.type === 'email') {
      const validation = validateEmail(value);
      if (!validation.isValid) {
        errors[field] = validation.error;
      }
    }

    if (rules.type === 'phone') {
      const validation = validatePhone(value);
      if (!validation.isValid) {
        errors[field] = validation.error;
      }
    }

    if (rules.type === 'url') {
      const validation = validateUrl(value);
      if (!validation.isValid) {
        errors[field] = validation.error;
      }
    }

    if (rules.type === 'number') {
      const validation = validateNumber(value, rules.options, rules.label || field);
      if (!validation.isValid) {
        errors[field] = validation.error;
      }
    }

    if (rules.type === 'score') {
      const validation = validateScore(value);
      if (!validation.isValid) {
        errors[field] = validation.error;
      }
    }

    if (rules.type === 'date') {
      const validation = validateDate(value, rules.options);
      if (!validation.isValid) {
        errors[field] = validation.error;
      }
    }

    if (rules.minLength) {
      const validation = validateMinLength(value, rules.minLength, rules.label || field);
      if (!validation.isValid) {
        errors[field] = validation.error;
      }
    }

    if (rules.maxLength) {
      const validation = validateMaxLength(value, rules.maxLength, rules.label || field);
      if (!validation.isValid) {
        errors[field] = validation.error;
      }
    }

    if (rules.pattern) {
      const regex = new RegExp(rules.pattern);
      if (!regex.test(value)) {
        errors[field] = rules.patternError || `${rules.label || field} format is invalid`;
      }
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

module.exports = {
  validateEmail,
  validatePhone,
  validateUrl,
  validateRequired,
  validateMinLength,
  validateMaxLength,
  validateNumber,
  validateScore,
  validateDate,
  validateCurrency,
  validateForm,
};
