import React, { useState, useEffect } from 'react';
import StandardLayout from '../components/layout/StandardLayout';
import './pages.css';

export default function AuditPage() {
  const [activeView, setActiveView] = useState('overview');
  const [selectedProcurement, setSelectedProcurement] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Comprehensive audit data - STEP methodology compliant
  const [audits] = useState([
    {
      id: 'AUDIT-2025-001',
      procurementRef: 'PROC-2025-001',
      title: 'Road Infrastructure Rehabilitation Project - Phase 1',
      auditType: 'Compliance Audit',
      status: 'completed',
      riskLevel: 'high',
      auditedBy: 'Elena Rodriguez',
      auditDate: '2025-12-20',
      completionDate: '2025-12-22',
      findingsCount: 8,
      criticalFindings: 2,
      majorFindings: 3,
      minorFindings: 3,
      complianceScore: 75,
      recommendationsCount: 12,
      procurementValue: 2500000,
      stage: 'Contract Award',
      nextReviewDate: '2026-03-20',
      auditDuration: '3 days',
      documentsReviewed: 45,
      approvalChainLength: 8
    },
    {
      id: 'AUDIT-2025-002',
      procurementRef: 'PROC-2024-089',
      title: 'Medical Equipment Procurement',
      auditType: 'Financial Audit',
      status: 'in_progress',
      riskLevel: 'medium',
      auditedBy: 'Michael Chen',
      auditDate: '2025-12-18',
      completionDate: null,
      findingsCount: 4,
      criticalFindings: 0,
      majorFindings: 1,
      minorFindings: 3,
      complianceScore: 88,
      recommendationsCount: 6,
      procurementValue: 850000,
      stage: 'Evaluation',
      nextReviewDate: '2026-01-15',
      auditDuration: 'Ongoing',
      documentsReviewed: 32,
      approvalChainLength: 5
    },
    {
      id: 'AUDIT-2025-003',
      procurementRef: 'PROC-2025-003',
      title: 'IT Infrastructure Upgrade',
      auditType: 'Process Audit',
      status: 'scheduled',
      riskLevel: 'low',
      auditedBy: 'Sarah Johnson',
      auditDate: '2025-12-30',
      completionDate: null,
      findingsCount: 0,
      criticalFindings: 0,
      majorFindings: 0,
      minorFindings: 0,
      complianceScore: null,
      recommendationsCount: 0,
      procurementValue: 450000,
      stage: 'Planning',
      nextReviewDate: '2026-02-28',
      auditDuration: 'Planned: 2 days',
      documentsReviewed: 0,
      approvalChainLength: 4
    },
    {
      id: 'AUDIT-2025-004',
      procurementRef: 'PROC-2024-078',
      title: 'Construction Materials Supply',
      auditType: 'Risk Assessment',
      status: 'draft',
      riskLevel: 'high',
      auditedBy: 'David Martinez',
      auditDate: '2025-12-28',
      completionDate: null,
      findingsCount: 0,
      criticalFindings: 0,
      majorFindings: 0,
      minorFindings: 0,
      complianceScore: null,
      recommendationsCount: 0,
      procurementValue: 1200000,
      stage: 'Tendering',
      nextReviewDate: '2026-01-28',
      auditDuration: 'Draft stage',
      documentsReviewed: 0,
      approvalChainLength: 6
    },
    {
      id: 'AUDIT-2024-095',
      procurementRef: 'PROC-2024-095',
      title: 'Emergency Response Equipment',
      auditType: 'Emergency Audit',
      status: 'under_review',
      riskLevel: 'high',
      auditedBy: 'Lisa Brown',
      auditDate: '2025-12-15',
      completionDate: '2025-12-17',
      findingsCount: 6,
      criticalFindings: 1,
      majorFindings: 2,
      minorFindings: 3,
      complianceScore: 82,
      recommendationsCount: 9,
      procurementValue: 890000,
      stage: 'Implementation',
      nextReviewDate: '2026-01-17',
      auditDuration: '2 days',
      documentsReviewed: 28,
      approvalChainLength: 7
    }
  ]);

  // Audit statistics
  const stats = {
    totalAudits: audits.length,
    completedAudits: audits.filter(a => a.status === 'completed').length,
    inProgressAudits: audits.filter(a => a.status === 'in_progress').length,
    highRiskAudits: audits.filter(a => a.riskLevel === 'high').length,
    avgComplianceScore: Math.round(audits.filter(a => a.complianceScore).reduce((sum, a) => sum + a.complianceScore, 0) / audits.filter(a => a.complianceScore).length),
    totalFindings: audits.reduce((sum, a) => sum + a.findingsCount, 0),
    criticalFindings: audits.reduce((sum, a) => sum + a.criticalFindings, 0),
    totalValue: audits.reduce((sum, a) => sum + a.procurementValue, 0)
  };

  // Filter audits
  const filteredAudits = audits.filter(audit => {
    const matchesSearch = audit.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         audit.procurementRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         audit.auditedBy.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || audit.status === statusFilter;
    const matchesRisk = riskFilter === 'all' || audit.riskLevel === riskFilter;
    return matchesSearch && matchesStatus && matchesRisk;
  });

  // Status configurations
  const statusConfig = {
    draft: { label: 'Draft', color: '#6b7280', bg: '#f9fafb', icon: '📝' },
    scheduled: { label: 'Scheduled', color: '#f59e0b', bg: '#fef3c7', icon: '📅' },
    in_progress: { label: 'In Progress', color: '#3b82f6', bg: '#dbeafe', icon: '🔄' },
    under_review: { label: 'Under Review', color: '#8b5cf6', bg: '#ede9fe', icon: '👁️' },
    completed: { label: 'Completed', color: '#10b981', bg: '#d1fae5', icon: '✅' }
  };

  // Risk level configurations
  const riskConfig = {
    low: { label: 'Low Risk', color: '#10b981', bg: '#d1fae5', icon: '🟢' },
    medium: { label: 'Medium Risk', color: '#f59e0b', bg: '#fef3c7', icon: '🟡' },
    high: { label: 'High Risk', color: '#ef4444', bg: '#fee2e2', icon: '🔴' }
  };

  // Audit type configurations
  const auditTypeConfig = {
    'Compliance Audit': { icon: '📋', color: '#3b82f6' },
    'Financial Audit': { icon: '💰', color: '#10b981' },
    'Process Audit': { icon: '⚙️', color: '#8b5cf6' },
    'Risk Assessment': { icon: '⚠️', color: '#f59e0b' },
    'Emergency Audit': { icon: '🚨', color: '#ef4444' }
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

  const getRiskBadge = (risk) => {
    const config = riskConfig[risk];
    return (
      <span 
        className="risk-badge"
        style={{
          backgroundColor: config.bg,
          color: config.color,
          padding: '0.4rem 0.6rem',
          borderRadius: '16px',
          fontSize: '0.75rem',
          fontWeight: '600',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem'
        }}
      >
        <span>{config.icon}</span>
        {config.label}
      </span>
    );
  };

  const getComplianceScoreColor = (score) => {
    if (score >= 90) return '#10b981'; // Green
    if (score >= 75) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  const renderOverviewTab = () => (
    <div className="audit-content">
      {/* Statistics Section */}
      <div className="stats-section">
        <h2 className="section-title">Audit Overview</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.totalAudits}</div>
            <div className="stat-label">Total Audits</div>
            <div className="stat-icon">📊</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.completedAudits}</div>
            <div className="stat-label">Completed</div>
            <div className="stat-icon">✅</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.inProgressAudits}</div>
            <div className="stat-label">In Progress</div>
            <div className="stat-icon">🔄</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.highRiskAudits}</div>
            <div className="stat-label">High Risk</div>
            <div className="stat-icon">🚨</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.avgComplianceScore}%</div>
            <div className="stat-label">Avg. Compliance</div>
            <div className="stat-icon">📈</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.totalFindings}</div>
            <div className="stat-label">Total Findings</div>
            <div className="stat-icon">🔍</div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="search-group">
          <label>Search Audits</label>
          <input
            type="text"
            placeholder="Search by title, reference, or auditor..."
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
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="under_review">Under Review</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Risk Level</label>
          <select 
            value={riskFilter} 
            onChange={(e) => setRiskFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Risk Levels</option>
            <option value="low">Low Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk</option>
          </select>
        </div>
      </div>

      {/* Audits Table */}
      <div className="table-section">
        <div className="table-header">
          <h3>Audit Records ({filteredAudits.length})</h3>
          <button 
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
          >
            + Schedule New Audit
          </button>
        </div>
        
        <div className="table-container">
          <table className="audits-table">
            <thead>
              <tr>
                <th>Procurement Details</th>
                <th>Audit Type</th>
                <th>Status</th>
                <th>Risk Level</th>
                <th>Auditor</th>
                <th>Compliance Score</th>
                <th>Findings</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAudits.map((audit) => (
                <tr key={audit.id}>
                  <td>
                    <div className="audit-info">
                      <div className="audit-ref">{audit.procurementRef}</div>
                      <div className="audit-title">{audit.title}</div>
                      <div className="audit-meta">
                        Value: {formatCurrency(audit.procurementValue)} | Stage: {audit.stage}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div 
                      className="type-badge"
                      style={{ 
                        backgroundColor: `${auditTypeConfig[audit.auditType]?.color}15`, 
                        color: auditTypeConfig[audit.auditType]?.color 
                      }}
                    >
                      <span className="type-icon">{auditTypeConfig[audit.auditType]?.icon}</span>
                      {audit.auditType}
                    </div>
                  </td>
                  <td>{getStatusBadge(audit.status)}</td>
                  <td>{getRiskBadge(audit.riskLevel)}</td>
                  <td>
                    <div className="auditor-info">
                      <div className="auditor-name">{audit.auditedBy}</div>
                      <div className="audit-date">
                        {audit.auditDate}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="compliance-score">
                      {audit.complianceScore ? (
                        <div 
                          className="score-circle"
                          style={{ 
                            backgroundColor: getComplianceScoreColor(audit.complianceScore),
                            color: 'white',
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '0.8rem'
                          }}
                        >
                          {audit.complianceScore}%
                        </div>
                      ) : (
                        <span className="score-pending">Pending</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="findings-summary">
                      <div className="findings-total">
                        <strong>{audit.findingsCount}</strong> Total
                      </div>
                      {audit.findingsCount > 0 && (
                        <div className="findings-breakdown">
                          <span className="critical-findings" title="Critical">🔴 {audit.criticalFindings}</span>
                          <span className="major-findings" title="Major">🟡 {audit.majorFindings}</span>
                          <span className="minor-findings" title="Minor">🟢 {audit.minorFindings}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="actions-cell">
                    <div className="action-buttons">
                      <button className="action-btn" title="View Audit">👁️</button>
                      <button className="action-btn" title="Edit">✏️</button>
                      <button className="action-btn" title="Generate Report">📊</button>
                      <button className="action-btn" title="Download Pack">📦</button>
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

  const renderComplianceTab = () => (
    <div className="compliance-section">
      <h2 className="section-title">STEP Compliance Framework</h2>
      <div className="compliance-framework">
        <div className="compliance-area">
          <div className="compliance-header">
            <h3>📋 Documentation Compliance</h3>
            <div className="compliance-score">85%</div>
          </div>
          <div className="compliance-items">
            <div className="compliance-item">
              <span>Procurement Plan Documentation</span>
              <span className="compliance-status pass">✅</span>
            </div>
            <div className="compliance-item">
              <span>Bidding Document Standards</span>
              <span className="compliance-status pass">✅</span>
            </div>
            <div className="compliance-item">
              <span>Evaluation Report Completeness</span>
              <span className="compliance-status warning">⚠️</span>
            </div>
          </div>
        </div>
        
        <div className="compliance-area">
          <div className="compliance-header">
            <h3>⚖️ Process Compliance</h3>
            <div className="compliance-score">92%</div>
          </div>
          <div className="compliance-items">
            <div className="compliance-item">
              <span>Approval Authority Delegation</span>
              <span className="compliance-status pass">✅</span>
            </div>
            <div className="compliance-item">
              <span>Competitive Process Adherence</span>
              <span className="compliance-status pass">✅</span>
            </div>
            <div className="compliance-item">
              <span>Timeline Compliance</span>
              <span className="compliance-status pass">✅</span>
            </div>
          </div>
        </div>

        <div className="compliance-area">
          <div className="compliance-header">
            <h3>🔍 Review & Oversight</h3>
            <div className="compliance-score">78%</div>
          </div>
          <div className="compliance-items">
            <div className="compliance-item">
              <span>Prior Review Requirements</span>
              <span className="compliance-status warning">⚠️</span>
            </div>
            <div className="compliance-item">
              <span>Post Review Compliance</span>
              <span className="compliance-status pass">✅</span>
            </div>
            <div className="compliance-item">
              <span>No Objection Procedures</span>
              <span className="compliance-status fail">❌</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <StandardLayout title="Audit Management">
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">
            <span className="title-icon">🔍</span>
            Audit Management
          </h1>
          <p className="page-subtitle">
            Comprehensive audit tracking and compliance monitoring following STEP methodology
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${activeView === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveView('overview')}
          >
            📊 Audit Overview
          </button>
          <button 
            className={`nav-tab ${activeView === 'compliance' ? 'active' : ''}`}
            onClick={() => setActiveView('compliance')}
          >
            📋 STEP Compliance
          </button>
          <button 
            className={`nav-tab ${activeView === 'findings' ? 'active' : ''}`}
            onClick={() => setActiveView('findings')}
          >
            🔍 Findings & Recommendations
          </button>
          <button 
            className={`nav-tab ${activeView === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveView('reports')}
          >
            📊 Audit Reports
          </button>
        </div>

        {/* Content based on active view */}
        {activeView === 'overview' && renderOverviewTab()}
        {activeView === 'compliance' && renderComplianceTab()}
        {activeView === 'findings' && (
          <div className="coming-soon">
            <h2>Findings & Recommendations</h2>
            <p>Detailed findings analysis and recommendation tracking coming soon...</p>
          </div>
        )}
        {activeView === 'reports' && (
          <div className="coming-soon">
            <h2>Audit Reports</h2>
            <p>Comprehensive audit reporting and analytics dashboard coming soon...</p>
          </div>
        )}

        {/* Modal for new audit */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h3>Schedule New Audit</h3>
              <p>Audit scheduling form coming soon...</p>
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

