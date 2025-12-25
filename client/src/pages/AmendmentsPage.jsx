// AmendmentsPage.jsx
import React, { useState } from 'react';
import StandardLayout from '../components/layout/StandardLayout';
import './pages.css';

/**
 * Amendments Page - Contract & Procurement Amendment Management
 * Manages all contract amendments, variations, and modifications in the STEP system
 * Tracks amendment history, approvals, and financial impacts
 */
export default function AmendmentsPage() {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewAmendment, setShowNewAmendment] = useState(false);

  // Amendment Types
  const amendmentTypes = [
    { id: 'contract_extension', name: 'Contract Extension', icon: '📅', color: '#3498db' },
    { id: 'scope_variation', name: 'Scope Variation', icon: '🔄', color: '#9b59b6' },
    { id: 'price_adjustment', name: 'Price Adjustment', icon: '💰', color: '#f39c12' },
    { id: 'technical_modification', name: 'Technical Modification', icon: '⚙️', color: '#e74c3c' },
    { id: 'delivery_change', name: 'Delivery Change', icon: '🚚', color: '#2ecc71' },
    { id: 'other', name: 'Other Amendment', icon: '📝', color: '#95a5a6' }
  ];

  // Amendment Status Options
  const statusOptions = [
    { value: 'draft', label: 'Draft', color: '#95a5a6' },
    { value: 'submitted', label: 'Submitted', color: '#3498db' },
    { value: 'under_review', label: 'Under Review', color: '#f39c12' },
    { value: 'bank_review', label: 'Bank Review', color: '#e67e22' },
    { value: 'approved', label: 'Approved', color: '#2ecc71' },
    { value: 'rejected', label: 'Rejected', color: '#e74c3c' },
    { value: 'implemented', label: 'Implemented', color: '#27ae60' }
  ];

  // Sample Amendments Data
  const amendments = [
    {
      id: 1,
      ref: 'AMD-OUL-10X-GO-2025-042-001',
      contractRef: 'OUL-10X-GO-2025-042',
      contractTitle: 'Office Equipment & Furniture Supply',
      type: 'contract_extension',
      description: 'Extension of delivery period due to supplier manufacturing delays',
      requestedBy: 'John Smith',
      requestDate: '2025-12-20',
      status: 'under_review',
      priority: 'medium',
      financialImpact: '$0.00',
      timeExtension: '30 days',
      originalValue: '$125,000.00',
      amendedValue: '$125,000.00',
      justification: 'Supplier requested extension due to raw material shortages affecting manufacturing schedule.',
      documents: ['Amendment Request Form', 'Supplier Justification Letter', 'Revised Delivery Schedule'],
      reviewHistory: [
        { date: '2025-12-20', action: 'Submitted', by: 'John Smith', notes: 'Initial amendment request' },
        { date: '2025-12-21', action: 'Technical Review', by: 'Sarah Johnson', notes: 'Technical feasibility confirmed' }
      ]
    },
    {
      id: 2,
      ref: 'AMD-OUL-10X-CONS-2025-034-001',
      contractRef: 'OUL-10X-CONS-2025-034',
      contractTitle: 'Inclusion & Accessibility Consultancy',
      type: 'scope_variation',
      description: 'Additional accessibility audit for 5 more facilities',
      requestedBy: 'Maria Garcia',
      requestDate: '2025-12-18',
      status: 'approved',
      priority: 'high',
      financialImpact: '+$25,000.00',
      timeExtension: '15 days',
      originalValue: '$75,000.00',
      amendedValue: '$100,000.00',
      justification: 'Project scope expansion requested by beneficiary to include additional facilities identified during initial assessment.',
      documents: ['Scope Variation Request', 'Cost Analysis', 'Beneficiary Authorization'],
      reviewHistory: [
        { date: '2025-12-18', action: 'Submitted', by: 'Maria Garcia', notes: 'Scope expansion request' },
        { date: '2025-12-19', action: 'Approved', by: 'David Wilson', notes: 'Budget allocation confirmed' }
      ]
    },
    {
      id: 3,
      ref: 'AMD-OUL-10X-CW-2025-029-001',
      contractRef: 'OUL-10X-CW-2025-029',
      contractTitle: 'Training Center Renovations',
      type: 'technical_modification',
      description: 'Change from standard flooring to specialized rubber flooring for safety',
      requestedBy: 'Ahmed Hassan',
      requestDate: '2025-12-15',
      status: 'bank_review',
      priority: 'high',
      financialImpact: '+$15,750.00',
      timeExtension: '0 days',
      originalValue: '$180,000.00',
      amendedValue: '$195,750.00',
      justification: 'Safety assessment recommended specialized flooring for training activities involving physical exercises.',
      documents: ['Technical Specification Change', 'Safety Assessment Report', 'Cost Impact Analysis'],
      reviewHistory: [
        { date: '2025-12-15', action: 'Submitted', by: 'Ahmed Hassan', notes: 'Technical modification request' },
        { date: '2025-12-16', action: 'Internal Review', by: 'Technical Team', notes: 'Specification validated' },
        { date: '2025-12-17', action: 'Sent to Bank', by: 'Procurement Unit', notes: 'Prior review required for cost increase' }
      ]
    },
    {
      id: 4,
      ref: 'AMD-OUL-10X-GO-2025-038-001',
      contractRef: 'OUL-10X-GO-2025-038',
      contractTitle: 'Digital Learning Devices (200 units)',
      type: 'price_adjustment',
      description: 'Price reduction due to bulk discount negotiation',
      requestedBy: 'Lisa Chen',
      requestDate: '2025-12-10',
      status: 'implemented',
      priority: 'medium',
      financialImpact: '-$8,500.00',
      timeExtension: '0 days',
      originalValue: '$95,000.00',
      amendedValue: '$86,500.00',
      justification: 'Contractor offered additional bulk discount for early payment and simplified delivery schedule.',
      documents: ['Price Negotiation Record', 'Contractor Offer Letter', 'Savings Certification'],
      reviewHistory: [
        { date: '2025-12-10', action: 'Submitted', by: 'Lisa Chen', notes: 'Price reduction amendment' },
        { date: '2025-12-11', action: 'Approved', by: 'Finance Team', notes: 'Budget savings confirmed' },
        { date: '2025-12-12', action: 'Implemented', by: 'Contract Admin', notes: 'Contract updated and signed' }
      ]
    },
    {
      id: 5,
      ref: 'AMD-OUL-10X-CONS-2025-031-001',
      contractRef: 'OUL-10X-CONS-2025-031',
      contractTitle: 'M&E Specialist - Individual Consultant',
      type: 'delivery_change',
      description: 'Change of reporting schedule from monthly to bi-weekly',
      requestedBy: 'Robert Taylor',
      requestDate: '2025-12-05',
      status: 'draft',
      priority: 'low',
      financialImpact: '$0.00',
      timeExtension: '0 days',
      originalValue: '$45,000.00',
      amendedValue: '$45,000.00',
      justification: 'Project management requires more frequent progress reporting for better coordination.',
      documents: ['Reporting Schedule Revision', 'Project Management Request'],
      reviewHistory: [
        { date: '2025-12-05', action: 'Created', by: 'Robert Taylor', notes: 'Draft amendment created' }
      ]
    }
  ];

  // Filter amendments
  const filteredAmendments = amendments.filter(amendment => {
    const matchesFilter = selectedFilter === 'all' || amendment.status === selectedFilter;
    const matchesSearch = amendment.ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         amendment.contractTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         amendment.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Summary Statistics
  const stats = [
    {
      label: 'Total Amendments',
      value: amendments.length.toString(),
      change: '+2 this month',
      icon: '📋',
      color: '#3498db'
    },
    {
      label: 'Pending Review',
      value: amendments.filter(a => ['submitted', 'under_review', 'bank_review'].includes(a.status)).length.toString(),
      change: '3 require action',
      icon: '⏳',
      color: '#f39c12'
    },
    {
      label: 'Total Financial Impact',
      value: `$${amendments.reduce((total, a) => {
        const impact = parseFloat(a.financialImpact.replace(/[+$,]/g, '').replace('-', '-'));
        return total + impact;
      }, 0).toLocaleString()}`,
      change: 'Net savings $32,250',
      icon: '💰',
      color: '#2ecc71'
    },
    {
      label: 'Avg. Processing Time',
      value: '4.2 days',
      change: '12% improvement',
      icon: '⚡',
      color: '#9b59b6'
    }
  ];

  // Header Actions
  const headerActions = [
    { label: '+ New Amendment', variant: 'primary', onClick: () => setShowNewAmendment(true) },
    { label: '📊 Amendment Report', variant: 'secondary', onClick: () => console.log('Amendment Report') },
    { label: '📤 Export Data', variant: 'secondary', onClick: () => console.log('Export Data') }
  ];

  // Get status badge style
  const getStatusBadge = (status) => {
    const statusObj = statusOptions.find(s => s.value === status);
    return statusObj ? { color: statusObj.color, label: statusObj.label } : { color: '#95a5a6', label: status };
  };

  // Get amendment type
  const getAmendmentType = (typeId) => {
    return amendmentTypes.find(t => t.id === typeId) || amendmentTypes[amendmentTypes.length - 1];
  };

  return (
    <StandardLayout
      title="📝 Contract Amendments"
      description="Manage contract amendments, variations, and modifications"
      headerActions={headerActions}
    >
      {/* Statistics Grid */}
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: stat.color + '20', color: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-content">
              <p className="stat-label">{stat.label}</p>
              <p className="stat-value">{stat.value}</p>
              <p style={{margin: '0.3rem 0 0 0', fontSize: '0.8rem', color: '#666'}}>{stat.change}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters and Search */}
      <div className="page-header">
        <div className="filters-section">
          <div className="filter-group">
            <label>Filter by Status:</label>
            <select 
              value={selectedFilter} 
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Amendments</option>
              {statusOptions.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>
          <div className="search-group">
            <label>Search:</label>
            <input
              type="text"
              placeholder="Search amendments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
      </div>

      {/* Amendments List */}
      <div className="table-container">
        <table className="data-table amendments-table">
          <thead>
            <tr>
              <th>Amendment Ref</th>
              <th>Contract</th>
              <th>Type</th>
              <th>Description</th>
              <th>Financial Impact</th>
              <th>Status</th>
              <th>Requested Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAmendments.map((amendment) => {
              const type = getAmendmentType(amendment.type);
              const status = getStatusBadge(amendment.status);
              return (
                <tr key={amendment.id}>
                  <td className="ref-number">{amendment.ref}</td>
                  <td className="contract-info">
                    <div className="contract-ref">{amendment.contractRef}</div>
                    <div className="contract-title">{amendment.contractTitle}</div>
                  </td>
                  <td>
                    <div className="type-badge" style={{ backgroundColor: type.color + '20', color: type.color }}>
                      <span className="type-icon">{type.icon}</span>
                      <span className="type-name">{type.name}</span>
                    </div>
                  </td>
                  <td className="description-cell">
                    <div className="amendment-description">{amendment.description}</div>
                    <div className="requested-by">Requested by: {amendment.requestedBy}</div>
                  </td>
                  <td className="financial-impact">
                    <span className={`impact-amount ${amendment.financialImpact.includes('-') ? 'negative' : 'positive'}`}>
                      {amendment.financialImpact}
                    </span>
                    {amendment.timeExtension !== '0 days' && (
                      <div className="time-extension">+{amendment.timeExtension}</div>
                    )}
                  </td>
                  <td>
                    <span className="status-badge" style={{ backgroundColor: status.color + '20', color: status.color }}>
                      {status.label}
                    </span>
                    <div className={`priority-indicator priority-${amendment.priority}`}>
                      {amendment.priority}
                    </div>
                  </td>
                  <td className="date-cell">{amendment.requestDate}</td>
                  <td className="actions-cell">
                    <button className="action-btn view-btn" title="View Details">👁️</button>
                    <button className="action-btn edit-btn" title="Edit Amendment">✏️</button>
                    <button className="action-btn docs-btn" title="Documents">📄</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Amendment Types Quick Reference */}
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="card-header">
            <h2>📊 Amendment Types Distribution</h2>
            <span className="card-subtitle">Current amendment breakdown</span>
          </div>
          <div className="amendment-types-chart">
            {amendmentTypes.map((type, index) => {
              const count = amendments.filter(a => a.type === type.id).length;
              const percentage = amendments.length > 0 ? (count / amendments.length) * 100 : 0;
              return (
                <div key={type.id} className="type-chart-item">
                  <div className="type-info">
                    <span className="type-icon" style={{ color: type.color }}>{type.icon}</span>
                    <span className="type-label">{type.name}</span>
                  </div>
                  <div className="type-metrics">
                    <span className="type-count">{count}</span>
                    <div className="type-bar">
                      <div 
                        className="type-bar-fill" 
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: type.color 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h2>🔄 Recent Activity</h2>
            <span className="card-subtitle">Latest amendment actions</span>
          </div>
          <div className="activity-timeline">
            {amendments.slice(0, 5).map((amendment, index) => {
              const lastAction = amendment.reviewHistory[amendment.reviewHistory.length - 1];
              const type = getAmendmentType(amendment.type);
              return (
                <div key={amendment.id} className="timeline-item">
                  <div className="timeline-icon" style={{ backgroundColor: type.color }}>
                    {type.icon}
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-title">{amendment.ref}</div>
                    <div className="timeline-description">{lastAction.action}: {lastAction.notes}</div>
                    <div className="timeline-meta">
                      <span>{lastAction.by}</span> • <span>{lastAction.date}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h3>Quick Actions</h3>
        <div className="quick-actions-grid">
          <button className="quick-action-card" onClick={() => setShowNewAmendment(true)}>
            <span className="action-icon">➕</span>
            <span className="action-title">Create Amendment</span>
            <span className="action-desc">Start new contract amendment</span>
          </button>
          <button className="quick-action-card">
            <span className="action-icon">📋</span>
            <span className="action-title">Amendment Templates</span>
            <span className="action-desc">Use pre-defined templates</span>
          </button>
          <button className="quick-action-card">
            <span className="action-icon">📊</span>
            <span className="action-title">Analytics Dashboard</span>
            <span className="action-desc">View amendment trends</span>
          </button>
          <button className="quick-action-card">
            <span className="action-icon">📤</span>
            <span className="action-title">Bulk Export</span>
            <span className="action-desc">Export amendment data</span>
          </button>
        </div>
      </div>

      {/* New Amendment Modal would go here */}
      {showNewAmendment && (
        <div className="modal-overlay" onClick={() => setShowNewAmendment(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Amendment</h2>
            <p>Amendment creation form would be implemented here...</p>
            <button onClick={() => setShowNewAmendment(false)}>Close</button>
          </div>
        </div>
      )}
    </StandardLayout>
  );
}
