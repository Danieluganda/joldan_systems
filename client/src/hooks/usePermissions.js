import { useState, useCallback, useEffect } from 'react';

export const usePermissions = (userId = null) => {
  // Define role-based permissions (moved outside to use in initial state)
  const ROLE_PERMISSIONS = {
    admin: [
      'create_procurement', 'edit_procurement', 'delete_procurement',
      'create_template', 'edit_template', 'lock_template',
      'create_rfq', 'publish_rfq', 'edit_rfq',
      'evaluate_submission', 'make_award_decision',
      'approve_contract', 'sign_contract',
      'generate_audit_pack', 'view_audit_logs',
      'manage_users', 'view_reports'
    ],
    procurementManager: [
      'create_procurement', 'edit_procurement',
      'create_template', 'edit_template',
      'create_rfq', 'publish_rfq', 'edit_rfq',
      'evaluate_submission', 'make_award_decision',
      'approve_contract',
      'generate_audit_pack', 'view_audit_logs',
      'view_reports'
    ],
    evaluator: [
      'evaluate_submission', 'view_audit_logs'
    ],
    approver: [
      'approve_contract', 'view_audit_logs'
    ],
    supplier: [
      'view_rfq', 'submit_bid', 'answer_clarifications'
    ],
    viewer: [
      'view_rfq', 'view_procurement', 'view_reports'
    ]
  };

  const [userRole, setUserRole] = useState('admin'); // Default to admin
  const [permissions, setPermissions] = useState(ROLE_PERMISSIONS['admin'] || []); // Default to admin permissions
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch user permissions
  const fetchUserPermissions = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/users/${id}/permissions`);
      if (!response.ok) throw new Error('Failed to fetch permissions');
      const data = await response.json();
      setUserRole(data.role);
      setPermissions(ROLE_PERMISSIONS[data.role] || []);
    } catch (err) {
      // Fallback to admin role when server is unavailable
      setUserRole('admin');
      setPermissions(ROLE_PERMISSIONS['admin'] || []);
      console.warn('Using admin permissions (server unavailable)');
    } finally {
      setLoading(false);
    }
  }, [ROLE_PERMISSIONS]);

  // Get current user from session
  const getCurrentUser = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch('/api/auth/user', { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error('Failed to fetch current user');
      const data = await response.json();
      if (data.id) {
        setUserRole(data.role);
        setPermissions(ROLE_PERMISSIONS[data.role] || []);
      }
      return data;
    } catch (err) {
      // Fallback to admin demo user when server is unavailable
      const demoUser = { id: 1, name: 'Demo User', role: 'admin', email: 'demo@example.com' };
      setUserRole(demoUser.role);
      setPermissions(ROLE_PERMISSIONS[demoUser.role] || []);
      console.log('Using demo user (server unavailable)');
      return demoUser;
    }
  }, [ROLE_PERMISSIONS]);

  // Check if user has permission
  const hasPermission = useCallback((permission) => {
    return permissions.includes(permission);
  }, [permissions]);

  // Check if user has any of given permissions
  const hasAnyPermission = useCallback((permissionList) => {
    return permissionList.some(perm => permissions.includes(perm));
  }, [permissions]);

  // Check if user has all given permissions
  const hasAllPermissions = useCallback((permissionList) => {
    return permissionList.every(perm => permissions.includes(perm));
  }, [permissions]);

  // Check if user can access resource
  const canAccessResource = useCallback((resourceType, action) => {
    return hasPermission(`${action}_${resourceType}`);
  }, [hasPermission]);

  // Check if user can perform workflow transition
  const canTransitionWorkflow = useCallback((fromStep, toStep) => {
    const workflowPermissions = {
      'planning': ['create_procurement', 'edit_procurement'],
      'templates': ['create_template', 'edit_template', 'lock_template'],
      'rfq': ['create_rfq', 'publish_rfq', 'edit_rfq'],
      'submission': ['view_submissions'],
      'evaluation': ['evaluate_submission'],
      'award': ['make_award_decision'],
      'contract': ['approve_contract', 'sign_contract'],
      'completed': ['view_reports']
    };

    const requiredPerms = workflowPermissions[toStep] || [];
    return hasAnyPermission(requiredPerms);
  }, [hasAnyPermission]);

  // Get user role label
  const getRoleLabel = useCallback(() => {
    const roleLabels = {
      admin: 'Administrator',
      procurementManager: 'Procurement Manager',
      evaluator: 'Evaluator',
      approver: 'Approver',
      supplier: 'Supplier',
      viewer: 'Viewer'
    };
    return roleLabels[userRole] || 'Unknown';
  }, [userRole]);

  // Get permissions for role
  const getPermissionsForRole = useCallback((role) => {
    return ROLE_PERMISSIONS[role] || [];
  }, []);

  // Check role is admin
  const isAdmin = useCallback(() => userRole === 'admin', [userRole]);

  // Check role is manager
  const isManager = useCallback(() => userRole === 'procurementManager', [userRole]);

  // Check role is evaluator
  const isEvaluator = useCallback(() => userRole === 'evaluator', [userRole]);

  // Auto-fetch on mount
  useEffect(() => {
    let isMounted = true;

    const loadPermissions = async () => {
      if (!isMounted) return;
      
      if (userId) {
        await fetchUserPermissions(userId);
      } else {
        await getCurrentUser();
      }
    };

    loadPermissions();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    userRole,
    permissions,
    loading,
    error,
    fetchUserPermissions,
    getCurrentUser,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessResource,
    canTransitionWorkflow,
    getRoleLabel,
    getPermissionsForRole,
    isAdmin,
    isManager,
    isEvaluator
  };
};

export default usePermissions;
