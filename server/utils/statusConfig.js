/**
 * Status and Configuration Constants
 * Centralized configuration for procurement system
 */

// Status configurations
const statusConfig = {
  pending: {
    color: '#6c757d',
    bgColor: '#e9ecef',
    label: 'Pending',
    icon: '⏳',
  },
  approved: {
    color: '#28a745',
    bgColor: '#d4edda',
    label: 'Approved',
    icon: '✓',
  },
  rejected: {
    color: '#dc3545',
    bgColor: '#f8d7da',
    label: 'Rejected',
    icon: '✗',
  },
  'changes-requested': {
    color: '#ffc107',
    bgColor: '#fff3cd',
    label: 'Changes Requested',
    icon: '📝',
  },
  draft: {
    color: '#0d6efd',
    bgColor: '#cfe2ff',
    label: 'Draft',
    icon: '📄',
  },
  submitted: {
    color: '#0dcaf0',
    bgColor: '#cff4fc',
    label: 'Submitted',
    icon: '📤',
  },
  'in-review': {
    color: '#0d6efd',
    bgColor: '#cfe2ff',
    label: 'In Review',
    icon: '👁️',
  },
  archived: {
    color: '#6c757d',
    bgColor: '#e9ecef',
    label: 'Archived',
    icon: '📦',
  },
};

// Priority configurations
const priorityConfig = {
  critical: {
    color: '#dc3545',
    label: 'Critical',
    level: 4,
    icon: '🚨',
  },
  high: {
    color: '#fd7e14',
    label: 'High',
    level: 3,
    icon: '⚠️',
  },
  medium: {
    color: '#ffc107',
    label: 'Medium',
    level: 2,
    icon: '⚡',
  },
  low: {
    color: '#28a745',
    label: 'Low',
    level: 1,
    icon: '✓',
  },
};

// Severity configurations
const severityConfig = {
  critical: {
    color: '#dc3545',
    bgColor: '#f8d7da',
    label: 'Critical',
    level: 5,
    icon: '🚨',
  },
  major: {
    color: '#fd7e14',
    bgColor: '#ffe5cc',
    label: 'Major',
    level: 4,
    icon: '⚠️',
  },
  warning: {
    color: '#ffc107',
    bgColor: '#fff3cd',
    label: 'Warning',
    level: 3,
    icon: '⚡',
  },
  info: {
    color: '#0dcaf0',
    bgColor: '#cff4fc',
    label: 'Info',
    level: 2,
    icon: 'ℹ️',
  },
  minor: {
    color: '#6c757d',
    bgColor: '#e9ecef',
    label: 'Minor',
    level: 1,
    icon: '•',
  },
};

// Timeline event categories
const categoryConfig = {
  planning: {
    color: '#0d6efd',
    bgColor: '#cfe2ff',
    label: 'Planning',
    icon: '📋',
  },
  template: {
    color: '#6f42c1',
    bgColor: '#e7d9f5',
    label: 'Template',
    icon: '📑',
  },
  rfq: {
    color: '#20c997',
    bgColor: '#d3f9d8',
    label: 'RFQ',
    icon: '📨',
  },
  clarification: {
    color: '#0dcaf0',
    bgColor: '#cff4fc',
    label: 'Clarification',
    icon: '💬',
  },
  submission: {
    color: '#fd7e14',
    bgColor: '#ffe5cc',
    label: 'Submission',
    icon: '📤',
  },
  evaluation: {
    color: '#0d6efd',
    bgColor: '#cfe2ff',
    label: 'Evaluation',
    icon: '📊',
  },
  approval: {
    color: '#28a745',
    bgColor: '#d4edda',
    label: 'Approval',
    icon: '✓',
  },
  award: {
    color: '#198754',
    bgColor: '#badbcc',
    label: 'Award',
    icon: '🏆',
  },
};

// Document types
const documentTypeConfig = {
  rfq: {
    label: 'Request for Quotation',
    icon: '📨',
    color: '#20c997',
  },
  submission: {
    label: 'Supplier Submission',
    icon: '📤',
    color: '#fd7e14',
  },
  evaluation: {
    label: 'Evaluation Report',
    icon: '📊',
    color: '#0d6efd',
  },
  approval: {
    label: 'Approval Document',
    icon: '✓',
    color: '#28a745',
  },
  contract: {
    label: 'Contract',
    icon: '📜',
    color: '#6f42c1',
  },
  certificate: {
    label: 'Certificate',
    icon: '📜',
    color: '#198754',
  },
  po: {
    label: 'Purchase Order',
    icon: '📑',
    color: '#0dcaf0',
  },
  compliance: {
    label: 'Compliance Document',
    icon: '✓',
    color: '#28a745',
  },
};

// Scoring criteria
const scoringCriteriaConfig = [
  {
    id: 'technical',
    label: 'Technical Capability',
    weight: 35,
    description: 'Ability to meet technical specifications',
  },
  {
    id: 'price',
    label: 'Price',
    weight: 30,
    description: 'Cost competitiveness',
  },
  {
    id: 'experience',
    label: 'Experience & Track Record',
    weight: 20,
    description: 'Previous experience and references',
  },
  {
    id: 'compliance',
    label: 'Compliance',
    weight: 15,
    description: 'Regulatory and policy compliance',
  },
];

// Score ratings
const scoreRatingConfig = {
  90: { label: 'Excellent', color: '#28a745' },
  80: { label: 'Very Good', color: '#20c997' },
  70: { label: 'Good', color: '#0dcaf0' },
  60: { label: 'Fair', color: '#ffc107' },
  50: { label: 'Poor', color: '#fd7e14' },
  0: { label: 'Very Poor', color: '#dc3545' },
};

/**
 * Get status configuration
 * @param {string} status - Status key
 * @returns {object} Status config or default
 */
const getStatusConfig = (status) => {
  return statusConfig[status] || statusConfig.pending;
};

/**
 * Get priority configuration
 * @param {string} priority - Priority key
 * @returns {object} Priority config or default
 */
const getPriorityConfig = (priority) => {
  return priorityConfig[priority] || priorityConfig.low;
};

/**
 * Get severity configuration
 * @param {string} severity - Severity key
 * @returns {object} Severity config or default
 */
const getSeverityConfig = (severity) => {
  return severityConfig[severity] || severityConfig.info;
};

/**
 * Get category configuration
 * @param {string} category - Category key
 * @returns {object} Category config or default
 */
const getCategoryConfig = (category) => {
  return categoryConfig[category] || categoryConfig.planning;
};

/**
 * Get document type configuration
 * @param {string} type - Document type key
 * @returns {object} Document type config or default
 */
const getDocumentTypeConfig = (type) => {
  return documentTypeConfig[type] || documentTypeConfig.submission;
};

/**
 * Get score rating based on score value
 * @param {number} score - Score value (0-100)
 * @returns {object} Rating config
 */
const getScoreRating = (score) => {
  if (score >= 90) return scoreRatingConfig[90];
  if (score >= 80) return scoreRatingConfig[80];
  if (score >= 70) return scoreRatingConfig[70];
  if (score >= 60) return scoreRatingConfig[60];
  if (score >= 50) return scoreRatingConfig[50];
  return scoreRatingConfig[0];
};

/**
 * Get all status options
 * @returns {array} Array of status options
 */
const getAllStatusOptions = () => {
  return Object.entries(statusConfig).map(([key, config]) => ({
    value: key,
    label: config.label,
    color: config.color,
  }));
};

/**
 * Get all priority options
 * @returns {array} Array of priority options
 */
const getAllPriorityOptions = () => {
  return Object.entries(priorityConfig).map(([key, config]) => ({
    value: key,
    label: config.label,
    level: config.level,
    color: config.color,
  }));
};

/**
 * Get all severity options
 * @returns {array} Array of severity options
 */
const getAllSeverityOptions = () => {
  return Object.entries(severityConfig).map(([key, config]) => ({
    value: key,
    label: config.label,
    level: config.level,
    color: config.color,
  }));
};

/**
 * Get all category options
 * @returns {array} Array of category options
 */
const getAllCategoryOptions = () => {
  return Object.entries(categoryConfig).map(([key, config]) => ({
    value: key,
    label: config.label,
    color: config.color,
  }));
};

module.exports = {
  statusConfig,
  priorityConfig,
  severityConfig,
  categoryConfig,
  documentTypeConfig,
  scoringCriteriaConfig,
  scoreRatingConfig,
  getStatusConfig,
  getPriorityConfig,
  getSeverityConfig,
  getCategoryConfig,
  getDocumentTypeConfig,
  getScoreRating,
  getAllStatusOptions,
  getAllPriorityOptions,
  getAllSeverityOptions,
  getAllCategoryOptions,
};
