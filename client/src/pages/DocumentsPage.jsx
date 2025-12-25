import React, { useState, useEffect } from 'react';
import StandardLayout from '../components/layout/StandardLayout';
import './pages.css';

/**
 * Documents Page - Comprehensive Document Management System
 * 
 * Manages all procurement documents with version control, approval workflows,
 * and STEP methodology compliance tracking
 */
const DocumentsPage = () => {
  const [activeView, setActiveView] = useState('documents');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Comprehensive document data - STEP methodology compliant
  const [documents] = useState([
    {
      id: 'DOC-2025-001',
      name: 'Procurement Notice - Infrastructure Development',
      description: 'Official procurement notice for infrastructure development project including detailed specifications, evaluation criteria, and submission requirements.',
      category: 'procurement_notices',
      type: 'notice',
      status: 'published',
      version: '2.1',
      size: '2.4 MB',
      format: 'PDF',
      procurementRef: 'PROC-2025-001',
      createdDate: '2025-12-15',
      modifiedDate: '2025-12-22',
      publishedDate: '2025-12-20',
      expiryDate: '2026-01-20',
      author: {
        name: 'Maria Rodriguez',
        department: 'Procurement Department',
        email: 'maria.rodriguez@organization.org'
      },
      approvalWorkflow: {
        currentStage: 'published',
        stages: [
          { stage: 'draft', status: 'completed', date: '2025-12-15', approver: 'John Smith' },
          { stage: 'review', status: 'completed', date: '2025-12-18', approver: 'Sarah Johnson' },
          { stage: 'approval', status: 'completed', date: '2025-12-19', approver: 'Michael Chen' },
          { stage: 'published', status: 'completed', date: '2025-12-20', approver: 'Maria Rodriguez' }
        ],
        nextAction: null,
        priority: 'high'
      },
      compliance: {
        stepCompliant: true,
        transparencyLevel: 'public',
        accessLevel: 'unrestricted',
        retentionPeriod: '7 years',
        auditRequired: true,
        lastAuditDate: '2025-12-21',
        complianceScore: 95
      },
      versions: [
        { version: '2.1', date: '2025-12-22', author: 'Maria Rodriguez', changes: 'Updated technical specifications and evaluation criteria' },
        { version: '2.0', date: '2025-12-20', author: 'Maria Rodriguez', changes: 'Published version with all approvals' },
        { version: '1.3', date: '2025-12-18', author: 'John Smith', changes: 'Incorporated review comments and legal requirements' },
        { version: '1.0', date: '2025-12-15', author: 'John Smith', changes: 'Initial draft version' }
      ],
      tags: ['infrastructure', 'public-tender', 'construction', 'STEP-compliant'],
      downloads: 147,
      views: 892,
      attachments: [
        { name: 'Technical_Specifications.pdf', size: '1.8 MB', type: 'PDF' },
        { name: 'Evaluation_Criteria.xlsx', size: '245 KB', type: 'Excel' },
        { name: 'Site_Plans.dwg', size: '3.2 MB', type: 'AutoCAD' }
      ],
      permissions: {
        view: ['all_users'],
        edit: ['procurement_team', 'senior_management'],
        approve: ['procurement_manager', 'legal_team'],
        publish: ['procurement_manager']
      },
      metadata: {
        confidential: false,
        externalSharing: true,
        backupStatus: 'completed',
        lastBackup: '2025-12-23',
        checksum: 'a1b2c3d4e5f6'
      }
    },
    {
      id: 'DOC-2025-002',
      name: 'Supplier Pre-qualification Guidelines',
      description: 'Comprehensive guidelines for supplier pre-qualification process including eligibility criteria, documentation requirements, and evaluation procedures.',
      category: 'guidelines',
      type: 'guideline',
      status: 'under_review',
      version: '1.2',
      size: '1.8 MB',
      format: 'PDF',
      procurementRef: 'PROC-2025-002',
      createdDate: '2025-12-18',
      modifiedDate: '2025-12-23',
      publishedDate: null,
      expiryDate: null,
      author: {
        name: 'Carlos Martinez',
        department: 'Supplier Management',
        email: 'carlos.martinez@organization.org'
      },
      approvalWorkflow: {
        currentStage: 'review',
        stages: [
          { stage: 'draft', status: 'completed', date: '2025-12-18', approver: 'Carlos Martinez' },
          { stage: 'review', status: 'in_progress', date: null, approver: 'Emma Wilson' },
          { stage: 'approval', status: 'pending', date: null, approver: 'Michael Chen' },
          { stage: 'published', status: 'pending', date: null, approver: null }
        ],
        nextAction: 'awaiting_review_completion',
        priority: 'medium'
      },
      compliance: {
        stepCompliant: true,
        transparencyLevel: 'public',
        accessLevel: 'restricted',
        retentionPeriod: '5 years',
        auditRequired: false,
        lastAuditDate: null,
        complianceScore: 88
      },
      versions: [
        { version: '1.2', date: '2025-12-23', author: 'Carlos Martinez', changes: 'Updated qualification criteria based on market feedback' },
        { version: '1.1', date: '2025-12-20', author: 'Carlos Martinez', changes: 'Added financial stability requirements' },
        { version: '1.0', date: '2025-12-18', author: 'Carlos Martinez', changes: 'Initial draft version' }
      ],
      tags: ['supplier-management', 'prequalification', 'guidelines', 'STEP-compliant'],
      downloads: 23,
      views: 156,
      attachments: [
        { name: 'Financial_Assessment_Form.xlsx', size: '156 KB', type: 'Excel' },
        { name: 'Technical_Capability_Checklist.pdf', size: '234 KB', type: 'PDF' }
      ],
      permissions: {
        view: ['procurement_team', 'supplier_management'],
        edit: ['supplier_management'],
        approve: ['procurement_manager', 'legal_team'],
        publish: ['procurement_manager']
      },
      metadata: {
        confidential: false,
        externalSharing: false,
        backupStatus: 'completed',
        lastBackup: '2025-12-23',
        checksum: 'x1y2z3a4b5c6'
      }
    },
    {
      id: 'DOC-2025-003',
      name: 'Contract Templates - Service Agreements',
      description: 'Standardized contract templates for service agreements including terms and conditions, payment schedules, and performance requirements.',
      category: 'contracts',
      type: 'template',
      status: 'approved',
      version: '3.0',
      size: '945 KB',
      format: 'DOC',
      procurementRef: null,
      createdDate: '2025-11-20',
      modifiedDate: '2025-12-10',
      publishedDate: '2025-12-12',
      expiryDate: '2026-12-12',
      author: {
        name: 'Sarah Johnson',
        department: 'Legal Department',
        email: 'sarah.johnson@organization.org'
      },
      approvalWorkflow: {
        currentStage: 'published',
        stages: [
          { stage: 'draft', status: 'completed', date: '2025-11-20', approver: 'Sarah Johnson' },
          { stage: 'review', status: 'completed', date: '2025-12-05', approver: 'Legal Team' },
          { stage: 'approval', status: 'completed', date: '2025-12-10', approver: 'Chief Legal Officer' },
          { stage: 'published', status: 'completed', date: '2025-12-12', approver: 'Sarah Johnson' }
        ],
        nextAction: null,
        priority: 'high'
      },
      compliance: {
        stepCompliant: true,
        transparencyLevel: 'internal',
        accessLevel: 'restricted',
        retentionPeriod: '10 years',
        auditRequired: true,
        lastAuditDate: '2025-12-15',
        complianceScore: 98
      },
      versions: [
        { version: '3.0', date: '2025-12-10', author: 'Sarah Johnson', changes: 'Major update with new regulatory compliance requirements' },
        { version: '2.5', date: '2025-11-25', author: 'Sarah Johnson', changes: 'Updated payment terms and dispute resolution clauses' },
        { version: '2.0', date: '2025-10-15', author: 'Legal Team', changes: 'Comprehensive review and restructure' }
      ],
      tags: ['contracts', 'templates', 'services', 'legal', 'STEP-compliant'],
      downloads: 89,
      views: 312,
      attachments: [
        { name: 'Service_Level_Agreement_Template.docx', size: '278 KB', type: 'Word' },
        { name: 'Payment_Schedule_Template.xlsx', size: '145 KB', type: 'Excel' }
      ],
      permissions: {
        view: ['procurement_team', 'legal_team', 'contract_managers'],
        edit: ['legal_team'],
        approve: ['chief_legal_officer'],
        publish: ['chief_legal_officer']
      },
      metadata: {
        confidential: true,
        externalSharing: false,
        backupStatus: 'completed',
        lastBackup: '2025-12-23',
        checksum: 'p1q2r3s4t5u6'
      }
    },
    {
      id: 'DOC-2024-089',
      name: 'Bid Evaluation Report - Medical Equipment',
      description: 'Comprehensive bid evaluation report for medical equipment procurement including technical and financial evaluation, supplier comparison, and recommendations.',
      category: 'evaluations',
      type: 'evaluation',
      status: 'draft',
      version: '0.8',
      size: '3.2 MB',
      format: 'PDF',
      procurementRef: 'PROC-2024-089',
      createdDate: '2025-12-20',
      modifiedDate: '2025-12-24',
      publishedDate: null,
      expiryDate: null,
      author: {
        name: 'Michael Chen',
        department: 'Evaluation Committee',
        email: 'michael.chen@organization.org'
      },
      approvalWorkflow: {
        currentStage: 'draft',
        stages: [
          { stage: 'draft', status: 'in_progress', date: null, approver: 'Michael Chen' },
          { stage: 'review', status: 'pending', date: null, approver: 'Evaluation Committee' },
          { stage: 'approval', status: 'pending', date: null, approver: 'Procurement Manager' },
          { stage: 'published', status: 'pending', date: null, approver: null }
        ],
        nextAction: 'complete_draft_evaluation',
        priority: 'high'
      },
      compliance: {
        stepCompliant: false, // Still in draft
        transparencyLevel: 'confidential',
        accessLevel: 'restricted',
        retentionPeriod: '7 years',
        auditRequired: true,
        lastAuditDate: null,
        complianceScore: 0 // Not yet evaluated
      },
      versions: [
        { version: '0.8', date: '2025-12-24', author: 'Michael Chen', changes: 'Added financial evaluation and supplier comparison tables' },
        { version: '0.5', date: '2025-12-22', author: 'Michael Chen', changes: 'Technical evaluation completed for all bidders' },
        { version: '0.1', date: '2025-12-20', author: 'Michael Chen', changes: 'Initial draft with evaluation framework' }
      ],
      tags: ['evaluation', 'medical-equipment', 'confidential', 'draft'],
      downloads: 5,
      views: 18,
      attachments: [
        { name: 'Technical_Evaluation_Matrix.xlsx', size: '567 KB', type: 'Excel' },
        { name: 'Financial_Comparison.xlsx', size: '234 KB', type: 'Excel' },
        { name: 'Supplier_Documentation.zip', size: '12.4 MB', type: 'Archive' }
      ],
      permissions: {
        view: ['evaluation_committee', 'procurement_manager'],
        edit: ['evaluation_committee'],
        approve: ['procurement_manager', 'senior_management'],
        publish: ['procurement_manager']
      },
      metadata: {
        confidential: true,
        externalSharing: false,
        backupStatus: 'completed',
        lastBackup: '2025-12-24',
        checksum: 'd1e2f3g4h5i6'
      }
    },
    {
      id: 'DOC-2025-004',
      name: 'STEP Compliance Audit Report Q4 2025',
      description: 'Quarterly audit report assessing compliance with World Bank Standard Tender Evaluation Procedures (STEP) methodology across all procurement activities.',
      category: 'audit_reports',
      type: 'audit',
      status: 'approved',
      version: '1.0',
      size: '1.6 MB',
      format: 'PDF',
      procurementRef: null,
      createdDate: '2025-12-22',
      modifiedDate: '2025-12-24',
      publishedDate: '2025-12-24',
      expiryDate: null,
      author: {
        name: 'Emma Wilson',
        department: 'Compliance & Audit',
        email: 'emma.wilson@organization.org'
      },
      approvalWorkflow: {
        currentStage: 'published',
        stages: [
          { stage: 'draft', status: 'completed', date: '2025-12-22', approver: 'Emma Wilson' },
          { stage: 'review', status: 'completed', date: '2025-12-23', approver: 'Senior Auditor' },
          { stage: 'approval', status: 'completed', date: '2025-12-24', approver: 'Chief Compliance Officer' },
          { stage: 'published', status: 'completed', date: '2025-12-24', approver: 'Emma Wilson' }
        ],
        nextAction: null,
        priority: 'medium'
      },
      compliance: {
        stepCompliant: true,
        transparencyLevel: 'internal',
        accessLevel: 'management',
        retentionPeriod: '10 years',
        auditRequired: false,
        lastAuditDate: '2025-12-24',
        complianceScore: 96
      },
      versions: [
        { version: '1.0', date: '2025-12-24', author: 'Emma Wilson', changes: 'Final approved version with all recommendations' }
      ],
      tags: ['audit', 'STEP-compliance', 'quarterly-report', 'internal'],
      downloads: 12,
      views: 45,
      attachments: [
        { name: 'Compliance_Metrics.xlsx', size: '445 KB', type: 'Excel' },
        { name: 'Recommendations_Summary.pdf', size: '234 KB', type: 'PDF' }
      ],
      permissions: {
        view: ['senior_management', 'compliance_team', 'audit_team'],
        edit: ['compliance_team'],
        approve: ['chief_compliance_officer'],
        publish: ['chief_compliance_officer']
      },
      metadata: {
        confidential: true,
        externalSharing: false,
        backupStatus: 'completed',
        lastBackup: '2025-12-24',
        checksum: 'j1k2l3m4n5o6'
      }
    }
  ]);

  // Document statistics
  const stats = {
    totalDocuments: documents.length,
    publishedDocuments: documents.filter(d => d.status === 'published').length,
    draftDocuments: documents.filter(d => d.status === 'draft').length,
    underReviewDocuments: documents.filter(d => d.status === 'under_review').length,
    approvedDocuments: documents.filter(d => d.status === 'approved').length,
    stepCompliantDocuments: documents.filter(d => d.compliance.stepCompliant).length,
    totalDownloads: documents.reduce((sum, d) => sum + d.downloads, 0),
    totalViews: documents.reduce((sum, d) => sum + d.views, 0),
    averageComplianceScore: Math.round(documents.reduce((sum, d) => sum + d.compliance.complianceScore, 0) / documents.length),
    pendingApprovals: documents.filter(d => d.approvalWorkflow.currentStage !== 'published' && d.status !== 'draft').length
  };

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.author.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    const matchesType = typeFilter === 'all' || doc.type === typeFilter;
    return matchesSearch && matchesCategory && matchesStatus && matchesType;
  });

  // Configuration objects
  const statusConfig = {
    published: { label: 'Published', color: '#10b981', bg: '#d1fae5', icon: '✅' },
    approved: { label: 'Approved', color: '#3b82f6', bg: '#dbeafe', icon: '👍' },
    under_review: { label: 'Under Review', color: '#f59e0b', bg: '#fef3c7', icon: '👀' },
    draft: { label: 'Draft', color: '#6b7280', bg: '#f9fafb', icon: '📝' },
    rejected: { label: 'Rejected', color: '#ef4444', bg: '#fee2e2', icon: '❌' }
  };

  const categoryConfig = {
    procurement_notices: { label: 'Procurement Notices', icon: '📢', color: '#3b82f6' },
    guidelines: { label: 'Guidelines', icon: '📋', color: '#8b5cf6' },
    contracts: { label: 'Contracts', icon: '📄', color: '#10b981' },
    evaluations: { label: 'Evaluations', icon: '📊', color: '#f59e0b' },
    audit_reports: { label: 'Audit Reports', icon: '🔍', color: '#ef4444' },
    templates: { label: 'Templates', icon: '📑', color: '#06b6d4' }
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

  const formatFileSize = (size) => {
    if (size.includes('KB')) return size;
    if (size.includes('MB')) return size;
    return size;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getWorkflowProgress = (workflow) => {
    const completedStages = workflow.stages.filter(s => s.status === 'completed').length;
    const totalStages = workflow.stages.length;
    return Math.round((completedStages / totalStages) * 100);
  };

  const renderDocumentsTab = () => (
    <div className="documents-content">
      {/* Statistics Section */}
      <div className="stats-section">
        <h2 className="section-title">Document Management Overview</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.totalDocuments}</div>
            <div className="stat-label">Total Documents</div>
            <div className="stat-icon">📄</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.publishedDocuments}</div>
            <div className="stat-label">Published</div>
            <div className="stat-icon">✅</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.pendingApprovals}</div>
            <div className="stat-label">Pending Approvals</div>
            <div className="stat-icon">⏳</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.stepCompliantDocuments}</div>
            <div className="stat-label">STEP Compliant</div>
            <div className="stat-icon">🎯</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.totalViews}</div>
            <div className="stat-label">Total Views</div>
            <div className="stat-icon">👁️</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.averageComplianceScore}%</div>
            <div className="stat-label">Avg Compliance</div>
            <div className="stat-icon">📈</div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="search-group">
          <label>Search Documents</label>
          <input
            type="text"
            placeholder="Search by name, description, author, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-group">
          <label>Category</label>
          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Categories</option>
            <option value="procurement_notices">Procurement Notices</option>
            <option value="guidelines">Guidelines</option>
            <option value="contracts">Contracts</option>
            <option value="evaluations">Evaluations</option>
            <option value="audit_reports">Audit Reports</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Status</label>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="approved">Approved</option>
            <option value="under_review">Under Review</option>
            <option value="draft">Draft</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Type</label>
          <select 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="notice">Notice</option>
            <option value="guideline">Guideline</option>
            <option value="template">Template</option>
            <option value="evaluation">Evaluation</option>
            <option value="audit">Audit</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="table-section">
        <div className="table-header">
          <h3>Document Registry ({filteredDocuments.length})</h3>
          <div className="header-actions">
            <button 
              onClick={() => setShowUploadModal(true)}
              className="btn btn-primary"
            >
              📁 Upload Document
            </button>
            <button 
              onClick={() => setShowModal(true)}
              className="btn btn-secondary"
            >
              + New Document
            </button>
          </div>
        </div>
        
        <div className="table-container">
          <table className="documents-table">
            <thead>
              <tr>
                <th>Document Information</th>
                <th>Category & Type</th>
                <th>Status & Workflow</th>
                <th>Version & Compliance</th>
                <th>Author & Dates</th>
                <th>Activity & Analytics</th>
                <th>File Details</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <div className="document-info">
                      <div className="doc-id">{doc.id}</div>
                      <div className="doc-name">{doc.name}</div>
                      <div className="doc-description">{doc.description.substring(0, 100)}...</div>
                      {doc.procurementRef && <div className="proc-ref">Proc: {doc.procurementRef}</div>}
                    </div>
                  </td>
                  <td>
                    <div className="category-type">
                      <div 
                        className="category-badge"
                        style={{ 
                          backgroundColor: `${categoryConfig[doc.category]?.color}15`, 
                          color: categoryConfig[doc.category]?.color 
                        }}
                      >
                        <span className="category-icon">{categoryConfig[doc.category]?.icon}</span>
                        {categoryConfig[doc.category]?.label}
                      </div>
                      <div className="type-info">Type: {doc.type}</div>
                      <div className="tags-display">
                        {doc.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="tag">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="status-workflow">
                      <div className="status-display">{getStatusBadge(doc.status)}</div>
                      <div className="workflow-progress">
                        <div className="workflow-label">Workflow Progress</div>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ width: `${getWorkflowProgress(doc.approvalWorkflow)}%` }}
                          ></div>
                        </div>
                        <div className="progress-text">{getWorkflowProgress(doc.approvalWorkflow)}%</div>
                      </div>
                      <div className="current-stage">Stage: {doc.approvalWorkflow.currentStage}</div>
                    </div>
                  </td>
                  <td>
                    <div className="version-compliance">
                      <div className="version-info">
                        <span className="version-label">Version: </span>
                        <span className="version-number">{doc.version}</span>
                      </div>
                      <div className="compliance-info">
                        <div className={`step-compliance ${doc.compliance.stepCompliant ? 'compliant' : 'non-compliant'}`}>
                          {doc.compliance.stepCompliant ? '✅ STEP Compliant' : '⚠️ Non-Compliant'}
                        </div>
                        <div className="compliance-score">Score: {doc.compliance.complianceScore}%</div>
                        <div className="transparency-level">{doc.compliance.transparencyLevel}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="author-dates">
                      <div className="author-info">
                        <div className="author-name">{doc.author.name}</div>
                        <div className="author-dept">{doc.author.department}</div>
                      </div>
                      <div className="date-info">
                        <div className="created-date">Created: {formatDate(doc.createdDate)}</div>
                        <div className="modified-date">Modified: {formatDate(doc.modifiedDate)}</div>
                        {doc.publishedDate && <div className="published-date">Published: {formatDate(doc.publishedDate)}</div>}
                        {doc.expiryDate && <div className="expiry-date">Expires: {formatDate(doc.expiryDate)}</div>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="activity-analytics">
                      <div className="activity-stats">
                        <div className="stat-item">
                          <span className="stat-icon">👁️</span>
                          <span className="stat-count">{doc.views}</span>
                          <span className="stat-label">Views</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-icon">⬇️</span>
                          <span className="stat-count">{doc.downloads}</span>
                          <span className="stat-label">Downloads</span>
                        </div>
                      </div>
                      <div className="backup-info">
                        <div className="backup-status">
                          <span className="backup-icon">💾</span>
                          <span className="backup-text">Backup: {doc.metadata.backupStatus}</span>
                        </div>
                        <div className="last-backup">Last: {formatDate(doc.metadata.lastBackup)}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="file-details">
                      <div className="file-format">
                        <span className="format-badge">{doc.format}</span>
                      </div>
                      <div className="file-size">{formatFileSize(doc.size)}</div>
                      <div className="attachments-count">
                        📎 {doc.attachments.length} attachments
                      </div>
                      <div className="confidentiality">
                        {doc.metadata.confidential ? '🔒 Confidential' : '🔓 Public'}
                      </div>
                    </div>
                  </td>
                  <td className="actions-cell">
                    <div className="action-buttons">
                      <button className="action-btn" title="View Document">👁️</button>
                      <button className="action-btn" title="Download">⬇️</button>
                      <button className="action-btn" title="Edit">✏️</button>
                      <button className="action-btn" title="Version History">🕐</button>
                      <button className="action-btn" title="Share">🔗</button>
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

  const renderVersionControlTab = () => (
    <div className="version-control">
      <h2 className="section-title">Version Control & History</h2>
      <div className="version-timeline">
        {documents.flatMap(doc => 
          doc.versions.map((version, index) => ({
            ...version,
            docId: doc.id,
            docName: doc.name,
            isLatest: index === 0
          }))
        ).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20).map((version, index) => (
          <div key={`${version.docId}-${version.version}`} className="version-timeline-item">
            <div className="version-date">{formatDate(version.date)}</div>
            <div className="version-content">
              <div className="version-header">
                <span className="version-number">v{version.version}</span>
                {version.isLatest && <span className="latest-badge">Latest</span>}
              </div>
              <div className="version-document">{version.docName}</div>
              <div className="version-author">by {version.author}</div>
              <div className="version-changes">{version.changes}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderWorkflowTab = () => (
    <div className="workflow-management">
      <h2 className="section-title">Approval Workflows</h2>
      <div className="workflow-grid">
        {documents.filter(doc => doc.approvalWorkflow.currentStage !== 'published').map(doc => (
          <div key={doc.id} className="workflow-card">
            <div className="workflow-header">
              <h3>{doc.name}</h3>
              <span className={`priority-badge ${doc.approvalWorkflow.priority}`}>
                {doc.approvalWorkflow.priority} priority
              </span>
            </div>
            <div className="workflow-stages">
              {doc.approvalWorkflow.stages.map((stage, index) => (
                <div key={index} className={`workflow-stage ${stage.status}`}>
                  <div className="stage-name">{stage.stage}</div>
                  <div className="stage-status">{stage.status}</div>
                  {stage.approver && <div className="stage-approver">{stage.approver}</div>}
                  {stage.date && <div className="stage-date">{formatDate(stage.date)}</div>}
                </div>
              ))}
            </div>
            {doc.approvalWorkflow.nextAction && (
              <div className="next-action">
                <strong>Next Action:</strong> {doc.approvalWorkflow.nextAction}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <StandardLayout title="Document Management">
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">
            <span className="title-icon">📄</span>
            Document Management System
          </h1>
          <p className="page-subtitle">
            Comprehensive document management with version control, approval workflows, and STEP compliance
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${activeView === 'documents' ? 'active' : ''}`}
            onClick={() => setActiveView('documents')}
          >
            📄 Documents
          </button>
          <button 
            className={`nav-tab ${activeView === 'versions' ? 'active' : ''}`}
            onClick={() => setActiveView('versions')}
          >
            🕐 Version Control
          </button>
          <button 
            className={`nav-tab ${activeView === 'workflow' ? 'active' : ''}`}
            onClick={() => setActiveView('workflow')}
          >
            ⚡ Workflows
          </button>
          <button 
            className={`nav-tab ${activeView === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveView('analytics')}
          >
            📊 Analytics
          </button>
        </div>

        {/* Content based on active view */}
        {activeView === 'documents' && renderDocumentsTab()}
        {activeView === 'versions' && renderVersionControlTab()}
        {activeView === 'workflow' && renderWorkflowTab()}
        {activeView === 'analytics' && (
          <div className="coming-soon">
            <h2>Document Analytics</h2>
            <p>Advanced analytics and reporting tools coming soon...</p>
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h3>Upload Document</h3>
              <p>Document upload functionality coming soon...</p>
              <button onClick={() => setShowUploadModal(false)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        )}

        {/* New Document Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h3>Create New Document</h3>
              <p>Document creation form coming soon...</p>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </StandardLayout>
  );
};

export default DocumentsPage;
