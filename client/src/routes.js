/**
 * Application Routes Configuration
 */

import LoginPage from './pages/LoginPage';
import ProcurementList from './pages/ProcurementList';
import ProcurementSetup from './pages/ProcurementSetup';
import PlanningPage from './pages/PlanningPage';
import TemplateManager from './pages/TemplateManager';
import RFQWorkspace from './pages/RFQWorkspace';
import RFQEditor from './pages/RFQEditor';
import ClarificationsPage from './pages/ClarificationsPage';
import SubmissionRegister from './pages/SubmissionRegister';
import EvaluationPage from './pages/EvaluationPage';
import ApprovalPage from './pages/ApprovalPage';
import AwardPage from './pages/AwardPage';
import ContractPage from './pages/ContractPage';
import AuditPage from './pages/AuditPage';
import DocumentsPage from './pages/DocumentsPage';
import RouteTestingPage from './pages/RouteTestingPage';
import NoObjectionPage from './pages/NoObjectionPage';
import Dashboard from './pages/Dashboard';

/**
 * Route configuration objects
 * Structure: { path, name, component, icon, requiredPermission, isPublic }
 */
const ROUTES = [
  // Authentication Routes
  {
    path: '/login',
    name: 'Login',
    component: LoginPage,
    icon: '🔐',
    isPublic: true,
    showInNav: false
  },

  // Dashboard & Home
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard,
    icon: '📊',
    requiredPermission: 'view_dashboard',
    showInNav: true
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    icon: '📊',
    requiredPermission: 'view_dashboard',
    showInNav: false
  },

  // Procurement Management
  {
    path: '/procurements',
    name: 'Procurements',
    component: ProcurementList,
    icon: '📦',
    requiredPermission: 'view_procurement',
    showInNav: true
  },
  {
    path: '/procurements/new',
    name: 'New Procurement',
    component: ProcurementSetup,
    icon: '📝',
    requiredPermission: 'create_procurement',
    showInNav: false
  },
  {
    path: '/procurements/:id',
    name: 'Procurement Details',
    component: ProcurementList,
    icon: '📦',
    requiredPermission: 'view_procurement',
    showInNav: false
  },
  {
    path: '/procurements/:id/edit',
    name: 'Edit Procurement',
    component: ProcurementSetup,
    icon: '📝',
    requiredPermission: 'edit_procurement',
    showInNav: false
  },

  // Procurement Planning (Legacy)
  {
    path: '/procurement-setup',
    name: 'New Procurement',
    component: ProcurementSetup,
    icon: '📝',
    requiredPermission: 'create_procurement',
    showInNav: false
  },
  {
    path: '/planning',
    name: 'Planning',
    component: PlanningPage,
    icon: '📋',
    requiredPermission: 'view_planning',
    showInNav: true
  },

  // Templates & Documents
  {
    path: '/templates',
    name: 'Templates',
    component: TemplateManager,
    icon: '🗂️',
    requiredPermission: 'view_templates',
    showInNav: true
  },

  // RFQ Management
  {
    path: '/rfqs',
    name: 'RFQs',
    component: RFQWorkspace,
    icon: '📄',
    requiredPermission: 'view_rfq',
    showInNav: true
  },
  {
    path: '/rfq/new',
    name: 'Create RFQ',
    component: RFQEditor,
    icon: '✍️',
    requiredPermission: 'create_rfq',
    showInNav: true
  },
  {
    path: '/rfq/:id',
    name: 'Edit RFQ',
    component: RFQEditor,
    icon: '✍️',
    requiredPermission: 'edit_rfq',
    showInNav: false
  },
  {
    path: '/rfq-workspace',
    name: 'RFQ Workspace',
    component: RFQWorkspace,
    icon: '📄',
    requiredPermission: 'view_rfq',
    showInNav: false
  },
  {
    path: '/rfq-editor',
    name: 'RFQ Editor',
    component: RFQEditor,
    icon: '✍️',
    requiredPermission: 'create_rfq',
    showInNav: false
  },
  {
    path: '/clarifications',
    name: 'Clarifications',
    component: ClarificationsPage,
    icon: '❓',
    requiredPermission: 'view_clarifications',
    showInNav: true
  },

  // Submissions & Bids
  {
    path: '/submissions',
    name: 'Submissions',
    component: SubmissionRegister,
    icon: '📮',
    requiredPermission: 'view_submissions',
    showInNav: true
  },

  // Evaluation & Scoring
  {
    path: '/evaluations',
    name: 'Evaluation',
    component: EvaluationPage,
    icon: '⭐',
    requiredPermission: 'view_evaluations',
    showInNav: true
  },
  {
    path: '/evaluation',
    name: 'Evaluation',
    component: EvaluationPage,
    icon: '⭐',
    requiredPermission: 'view_evaluations',
    showInNav: false
  },
  {
    path: '/results',
    name: 'Results',
    component: EvaluationPage,
    icon: '📊',
    requiredPermission: 'view_evaluations',
    showInNav: false
  },

  // Approvals
  {
    path: '/approvals',
    name: 'Approvals',
    component: ApprovalPage,
    icon: '✅',
    requiredPermission: 'view_approvals',
    showInNav: true
  },
  {
    path: '/approvals/history',
    name: 'Approval History',
    component: ApprovalPage,
    icon: '✅',
    requiredPermission: 'view_approvals',
    showInNav: false
  },

  // Awards & Contract
  {
    path: '/awards',
    name: 'Awards',
    component: AwardPage,
    icon: '🏆',
    requiredPermission: 'view_awards',
    showInNav: true
  },
  {
    path: '/contracts',
    name: 'Contracts',
    component: ContractPage,
    icon: '📑',
    requiredPermission: 'view_contracts',
    showInNav: true
  },

  // Audit & Compliance
  {
    path: '/audit',
    name: 'Audit Trail',
    component: AuditPage,
    icon: '🔍',
    requiredPermission: 'view_audit',
    showInNav: true
  },
  {
    path: '/audit/compliance',
    name: 'Compliance',
    component: AuditPage,
    icon: '🔍',
    requiredPermission: 'view_audit',
    showInNav: false
  },

  // Documents
  {
    path: '/documents',
    name: 'Documents',
    component: DocumentsPage,
    icon: '📄',
    requiredPermission: 'view_documents',
    showInNav: true
  },

  // Admin Tools
  {
    path: '/admin/route-testing',
    name: 'Route Testing',
    component: RouteTestingPage,
    icon: '🧪',
    requiredPermission: 'admin_view',
    showInNav: true
  },

  // No Objection Requests
  {
    path: '/no-objections',
    name: 'No-Objection Requests',
    component: NoObjectionPage,
    icon: '🚦',
    requiredPermission: 'view_procurement',
    showInNav: true
  }
];

/**
 * Navigation menu configuration
 * Includes main navigation items and their organization
 */
export const NAVIGATION_MENU = [
  {
    section: 'Main',
    items: ROUTES.filter(r => r.showInNav && ['/', '/procurements', '/procurement-setup'].includes(r.path))
  },
  {
    section: 'Procurement Lifecycle',
    items: ROUTES.filter(r => 
      r.showInNav && 
      ['/planning', '/templates', '/rfqs', '/rfq/new', '/clarifications'].includes(r.path)
    )
  },
  {
    section: 'Evaluation & Approval',
    items: ROUTES.filter(r => 
      r.showInNav && 
      ['/submissions', '/evaluations', '/approvals'].includes(r.path)
    )
  },
  {
    section: 'Execution',
    items: ROUTES.filter(r => 
      r.showInNav && 
      ['/awards', '/contracts'].includes(r.path)
    )
  },
  {
    section: 'Governance',
    items: ROUTES.filter(r => 
      r.showInNav && 
      ['/audit'].includes(r.path)
    )
  },

  // Admin Tools Section
  {
    section: 'Admin Tools',
    items: ROUTES.filter(r => 
      r.showInNav && 
      ['/admin/route-testing'].includes(r.path)
    )
  }
];

/**
 * Get all public routes (accessible without authentication)
 */
export const getPublicRoutes = () => {
  return ROUTES.filter(route => route.isPublic);
};

/**
 * Get all protected routes (require authentication)
 */
export const getProtectedRoutes = () => {
  return ROUTES.filter(route => !route.isPublic);
};

/**
 * Get routes that should appear in navigation
 */
export const getNavRoutes = () => {
  return ROUTES.filter(route => route.showInNav && !route.isPublic);
};

/**
 * Get a specific route by path
 */
export const getRouteByPath = (path) => {
  return ROUTES.find(route => route.path === path);
};

/**
 * Get routes requiring a specific permission
 */
export const getRoutesByPermission = (permission) => {
  return ROUTES.filter(route => route.requiredPermission === permission);
};

/**
 * Check if user can access a route
 */
export const canAccessRoute = (route, userPermissions) => {
  // TODO: Implement permission check logic
  return true;
}

export default ROUTES;
