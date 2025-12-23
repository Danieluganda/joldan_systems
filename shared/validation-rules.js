/**
 * Validation Rules
 * 
 * Shared validation schemas and rules
 * Used for form validation on client and server
 */

const FIELD_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[\d\s\-\+\(\)]{10,}$/,
  URL: /^https?:\/\/.+/,
  CURRENCY: /^\d+(\.\d{1,2})?$/,
  PERCENTAGE: /^(100|[1-9]?[0-9])(\.\d{1,2})?$/,
};

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
        { test: /[A-Z]/, message: 'Must contain uppercase letter' },
        { test: /[a-z]/, message: 'Must contain lowercase letter' },
        { test: /\d/, message: 'Must contain number' },
      ],
    },
    confirmPassword: { required: true, matches: 'password' },
  },
};

/**
 * Validate a value against a rule
 */
const validateField = (value, rule) => {
  const errors = [];

  if (rule.required && (!value || value.trim() === '')) {
    errors.push('This field is required');
    return errors;
  }

  if (!value) return errors;

  if (rule.minLength && value.length < rule.minLength) {
    errors.push(`Minimum ${rule.minLength} characters required`);
  }

  if (rule.maxLength && value.length > rule.maxLength) {
    errors.push(`Maximum ${rule.maxLength} characters allowed`);
  }

  if (rule.pattern && !rule.pattern.test(value)) {
    errors.push('Invalid format');
  }

  if (rule.enum && !rule.enum.includes(value)) {
    errors.push(`Must be one of: ${rule.enum.join(', ')}`);
  }

  if (rule.rules && Array.isArray(rule.rules)) {
    rule.rules.forEach(r => {
      if (!r.test.test(value)) {
        errors.push(r.message);
      }
    });
  }

  return errors;
};

/**
 * Validate an object against a schema
 */
const validateObject = (obj, schema) => {
  const errors = {};

  Object.keys(schema).forEach(field => {
    const fieldErrors = validateField(obj[field], schema[field]);
    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors;
    }
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

module.exports = {
  FIELD_PATTERNS,
  VALIDATION_SCHEMAS,
  validateField,
  validateObject,
};
