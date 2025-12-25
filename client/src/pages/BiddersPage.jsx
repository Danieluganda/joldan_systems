import React, { useState, useEffect } from 'react';
import StandardLayout from '../components/layout/StandardLayout';
import './pages.css';

export default function BiddersPage() {
  const [activeView, setActiveView] = useState('bidders');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [qualificationFilter, setQualificationFilter] = useState('all');
  const [selectedBidder, setSelectedBidder] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Comprehensive bidder data - STEP methodology compliant
  const [bidders] = useState([
    {
      id: 'BIDDER-2025-001',
      registrationNumber: 'REG-12345',
      companyName: 'ABC Construction Ltd.',
      tradingName: 'ABC Construction',
      status: 'active',
      qualification: 'qualified',
      category: 'contractor',
      businessType: 'limited_company',
      registrationDate: '2023-01-15',
      lastUpdated: '2025-12-20',
      contact: {
        primaryContact: 'John Smith',
        position: 'Business Development Manager',
        email: 'john.smith@abcconstruction.com',
        phone: '+1-555-0123',
        mobile: '+1-555-0124',
        website: 'www.abcconstruction.com',
        address: {
          street: '123 Industrial Avenue',
          city: 'Metro City',
          state: 'State',
          zipCode: '12345',
          country: 'Country'
        }
      },
      financial: {
        annualRevenue: 15000000,
        creditRating: 'A',
        bankReferences: 3,
        financialStatementsDate: '2024-12-31',
        insuranceCoverage: 5000000,
        bondingCapacity: 10000000,
        taxCompliance: true,
        auditedFinancials: true
      },
      capabilities: {
        sectors: ['Infrastructure', 'Buildings', 'Roads'],
        maxContractValue: 25000000,
        technicalStaff: 45,
        equipment: ['Heavy Machinery', 'Construction Equipment'],
        certifications: ['ISO 9001', 'ISO 14001', 'OHSAS 18001'],
        languages: ['English', 'Spanish']
      },
      performance: {
        totalContracts: 28,
        completedContracts: 26,
        ongoingContracts: 2,
        averageRating: 4.2,
        onTimeDelivery: 92,
        qualityScore: 88,
        safetyRecord: 'excellent',
        disputeHistory: 1,
        lastContractDate: '2025-11-15'
      },
      compliance: {
        debarmentStatus: 'clear',
        sanctionsList: false,
        criminalRecord: false,
        environmentalViolations: false,
        laborViolations: false,
        corruptionAllegations: false,
        lastComplianceCheck: '2025-12-01'
      },
      documents: {
        businessLicense: { status: 'valid', expiryDate: '2026-01-15' },
        taxClearance: { status: 'valid', expiryDate: '2025-12-31' },
        insuranceCertificate: { status: 'valid', expiryDate: '2026-06-30' },
        technicalCapability: { status: 'submitted', date: '2025-10-15' },
        financialStatements: { status: 'verified', date: '2025-01-30' },
        references: { count: 5, lastVerified: '2025-11-20' }
      }
    },
    {
      id: 'BIDDER-2025-002',
      registrationNumber: 'REG-67890',
      companyName: 'MedTech Solutions Inc.',
      tradingName: 'MedTech Solutions',
      status: 'active',
      qualification: 'pre_qualified',
      category: 'supplier',
      businessType: 'corporation',
      registrationDate: '2024-03-20',
      lastUpdated: '2025-12-18',
      contact: {
        primaryContact: 'Sarah Johnson',
        position: 'Sales Director',
        email: 'sarah.j@medtechsolutions.com',
        phone: '+1-555-0456',
        mobile: '+1-555-0457',
        website: 'www.medtechsolutions.com',
        address: {
          street: '456 Health Plaza',
          city: 'Medical District',
          state: 'State',
          zipCode: '67890',
          country: 'Country'
        }
      },
      financial: {
        annualRevenue: 8500000,
        creditRating: 'A-',
        bankReferences: 2,
        financialStatementsDate: '2024-12-31',
        insuranceCoverage: 2000000,
        bondingCapacity: 5000000,
        taxCompliance: true,
        auditedFinancials: true
      },
      capabilities: {
        sectors: ['Healthcare', 'Medical Equipment', 'Pharmaceuticals'],
        maxContractValue: 12000000,
        technicalStaff: 28,
        equipment: ['Laboratory Equipment', 'Medical Devices'],
        certifications: ['ISO 13485', 'FDA Approval', 'CE Marking'],
        languages: ['English', 'French']
      },
      performance: {
        totalContracts: 15,
        completedContracts: 14,
        ongoingContracts: 1,
        averageRating: 4.5,
        onTimeDelivery: 95,
        qualityScore: 92,
        safetyRecord: 'excellent',
        disputeHistory: 0,
        lastContractDate: '2025-10-30'
      },
      compliance: {
        debarmentStatus: 'clear',
        sanctionsList: false,
        criminalRecord: false,
        environmentalViolations: false,
        laborViolations: false,
        corruptionAllegations: false,
        lastComplianceCheck: '2025-11-15'
      },
      documents: {
        businessLicense: { status: 'valid', expiryDate: '2026-03-20' },
        taxClearance: { status: 'valid', expiryDate: '2025-12-31' },
        insuranceCertificate: { status: 'valid', expiryDate: '2026-03-15' },
        technicalCapability: { status: 'verified', date: '2025-09-10' },
        financialStatements: { status: 'verified', date: '2025-01-15' },
        references: { count: 8, lastVerified: '2025-10-25' }
      }
    },
    {
      id: 'BIDDER-2024-087',
      registrationNumber: 'REG-11111',
      companyName: 'TechCore Systems',
      tradingName: 'TechCore',
      status: 'active',
      qualification: 'qualified',
      category: 'service_provider',
      businessType: 'llc',
      registrationDate: '2022-08-10',
      lastUpdated: '2025-12-15',
      contact: {
        primaryContact: 'Mike Wilson',
        position: 'Account Manager',
        email: 'mike.w@techcoresystems.com',
        phone: '+1-555-0789',
        mobile: '+1-555-0790',
        website: 'www.techcoresystems.com',
        address: {
          street: '789 Technology Boulevard',
          city: 'Innovation Park',
          state: 'State',
          zipCode: '11111',
          country: 'Country'
        }
      },
      financial: {
        annualRevenue: 3200000,
        creditRating: 'B+',
        bankReferences: 2,
        financialStatementsDate: '2024-12-31',
        insuranceCoverage: 1000000,
        bondingCapacity: 2000000,
        taxCompliance: true,
        auditedFinancials: false
      },
      capabilities: {
        sectors: ['IT Services', 'Software Development', 'Cloud Solutions'],
        maxContractValue: 5000000,
        technicalStaff: 22,
        equipment: ['Servers', 'Network Equipment'],
        certifications: ['ISO 27001', 'AWS Certified', 'Microsoft Gold Partner'],
        languages: ['English']
      },
      performance: {
        totalContracts: 12,
        completedContracts: 11,
        ongoingContracts: 1,
        averageRating: 4.8,
        onTimeDelivery: 100,
        qualityScore: 94,
        safetyRecord: 'good',
        disputeHistory: 0,
        lastContractDate: '2025-08-20'
      },
      compliance: {
        debarmentStatus: 'clear',
        sanctionsList: false,
        criminalRecord: false,
        environmentalViolations: false,
        laborViolations: false,
        corruptionAllegations: false,
        lastComplianceCheck: '2025-10-30'
      },
      documents: {
        businessLicense: { status: 'valid', expiryDate: '2026-08-10' },
        taxClearance: { status: 'valid', expiryDate: '2025-12-31' },
        insuranceCertificate: { status: 'valid', expiryDate: '2026-02-28' },
        technicalCapability: { status: 'verified', date: '2025-07-15' },
        financialStatements: { status: 'pending', date: '2025-01-20' },
        references: { count: 6, lastVerified: '2025-09-10' }
      }
    },
    {
      id: 'BIDDER-2024-055',
      registrationNumber: 'REG-55555',
      companyName: 'Materials Plus Ltd.',
      tradingName: 'Materials Plus',
      status: 'suspended',
      qualification: 'disqualified',
      category: 'supplier',
      businessType: 'limited_company',
      registrationDate: '2021-05-15',
      lastUpdated: '2025-01-15',
      contact: {
        primaryContact: 'Robert Davis',
        position: 'General Manager',
        email: 'robert.d@materialsplus.com',
        phone: '+1-555-0654',
        mobile: '+1-555-0655',
        website: 'www.materialsplus.com',
        address: {
          street: '555 Supply Chain Avenue',
          city: 'Industrial Zone',
          state: 'State',
          zipCode: '55555',
          country: 'Country'
        }
      },
      financial: {
        annualRevenue: 6800000,
        creditRating: 'C',
        bankReferences: 1,
        financialStatementsDate: '2023-12-31',
        insuranceCoverage: 500000,
        bondingCapacity: 1000000,
        taxCompliance: false,
        auditedFinancials: false
      },
      capabilities: {
        sectors: ['Construction Materials', 'Mining', 'Aggregates'],
        maxContractValue: 8000000,
        technicalStaff: 15,
        equipment: ['Trucks', 'Loaders', 'Processing Equipment'],
        certifications: [],
        languages: ['English']
      },
      performance: {
        totalContracts: 8,
        completedContracts: 5,
        ongoingContracts: 0,
        averageRating: 2.1,
        onTimeDelivery: 45,
        qualityScore: 52,
        safetyRecord: 'poor',
        disputeHistory: 4,
        lastContractDate: '2024-12-15'
      },
      compliance: {
        debarmentStatus: 'under_investigation',
        sanctionsList: false,
        criminalRecord: false,
        environmentalViolations: true,
        laborViolations: true,
        corruptionAllegations: false,
        lastComplianceCheck: '2025-01-10',
        suspensionReason: 'Performance issues and compliance violations'
      },
      documents: {
        businessLicense: { status: 'expired', expiryDate: '2024-05-15' },
        taxClearance: { status: 'overdue', expiryDate: '2024-12-31' },
        insuranceCertificate: { status: 'expired', expiryDate: '2024-11-30' },
        technicalCapability: { status: 'outdated', date: '2023-03-20' },
        financialStatements: { status: 'missing', date: null },
        references: { count: 2, lastVerified: '2023-08-15' }
      }
    },
    {
      id: 'BIDDER-2025-003',
      registrationNumber: 'REG-33333',
      companyName: 'Global Advisory Partners',
      tradingName: 'Global Advisory',
      status: 'active',
      qualification: 'qualified',
      category: 'consultant',
      businessType: 'partnership',
      registrationDate: '2023-07-01',
      lastUpdated: '2025-12-10',
      contact: {
        primaryContact: 'Amanda White',
        position: 'Partner',
        email: 'amanda.white@globaladvisory.com',
        phone: '+1-555-0321',
        mobile: '+1-555-0322',
        website: 'www.globaladvisory.com',
        address: {
          street: '321 Consulting Row',
          city: 'Business District',
          state: 'State',
          zipCode: '33333',
          country: 'Country'
        }
      },
      financial: {
        annualRevenue: 2800000,
        creditRating: 'B',
        bankReferences: 2,
        financialStatementsDate: '2024-12-31',
        insuranceCoverage: 2000000,
        bondingCapacity: 0,
        taxCompliance: true,
        auditedFinancials: true
      },
      capabilities: {
        sectors: ['Management Consulting', 'Financial Advisory', 'Strategic Planning'],
        maxContractValue: 3000000,
        technicalStaff: 18,
        equipment: [],
        certifications: ['CPA', 'PMP', 'MBA'],
        languages: ['English', 'French', 'Spanish']
      },
      performance: {
        totalContracts: 24,
        completedContracts: 23,
        ongoingContracts: 1,
        averageRating: 4.6,
        onTimeDelivery: 96,
        qualityScore: 91,
        safetyRecord: 'excellent',
        disputeHistory: 0,
        lastContractDate: '2025-07-01'
      },
      compliance: {
        debarmentStatus: 'clear',
        sanctionsList: false,
        criminalRecord: false,
        environmentalViolations: false,
        laborViolations: false,
        corruptionAllegations: false,
        lastComplianceCheck: '2025-11-01'
      },
      documents: {
        businessLicense: { status: 'valid', expiryDate: '2026-07-01' },
        taxClearance: { status: 'valid', expiryDate: '2025-12-31' },
        insuranceCertificate: { status: 'valid', expiryDate: '2026-05-15' },
        technicalCapability: { status: 'verified', date: '2025-06-10' },
        financialStatements: { status: 'verified', date: '2025-01-10' },
        references: { count: 12, lastVerified: '2025-09-20' }
      }
    }
  ]);

  // Bidder statistics
  const stats = {
    totalBidders: bidders.length,
    activeBidders: bidders.filter(b => b.status === 'active').length,
    qualifiedBidders: bidders.filter(b => b.qualification === 'qualified').length,
    suspendedBidders: bidders.filter(b => b.status === 'suspended').length,
    contractors: bidders.filter(b => b.category === 'contractor').length,
    suppliers: bidders.filter(b => b.category === 'supplier').length,
    consultants: bidders.filter(b => b.category === 'consultant').length,
    serviceProviders: bidders.filter(b => b.category === 'service_provider').length,
    avgPerformanceRating: Math.round(bidders.reduce((sum, b) => sum + b.performance.averageRating, 0) / bidders.length * 10) / 10,
    totalContracts: bidders.reduce((sum, b) => sum + b.performance.totalContracts, 0),
    complianceIssues: bidders.filter(b => b.compliance.debarmentStatus !== 'clear' || !b.compliance.sanctionsList === false).length
  };

  // Filter bidders
  const filteredBidders = bidders.filter(bidder => {
    const matchesSearch = bidder.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bidder.tradingName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bidder.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bidder.contact.primaryContact.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || bidder.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || bidder.category === categoryFilter;
    const matchesQualification = qualificationFilter === 'all' || bidder.qualification === qualificationFilter;
    return matchesSearch && matchesStatus && matchesCategory && matchesQualification;
  });

  // Status configurations
  const statusConfig = {
    active: { label: 'Active', color: '#10b981', bg: '#d1fae5', icon: '✅' },
    inactive: { label: 'Inactive', color: '#6b7280', bg: '#f9fafb', icon: '⏸️' },
    suspended: { label: 'Suspended', color: '#ef4444', bg: '#fee2e2', icon: '⛔' },
    under_review: { label: 'Under Review', color: '#f59e0b', bg: '#fef3c7', icon: '🔍' }
  };

  // Qualification configurations
  const qualificationConfig = {
    qualified: { label: 'Qualified', color: '#10b981', bg: '#d1fae5', icon: '✅' },
    pre_qualified: { label: 'Pre-Qualified', color: '#3b82f6', bg: '#dbeafe', icon: '📋' },
    disqualified: { label: 'Disqualified', color: '#ef4444', bg: '#fee2e2', icon: '❌' },
    pending: { label: 'Pending Review', color: '#f59e0b', bg: '#fef3c7', icon: '⏳' }
  };

  // Category configurations
  const categoryConfig = {
    contractor: { label: 'Contractor', icon: '🏗️', color: '#10b981' },
    supplier: { label: 'Supplier', icon: '📦', color: '#3b82f6' },
    service_provider: { label: 'Service Provider', icon: '⚙️', color: '#f59e0b' },
    consultant: { label: 'Consultant', icon: '💼', color: '#8b5cf6' }
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

  const getQualificationBadge = (qualification) => {
    const config = qualificationConfig[qualification];
    return (
      <span 
        className="qualification-badge"
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
    let color, icon;
    if (rating >= 4.5) {
      color = '#10b981';
      icon = '🌟';
    } else if (rating >= 4.0) {
      color = '#3b82f6';
      icon = '👍';
    } else if (rating >= 3.0) {
      color = '#f59e0b';
      icon = '👌';
    } else {
      color = '#ef4444';
      icon = '👎';
    }
    return (
      <span style={{ color, fontSize: '0.8rem', fontWeight: '500' }}>
        {icon} {rating.toFixed(1)}
      </span>
    );
  };

  const renderBiddersTab = () => (
    <div className="bidders-content">
      {/* Statistics Section */}
      <div className="stats-section">
        <h2 className="section-title">Bidder Overview</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.totalBidders}</div>
            <div className="stat-label">Total Bidders</div>
            <div className="stat-icon">👥</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.activeBidders}</div>
            <div className="stat-label">Active Bidders</div>
            <div className="stat-icon">✅</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.qualifiedBidders}</div>
            <div className="stat-label">Qualified</div>
            <div className="stat-icon">🎯</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.contractors}</div>
            <div className="stat-label">Contractors</div>
            <div className="stat-icon">🏗️</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.suppliers}</div>
            <div className="stat-label">Suppliers</div>
            <div className="stat-icon">📦</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.avgPerformanceRating}</div>
            <div className="stat-label">Avg. Rating</div>
            <div className="stat-icon">⭐</div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="search-group">
          <label>Search Bidders</label>
          <input
            type="text"
            placeholder="Search by company name, contact, or registration..."
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
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="under_review">Under Review</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Category</label>
          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Categories</option>
            <option value="contractor">Contractors</option>
            <option value="supplier">Suppliers</option>
            <option value="service_provider">Service Providers</option>
            <option value="consultant">Consultants</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Qualification</label>
          <select 
            value={qualificationFilter} 
            onChange={(e) => setQualificationFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Qualifications</option>
            <option value="qualified">Qualified</option>
            <option value="pre_qualified">Pre-Qualified</option>
            <option value="disqualified">Disqualified</option>
            <option value="pending">Pending Review</option>
          </select>
        </div>
      </div>

      {/* Bidders Table */}
      <div className="table-section">
        <div className="table-header">
          <h3>Bidder Registry ({filteredBidders.length})</h3>
          <button 
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
          >
            + Register Bidder
          </button>
        </div>
        
        <div className="table-container">
          <table className="bidders-table">
            <thead>
              <tr>
                <th>Company Details</th>
                <th>Category</th>
                <th>Contact Information</th>
                <th>Financial Capacity</th>
                <th>Performance</th>
                <th>Qualification</th>
                <th>Compliance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBidders.map((bidder) => (
                <tr key={bidder.id}>
                  <td>
                    <div className="company-info">
                      <div className="company-name">{bidder.companyName}</div>
                      <div className="trading-name">{bidder.tradingName}</div>
                      <div className="registration-info">
                        Reg: {bidder.registrationNumber}
                      </div>
                      <div className="status-display">{getStatusBadge(bidder.status)}</div>
                    </div>
                  </td>
                  <td>
                    <div 
                      className="category-badge"
                      style={{ 
                        backgroundColor: `${categoryConfig[bidder.category]?.color}15`, 
                        color: categoryConfig[bidder.category]?.color 
                      }}
                    >
                      <span className="category-icon">{categoryConfig[bidder.category]?.icon}</span>
                      {categoryConfig[bidder.category]?.label}
                    </div>
                  </td>
                  <td>
                    <div className="contact-info">
                      <div className="contact-name">{bidder.contact.primaryContact}</div>
                      <div className="contact-position">{bidder.contact.position}</div>
                      <div className="contact-email">{bidder.contact.email}</div>
                      <div className="contact-phone">{bidder.contact.phone}</div>
                      <div className="contact-address">
                        {bidder.contact.address.city}, {bidder.contact.address.state}
                      </div>
                    </div>
                  </td>
                  <td className="financial-cell">
                    <div className="annual-revenue">{formatCurrency(bidder.financial.annualRevenue)}</div>
                    <div className="credit-rating">Rating: {bidder.financial.creditRating}</div>
                    <div className="max-contract">Max: {formatCurrency(bidder.capabilities.maxContractValue)}</div>
                    <div className="bonding-capacity">Bond: {formatCurrency(bidder.financial.bondingCapacity)}</div>
                  </td>
                  <td>
                    <div className="performance-info">
                      <div className="performance-rating">
                        {getPerformanceIndicator(bidder.performance.averageRating)}
                      </div>
                      <div className="contract-stats">
                        Contracts: {bidder.performance.completedContracts}/{bidder.performance.totalContracts}
                      </div>
                      <div className="delivery-rate">
                        On-time: {bidder.performance.onTimeDelivery}%
                      </div>
                      <div className="quality-score">
                        Quality: {bidder.performance.qualityScore}%
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="qualification-info">
                      {getQualificationBadge(bidder.qualification)}
                      <div className="cert-count">
                        Certs: {bidder.capabilities.certifications.length}
                      </div>
                      <div className="staff-count">
                        Staff: {bidder.capabilities.technicalStaff}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="compliance-info">
                      <div className={`debarment-status ${bidder.compliance.debarmentStatus}`}>
                        {bidder.compliance.debarmentStatus === 'clear' ? '✅ Clear' : 
                         bidder.compliance.debarmentStatus === 'under_investigation' ? '⚠️ Under Review' : 
                         '❌ Debarred'}
                      </div>
                      <div className="tax-compliance">
                        Tax: {bidder.financial.taxCompliance ? '✅' : '❌'}
                      </div>
                      <div className="doc-status">
                        Docs: {Object.values(bidder.documents).filter(d => d.status === 'valid' || d.status === 'verified').length}/6
                      </div>
                    </div>
                  </td>
                  <td className="actions-cell">
                    <div className="action-buttons">
                      <button className="action-btn" title="View Profile">👁️</button>
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
      <h2 className="section-title">Bidder Performance Analysis</h2>
      <div className="performance-grid">
        <div className="performance-card">
          <h3>Performance Distribution</h3>
          <div className="performance-chart">
            <div className="chart-item">
              <span>🌟 Excellent (4.5+)</span>
              <span>40%</span>
            </div>
            <div className="chart-item">
              <span>👍 Good (4.0+)</span>
              <span>40%</span>
            </div>
            <div className="chart-item">
              <span>👌 Average (3.0+)</span>
              <span>0%</span>
            </div>
            <div className="chart-item">
              <span>👎 Poor (&lt;3.0)</span>
              <span>20%</span>
            </div>
          </div>
        </div>
        
        <div className="performance-card">
          <h3>Category Breakdown</h3>
          <div className="category-stats">
            <div className="category-stat">
              <span className="category-label">🏗️ Contractors</span>
              <span className="category-value">{stats.contractors}</span>
            </div>
            <div className="category-stat">
              <span className="category-label">📦 Suppliers</span>
              <span className="category-value">{stats.suppliers}</span>
            </div>
            <div className="category-stat">
              <span className="category-label">⚙️ Service Providers</span>
              <span className="category-value">{stats.serviceProviders}</span>
            </div>
            <div className="category-stat">
              <span className="category-label">💼 Consultants</span>
              <span className="category-value">{stats.consultants}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <StandardLayout title="Bidder Management">
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">
            <span className="title-icon">👥</span>
            Bidder Management
          </h1>
          <p className="page-subtitle">
            Manage bidder registration, qualification, and performance following STEP methodology
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${activeView === 'bidders' ? 'active' : ''}`}
            onClick={() => setActiveView('bidders')}
          >
            👥 Bidder Registry
          </button>
          <button 
            className={`nav-tab ${activeView === 'performance' ? 'active' : ''}`}
            onClick={() => setActiveView('performance')}
          >
            📊 Performance
          </button>
          <button 
            className={`nav-tab ${activeView === 'qualification' ? 'active' : ''}`}
            onClick={() => setActiveView('qualification')}
          >
            🎯 Qualification
          </button>
          <button 
            className={`nav-tab ${activeView === 'compliance' ? 'active' : ''}`}
            onClick={() => setActiveView('compliance')}
          >
            ✅ Compliance
          </button>
        </div>

        {/* Content based on active view */}
        {activeView === 'bidders' && renderBiddersTab()}
        {activeView === 'performance' && renderPerformanceTab()}
        {activeView === 'qualification' && (
          <div className="coming-soon">
            <h2>Bidder Qualification</h2>
            <p>Qualification assessment and certification management coming soon...</p>
          </div>
        )}
        {activeView === 'compliance' && (
          <div className="coming-soon">
            <h2>Compliance Monitoring</h2>
            <p>Debarment tracking and compliance monitoring system coming soon...</p>
          </div>
        )}

        {/* Modal for new bidder registration */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h3>Register New Bidder</h3>
              <p>Bidder registration form coming soon...</p>
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
