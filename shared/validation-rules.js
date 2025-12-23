/**
 * Validation Rules
 *
 * Shared validation schemas and rules used for form validation on both client and server.
 * This module ensures consistent validation logic across the application.
 */

/**
 * Field Patterns
 *
 * Regular expressions for validating common field types.
 */
const FIELD_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // Validates email addresses
  PHONE: /^[\d\s\-\+\(\)]{10,}$/, // Validates phone numbers with optional spaces, dashes, and parentheses
  URL: /^https?:\/\/.+/, // Validates HTTP/HTTPS URLs
  CURRENCY: /^\d+(\.\d{1,2})?$/, // Validates currency values with up to 2 decimal places
  PERCENTAGE: /^(100|[1-9]?[0-9])(\.\d{1,2})?$/, // Validates percentages (0-100) with optional decimals
};

/**
 * Validation Schemas
 *
 * Defines validation rules for various entities and forms in the system.
 */
const VALIDATION_SCHEMAS = {
  LOGIN: {
    email: { required: true, pattern: FIELD_PATTERNS.EMAIL },
    password: { required: true, minLength: 8 },
  },

  PROCUREMENT: {
    procurementTitle: { required: true, minLength: 10, maxLength: 255 },
    procurementType: { required: true },
    estimatedBudget: { required: true, pattern: FIELD_PATTERNS.CURRENCY },
    procurementReason: { required: true, minLength: 20 },
    procurementCategory: { required: true },
  },

  RFQ: {
    rfqTitle: { required: true, minLength: 10, maxLength: 255 },
    closingDate: { required: true },
    closingTime: { required: true },
    submissionFormat: { required: true },
    evaluationCriteria: { required: true },
  },

  EVALUATION: {
    technicalScore: { required: true, pattern: FIELD_PATTERNS.PERCENTAGE },
    financialScore: { required: true, pattern: FIELD_PATTERNS.PERCENTAGE },
    evaluatorName: { required: true },
    comments: { required: false },
  },

  APPROVAL: {
    decision: { required: true, enum: ['approve', 'reject', 'return'] },
    comments: { required: true, minLength: 10 },
    approverName: { required: true },
  },

  USER: {
    email: { required: true, pattern: FIELD_PATTERNS.EMAIL },
    firstName: { required: true, minLength: 2 },
    lastName: { required: true, minLength: 2 },
    phone: { required: false, pattern: FIELD_PATTERNS.PHONE },
    role: { required: true, enum: ['ADMIN', 'PROCUREMENT_OFFICER', 'EVALUATOR', 'APPROVER', 'VENDOR', 'VIEWER'] },
  },

  PASSWORD: {
    password: {
      required: true,
      minLength: 8,
      rules: [
        { test: /[A-Z]/, message: 'Must contain at least one uppercase letter' },
        { test: /[a-z]/, message: 'Must contain at least one lowercase letter' },
        { test: /\d/, message: 'Must contain at least one number' },
      ],
    },
    confirmPassword: { required: true, matches: 'password' },
  },
};

/**
 * Validate a single field against a rule.
 *
 * @param {string} value - The value to validate.
 * @param {Object} rule - The validation rule.
 * @returns {string[]} - An array of error messages, or an empty array if valid.
 */
/**
 * Validate a single field against a rule.
 *
 * @param {string} value - The value to validate.
 * @param {Object} rule - The validation rule.
 * @param {Object} [context] - Optional context for cross-field validation.
 * @param {Object} [messages] - Optional custom error messages.
 * @returns {string[]} - An array of error messages, or an empty array if valid.
 */
const validateField = (value, rule, context = {}, messages = {}) => {
  const errors = [];

  const msg = (key, def) => messages[key] || def;

  if (rule.required && (!value || value.trim() === '')) {
    errors.push(msg('required', 'This field is required.'));
    return errors;
  }

  if (!value) return errors;

  if (rule.minLength && value.length < rule.minLength) {
    errors.push(msg('minLength', `Minimum ${rule.minLength} characters required.`));
  }

  if (rule.maxLength && value.length > rule.maxLength) {
    errors.push(msg('maxLength', `Maximum ${rule.maxLength} characters allowed.`));
  }

  if (rule.pattern && !rule.pattern.test(value)) {
    errors.push(msg('pattern', 'Invalid format.'));
  }

  if (rule.enum && !rule.enum.includes(value)) {
    errors.push(msg('enum', `Must be one of: ${rule.enum.join(', ')}.`));
  }

  if (rule.rules && Array.isArray(rule.rules)) {
    rule.rules.forEach(r => {
      if (!r.test.test(value)) {
        errors.push(r.message);
      }
    });
  }

  // Cross-field validation: matches
  if (rule.matches && context) {
    if (value !== context[rule.matches]) {
      errors.push(msg('matches', `This field must match ${rule.matches}.`));
    }
  }

  return errors;
};

/**
 * Validate an object against a schema.
 *
 * @param {Object} obj - The object to validate.
 * @param {Object} schema - The validation schema.
 * @returns {Object} - An object containing validation results.
 */

/**
 * Validate an object against a schema, with options for custom messages and early exit.
 *
 * @param {Object} obj - The object to validate.
 * @param {Object} schema - The validation schema.
 * @param {Object} [options] - Validation options.
 * @param {Object} [options.messages] - Custom error messages per field.
 * @param {boolean} [options.stopOnFirstError] - If true, stops at the first error per field.
 * @returns {Object} - An object containing validation results.
 */
const validateObject = (obj, schema, options = {}) => {
  const errors = {};
  const { messages = {}, stopOnFirstError = false } = options;

  Object.keys(schema).forEach(field => {
    const fieldErrors = validateField(
      obj[field],
      schema[field],
      obj, // context for cross-field validation
      messages[field] || {}
    );
    if (fieldErrors.length > 0) {
      errors[field] = stopOnFirstError ? [fieldErrors[0]] : fieldErrors;
    }
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

// Exporting validation utilities
module.exports = {
  FIELD_PATTERNS,
  VALIDATION_SCHEMAS,
  validateField,
  validateObject,
};
