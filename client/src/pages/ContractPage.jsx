import React, { useState, useEffect } from 'react';
import StandardLayout from '../components/layout/StandardLayout';
import './pages.css';

export default function ContractPage() {
  const [activeView, setActiveView] = useState('contracts');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [expiryFilter, setExpiryFilter] = useState('all');
  const [selectedContract, setSelectedContract] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Comprehensive contract data - STEP methodology compliant
  const [contracts] = useState([
    {
      id: 'CONTRACT-2025-001',
      procurementRef: 'PROC-2025-001',
      awardRef: 'AWARD-2025-001',
      title: 'Road Infrastructure Rehabilitation Project - Phase 1',
      contractType: 'Goods & Works',
      status: 'active',
      supplier: {
        name: 'ABC Construction Ltd.',
        representative: 'John Smith',
        email: 'john.smith@abcconstruction.com',
        phone: '+1-555-0123',
        registrationNumber: 'REG-12345',
        address: '123 Industrial Ave, Metro City'
      },
      financials: {
        contractValue: 2500000,
        paidAmount: 750000,
        remainingAmount: 1750000,
        currency: 'USD',
        advancePayment: 750000,
        retentionAmount: 125000,
        performanceBond: 250000
      },
      timeline: {
        signedDate: '2025-12-25',
        effectiveDate: '2025-12-25',
        completionDate: '2026-06-25',
        expiryDate: '2026-08-25',
        daysRemaining: 183,
        duration: '6 months',
        extensionRequests: 0
      },
      performance: {
        progressPercentage: 30,
        performanceRating: 'satisfactory',
        milestonesCompleted: 3,
        totalMilestones: 10,
        delayDays: 0,
        qualityScore: 85
      },
      compliance: {
        insuranceCurrent: true,
        bondsActive: true,
        licensesValid: true,
        taxCompliant: true,
        environmentalCompliant: true,
        safetyCompliant: true
      },
      documents: {
        signedContract: { uploaded: true, version: '1.0', date: '2025-12-25' },
        amendments: { count: 0, lastAmendment: null },
        invoices: { count: 3, totalAmount: 750000 },
        deliveryNotes: { count: 8, lastDelivery: '2025-12-20' },
        warranties: { count: 1, validUntil: '2028-06-25' }
      },
      risks: {
        level: 'medium',
        financialRisk: 'low',
        performanceRisk: 'medium',
        complianceRisk: 'low',
        lastAssessment: '2025-12-20'
      }
    },
    {
      id: 'CONTRACT-2025-002',
      procurementRef: 'PROC-2024-089',
      awardRef: 'AWARD-2025-002',
      title: 'Medical Equipment Procurement',
      contractType: 'Goods',
      status: 'pending_signature',
      supplier: {
        name: 'MedTech Solutions Inc.',
        representative: 'Sarah Johnson',
        email: 'sarah.j@medtechsolutions.com',
        phone: '+1-555-0456',
        registrationNumber: 'REG-67890',
        address: '456 Health Plaza, Medical District'
      },
      financials: {
        contractValue: 850000,
        paidAmount: 0,
        remainingAmount: 850000,
        currency: 'USD',
        advancePayment: 170000,
        retentionAmount: 42500,
        performanceBond: 42500
      },
      timeline: {
        signedDate: null,
        effectiveDate: null,
        completionDate: '2026-12-18',
        expiryDate: '2027-12-18',
        daysRemaining: null,
        duration: '12 months',
        extensionRequests: 0
      },
      performance: {
        progressPercentage: 0,
        performanceRating: null,
        milestonesCompleted: 0,
        totalMilestones: 6,
        delayDays: 0,
        qualityScore: null
      },
      compliance: {
        insuranceCurrent: false,
        bondsActive: false,
        licensesValid: true,
        taxCompliant: true,
        environmentalCompliant: true,
        safetyCompliant: true
      },
      documents: {
        signedContract: { uploaded: false, version: null, date: null },
        amendments: { count: 0, lastAmendment: null },
        invoices: { count: 0, totalAmount: 0 },
        deliveryNotes: { count: 0, lastDelivery: null },
        warranties: { count: 0, validUntil: null }
      },
      risks: {
        level: 'low',
        financialRisk: 'low',
        performanceRisk: 'low',
        complianceRisk: 'medium',
        lastAssessment: '2025-12-18'
      }
    },
    {
      id: 'CONTRACT-2025-003',
      procurementRef: 'PROC-2025-003',
      awardRef: 'AWARD-2025-003',
      title: 'IT Infrastructure Upgrade',
      contractType: 'Services',
      status: 'completed',
      supplier: {
        name: 'TechCore Systems',
        representative: 'Mike Wilson',
        email: 'mike.w@techcoresystems.com',
        phone: '+1-555-0789',
        registrationNumber: 'REG-11111',
        address: '789 Technology Blvd, Innovation Park'
      },
      financials: {
        contractValue: 450000,
        paidAmount: 450000,
        remainingAmount: 0,
        currency: 'USD',
        advancePayment: 0,
        retentionAmount: 0,
        performanceBond: 45000
      },
      timeline: {
        signedDate: '2025-01-15',
        effectiveDate: '2025-01-15',
        completionDate: '2025-08-15',
        expiryDate: '2025-08-15',
        daysRemaining: 0,
        duration: '7 months',
        extensionRequests: 1
      },
      performance: {
        progressPercentage: 100,
        performanceRating: 'excellent',
        milestonesCompleted: 8,
        totalMilestones: 8,
        delayDays: -5,
        qualityScore: 94
      },
      compliance: {
        insuranceCurrent: true,
        bondsActive: false,
        licensesValid: true,
        taxCompliant: true,
        environmentalCompliant: true,
        safetyCompliant: true
      },
      documents: {
        signedContract: { uploaded: true, version: '1.1', date: '2025-01-15' },
        amendments: { count: 1, lastAmendment: '2025-05-10' },
        invoices: { count: 7, totalAmount: 450000 },
        deliveryNotes: { count: 12, lastDelivery: '2025-08-10' },
        warranties: { count: 2, validUntil: '2026-08-15' }
      },
      risks: {
        level: 'low',
        financialRisk: 'low',
        performanceRisk: 'low',
        complianceRisk: 'low',
        lastAssessment: '2025-08-10'
      }
    },
    {
      id: 'CONTRACT-2024-078',
      procurementRef: 'PROC-2024-078',
      awardRef: 'AWARD-2024-078',
      title: 'Construction Materials Supply',
      contractType: 'Goods',
      status: 'terminated',
      supplier: {
        name: 'Materials Plus Ltd.',
        representative: 'Robert Davis',
        email: 'robert.d@materialsplus.com',
        phone: '+1-555-0654',
        registrationNumber: 'REG-55555',
        address: '555 Supply Chain Ave, Industrial Zone'
      },
      financials: {
        contractValue: 1200000,
        paidAmount: 480000,
        remainingAmount: 720000,
        currency: 'USD',
        advancePayment: 240000,
        retentionAmount: 60000,
        performanceBond: 120000
      },
      timeline: {
        signedDate: '2024-10-01',
        effectiveDate: '2024-10-01',
        completionDate: '2025-04-01',
        expiryDate: '2025-06-01',
        daysRemaining: 0,
        duration: '6 months',
        extensionRequests: 0
      },
      performance: {
        progressPercentage: 40,
        performanceRating: 'unsatisfactory',
        milestonesCompleted: 2,
        totalMilestones: 5,
        delayDays: 45,
        qualityScore: 45
      },
      compliance: {
        insuranceCurrent: false,
        bondsActive: false,
        licensesValid: false,
        taxCompliant: false,
        environmentalCompliant: false,
        safetyCompliant: false
      },
      documents: {
        signedContract: { uploaded: true, version: '1.0', date: '2024-10-01' },
        amendments: { count: 0, lastAmendment: null },
        invoices: { count: 4, totalAmount: 480000 },
        deliveryNotes: { count: 6, lastDelivery: '2024-12-15' },
        warranties: { count: 0, validUntil: null }
      },
      risks: {
        level: 'high',
        financialRisk: 'high',
        performanceRisk: 'high',
        complianceRisk: 'high',
        lastAssessment: '2025-01-15',
        terminationReason: 'Non-performance and compliance violations'
      }
    },
    {
      id: 'CONTRACT-2025-004',
      procurementRef: 'PROC-2025-004',
      awardRef: 'AWARD-2025-004',
      title: 'Consultant Services Agreement',
      contractType: 'Consulting Services',
      status: 'expiring_soon',
      supplier: {
        name: 'Global Advisory Partners',
        representative: 'Amanda White',
        email: 'amanda.white@globaladvisory.com',
        phone: '+1-555-0321',
        registrationNumber: 'REG-33333',
        address: '321 Consulting Row, Business District'
      },
      financials: {
        contractValue: 320000,
        paidAmount: 288000,
        remainingAmount: 32000,
        currency: 'USD',
        advancePayment: 0,
        retentionAmount: 16000,
        performanceBond: 0
      },
      timeline: {
        signedDate: '2025-07-01',
        effectiveDate: '2025-07-01',
        completionDate: '2025-12-31',
        expiryDate: '2025-12-31',
        daysRemaining: 6,
        duration: '6 months',
        extensionRequests: 0
      },
      performance: {
        progressPercentage: 90,
        performanceRating: 'good',
        milestonesCompleted: 5,
        totalMilestones: 6,
        delayDays: 0,
        qualityScore: 88
      },
      compliance: {
        insuranceCurrent: true,
        bondsActive: true,
        licensesValid: true,
        taxCompliant: true,
        environmentalCompliant: true,
        safetyCompliant: true
      },
      documents: {
        signedContract: { uploaded: true, version: '1.0', date: '2025-07-01' },
        amendments: { count: 0, lastAmendment: null },
        invoices: { count: 6, totalAmount: 288000 },
        deliveryNotes: { count: 18, lastDelivery: '2025-12-20' },
        warranties: { count: 0, validUntil: null }
      },
      risks: {
        level: 'low',
        financialRisk: 'low',
        performanceRisk: 'low',
        complianceRisk: 'low',
        lastAssessment: '2025-12-01'
      }
    }
  ]);

  // Contract statistics
  const stats = {
    totalContracts: contracts.length,
    activeContracts: contracts.filter(c => c.status === 'active').length,
    completedContracts: contracts.filter(c => c.status === 'completed').length,
    pendingContracts: contracts.filter(c => c.status === 'pending_signature').length,
    expiringContracts: contracts.filter(c => c.status === 'expiring_soon').length,
    totalValue: contracts.reduce((sum, c) => sum + c.financials.contractValue, 0),
    paidAmount: contracts.reduce((sum, c) => sum + c.financials.paidAmount, 0),
    avgPerformance: Math.round(contracts.filter(c => c.performance.qualityScore).reduce((sum, c) => sum + c.performance.qualityScore, 0) / contracts.filter(c => c.performance.qualityScore).length),
    highRiskContracts: contracts.filter(c => c.risks.level === 'high').length
  };

  // Filter contracts
  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contract.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contract.procurementRef.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    const matchesType = typeFilter === 'all' || contract.contractType === typeFilter;
    const matchesExpiry = expiryFilter === 'all' || 
      (expiryFilter === 'expiring_30' && contract.timeline.daysRemaining <= 30 && contract.timeline.daysRemaining > 0) ||
      (expiryFilter === 'expired' && contract.timeline.daysRemaining <= 0);
    return matchesSearch && matchesStatus && matchesType && matchesExpiry;
  });

  // Status configurations
  const statusConfig = {
    draft: { label: 'Draft', color: '#6b7280', bg: '#f9fafb', icon: '📝' },
    pending_signature: { label: 'Pending Signature', color: '#f59e0b', bg: '#fef3c7', icon: '✍️' },
    active: { label: 'Active', color: '#10b981', bg: '#d1fae5', icon: '✅' },
    completed: { label: 'Completed', color: '#3b82f6', bg: '#dbeafe', icon: '🏁' },
    terminated: { label: 'Terminated', color: '#ef4444', bg: '#fee2e2', icon: '❌' },
    expiring_soon: { label: 'Expiring Soon', color: '#8b5cf6', bg: '#ede9fe', icon: '⚠️' }
  };

  // Contract type configurations
  const contractTypeConfig = {
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

  const getPerformanceIndicator = (rating) => {
    const indicators = {
      excellent: { color: '#10b981', icon: '🌟', label: 'Excellent' },
      good: { color: '#3b82f6', icon: '👍', label: 'Good' },
      satisfactory: { color: '#f59e0b', icon: '👌', label: 'Satisfactory' },
      unsatisfactory: { color: '#ef4444', icon: '👎', label: 'Unsatisfactory' }
    };
    const config = indicators[rating] || { color: '#6b7280', icon: '❓', label: 'Pending' };
    return (
      <span style={{ color: config.color, fontSize: '0.8rem', fontWeight: '500' }}>
        {config.icon} {config.label}
      </span>
    );
  };

  const renderContractsTab = () => (
    <div className="contracts-content">
      {/* Statistics Section */}
      <div className="stats-section">
        <h2 className="section-title">Contract Overview</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.totalContracts}</div>
            <div className="stat-label">Total Contracts</div>
            <div className="stat-icon">📄</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.activeContracts}</div>
            <div className="stat-label">Active Contracts</div>
            <div className="stat-icon">✅</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.expiringContracts}</div>
            <div className="stat-label">Expiring Soon</div>
            <div className="stat-icon">⚠️</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatCurrency(stats.totalValue)}</div>
            <div className="stat-label">Total Value</div>
            <div className="stat-icon">💰</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatCurrency(stats.paidAmount)}</div>
            <div className="stat-label">Paid Amount</div>
            <div className="stat-icon">💵</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.avgPerformance}%</div>
            <div className="stat-label">Avg. Performance</div>
            <div className="stat-icon">📈</div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="search-group">
          <label>Search Contracts</label>
          <input
            type="text"
            placeholder="Search by title, supplier, or reference..."
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
            <option value="pending_signature">Pending Signature</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="terminated">Terminated</option>
            <option value="expiring_soon">Expiring Soon</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Contract Type</label>
          <select 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="Goods">Goods</option>
            <option value="Works">Works</option>
            <option value="Goods & Works">Goods & Works</option>
            <option value="Services">Services</option>
            <option value="Consulting Services">Consulting Services</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Expiry</label>
          <select 
            value={expiryFilter} 
            onChange={(e) => setExpiryFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Contracts</option>
            <option value="expiring_30">Expiring in 30 Days</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="table-section">
        <div className="table-header">
          <h3>Contract Registry ({filteredContracts.length})</h3>
          <button 
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
          >
            + New Contract
          </button>
        </div>
        
        <div className="table-container">
          <table className="contracts-table">
            <thead>
              <tr>
                <th>Contract Details</th>
                <th>Type</th>
                <th>Supplier</th>
                <th>Financial Status</th>
                <th>Timeline</th>
                <th>Performance</th>
                <th>Risk Level</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredContracts.map((contract) => (
                <tr key={contract.id}>
                  <td>
                    <div className="contract-info">
                      <div className="contract-ref">{contract.id}</div>
                      <div className="contract-title">{contract.title}</div>
                      <div className="contract-meta">
                        Proc: {contract.procurementRef}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div 
                      className="type-badge"
                      style={{ 
                        backgroundColor: `${contractTypeConfig[contract.contractType]?.color}15`, 
                        color: contractTypeConfig[contract.contractType]?.color 
                      }}
                    >
                      <span className="type-icon">{contractTypeConfig[contract.contractType]?.icon}</span>
                      {contract.contractType}
                    </div>
                  </td>
                  <td>
                    <div className="supplier-info">
                      <div className="supplier-name">{contract.supplier.name}</div>
                      <div className="supplier-contact">{contract.supplier.representative}</div>
                      <div className="supplier-reg">Reg: {contract.supplier.registrationNumber}</div>
                    </div>
                  </td>
                  <td className="financial-cell">
                    <div className="contract-value">{formatCurrency(contract.financials.contractValue)}</div>
                    <div className="payment-status">
                      Paid: {formatCurrency(contract.financials.paidAmount)}
                    </div>
                    <div className="remaining-amount">
                      Remaining: {formatCurrency(contract.financials.remainingAmount)}
                    </div>
                  </td>
                  <td>
                    <div className="timeline-info">
                      <div className="status-display">{getStatusBadge(contract.status)}</div>
                      <div className="contract-dates">
                        {contract.timeline.signedDate ? `Signed: ${contract.timeline.signedDate}` : 'Not signed'}
                      </div>
                      <div className={`expiry-info ${contract.timeline.daysRemaining <= 30 && contract.timeline.daysRemaining > 0 ? 'expiring-soon' : contract.timeline.daysRemaining <= 0 ? 'expired' : ''}`}>
                        {contract.timeline.daysRemaining > 0 ? 
                          `${contract.timeline.daysRemaining} days left` : 
                          contract.timeline.daysRemaining === 0 ? 'Expires today' : 
                          'Expired'}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="performance-info">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ width: `${contract.performance.progressPercentage}%` }}
                        ></div>
                      </div>
                      <div className="progress-text">{contract.performance.progressPercentage}% complete</div>
                      <div className="performance-rating">
                        {getPerformanceIndicator(contract.performance.performanceRating)}
                      </div>
                    </div>
                  </td>
                  <td>{getRiskBadge(contract.risks.level)}</td>
                  <td className="actions-cell">
                    <div className="action-buttons">
                      <button className="action-btn" title="View Contract">👁️</button>
                      <button className="action-btn" title="Edit">✏️</button>
                      <button className="action-btn" title="Documents">📎</button>
                      <button className="action-btn" title="Performance">📊</button>
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

  const renderPerformanceTab = () => (
    <div className="performance-section">
      <h2 className="section-title">Contract Performance Dashboard</h2>
      <div className="performance-grid">
        <div className="performance-card">
          <h3>Performance Distribution</h3>
          <div className="performance-chart">
            <div className="chart-item">
              <span>🌟 Excellent</span>
              <span>20%</span>
            </div>
            <div className="chart-item">
              <span>👍 Good</span>
              <span>40%</span>
            </div>
            <div className="chart-item">
              <span>👌 Satisfactory</span>
              <span>20%</span>
            </div>
            <div className="chart-item">
              <span>👎 Unsatisfactory</span>
              <span>20%</span>
            </div>
          </div>
        </div>
        
        <div className="performance-card">
          <h3>Financial Performance</h3>
          <div className="financial-metrics">
            <div className="metric">
              <span className="metric-label">Contract Value</span>
              <span className="metric-value">{formatCurrency(stats.totalValue)}</span>
            </div>
            <div className="metric">
              <span className="metric-label">Amount Paid</span>
              <span className="metric-value">{formatCurrency(stats.paidAmount)}</span>
            </div>
            <div className="metric">
              <span className="metric-label">Payment Rate</span>
              <span className="metric-value">{Math.round((stats.paidAmount / stats.totalValue) * 100)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <StandardLayout title="Contract Management">
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">
            <span className="title-icon">📄</span>
            Contract Management
          </h1>
          <p className="page-subtitle">
            Manage contract lifecycle, performance, and compliance following STEP methodology
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${activeView === 'contracts' ? 'active' : ''}`}
            onClick={() => setActiveView('contracts')}
          >
            📄 Contract Registry
          </button>
          <button 
            className={`nav-tab ${activeView === 'performance' ? 'active' : ''}`}
            onClick={() => setActiveView('performance')}
          >
            📊 Performance
          </button>
          <button 
            className={`nav-tab ${activeView === 'compliance' ? 'active' : ''}`}
            onClick={() => setActiveView('compliance')}
          >
            ✅ Compliance
          </button>
          <button 
            className={`nav-tab ${activeView === 'documents' ? 'active' : ''}`}
            onClick={() => setActiveView('documents')}
          >
            📁 Documents
          </button>
        </div>

        {/* Content based on active view */}
        {activeView === 'contracts' && renderContractsTab()}
        {activeView === 'performance' && renderPerformanceTab()}
        {activeView === 'compliance' && (
          <div className="coming-soon">
            <h2>Contract Compliance</h2>
            <p>Compliance monitoring and risk assessment dashboard coming soon...</p>
          </div>
        )}
        {activeView === 'documents' && (
          <div className="coming-soon">
            <h2>Document Management</h2>
            <p>Contract document versioning and management system coming soon...</p>
          </div>
        )}

        {/* Modal for new contract */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h3>New Contract</h3>
              <p>Contract creation form coming soon...</p>
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
