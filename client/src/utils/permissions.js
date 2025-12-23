/**
 * Permissions Utility
 * 
 * Role-based access control and permission checking.
 * Manages user permissions and feature access based on roles.
 * 
 * Features:
 * - Role definitions
 * - Permission checking
 * - Feature access control
 * - Department-based permissions
 * - Hierarchical role access
 */

/**
 * Role Definitions
 */
const ROLES = {
  ADMIN: 'administrator',
  OFFICER: 'procurement_officer',
  EVALUATOR: 'evaluator',
  APPROVER: 'approver',
  VIEWER: 'viewer'
};

/**
 * Permission Definitions
 */
const PERMISSIONS = {
  // Procurement permissions
  CREATE_PROCUREMENT: 'create_procurement',
  EDIT_PROCUREMENT: 'edit_procurement',
  DELETE_PROCUREMENT: 'delete_procurement',
  VIEW_PROCUREMENT: 'view_procurement',

  // Planning permissions
  CREATE_PLAN: 'create_plan',
  EDIT_PLAN: 'edit_plan',
  APPROVE_PLAN: 'approve_plan',

  // Template permissions
  CREATE_TEMPLATE: 'create_template',
  EDIT_TEMPLATE: 'edit_template',
  DELETE_TEMPLATE: 'delete_template',
  USE_TEMPLATE: 'use_template',

  // RFQ permissions
  CREATE_RFQ: 'create_rfq',
  EDIT_RFQ: 'edit_rfq',
  PUBLISH_RFQ: 'publish_rfq',

  // Document permissions
  UPLOAD_DOCUMENT: 'upload_document',
  DELETE_DOCUMENT: 'delete_document',
  VERSION_DOCUMENT: 'version_document',

  // Evaluation permissions
  EVALUATE_BIDS: 'evaluate_bids',
  SCORE_SUBMISSION: 'score_submission',
  VIEW_SCORES: 'view_scores',

  // Approval permissions
  APPROVE_DECISIONS: 'approve_decisions',
  REJECT_DECISIONS: 'reject_decisions',
  VIEW_APPROVALS: 'view_approvals',

  // Award permissions
  DECIDE_AWARD: 'decide_award',
  VIEW_AWARDS: 'view_awards',

  // Contract permissions
  CREATE_CONTRACT: 'create_contract',
  SIGN_CONTRACT: 'sign_contract',
  VIEW_CONTRACTS: 'view_contracts',

  // Audit permissions
  VIEW_AUDIT: 'view_audit',
  GENERATE_AUDIT_PACK: 'generate_audit_pack',
  EXPORT_AUDIT: 'export_audit',

  // Admin permissions
  MANAGE_USERS: 'manage_users',
  MANAGE_ROLES: 'manage_roles',
  VIEW_LOGS: 'view_logs',
  SYSTEM_SETTINGS: 'system_settings'
};

/**
 * Role-Permission Mapping
 */
const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    // All permissions
    ...Object.values(PERMISSIONS)
  ],

  [ROLES.OFFICER]: [
    // Procurement management
    PERMISSIONS.CREATE_PROCUREMENT,
    PERMISSIONS.EDIT_PROCUREMENT,
    PERMISSIONS.VIEW_PROCUREMENT,
    // Planning
    PERMISSIONS.CREATE_PLAN,
    PERMISSIONS.EDIT_PLAN,
    // Templates
    PERMISSIONS.USE_TEMPLATE,
    PERMISSIONS.VIEW_AUDIT,
    // RFQ
    PERMISSIONS.CREATE_RFQ,
    PERMISSIONS.EDIT_RFQ,
    PERMISSIONS.PUBLISH_RFQ,
    // Documents
    PERMISSIONS.UPLOAD_DOCUMENT,
    PERMISSIONS.VERSION_DOCUMENT,
    // Evaluation
    PERMISSIONS.VIEW_SCORES,
    // Approvals
    PERMISSIONS.VIEW_APPROVALS,
    // Awards
    PERMISSIONS.VIEW_AWARDS,
    // Contracts
    PERMISSIONS.CREATE_CONTRACT,
    PERMISSIONS.VIEW_CONTRACTS,
    // Audit
    PERMISSIONS.GENERATE_AUDIT_PACK,
    PERMISSIONS.EXPORT_AUDIT
  ],

  [ROLES.EVALUATOR]: [
    // Evaluation
    PERMISSIONS.EVALUATE_BIDS,
    PERMISSIONS.SCORE_SUBMISSION,
    PERMISSIONS.VIEW_SCORES,
    // Documents
    PERMISSIONS.UPLOAD_DOCUMENT,
    // View
    PERMISSIONS.VIEW_PROCUREMENT,
    PERMISSIONS.VIEW_APPROVALS,
    PERMISSIONS.VIEW_AUDIT
  ],

  [ROLES.APPROVER]: [
    // Approvals
    PERMISSIONS.APPROVE_DECISIONS,
    PERMISSIONS.REJECT_DECISIONS,
    PERMISSIONS.VIEW_APPROVALS,
    // View
    PERMISSIONS.VIEW_PROCUREMENT,
    PERMISSIONS.VIEW_SCORES,
    PERMISSIONS.VIEW_AWARDS,
    PERMISSIONS.VIEW_AUDIT
  ],

  [ROLES.VIEWER]: [
    // View only
    PERMISSIONS.VIEW_PROCUREMENT,
    PERMISSIONS.VIEW_APPROVALS,
    PERMISSIONS.VIEW_AUDIT,
    PERMISSIONS.VIEW_SCORES,
    PERMISSIONS.VIEW_AWARDS,
    PERMISSIONS.VIEW_CONTRACTS
  ]
};

/**
 * Get user from localStorage
 */
const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

/**
 * Check if user has permission
 * @param {string} permission - Permission to check
 * @param {object} user - User object (optional, uses current user if not provided)
 * @returns {boolean} True if user has permission
 */
export const hasPermission = (permission, user = null) => {
  const currentUser = user || getCurrentUser();

  if (!currentUser || !currentUser.role) {
    return false;
  }

  const userRole = currentUser.role.toLowerCase();
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];

  return rolePermissions.includes(permission);
};

/**
 * Check if user has any of the permissions
 * @param {array} permissions - Permissions to check
 * @param {object} user - User object (optional)
 * @returns {boolean} True if user has any permission
 */
export const hasAnyPermission = (permissions, user = null) => {
  return permissions.some(permission => hasPermission(permission, user));
};

/**
 * Check if user has all permissions
 * @param {array} permissions - Permissions to check
 * @param {object} user - User object (optional)
 * @returns {boolean} True if user has all permissions
 */
export const hasAllPermissions = (permissions, user = null) => {
  return permissions.every(permission => hasPermission(permission, user));
};

/**
 * Get user role
 * @returns {string} User's role
 */
export const getUserRole = () => {
  const user = getCurrentUser();
  return user ? user.role : null;
};

/**
 * Check if user is admin
 * @returns {boolean} True if user is administrator
 */
export const isAdmin = () => {
  const user = getCurrentUser();
  return user && user.role?.toLowerCase() === ROLES.ADMIN;
};

/**
 * Check if user is officer
 * @returns {boolean} True if user is procurement officer
 */
export const isOfficer = () => {
  const user = getCurrentUser();
  return user && user.role?.toLowerCase() === ROLES.OFFICER;
};

/**
 * Check if user is evaluator
 * @returns {boolean} True if user is evaluator
 */
export const isEvaluator = () => {
  const user = getCurrentUser();
  return user && user.role?.toLowerCase() === ROLES.EVALUATOR;
};

/**
 * Check if user is approver
 * @returns {boolean} True if user is approver
 */
export const isApprover = () => {
  const user = getCurrentUser();
  return user && user.role?.toLowerCase() === ROLES.APPROVER;
};

/**
 * Get all permissions for a role
 * @param {string} role - Role to check
 * @returns {array} Array of permissions
 */
export const getRolePermissions = (role) => {
  const roleKey = Object.keys(ROLES).find(
    key => ROLES[key].toLowerCase() === role?.toLowerCase()
  );

  return roleKey ? ROLE_PERMISSIONS[ROLES[roleKey]] || [] : [];
};

/**
 * Get human-readable role name
 * @param {string} role - Role key
 * @returns {string} Formatted role name
 */
export const getRoleLabel = (role) => {
  const labels = {
    [ROLES.ADMIN]: 'Administrator',
    [ROLES.OFFICER]: 'Procurement Officer',
    [ROLES.EVALUATOR]: 'Evaluator',
    [ROLES.APPROVER]: 'Approver',
    [ROLES.VIEWER]: 'Viewer'
  };

  return labels[role?.toLowerCase()] || role;
};

/**
 * Check feature access
 * Feature-based access check (higher-level than permissions)
 */
export const hasFeatureAccess = (feature, user = null) => {
  const featurePermissions = {
    'planning': [PERMISSIONS.CREATE_PLAN, PERMISSIONS.VIEW_PROCUREMENT],
    'templates': [PERMISSIONS.USE_TEMPLATE],
    'rfq': [PERMISSIONS.CREATE_RFQ, PERMISSIONS.PUBLISH_RFQ],
    'clarifications': [PERMISSIONS.VIEW_PROCUREMENT],
    'submissions': [PERMISSIONS.VIEW_PROCUREMENT],
    'evaluation': [PERMISSIONS.EVALUATE_BIDS, PERMISSIONS.VIEW_SCORES],
    'approvals': [PERMISSIONS.APPROVE_DECISIONS, PERMISSIONS.VIEW_APPROVALS],
    'awards': [PERMISSIONS.DECIDE_AWARD, PERMISSIONS.VIEW_AWARDS],
    'contracts': [PERMISSIONS.CREATE_CONTRACT, PERMISSIONS.VIEW_CONTRACTS],
    'audit': [PERMISSIONS.VIEW_AUDIT, PERMISSIONS.GENERATE_AUDIT_PACK],
    'documents': [PERMISSIONS.UPLOAD_DOCUMENT],
    'admin': [PERMISSIONS.MANAGE_USERS, PERMISSIONS.SYSTEM_SETTINGS]
  };

  const requiredPermissions = featurePermissions[feature?.toLowerCase()] || [];
  return hasAnyPermission(requiredPermissions, user);
};

/**
 * Can perform action check
 * High-level action check
 */
export const canPerform = (action, user = null) => {
  const actionPermissions = {
    'create_procurement': PERMISSIONS.CREATE_PROCUREMENT,
    'edit_procurement': PERMISSIONS.EDIT_PROCUREMENT,
    'delete_procurement': PERMISSIONS.DELETE_PROCUREMENT,
    'create_rfq': PERMISSIONS.CREATE_RFQ,
    'publish_rfq': PERMISSIONS.PUBLISH_RFQ,
    'evaluate_bids': PERMISSIONS.EVALUATE_BIDS,
    'approve': PERMISSIONS.APPROVE_DECISIONS,
    'reject': PERMISSIONS.REJECT_DECISIONS,
    'award': PERMISSIONS.DECIDE_AWARD,
    'create_contract': PERMISSIONS.CREATE_CONTRACT
  };

  const permission = actionPermissions[action?.toLowerCase()];
  return permission ? hasPermission(permission, user) : false;
};

/**
 * Require permission middleware
 * For protecting components/routes
 */
export const requirePermission = (permission) => {
  return (Component) => {
    return (props) => {
      if (!hasPermission(permission)) {
        return <div className="permission-denied">You don't have permission to access this.</div>;
      }

      return <Component {...props} />;
    };
  };
};

// Export role and permission constants
export { ROLES, PERMISSIONS };

export default {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getUserRole,
  isAdmin,
  isOfficer,
  isEvaluator,
  isApprover,
  getRolePermissions,
  getRoleLabel,
  hasFeatureAccess,
  canPerform,
  requirePermission,
  ROLES,
  PERMISSIONS
};
