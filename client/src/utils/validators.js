/**
 * Validators Utility
 * 
 * Client-side form validation functions.
 * Validates user input before submission to server.
 * 
 * Features:
 * - Email validation
 * - Password strength checking
 * - Required field validation
 * - Pattern matching validation
 * - Range validation
 * - Custom validation rules
 */

/**
 * Validation error messages
 */
const ERROR_MESSAGES = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  password_weak: 'Password must be at least 8 characters with uppercase, lowercase, and numbers',
  password_mismatch: 'Passwords do not match',
  minLength: 'Must be at least {min} characters',
  maxLength: 'Must not exceed {max} characters',
  pattern: 'Invalid format',
  number: 'Must be a valid number',
  phone: 'Must be a valid phone number',
  url: 'Must be a valid URL',
  date: 'Must be a valid date',
  dateRange: 'End date must be after start date',
  budget: 'Budget must be a positive number',
  percentage: 'Must be between 0 and 100'
};

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {object} {valid: boolean, error: string}
 */
export const validateEmail = (email) => {
  if (!email) {
    return { valid: false, error: ERROR_MESSAGES.required };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: ERROR_MESSAGES.email };
  }

  return { valid: true, error: '' };
};

/**
 * Validate password strength
 * Requirements: 8+ chars, uppercase, lowercase, number, special char optional
 * @param {string} password - Password to validate
 * @returns {object} {valid: boolean, strength: number, error: string}
 */
export const validatePassword = (password) => {
  if (!password) {
    return { valid: false, strength: 0, error: ERROR_MESSAGES.required };
  }

  let strength = 0;
  let errors = [];

  // Check length
  if (password.length >= 8) strength++;
  else errors.push('At least 8 characters');

  // Check uppercase
  if (/[A-Z]/.test(password)) strength++;
  else errors.push('At least one uppercase letter');

  // Check lowercase
  if (/[a-z]/.test(password)) strength++;
  else errors.push('At least one lowercase letter');

  // Check numbers
  if (/\d/.test(password)) strength++;
  else errors.push('At least one number');

  // Check special characters
  if (/[!@#$%^&*]/.test(password)) strength++;

  const valid = strength >= 3;

  return {
    valid,
    strength: Math.min(strength, 5),
    error: valid ? '' : errors.join(', ')
  };
};

/**
 * Validate password match
 * @param {string} password1 - First password
 * @param {string} password2 - Second password
 * @returns {object} {valid: boolean, error: string}
 */
export const validatePasswordMatch = (password1, password2) => {
  if (password1 !== password2) {
    return { valid: false, error: ERROR_MESSAGES.password_mismatch };
  }

  return { valid: true, error: '' };
};

/**
 * Validate required field
 * @param {any} value - Value to validate
 * @returns {object} {valid: boolean, error: string}
 */
export const validateRequired = (value) => {
  if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
    return { valid: false, error: ERROR_MESSAGES.required };
  }

  return { valid: true, error: '' };
};

/**
 * Validate minimum length
 * @param {string} value - Value to validate
 * @param {number} min - Minimum length
 * @returns {object} {valid: boolean, error: string}
 */
export const validateMinLength = (value, min) => {
  if (!value || value.length < min) {
    return { valid: false, error: ERROR_MESSAGES.minLength.replace('{min}', min) };
  }

  return { valid: true, error: '' };
};

/**
 * Validate maximum length
 * @param {string} value - Value to validate
 * @param {number} max - Maximum length
 * @returns {object} {valid: boolean, error: string}
 */
export const validateMaxLength = (value, max) => {
  if (value && value.length > max) {
    return { valid: false, error: ERROR_MESSAGES.maxLength.replace('{max}', max) };
  }

  return { valid: true, error: '' };
};

/**
 * Validate number
 * @param {string|number} value - Value to validate
 * @param {object} options - {min, max}
 * @returns {object} {valid: boolean, error: string}
 */
export const validateNumber = (value, options = {}) => {
  if (value === '' || value === null || value === undefined) {
    return { valid: false, error: ERROR_MESSAGES.required };
  }

  const num = parseFloat(value);

  if (isNaN(num)) {
    return { valid: false, error: ERROR_MESSAGES.number };
  }

  if (options.min !== undefined && num < options.min) {
    return { valid: false, error: `Must be at least ${options.min}` };
  }

  if (options.max !== undefined && num > options.max) {
    return { valid: false, error: `Must not exceed ${options.max}` };
  }

  return { valid: true, error: '' };
};

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {object} {valid: boolean, error: string}
 */
export const validatePhoneNumber = (phone) => {
  if (!phone) {
    return { valid: false, error: ERROR_MESSAGES.required };
  }

  const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
  if (!phoneRegex.test(phone)) {
    return { valid: false, error: ERROR_MESSAGES.phone };
  }

  return { valid: true, error: '' };
};

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {object} {valid: boolean, error: string}
 */
export const validateURL = (url) => {
  if (!url) {
    return { valid: false, error: ERROR_MESSAGES.required };
  }

  try {
    new URL(url);
    return { valid: true, error: '' };
  } catch {
    return { valid: false, error: ERROR_MESSAGES.url };
  }
};

/**
 * Validate date
 * @param {string|Date} date - Date to validate
 * @returns {object} {valid: boolean, error: string}
 */
export const validateDate = (date) => {
  if (!date) {
    return { valid: false, error: ERROR_MESSAGES.required };
  }

  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return { valid: false, error: ERROR_MESSAGES.date };
  }

  return { valid: true, error: '' };
};

/**
 * Validate date range
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date
 * @returns {object} {valid: boolean, error: string}
 */
export const validateDateRange = (startDate, endDate) => {
  const startResult = validateDate(startDate);
  if (!startResult.valid) return startResult;

  const endResult = validateDate(endDate);
  if (!endResult.valid) return endResult;

  if (new Date(endDate) <= new Date(startDate)) {
    return { valid: false, error: ERROR_MESSAGES.dateRange };
  }

  return { valid: true, error: '' };
};

/**
 * Validate budget (positive number)
 * @param {number|string} budget - Budget amount
 * @returns {object} {valid: boolean, error: string}
 */
export const validateBudget = (budget) => {
  const result = validateNumber(budget);
  if (!result.valid) return result;

  const num = parseFloat(budget);
  if (num <= 0) {
    return { valid: false, error: ERROR_MESSAGES.budget };
  }

  return { valid: true, error: '' };
};

/**
 * Validate percentage (0-100)
 * @param {number|string} value - Percentage value
 * @returns {object} {valid: boolean, error: string}
 */
export const validatePercentage = (value) => {
  const result = validateNumber(value, { min: 0, max: 100 });
  if (!result.valid) {
    return { valid: false, error: ERROR_MESSAGES.percentage };
  }

  return { valid: true, error: '' };
};

/**
 * Validate pattern match
 * @param {string} value - Value to validate
 * @param {RegExp} pattern - Regex pattern
 * @returns {object} {valid: boolean, error: string}
 */
export const validatePattern = (value, pattern) => {
  if (!pattern.test(value)) {
    return { valid: false, error: ERROR_MESSAGES.pattern };
  }

  return { valid: true, error: '' };
};

/**
 * Validate procurement planning form
 * @param {object} data - Form data
 * @returns {object} {valid: boolean, errors: object}
 */
export const validateProcurementPlan = (data) => {
  const errors = {};

  if (!data.procurementTitle) {
    errors.procurementTitle = 'Procurement title is required';
  } else if (data.procurementTitle.length < 10) {
    errors.procurementTitle = 'Title must be at least 10 characters';
  }

  if (!data.procurementType) {
    errors.procurementType = 'Procurement type is required';
  }

  const budgetResult = validateBudget(data.estimatedBudget);
  if (!budgetResult.valid) {
    errors.estimatedBudget = budgetResult.error;
  }

  if (!data.procurementReason) {
    errors.procurementReason = 'Reason is required';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate RFQ form
 * @param {object} data - Form data
 * @returns {object} {valid: boolean, errors: object}
 */
export const validateRFQForm = (data) => {
  const errors = {};

  if (!data.rfqTitle) {
    errors.rfqTitle = 'RFQ title is required';
  }

  if (!data.closingDate) {
    errors.closingDate = 'Closing date is required';
  } else if (new Date(data.closingDate) <= new Date()) {
    errors.closingDate = 'Closing date must be in the future';
  }

  if (!data.closingTime) {
    errors.closingTime = 'Closing time is required';
  }

  if (!data.submissionFormat) {
    errors.submissionFormat = 'Submission format is required';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate evaluation scores
 * @param {object} data - Score data
 * @returns {object} {valid: boolean, errors: object}
 */
export const validateEvaluationScores = (data) => {
  const errors = {};

  if (data.technicalScore === '' || data.technicalScore === null) {
    errors.technicalScore = 'Technical score is required';
  } else {
    const result = validatePercentage(data.technicalScore);
    if (!result.valid) errors.technicalScore = result.error;
  }

  if (data.financialScore === '' || data.financialScore === null) {
    errors.financialScore = 'Financial score is required';
  } else {
    const result = validatePercentage(data.financialScore);
    if (!result.valid) errors.financialScore = result.error;
  }

  if (!data.evaluatorName) {
    errors.evaluatorName = 'Evaluator name is required';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

export default {
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateRequired,
  validateMinLength,
  validateMaxLength,
  validateNumber,
  validatePhoneNumber,
  validateURL,
  validateDate,
  validateDateRange,
  validateBudget,
  validatePercentage,
  validatePattern,
  validateProcurementPlan,
  validateRFQForm,
  validateEvaluationScores,
  ERROR_MESSAGES
};
