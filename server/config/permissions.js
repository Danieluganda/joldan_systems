/**
 * Role-Based Access Control (RBAC) Configuration
 * 
 * Defines roles, permissions, and access control for the system
 * Feature 5: Role-based access control
 */

const PERMISSIONS = {
  // Dashboard
  VIEW_DASHBOARD: 'view_dashboard',
  
  // Procurement
  CREATE_PROCUREMENT: 'create_procurement',
  VIEW_PROCUREMENT: 'view_procurement',
  EDIT_PROCUREMENT: 'edit_procurement',
  DELETE_PROCUREMENT: 'delete_procurement',
  
  // Planning
  VIEW_PLANNING: 'view_planning',
  CREATE_PLANNING: 'create_planning',
  EDIT_PLANNING: 'edit_planning',
  APPROVE_PLANNING: 'approve_planning',
  
  // Templates
  VIEW_TEMPLATES: 'view_templates',
  CREATE_TEMPLATES: 'create_templates',
  EDIT_TEMPLATES: 'edit_templates',
  DELETE_TEMPLATES: 'delete_templates',
  
  // RFQ
  VIEW_RFQ: 'view_rfq',
  CREATE_RFQ: 'create_rfq',
  EDIT_RFQ: 'edit_rfq',
  PUBLISH_RFQ: 'publish_rfq',
  
  // Submissions
  VIEW_SUBMISSIONS: 'view_submissions',
  RECEIVE_SUBMISSIONS: 'receive_submissions',
  
  // Evaluations
  VIEW_EVALUATIONS: 'view_evaluations',
  CREATE_EVALUATIONS: 'create_evaluations',
  CONSOLIDATE_EVALUATIONS: 'consolidate_evaluations',
  
  // Approvals
  VIEW_APPROVALS: 'view_approvals',
  APPROVE_SUBMISSIONS: 'approve_submissions',
  RETURN_APPROVALS: 'return_approvals',
  
  // Awards
  VIEW_AWARDS: 'view_awards',
  CREATE_AWARDS: 'create_awards',
  PUBLISH_AWARDS: 'publish_awards',
  
  // Contracts
  VIEW_CONTRACTS: 'view_contracts',
  CREATE_CONTRACTS: 'create_contracts',
  SIGN_CONTRACTS: 'sign_contracts',
  
  // Audit
  VIEW_AUDIT: 'view_audit',
  EXPORT_AUDIT: 'export_audit',
  
  // Admin
  MANAGE_USERS: 'manage_users',
  MANAGE_ROLES: 'manage_roles',
  VIEW_REPORTS: 'view_reports',
  MANAGE_SETTINGS: 'manage_settings',
};

// Role definitions with associated permissions
const ROLES = {
  ADMIN: {
    name: 'Administrator',
    description: 'Full system access',
    permissions: Object.values(PERMISSIONS),
  },
  PROCUREMENT_OFFICER: {
    name: 'Procurement Officer',
    description: 'Manages procurement process',
    permissions: [
      PERMISSIONS.VIEW_DASHBOARD,
      PERMISSIONS.CREATE_PROCUREMENT,
      PERMISSIONS.VIEW_PROCUREMENT,
      PERMISSIONS.EDIT_PROCUREMENT,
      PERMISSIONS.CREATE_PLANNING,
      PERMISSIONS.EDIT_PLANNING,
      PERMISSIONS.VIEW_TEMPLATES,
      PERMISSIONS.CREATE_RFQ,
      PERMISSIONS.EDIT_RFQ,
      PERMISSIONS.PUBLISH_RFQ,
      PERMISSIONS.VIEW_SUBMISSIONS,
      PERMISSIONS.RECEIVE_SUBMISSIONS,
      PERMISSIONS.VIEW_EVALUATIONS,
      PERMISSIONS.VIEW_APPROVALS,
      PERMISSIONS.VIEW_AUDIT,
    ],
  },
  EVALUATOR: {
    name: 'Evaluator',
    description: 'Evaluates submitted bids',
    permissions: [
      PERMISSIONS.VIEW_DASHBOARD,
      PERMISSIONS.VIEW_SUBMISSIONS,
      PERMISSIONS.VIEW_EVALUATIONS,
      PERMISSIONS.CREATE_EVALUATIONS,
      PERMISSIONS.VIEW_AUDIT,
    ],
  },
  APPROVER: {
    name: 'Approver',
    description: 'Approves procurement decisions',
    permissions: [
      PERMISSIONS.VIEW_DASHBOARD,
      PERMISSIONS.VIEW_PROCUREMENT,
      PERMISSIONS.VIEW_SUBMISSIONS,
      PERMISSIONS.VIEW_EVALUATIONS,
      PERMISSIONS.VIEW_APPROVALS,
      PERMISSIONS.APPROVE_SUBMISSIONS,
      PERMISSIONS.RETURN_APPROVALS,
      PERMISSIONS.VIEW_AUDIT,
    ],
  },
  VENDOR: {
    name: 'Vendor',
    description: 'Can submit bids',
    permissions: [
      PERMISSIONS.VIEW_RFQ,
      PERMISSIONS.RECEIVE_SUBMISSIONS,
    ],
  },
  VIEWER: {
    name: 'Viewer',
    description: 'Read-only access',
    permissions: [
      PERMISSIONS.VIEW_DASHBOARD,
      PERMISSIONS.VIEW_PROCUREMENT,
      PERMISSIONS.VIEW_TEMPLATES,
      PERMISSIONS.VIEW_RFQ,
      PERMISSIONS.VIEW_SUBMISSIONS,
      PERMISSIONS.VIEW_EVALUATIONS,
      PERMISSIONS.VIEW_APPROVALS,
      PERMISSIONS.VIEW_AWARDS,
      PERMISSIONS.VIEW_CONTRACTS,
    ],
  },
};

/**
 * Check if a role has a specific permission
 */
const hasPermission = (role, permission) => {
  if (!ROLES[role]) return false;
  return ROLES[role].permissions.includes(permission);
};

/**
 * Check if a role has any of the given permissions
 */
const hasAnyPermission = (role, permissions) => {
  if (!ROLES[role]) return false;
  return permissions.some(p => ROLES[role].permissions.includes(p));
};

/**
 * Get all permissions for a role
 */
const getPermissions = (role) => {
  if (!ROLES[role]) return [];
  return ROLES[role].permissions;
};

module.exports = {
  PERMISSIONS,
  ROLES,
  hasPermission,
  hasAnyPermission,
  getPermissions,
};
