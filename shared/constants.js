/**
 * Shared Constants
 *
 * This file contains system-wide constants used across the frontend and backend.
 * Each constant is grouped by its domain for better organization and maintainability.
 */

/**
 * Procurement Types
 * Defines the types of procurements handled by the system.
 */
const PROCUREMENT_TYPES = {
  GOODS: 'goods',
  SERVICES: 'services',
  WORKS: 'works',
  MIXED: 'mixed',
};

/**
 * Procurement Status
 * Represents the various stages of the procurement lifecycle.
 */
const PROCUREMENT_STATUS = {
  PLANNING: 'planning',
  RFQ_PREPARATION: 'rfq_preparation',
  RFQ_PUBLISHED: 'rfq_published',
  SUBMISSION_CLOSING: 'submission_closing',
  EVALUATION: 'evaluation',
  AWARD_PENDING: 'award_pending',
  AWARDED: 'awarded',
  CONTRACT_EXECUTION: 'contract_execution',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

/**
 * Approval Status
 * Indicates the status of an approval request.
 */
const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  RETURNED: 'returned',
};

/**
 * Evaluation Status
 * Tracks the progress of an evaluation process.
 */
const EVALUATION_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CONSOLIDATED: 'consolidated',
};

/**
 * Document Types
 * Specifies the types of documents managed in the system.
 */
const DOCUMENT_TYPES = {
  SPECIFICATION: 'specification',
  TERMS_CONDITIONS: 'terms_conditions',
  EVALUATION_CRITERIA: 'evaluation_criteria',
  TENDER_DOCUMENT: 'tender_document',
  SUBMISSION: 'submission',
  EVALUATION_REPORT: 'evaluation_report',
  AWARD_NOTICE: 'award_notice',
  CONTRACT: 'contract',
};

/**
 * Audit Actions
 * Defines the actions that can be audited in the system.
 */
const AUDIT_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  APPROVE: 'approve',
  REJECT: 'reject',
  PUBLISH: 'publish',
  DOWNLOAD: 'download',
  LOGIN: 'login',
  LOGOUT: 'logout',
};

/**
 * User Roles
 * Lists the roles available in the system.
 */
const USER_ROLES = {
  ADMIN: 'ADMIN',
  PROCUREMENT_OFFICER: 'PROCUREMENT_OFFICER',
  EVALUATOR: 'EVALUATOR',
  APPROVER: 'APPROVER',
  VENDOR: 'VENDOR',
  VIEWER: 'VIEWER',
};

/**
 * Notification Types
 * Represents the types of notifications sent by the system.
 */
const NOTIFICATION_TYPES = {
  SUBMISSION_RECEIVED: 'submission_received',
  EVALUATION_STARTED: 'evaluation_started',
  APPROVAL_PENDING: 'approval_pending',
  AWARD_ANNOUNCED: 'award_announced',
  CONTRACT_SIGNED: 'contract_signed',
  STATUS_CHANGED: 'status_changed',
};

/**
 * Validation Rules
 * Contains validation rules used throughout the system.
 */
const VALIDATION_RULES = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_FILE_SIZE: 52428800, // 50MB
  RFQ_TITLE_MIN: 10,
  RFQ_TITLE_MAX: 255,
  MIN_EVALUATORS: 2,
  MAX_EVALUATORS: 10,
  EVALUATION_SCALE: 100,
};

/**
 * API Response Types
 * Defines the standard response types for API calls.
 */
const API_RESPONSE = {
  SUCCESS: 'success',
  ERROR: 'error',
  VALIDATION_ERROR: 'validation_error',
};

// Exporting all constants as a single module
module.exports = {
  PROCUREMENT_TYPES,
  PROCUREMENT_STATUS,
  APPROVAL_STATUS,
  EVALUATION_STATUS,
  DOCUMENT_TYPES,
  AUDIT_ACTIONS,
  USER_ROLES,
  NOTIFICATION_TYPES,
  VALIDATION_RULES,
  API_RESPONSE,
};
