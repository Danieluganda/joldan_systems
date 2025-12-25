// client/src/pages/ApprovalPage.jsx

import React, { useState, useEffect } from 'react';
import StandardLayout from '../components/layout/StandardLayout';
import './pages.css';

function ApprovalPage() {
  const [activeView, setActiveView] = useState('queue');
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);

  // Mock approval data - STEP compliant approval workflow
  const [approvals] = useState([
    {
      id: 'APP-2025-001',
      procurementRef: 'PROC-2025-001',
      title: 'Road Infrastructure Rehabilitation Project - Phase 1',
      type: 'Contract Award',
      status: 'pending_review',
      priority: 'high',
      submittedBy: 'John Smith',
      submittedDate: '2025-12-20',
      currentApprover: 'Maria Garcia (PMU Director)',
      stage: 'Technical Review',
      value: 2500000,
      description: 'Seeking approval for contractor selection and contract award',
      approvalLevel: 'Level 2 - PMU Director',
      deadline: '2025-12-30',
      daysRemaining: 5,
      attachments: 8,
      comments: 3
    },
    {
      id: 'APP-2025-002',
      procurementRef: 'PROC-2024-089',
      title: 'Medical Equipment Procurement',
      type: 'Budget Revision',
      status: 'approved',
      priority: 'medium',
      submittedBy: 'Sarah Johnson',
      submittedDate: '2025-12-18',
      currentApprover: 'David Chen (Finance Director)',
      stage: 'Financial Approval',
      value: 850000,
      description: 'Budget increase for additional medical equipment specifications',
      approvalLevel: 'Level 1 - Department Head',
      deadline: '2025-12-25',
      daysRemaining: 0,
      attachments: 12,
      comments: 7,
      approvedDate: '2025-12-22',
      approvedBy: 'David Chen'
    },
    {
      id: 'APP-2025-003',
      procurementRef: 'PROC-2025-003',
      title: 'IT Infrastructure Upgrade',
      type: 'Procurement Plan',
      status: 'under_review',
      priority: 'low',
      submittedBy: 'Mike Wilson',
      submittedDate: '2025-12-15',
      currentApprover: 'Lisa Brown (IT Director)',
      stage: 'Technical Evaluation',
      value: 450000,
      description: 'Annual IT infrastructure upgrade and modernization plan',
      approvalLevel: 'Level 1 - Department Head',
      deadline: '2026-01-05',
      daysRemaining: 11,
      attachments: 6,
      comments: 2
    },
    {
      id: 'APP-2025-004',
      procurementRef: 'PROC-2024-078',
      title: 'Construction Materials Supply',
      type: 'Contract Amendment',
      status: 'rejected',
      priority: 'high',
      submittedBy: 'Robert Davis',
      submittedDate: '2025-12-10',
      currentApprover: 'Elena Martinez (Legal)',
      stage: 'Legal Review',
      value: 1200000,
      description: 'Amendment to include additional construction materials',
      approvalLevel: 'Level 2 - PMU Director',
      deadline: '2025-12-20',
      daysRemaining: -5,
      attachments: 4,
      comments: 9,
      rejectedDate: '2025-12-19',
      rejectedBy: 'Elena Martinez',
      rejectionReason: 'Insufficient documentation for scope changes'
    },
    {
      id: 'APP-2025-005',
      procurementRef: 'PROC-2025-004',
      title: 'Consultant Services Agreement',
      type: 'New Procurement',
      status: 'draft',
      priority: 'medium',
      submittedBy: 'Amanda White',
      submittedDate: '2025-12-23',
      currentApprover: 'Pending Submission',
      stage: 'Document Preparation',
      value: 320000,
      description: 'Engineering consulting services for bridge construction',
      approvalLevel: 'Level 1 - Department Head',
      deadline: '2026-01-10',
      daysRemaining: 16,
      attachments: 3,
      comments: 1
    },
    {
      id: 'APP-2025-006',
      procurementRef: 'PROC-2024-095',
      title: 'Emergency Response Equipment',
      type: 'Emergency Procurement',
      status: 'escalated',
      priority: 'high',
      submittedBy: 'Carlos Rodriguez',
      submittedDate: '2025-12-24',
      currentApprover: 'Director General Office',
      stage: 'Executive Review',
      value: 890000,
      description: 'Urgent procurement for disaster response equipment',
      approvalLevel: 'Level 3 - Director General',
      deadline: '2025-12-26',
      daysRemaining: 1,
      attachments: 15,
      comments: 8
    }
  ]);

  // Approval statistics
  const stats = {
    total: approvals.length,
    pending: approvals.filter(a => a.status === 'pending_review').length,
    approved: approvals.filter(a => a.status === 'approved').length,
    underReview: approvals.filter(a => a.status === 'under_review').length,
    overdue: approvals.filter(a => a.daysRemaining < 0).length,
    totalValue: approvals.reduce((sum, a) => sum + a.value, 0),
    avgProcessingTime: '7.2 days'
  };

  // Filter approvals based on search and filters
  const filteredApprovals = approvals.filter(approval => {
    const matchesSearch = approval.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         approval.procurementRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         approval.submittedBy.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || approval.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || approval.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Status configurations
  const statusConfig = {
    draft: { label: 'Draft', color: '#6b7280', bg: '#f9fafb', icon: '📝' },
    pending_review: { label: 'Pending Review', color: '#f59e0b', bg: '#fef3c7', icon: '⏳' },
    under_review: { label: 'Under Review', color: '#3b82f6', bg: '#dbeafe', icon: '👁️' },
    approved: { label: 'Approved', color: '#10b981', bg: '#d1fae5', icon: '✅' },
    rejected: { label: 'Rejected', color: '#ef4444', bg: '#fee2e2', icon: '❌' },
    escalated: { label: 'Escalated', color: '#8b5cf6', bg: '#ede9fe', icon: '⬆️' }
  };

  // Approval types with icons
  const typeConfig = {
    'Contract Award': { icon: '🏆', color: '#10b981' },
    'Budget Revision': { icon: '💰', color: '#f59e0b' },
    'Procurement Plan': { icon: '📋', color: '#3b82f6' },
    'Contract Amendment': { icon: '📝', color: '#8b5cf6' },
    'New Procurement': { icon: '🆕', color: '#06b6d4' },
    'Emergency Procurement': { icon: '🚨', color: '#ef4444' }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const config = statusConfig[status];
    return (
      <span 
        className="status-badge"
        style={{
          backgroundColor: config.bg,
          color: config.color,
          padding: '0.5rem 0.75rem',
          borderRadius: '20px',
          fontSize: '0.8rem',
          fontWeight: '600',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        <span>{config.icon}</span>
        {config.label}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const priorityStyles = {
      high: { bg: '#fee2e2', color: '#dc2626' },
      medium: { bg: '#fef3c7', color: '#d97706' },
      low: { bg: '#f0f9ff', color: '#0369a1' }
    };
    const style = priorityStyles[priority];
    return (
      <span 
        className={`priority-indicator priority-${priority}`}
        style={{
          backgroundColor: style.bg,
          color: style.color,
          padding: '0.25rem 0.5rem',
          borderRadius: '12px',
          fontSize: '0.7rem',
          fontWeight: '600',
          textTransform: 'uppercase'
        }}
      >
        {priority}
      </span>
    );
  };

  const renderQueueView = () => (
    <div className="approvals-content">
      {/* Statistics Section */}
      <div className="stats-section">
        <h2 className="section-title">Approval Overview</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Approvals</div>
            <div className="stat-icon">📊</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Pending Review</div>
            <div className="stat-icon">⏳</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.approved}</div>
            <div className="stat-label">Approved</div>
            <div className="stat-icon">✅</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.overdue}</div>
            <div className="stat-label">Overdue</div>
            <div className="stat-icon">🚨</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatCurrency(stats.totalValue)}</div>
            <div className="stat-label">Total Value</div>
            <div className="stat-icon">💰</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.avgProcessingTime}</div>
            <div className="stat-label">Avg. Processing Time</div>
            <div className="stat-icon">⏱️</div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="search-group">
          <label>Search Approvals</label>
          <input
            type="text"
            placeholder="Search by title, reference, or submitter..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-group">
          <label>Status</label>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="pending_review">Pending Review</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="escalated">Escalated</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Priority</label>
          <select 
            value={priorityFilter} 
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Approvals Table */}
      <div className="table-section">
        <div className="table-header">
          <h3>Approval Queue ({filteredApprovals.length})</h3>
          <button 
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
          >
            + New Approval Request
          </button>
        </div>
        
        <div className="table-container">
          <table className="approvals-table">
            <thead>
              <tr>
                <th>Procurement Details</th>
                <th>Type</th>
                <th>Status</th>
                <th>Value</th>
                <th>Current Approver</th>
                <th>Deadline</th>
                <th>Priority</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredApprovals.map((approval) => (
                <tr key={approval.id}>
                  <td>
                    <div className="procurement-info">
                      <div className="procurement-ref">{approval.procurementRef}</div>
                      <div className="procurement-title">{approval.title}</div>
                      <div className="submitted-info">
                        Submitted by {approval.submittedBy} on {approval.submittedDate}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div 
                      className="type-badge"
                      style={{ backgroundColor: `${typeConfig[approval.type]?.color}15`, color: typeConfig[approval.type]?.color }}
                    >
                      <span className="type-icon">{typeConfig[approval.type]?.icon}</span>
                      {approval.type}
                    </div>
                  </td>
                  <td>{getStatusBadge(approval.status)}</td>
                  <td className="value-cell">
                    <div className="approval-value">{formatCurrency(approval.value)}</div>
                    <div className="approval-level">{approval.approvalLevel}</div>
                  </td>
                  <td>
                    <div className="approver-info">
                      <div className="current-approver">{approval.currentApprover}</div>
                      <div className="approval-stage">{approval.stage}</div>
                    </div>
                  </td>
                  <td>
                    <div className="deadline-info">
                      <div className="deadline-date">{approval.deadline}</div>
                      <div className={`days-remaining ${approval.daysRemaining < 0 ? 'overdue' : approval.daysRemaining <= 2 ? 'urgent' : ''}`}>
                        {approval.daysRemaining < 0 ? `${Math.abs(approval.daysRemaining)} days overdue` : 
                         approval.daysRemaining === 0 ? 'Due today' :
                         `${approval.daysRemaining} days left`}
                      </div>
                    </div>
                  </td>
                  <td>{getPriorityBadge(approval.priority)}</td>
                  <td className="actions-cell">
                    <div className="action-buttons">
                      <button className="action-btn" title="View Details">👁️</button>
                      <button className="action-btn" title="Edit">✏️</button>
                      <button className="action-btn" title="Comments">💬</button>
                      <button className="action-btn" title="Documents">📎</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderWorkflowView = () => (
    <div className="workflow-section">
      <h2 className="section-title">STEP Approval Workflow</h2>
      <div className="workflow-diagram">
        <div className="workflow-stage">
          <div className="stage-icon">📝</div>
          <div className="stage-name">Draft</div>
          <div className="stage-description">Initial preparation and documentation</div>
        </div>
        <div className="workflow-arrow">→</div>
        <div className="workflow-stage">
          <div className="stage-icon">📤</div>
          <div className="stage-name">Submit</div>
          <div className="stage-description">Submit for review and approval</div>
        </div>
        <div className="workflow-arrow">→</div>
        <div className="workflow-stage">
          <div className="stage-icon">👁️</div>
          <div className="stage-name">Review</div>
          <div className="stage-description">Technical and compliance review</div>
        </div>
        <div className="workflow-arrow">→</div>
        <div className="workflow-stage">
          <div className="stage-icon">✅</div>
          <div className="stage-name">Approve</div>
          <div className="stage-description">Final approval and authorization</div>
        </div>
      </div>
    </div>
  );

  return (
    <StandardLayout title="Approval Management">
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">
            <span className="title-icon">🔍</span>
            Approval Management
          </h1>
          <p className="page-subtitle">
            Manage procurement approvals following STEP methodology and World Bank guidelines
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${activeView === 'queue' ? 'active' : ''}`}
            onClick={() => setActiveView('queue')}
          >
            📋 Approval Queue
          </button>
          <button 
            className={`nav-tab ${activeView === 'workflow' ? 'active' : ''}`}
            onClick={() => setActiveView('workflow')}
          >
            🔄 Workflow Status
          </button>
          <button 
            className={`nav-tab ${activeView === 'history' ? 'active' : ''}`}
            onClick={() => setActiveView('history')}
          >
            📚 Approval History
          </button>
          <button 
            className={`nav-tab ${activeView === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveView('analytics')}
          >
            📊 Analytics
          </button>
        </div>

        {/* Content based on active view */}
        {activeView === 'queue' && renderQueueView()}
        {activeView === 'workflow' && renderWorkflowView()}
        {activeView === 'history' && (
          <div className="coming-soon">
            <h2>Approval History</h2>
            <p>Historical approval records and audit trail coming soon...</p>
          </div>
        )}
        {activeView === 'analytics' && (
          <div className="coming-soon">
            <h2>Approval Analytics</h2>
            <p>Advanced analytics and reporting dashboard coming soon...</p>
          </div>
        )}

        {/* Modal for new approval request */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h3>New Approval Request</h3>
              <p>Approval request form coming soon...</p>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </StandardLayout>
  );
}

export default ApprovalPage;
