import React, { useState, useEffect } from 'react';
import StandardLayout from '../components/layout/StandardLayout';
import './pages.css';

export default function AwardPage() {
  const [activeView, setActiveView] = useState('awards');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [valueFilter, setValueFilter] = useState('all');
  const [selectedAward, setSelectedAward] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [awardNotes, setAwardNotes] = useState('');

  // Comprehensive award data - STEP methodology compliant
  const [awards] = useState([
    {
      id: 'AWARD-2025-001',
      procurementRef: 'PROC-2025-001',
      title: 'Road Infrastructure Rehabilitation Project - Phase 1',
      awardType: 'Goods & Works',
      status: 'awarded',
      awardDate: '2025-12-20',
      effectiveDate: '2025-12-25',
      contractRef: 'CONTRACT-2025-001',
      winningBidder: {
        name: 'ABC Construction Ltd.',
        representative: 'John Smith',
        email: 'john.smith@abcconstruction.com',
        phone: '+1-555-0123',
        address: '123 Industrial Ave, Metro City',
        registrationNumber: 'REG-12345',
        taxId: 'TAX-98765'
      },
      awardValue: 2500000,
      originalBudget: 2800000,
      savings: 300000,
      savingsPercentage: 10.7,
      contractDuration: '18 months',
      completionDate: '2026-06-20',
      noObjectionDate: '2025-12-18',
      publicationDate: '2025-12-22',
      evaluationScore: 92.5,
      technicalScore: 89,
      financialScore: 96,
      totalBidders: 8,
      qualifiedBidders: 5,
      awardCriteria: 'Lowest Evaluated Substantially Responsive Bid (LESRB)',
      riskLevel: 'medium',
      paymentTerms: '30% advance, 70% on completion',
      performanceBond: '10% of contract value',
      warrantyPeriod: '24 months',
      liquidatedDamages: '0.5% per week delay',
      awardedBy: 'Maria Garcia',
      approvedBy: 'Director General',
      noObjectionRequired: true,
      noObjectionStatus: 'obtained'
    },
    {
      id: 'AWARD-2025-002',
      procurementRef: 'PROC-2024-089',
      title: 'Medical Equipment Procurement',
      awardType: 'Goods',
      status: 'pending_signature',
      awardDate: '2025-12-18',
      effectiveDate: null,
      contractRef: 'CONTRACT-2025-002',
      winningBidder: {
        name: 'MedTech Solutions Inc.',
        representative: 'Sarah Johnson',
        email: 'sarah.j@medtechsolutions.com',
        phone: '+1-555-0456',
        address: '456 Health Plaza, Medical District',
        registrationNumber: 'REG-67890',
        taxId: 'TAX-54321'
      },
      awardValue: 850000,
      originalBudget: 900000,
      savings: 50000,
      savingsPercentage: 5.6,
      contractDuration: '12 months',
      completionDate: '2025-12-18',
      noObjectionDate: '2025-12-15',
      publicationDate: null,
      evaluationScore: 88.3,
      technicalScore: 91,
      financialScore: 85,
      totalBidders: 6,
      qualifiedBidders: 4,
      awardCriteria: 'Quality and Cost Based Selection (QCBS)',
      riskLevel: 'low',
      paymentTerms: '20% advance, 80% on delivery',
      performanceBond: '5% of contract value',
      warrantyPeriod: '36 months',
      liquidatedDamages: '1% per week delay',
      awardedBy: 'David Chen',
      approvedBy: 'Finance Director',
      noObjectionRequired: false,
      noObjectionStatus: 'not_required'
    },
    {
      id: 'AWARD-2025-003',
      procurementRef: 'PROC-2025-003',
      title: 'IT Infrastructure Upgrade',
      awardType: 'Services',
      status: 'no_objection_pending',
      awardDate: '2025-12-22',
      effectiveDate: null,
      contractRef: 'CONTRACT-2025-003',
      winningBidder: {
        name: 'TechCore Systems',
        representative: 'Mike Wilson',
        email: 'mike.w@techcoresystems.com',
        phone: '+1-555-0789',
        address: '789 Technology Blvd, Innovation Park',
        registrationNumber: 'REG-11111',
        taxId: 'TAX-22222'
      },
      awardValue: 450000,
      originalBudget: 500000,
      savings: 50000,
      savingsPercentage: 10.0,
      contractDuration: '8 months',
      completionDate: '2026-08-22',
      noObjectionDate: null,
      publicationDate: null,
      evaluationScore: 94.2,
      technicalScore: 96,
      financialScore: 92,
      totalBidders: 5,
      qualifiedBidders: 3,
      awardCriteria: 'Technical and Financial Proposals (TFP)',
      riskLevel: 'low',
      paymentTerms: 'Monthly invoicing based on deliverables',
      performanceBond: '10% of contract value',
      warrantyPeriod: '12 months',
      liquidatedDamages: '0.25% per day delay',
      awardedBy: 'Lisa Brown',
      approvedBy: 'IT Director',
      noObjectionRequired: true,
      noObjectionStatus: 'pending'
    },
    {
      id: 'AWARD-2025-004',
      procurementRef: 'PROC-2024-078',
      title: 'Construction Materials Supply',
      awardType: 'Goods',
      status: 'cancelled',
      awardDate: null,
      effectiveDate: null,
      contractRef: null,
      winningBidder: null,
      awardValue: 0,
      originalBudget: 1200000,
      savings: 0,
      savingsPercentage: 0,
      contractDuration: null,
      completionDate: null,
      noObjectionDate: null,
      publicationDate: null,
      evaluationScore: null,
      technicalScore: null,
      financialScore: null,
      totalBidders: 4,
      qualifiedBidders: 2,
      awardCriteria: 'Lowest Price Selection (LPS)',
      riskLevel: 'high',
      paymentTerms: null,
      performanceBond: null,
      warrantyPeriod: null,
      liquidatedDamages: null,
      awardedBy: null,
      approvedBy: null,
      noObjectionRequired: true,
      noObjectionStatus: 'not_applicable',
      cancellationReason: 'Insufficient responsive bids - re-tendering required'
    },
    {
      id: 'AWARD-2025-005',
      procurementRef: 'PROC-2025-004',
      title: 'Consultant Services Agreement',
      awardType: 'Consulting Services',
      status: 'draft',
      awardDate: null,
      effectiveDate: null,
      contractRef: null,
      winningBidder: {
        name: 'Global Advisory Partners',
        representative: 'Amanda White',
        email: 'amanda.white@globaladvisory.com',
        phone: '+1-555-0321',
        address: '321 Consulting Row, Business District',
        registrationNumber: 'REG-33333',
        taxId: 'TAX-44444'
      },
      awardValue: 320000,
      originalBudget: 350000,
      savings: 30000,
      savingsPercentage: 8.6,
      contractDuration: '6 months',
      completionDate: '2026-06-25',
      noObjectionDate: null,
      publicationDate: null,
      evaluationScore: 91.8,
      technicalScore: 94,
      financialScore: 89,
      totalBidders: 7,
      qualifiedBidders: 5,
      awardCriteria: 'Consultants Qualification Selection (CQS)',
      riskLevel: 'low',
      paymentTerms: 'Monthly payments based on deliverables',
      performanceBond: 'Not required',
      warrantyPeriod: 'Not applicable',
      liquidatedDamages: 'Professional indemnity insurance required',
      awardedBy: 'Robert Davis',
      approvedBy: 'Pending',
      noObjectionRequired: false,
      noObjectionStatus: 'not_required'
    }
  ]);

  // Award statistics
  const stats = {
    totalAwards: awards.length,
    awardedContracts: awards.filter(a => a.status === 'awarded').length,
    pendingAwards: awards.filter(a => a.status === 'pending_signature' || a.status === 'no_objection_pending').length,
    totalValue: awards.reduce((sum, a) => sum + a.awardValue, 0),
    totalSavings: awards.reduce((sum, a) => sum + a.savings, 0),
    avgSavingsPercentage: awards.length > 0 ? 
      (awards.reduce((sum, a) => sum + a.savingsPercentage, 0) / awards.filter(a => a.savingsPercentage > 0).length).toFixed(1) : 0,
    avgProcessingTime: '12.4 days',
    noObjectionPending: awards.filter(a => a.noObjectionStatus === 'pending').length
  };

  // Filter awards
  const filteredAwards = awards.filter(award => {
    const matchesSearch = award.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         award.procurementRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (award.winningBidder && award.winningBidder.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || award.status === statusFilter;
    const matchesValue = valueFilter === 'all' || 
      (valueFilter === 'under_500k' && award.awardValue < 500000) ||
      (valueFilter === '500k_1m' && award.awardValue >= 500000 && award.awardValue < 1000000) ||
      (valueFilter === 'over_1m' && award.awardValue >= 1000000);
    return matchesSearch && matchesStatus && matchesValue;
  });

  // Status configurations
  const statusConfig = {
    draft: { label: 'Draft', color: '#6b7280', bg: '#f9fafb', icon: '📝' },
    no_objection_pending: { label: 'No Objection Pending', color: '#f59e0b', bg: '#fef3c7', icon: '⏳' },
    pending_signature: { label: 'Pending Signature', color: '#3b82f6', bg: '#dbeafe', icon: '✍️' },
    awarded: { label: 'Awarded', color: '#10b981', bg: '#d1fae5', icon: '🏆' },
    cancelled: { label: 'Cancelled', color: '#ef4444', bg: '#fee2e2', icon: '❌' }
  };

  // Award type configurations
  const awardTypeConfig = {
    'Goods': { icon: '📦', color: '#3b82f6' },
    'Works': { icon: '🏗️', color: '#10b981' },
    'Goods & Works': { icon: '🏭', color: '#8b5cf6' },
    'Services': { icon: '⚙️', color: '#f59e0b' },
    'Consulting Services': { icon: '💼', color: '#06b6d4' }
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
    const riskConfig = {
      low: { label: 'Low Risk', color: '#10b981', bg: '#d1fae5', icon: '🟢' },
      medium: { label: 'Medium Risk', color: '#f59e0b', bg: '#fef3c7', icon: '🟡' },
      high: { label: 'High Risk', color: '#ef4444', bg: '#fee2e2', icon: '🔴' }
    };
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

  const renderAwardsTab = () => (
    <div className="awards-content">
      {/* Statistics Section */}
      <div className="stats-section">
        <h2 className="section-title">Award Overview</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.totalAwards}</div>
            <div className="stat-label">Total Awards</div>
            <div className="stat-icon">🏆</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.awardedContracts}</div>
            <div className="stat-label">Awarded Contracts</div>
            <div className="stat-icon">✅</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.pendingAwards}</div>
            <div className="stat-label">Pending Awards</div>
            <div className="stat-icon">⏳</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatCurrency(stats.totalValue)}</div>
            <div className="stat-label">Total Value</div>
            <div className="stat-icon">💰</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatCurrency(stats.totalSavings)}</div>
            <div className="stat-label">Total Savings</div>
            <div className="stat-icon">💵</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.avgSavingsPercentage}%</div>
            <div className="stat-label">Avg. Savings</div>
            <div className="stat-icon">📈</div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="search-group">
          <label>Search Awards</label>
          <input
            type="text"
            placeholder="Search by title, reference, or supplier..."
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
            <option value="no_objection_pending">No Objection Pending</option>
            <option value="pending_signature">Pending Signature</option>
            <option value="awarded">Awarded</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Contract Value</label>
          <select 
            value={valueFilter} 
            onChange={(e) => setValueFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Values</option>
            <option value="under_500k">Under $500K</option>
            <option value="500k_1m">$500K - $1M</option>
            <option value="over_1m">Over $1M</option>
          </select>
        </div>
      </div>

      {/* Awards Table */}
      <div className="table-section">
        <div className="table-header">
          <h3>Award Records ({filteredAwards.length})</h3>
          <button 
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
          >
            + New Award Decision
          </button>
        </div>
        
        <div className="table-container">
          <table className="awards-table">
            <thead>
              <tr>
                <th>Procurement Details</th>
                <th>Type</th>
                <th>Winning Supplier</th>
                <th>Award Value</th>
                <th>Status</th>
                <th>Savings</th>
                <th>Risk Level</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAwards.map((award) => (
                <tr key={award.id}>
                  <td>
                    <div className="award-info">
                      <div className="award-ref">{award.procurementRef}</div>
                      <div className="award-title">{award.title}</div>
                      <div className="award-meta">
                        {award.contractRef ? `Contract: ${award.contractRef}` : 'Contract pending'}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div 
                      className="type-badge"
                      style={{ 
                        backgroundColor: `${awardTypeConfig[award.awardType]?.color}15`, 
                        color: awardTypeConfig[award.awardType]?.color 
                      }}
                    >
                      <span className="type-icon">{awardTypeConfig[award.awardType]?.icon}</span>
                      {award.awardType}
                    </div>
                  </td>
                  <td>
                    <div className="supplier-info">
                      {award.winningBidder ? (
                        <>
                          <div className="supplier-name">{award.winningBidder.name}</div>
                          <div className="supplier-contact">{award.winningBidder.representative}</div>
                          <div className="supplier-details">Score: {award.evaluationScore}%</div>
                        </>
                      ) : (
                        <div className="no-supplier">
                          {award.status === 'cancelled' ? 'Cancelled' : 'TBD'}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="value-cell">
                    <div className="award-value">{formatCurrency(award.awardValue)}</div>
                    <div className="budget-info">Budget: {formatCurrency(award.originalBudget)}</div>
                    <div className="contract-duration">{award.contractDuration || 'TBD'}</div>
                  </td>
                  <td>{getStatusBadge(award.status)}</td>
                  <td className="savings-cell">
                    {award.savings > 0 ? (
                      <>
                        <div className="savings-amount" style={{color: '#10b981', fontWeight: 'bold'}}>
                          {formatCurrency(award.savings)}
                        </div>
                        <div className="savings-percentage">
                          ({award.savingsPercentage}% saved)
                        </div>
                      </>
                    ) : (
                      <div className="no-savings">No savings</div>
                    )}
                  </td>
                  <td>{getRiskBadge(award.riskLevel)}</td>
                  <td className="actions-cell">
                    <div className="action-buttons">
                      <button className="action-btn" title="View Details">👁️</button>
                      <button className="action-btn" title="Edit Award">✏️</button>
                      <button className="action-btn" title="Contract">📄</button>
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

  const renderAnalyticsTab = () => (
    <div className="analytics-section">
      <h2 className="section-title">Award Analytics</h2>
      <div className="analytics-grid">
        <div className="analytics-card">
          <h3>Award Types Distribution</h3>
          <div className="chart-placeholder">
            <div className="chart-item">
              <span>📦 Goods</span>
              <span>40%</span>
            </div>
            <div className="chart-item">
              <span>🏗️ Works</span>
              <span>25%</span>
            </div>
            <div className="chart-item">
              <span>⚙️ Services</span>
              <span>20%</span>
            </div>
            <div className="chart-item">
              <span>💼 Consulting</span>
              <span>15%</span>
            </div>
          </div>
        </div>
        
        <div className="analytics-card">
          <h3>Savings Performance</h3>
          <div className="savings-metrics">
            <div className="metric">
              <span className="metric-label">Total Savings</span>
              <span className="metric-value">{formatCurrency(stats.totalSavings)}</span>
            </div>
            <div className="metric">
              <span className="metric-label">Average Savings %</span>
              <span className="metric-value">{stats.avgSavingsPercentage}%</span>
            </div>
            <div className="metric">
              <span className="metric-label">Best Performance</span>
              <span className="metric-value">10.7%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <StandardLayout title="Award Management">
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">
            <span className="title-icon">🏆</span>
            Award Management
          </h1>
          <p className="page-subtitle">
            Manage contract awards and supplier selections following STEP methodology
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${activeView === 'awards' ? 'active' : ''}`}
            onClick={() => setActiveView('awards')}
          >
            🏆 Award Records
          </button>
          <button 
            className={`nav-tab ${activeView === 'pipeline' ? 'active' : ''}`}
            onClick={() => setActiveView('pipeline')}
          >
            📋 Award Pipeline
          </button>
          <button 
            className={`nav-tab ${activeView === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveView('analytics')}
          >
            📊 Analytics
          </button>
          <button 
            className={`nav-tab ${activeView === 'compliance' ? 'active' : ''}`}
            onClick={() => setActiveView('compliance')}
          >
            ✅ Compliance
          </button>
        </div>

        {/* Content based on active view */}
        {activeView === 'awards' && renderAwardsTab()}
        {activeView === 'pipeline' && (
          <div className="coming-soon">
            <h2>Award Pipeline</h2>
            <p>Upcoming award decisions and timeline tracking coming soon...</p>
          </div>
        )}
        {activeView === 'analytics' && renderAnalyticsTab()}
        {activeView === 'compliance' && (
          <div className="coming-soon">
            <h2>Award Compliance</h2>
            <p>STEP compliance monitoring and reporting coming soon...</p>
          </div>
        )}

        {/* Modal for new award */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h3>New Award Decision</h3>
              <p>Award decision form coming soon...</p>
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

