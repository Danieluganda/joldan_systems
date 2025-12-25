import React, { useState, useEffect } from 'react';
import StandardLayout from '../components/layout/StandardLayout';
import './pages.css';

export default function CompliancePage() {
  const [activeView, setActiveView] = useState('compliance');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [selectedCompliance, setSelectedCompliance] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Comprehensive compliance data - STEP methodology compliant
  const [complianceItems] = useState([
    {
      id: 'COMP-2025-001',
      type: 'regulatory_compliance',
      status: 'compliant',
      riskLevel: 'low',
      category: 'procurement_regulations',
      title: 'World Bank STEP Methodology Compliance',
      description: 'Comprehensive assessment of procurement processes against World Bank Standard Tender Evaluation Procedures (STEP) methodology requirements.',
      procurementRef: 'PROC-2025-001',
      assessmentDate: '2025-12-20',
      nextReviewDate: '2026-03-20',
      lastUpdated: '2025-12-22',
      compliance: {
        overallScore: 95,
        maxScore: 100,
        compliancePercentage: 95,
        criticalIssues: 0,
        majorIssues: 1,
        minorIssues: 3,
        recommendationsImplemented: 12,
        totalRecommendations: 15
      },
      requirements: {
        transparencyRequirements: {
          status: 'compliant',
          score: 100,
          details: 'All procurement notices published according to STEP guidelines with adequate publication periods.'
        },
        competitiveProcess: {
          status: 'compliant',
          score: 98,
          details: 'Competitive bidding process followed with proper market engagement and supplier participation.'
        },
        evaluationCriteria: {
          status: 'compliant',
          score: 92,
          details: 'Clear evaluation criteria defined and consistently applied. Minor improvement needed in technical scoring methodology.'
        },
        contractManagement: {
          status: 'compliant',
          score: 90,
          details: 'Contract management processes align with STEP requirements. Monitoring and reporting mechanisms in place.'
        },
        recordKeeping: {
          status: 'compliant',
          score: 96,
          details: 'Comprehensive documentation and audit trail maintained throughout procurement lifecycle.'
        }
      },
      risks: {
        identifiedRisks: [
          {
            risk: 'Evaluation Committee Training Gap',
            severity: 'medium',
            mitigation: 'Schedule quarterly training sessions on STEP evaluation procedures',
            status: 'mitigating',
            dueDate: '2026-01-15'
          }
        ],
        overallRiskRating: 'low',
        riskScore: 15 // out of 100
      },
      audits: {
        lastAuditDate: '2025-11-15',
        nextAuditDate: '2026-02-15',
        auditor: 'Internal Compliance Team',
        auditScore: 94,
        findings: 'Minor documentation improvements needed for supplier qualification records.'
      },
      responsible: {
        officer: 'Maria Rodriguez',
        department: 'Procurement Department',
        email: 'maria.rodriguez@organization.org',
        phone: '+1-555-0123'
      },
      metadata: {
        createdBy: 'compliance_officer_1',
        reviewedBy: 'senior_compliance_officer',
        version: '2.1',
        confidential: false,
        framework: 'World Bank STEP'
      }
    },
    {
      id: 'COMP-2025-002',
      type: 'policy_compliance',
      status: 'non_compliant',
      riskLevel: 'high',
      category: 'internal_policies',
      title: 'Supplier Code of Conduct Compliance',
      description: 'Assessment of supplier adherence to organizational code of conduct, ethical standards, and anti-corruption policies.',
      procurementRef: 'PROC-2024-089',
      assessmentDate: '2025-12-18',
      nextReviewDate: '2025-12-28',
      lastUpdated: '2025-12-24',
      compliance: {
        overallScore: 68,
        maxScore: 100,
        compliancePercentage: 68,
        criticalIssues: 2,
        majorIssues: 4,
        minorIssues: 8,
        recommendationsImplemented: 3,
        totalRecommendations: 14
      },
      requirements: {
        ethicalStandards: {
          status: 'non_compliant',
          score: 45,
          details: 'Several suppliers have not submitted updated ethical compliance declarations. Immediate action required.'
        },
        antiCorruption: {
          status: 'partially_compliant',
          score: 72,
          details: 'Anti-corruption training completed by 72% of supplier representatives. Target is 100%.'
        },
        conflictOfInterest: {
          status: 'compliant',
          score: 88,
          details: 'Conflict of interest declarations current for most suppliers. Minor updates needed.'
        },
        laborStandards: {
          status: 'partially_compliant',
          score: 75,
          details: 'Labor standards compliance varies among suppliers. Enhanced monitoring required.'
        },
        environmentalCompliance: {
          status: 'compliant',
          score: 85,
          details: 'Environmental standards generally met. Some suppliers need minor improvements.'
        }
      },
      risks: {
        identifiedRisks: [
          {
            risk: 'Supplier Ethical Standards Non-Compliance',
            severity: 'high',
            mitigation: 'Implement immediate supplier compliance review and corrective action plan',
            status: 'active',
            dueDate: '2025-12-30'
          },
          {
            risk: 'Reputational Risk from Non-Compliant Suppliers',
            severity: 'high',
            mitigation: 'Review supplier contracts and consider suspension pending compliance',
            status: 'escalated',
            dueDate: '2025-12-27'
          }
        ],
        overallRiskRating: 'high',
        riskScore: 85
      },
      audits: {
        lastAuditDate: '2025-12-15',
        nextAuditDate: '2025-12-30',
        auditor: 'External Ethics Consultant',
        auditScore: 65,
        findings: 'Significant gaps in supplier ethical compliance monitoring and enforcement.'
      },
      responsible: {
        officer: 'Carlos Martinez',
        department: 'Ethics & Compliance',
        email: 'carlos.martinez@organization.org',
        phone: '+1-555-0124'
      },
      metadata: {
        createdBy: 'ethics_officer_1',
        reviewedBy: 'chief_compliance_officer',
        version: '1.3',
        confidential: true,
        framework: 'Internal Ethics Framework'
      }
    },
    {
      id: 'COMP-2025-003',
      type: 'regulatory_compliance',
      status: 'partially_compliant',
      riskLevel: 'medium',
      category: 'data_protection',
      title: 'Data Protection and Privacy Compliance',
      description: 'Assessment of data handling, storage, and privacy protection measures in procurement processes.',
      procurementRef: 'PROC-2025-002',
      assessmentDate: '2025-12-19',
      nextReviewDate: '2026-01-19',
      lastUpdated: '2025-12-23',
      compliance: {
        overallScore: 82,
        maxScore: 100,
        compliancePercentage: 82,
        criticalIssues: 0,
        majorIssues: 2,
        minorIssues: 5,
        recommendationsImplemented: 8,
        totalRecommendations: 11
      },
      requirements: {
        dataCollection: {
          status: 'compliant',
          score: 90,
          details: 'Data collection practices align with privacy regulations. Clear consent mechanisms in place.'
        },
        dataStorage: {
          status: 'partially_compliant',
          score: 78,
          details: 'Data storage systems meet basic requirements. Encryption upgrades needed for sensitive data.'
        },
        dataAccess: {
          status: 'compliant',
          score: 85,
          details: 'Access controls properly implemented with role-based permissions and audit logging.'
        },
        dataRetention: {
          status: 'partially_compliant',
          score: 75,
          details: 'Retention policies defined but automated deletion processes need implementation.'
        },
        thirdPartySharing: {
          status: 'compliant',
          score: 88,
          details: 'Third-party data sharing agreements in place with appropriate safeguards.'
        }
      },
      risks: {
        identifiedRisks: [
          {
            risk: 'Data Breach Due to Inadequate Encryption',
            severity: 'medium',
            mitigation: 'Implement end-to-end encryption for all sensitive procurement data',
            status: 'planned',
            dueDate: '2026-02-01'
          }
        ],
        overallRiskRating: 'medium',
        riskScore: 45
      },
      audits: {
        lastAuditDate: '2025-11-30',
        nextAuditDate: '2026-02-28',
        auditor: 'Data Protection Officer',
        auditScore: 83,
        findings: 'Generally compliant with room for improvement in automated data lifecycle management.'
      },
      responsible: {
        officer: 'Sarah Johnson',
        department: 'IT Security & Privacy',
        email: 'sarah.johnson@organization.org',
        phone: '+1-555-0125'
      },
      metadata: {
        createdBy: 'data_protection_officer',
        reviewedBy: 'chief_information_officer',
        version: '1.2',
        confidential: false,
        framework: 'GDPR/Privacy Regulations'
      }
    },
    {
      id: 'COMP-2024-078',
      type: 'financial_compliance',
      status: 'compliant',
      riskLevel: 'low',
      category: 'financial_controls',
      title: 'Financial Controls and Budget Compliance',
      description: 'Assessment of financial controls, budget adherence, and fiscal responsibility in procurement activities.',
      procurementRef: 'PROC-2024-078',
      assessmentDate: '2025-12-16',
      nextReviewDate: '2026-03-16',
      lastUpdated: '2025-12-20',
      compliance: {
        overallScore: 96,
        maxScore: 100,
        compliancePercentage: 96,
        criticalIssues: 0,
        majorIssues: 0,
        minorIssues: 2,
        recommendationsImplemented: 10,
        totalRecommendations: 12
      },
      requirements: {
        budgetAdherence: {
          status: 'compliant',
          score: 98,
          details: 'All procurements within approved budget limits. Proper authorization controls in place.'
        },
        costControls: {
          status: 'compliant',
          score: 94,
          details: 'Cost control mechanisms effective. Regular monitoring and variance reporting implemented.'
        },
        paymentControls: {
          status: 'compliant',
          score: 96,
          details: 'Payment authorization controls robust with proper segregation of duties.'
        },
        contractFinancials: {
          status: 'compliant',
          score: 95,
          details: 'Contract financial terms properly managed with appropriate milestone tracking.'
        },
        auditTrail: {
          status: 'compliant',
          score: 97,
          details: 'Comprehensive financial audit trail maintained for all procurement transactions.'
        }
      },
      risks: {
        identifiedRisks: [
          {
            risk: 'Manual Process Dependencies in Small Value Procurements',
            severity: 'low',
            mitigation: 'Automate approval workflows for small value procurement to reduce manual errors',
            status: 'planned',
            dueDate: '2026-04-01'
          }
        ],
        overallRiskRating: 'low',
        riskScore: 20
      },
      audits: {
        lastAuditDate: '2025-12-01',
        nextAuditDate: '2026-03-01',
        auditor: 'Internal Financial Audit Team',
        auditScore: 97,
        findings: 'Excellent financial controls with minor process optimization opportunities.'
      },
      responsible: {
        officer: 'Michael Chen',
        department: 'Finance Department',
        email: 'michael.chen@organization.org',
        phone: '+1-555-0126'
      },
      metadata: {
        createdBy: 'financial_analyst_1',
        reviewedBy: 'chief_financial_officer',
        version: '1.1',
        confidential: false,
        framework: 'Internal Financial Controls'
      }
    },
    {
      id: 'COMP-2025-004',
      type: 'environmental_compliance',
      status: 'under_review',
      riskLevel: 'medium',
      category: 'environmental_standards',
      title: 'Environmental Impact and Sustainability Compliance',
      description: 'Assessment of environmental impact considerations and sustainability requirements in procurement processes.',
      procurementRef: 'PROC-2025-004',
      assessmentDate: '2025-12-21',
      nextReviewDate: '2026-01-21',
      lastUpdated: '2025-12-24',
      compliance: {
        overallScore: 0, // Under review
        maxScore: 100,
        compliancePercentage: 0,
        criticalIssues: 0,
        majorIssues: 0,
        minorIssues: 0,
        recommendationsImplemented: 0,
        totalRecommendations: 0
      },
      requirements: {
        environmentalImpact: {
          status: 'under_review',
          score: 0,
          details: 'Environmental impact assessment currently being conducted by external specialists.'
        },
        sustainabilityCriteria: {
          status: 'under_review',
          score: 0,
          details: 'Sustainability criteria being developed for integration into procurement evaluation.'
        },
        supplierEnvironmentalStandards: {
          status: 'under_review',
          score: 0,
          details: 'Supplier environmental compliance requirements under development.'
        },
        wasteManagement: {
          status: 'under_review',
          score: 0,
          details: 'Waste management protocols for procurement activities being assessed.'
        },
        carbonFootprint: {
          status: 'under_review',
          score: 0,
          details: 'Carbon footprint measurement and reduction strategies being evaluated.'
        }
      },
      risks: {
        identifiedRisks: [
          {
            risk: 'Incomplete Environmental Assessment',
            severity: 'medium',
            mitigation: 'Engage certified environmental consultants to complete comprehensive assessment',
            status: 'active',
            dueDate: '2026-01-15'
          }
        ],
        overallRiskRating: 'medium',
        riskScore: 55
      },
      audits: {
        lastAuditDate: null,
        nextAuditDate: '2026-02-01',
        auditor: 'Environmental Compliance Specialist',
        auditScore: 0,
        findings: 'Initial assessment pending completion of environmental review process.'
      },
      responsible: {
        officer: 'Emma Wilson',
        department: 'Environmental Affairs',
        email: 'emma.wilson@organization.org',
        phone: '+1-555-0127'
      },
      metadata: {
        createdBy: 'environmental_officer_1',
        reviewedBy: null,
        version: '1.0',
        confidential: false,
        framework: 'ISO 14001 / Environmental Standards'
      }
    }
  ]);

  // Compliance statistics
  const stats = {
    totalCompliance: complianceItems.length,
    compliantItems: complianceItems.filter(c => c.status === 'compliant').length,
    nonCompliantItems: complianceItems.filter(c => c.status === 'non_compliant').length,
    partiallyCompliantItems: complianceItems.filter(c => c.status === 'partially_compliant').length,
    underReviewItems: complianceItems.filter(c => c.status === 'under_review').length,
    highRiskItems: complianceItems.filter(c => c.riskLevel === 'high').length,
    averageComplianceScore: Math.round(complianceItems.reduce((sum, c) => sum + c.compliance.compliancePercentage, 0) / complianceItems.length),
    totalCriticalIssues: complianceItems.reduce((sum, c) => sum + c.compliance.criticalIssues, 0),
    totalMajorIssues: complianceItems.reduce((sum, c) => sum + c.compliance.majorIssues, 0),
    implementationRate: Math.round((complianceItems.reduce((sum, c) => sum + c.compliance.recommendationsImplemented, 0) / complianceItems.reduce((sum, c) => sum + c.compliance.totalRecommendations, 0)) * 100)
  };

  // Filter compliance items
  const filteredComplianceItems = complianceItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.procurementRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesRisk = riskFilter === 'all' || item.riskLevel === riskFilter;
    return matchesSearch && matchesStatus && matchesCategory && matchesRisk;
  });

  // Status configurations
  const statusConfig = {
    compliant: { label: 'Compliant', color: '#10b981', bg: '#d1fae5', icon: '✅' },
    non_compliant: { label: 'Non-Compliant', color: '#ef4444', bg: '#fee2e2', icon: '❌' },
    partially_compliant: { label: 'Partially Compliant', color: '#f59e0b', bg: '#fef3c7', icon: '⚠️' },
    under_review: { label: 'Under Review', color: '#3b82f6', bg: '#dbeafe', icon: '🔍' },
    pending: { label: 'Pending', color: '#6b7280', bg: '#f9fafb', icon: '⏳' }
  };

  // Risk level configurations
  const riskConfig = {
    high: { label: 'High Risk', color: '#ef4444', bg: '#fee2e2', icon: '🔴' },
    medium: { label: 'Medium Risk', color: '#f59e0b', bg: '#fef3c7', icon: '🟡' },
    low: { label: 'Low Risk', color: '#10b981', bg: '#d1fae5', icon: '🟢' }
  };

  // Category configurations
  const categoryConfig = {
    procurement_regulations: { label: 'Procurement Regulations', icon: '📋', color: '#3b82f6' },
    internal_policies: { label: 'Internal Policies', icon: '🏢', color: '#8b5cf6' },
    data_protection: { label: 'Data Protection', icon: '🔒', color: '#06b6d4' },
    financial_controls: { label: 'Financial Controls', icon: '💰', color: '#10b981' },
    environmental_standards: { label: 'Environmental Standards', icon: '🌱', color: '#84cc16' }
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

  const getRiskBadge = (riskLevel) => {
    const config = riskConfig[riskLevel];
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

  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getComplianceBarColor = (percentage) => {
    if (percentage >= 90) return '#10b981'; // Green
    if (percentage >= 75) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  const renderComplianceTab = () => (
    <div className="compliance-content">
      {/* Statistics Section */}
      <div className="stats-section">
        <h2 className="section-title">Compliance Overview</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.totalCompliance}</div>
            <div className="stat-label">Total Assessments</div>
            <div className="stat-icon">📊</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.compliantItems}</div>
            <div className="stat-label">Compliant</div>
            <div className="stat-icon">✅</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.nonCompliantItems}</div>
            <div className="stat-label">Non-Compliant</div>
            <div className="stat-icon">❌</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.highRiskItems}</div>
            <div className="stat-label">High Risk</div>
            <div className="stat-icon">🔴</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.averageComplianceScore}%</div>
            <div className="stat-label">Avg Compliance Score</div>
            <div className="stat-icon">📈</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.implementationRate}%</div>
            <div className="stat-label">Implementation Rate</div>
            <div className="stat-icon">🎯</div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="search-group">
          <label>Search Compliance Items</label>
          <input
            type="text"
            placeholder="Search by title, description, reference, or ID..."
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
            <option value="compliant">Compliant</option>
            <option value="non_compliant">Non-Compliant</option>
            <option value="partially_compliant">Partially Compliant</option>
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
            <option value="procurement_regulations">Procurement Regulations</option>
            <option value="internal_policies">Internal Policies</option>
            <option value="data_protection">Data Protection</option>
            <option value="financial_controls">Financial Controls</option>
            <option value="environmental_standards">Environmental Standards</option>
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
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Compliance Table */}
      <div className="table-section">
        <div className="table-header">
          <h3>Compliance Registry ({filteredComplianceItems.length})</h3>
          <button 
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
          >
            + New Assessment
          </button>
        </div>
        
        <div className="table-container">
          <table className="compliance-table">
            <thead>
              <tr>
                <th>Compliance Details</th>
                <th>Category & Framework</th>
                <th>Status & Risk Assessment</th>
                <th>Compliance Score</th>
                <th>Issues & Recommendations</th>
                <th>Timeline & Reviews</th>
                <th>Responsible Officer</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredComplianceItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="compliance-info">
                      <div className="compliance-ref">{item.id}</div>
                      <div className="compliance-title">{item.title}</div>
                      <div className="compliance-description">{item.description.substring(0, 120)}...</div>
                      <div className="proc-ref">Proc: {item.procurementRef}</div>
                    </div>
                  </td>
                  <td>
                    <div className="category-info">
                      <div 
                        className="category-badge"
                        style={{ 
                          backgroundColor: `${categoryConfig[item.category]?.color}15`, 
                          color: categoryConfig[item.category]?.color 
                        }}
                      >
                        <span className="category-icon">{categoryConfig[item.category]?.icon}</span>
                        {categoryConfig[item.category]?.label}
                      </div>
                      <div className="framework-info">{item.metadata.framework}</div>
                      <div className="type-label">{item.type.replace('_', ' ')}</div>
                    </div>
                  </td>
                  <td>
                    <div className="status-risk">
                      <div className="status-display">{getStatusBadge(item.status)}</div>
                      <div className="risk-display">{getRiskBadge(item.riskLevel)}</div>
                      <div className="risk-score">Risk Score: {item.risks.riskScore}/100</div>
                    </div>
                  </td>
                  <td>
                    <div className="compliance-score">
                      <div className="score-circle" style={{ '--percentage': item.compliance.compliancePercentage }}>
                        <div className="score-value">{item.compliance.compliancePercentage}%</div>
                      </div>
                      <div className="score-details">
                        <div className="score-points">{item.compliance.overallScore}/{item.compliance.maxScore}</div>
                        <div className="compliance-bar">
                          <div 
                            className="compliance-fill"
                            style={{ 
                              width: `${item.compliance.compliancePercentage}%`,
                              backgroundColor: getComplianceBarColor(item.compliance.compliancePercentage)
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="issues-recommendations">
                      <div className="issues-summary">
                        <div className="issue-count critical">Critical: {item.compliance.criticalIssues}</div>
                        <div className="issue-count major">Major: {item.compliance.majorIssues}</div>
                        <div className="issue-count minor">Minor: {item.compliance.minorIssues}</div>
                      </div>
                      <div className="recommendations-progress">
                        <div className="rec-label">Recommendations</div>
                        <div className="rec-fraction">
                          {item.compliance.recommendationsImplemented}/{item.compliance.totalRecommendations}
                        </div>
                        <div className="rec-bar">
                          <div 
                            className="rec-fill"
                            style={{ 
                              width: `${(item.compliance.recommendationsImplemented / item.compliance.totalRecommendations) * 100}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="timeline-info">
                      <div className="assessment-date">Assessed: {formatDate(item.assessmentDate)}</div>
                      <div className="next-review">Next Review: {formatDate(item.nextReviewDate)}</div>
                      <div className="last-audit">Last Audit: {formatDate(item.audits.lastAuditDate)}</div>
                      <div className="audit-score">Audit Score: {item.audits.auditScore || 'Pending'}</div>
                    </div>
                  </td>
                  <td>
                    <div className="responsible-officer">
                      <div className="officer-name">{item.responsible.officer}</div>
                      <div className="officer-dept">{item.responsible.department}</div>
                      <div className="officer-contact">{item.responsible.email}</div>
                      <div className="officer-phone">{item.responsible.phone}</div>
                    </div>
                  </td>
                  <td className="actions-cell">
                    <div className="action-buttons">
                      <button className="action-btn" title="View Details">👁️</button>
                      <button className="action-btn" title="Edit Assessment">✏️</button>
                      <button className="action-btn" title="Generate Report">📊</button>
                      <button className="action-btn" title="Schedule Audit">🔍</button>
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

  const renderRiskDashboardTab = () => (
    <div className="risk-dashboard">
      <h2 className="section-title">Risk Dashboard</h2>
      <div className="risk-grid">
        <div className="risk-card">
          <h3>Risk Distribution</h3>
          <div className="risk-chart">
            <div className="risk-item high">
              <span>🔴 High Risk</span>
              <span>{stats.highRiskItems}</span>
            </div>
            <div className="risk-item medium">
              <span>🟡 Medium Risk</span>
              <span>{complianceItems.filter(c => c.riskLevel === 'medium').length}</span>
            </div>
            <div className="risk-item low">
              <span>🟢 Low Risk</span>
              <span>{complianceItems.filter(c => c.riskLevel === 'low').length}</span>
            </div>
          </div>
        </div>
        
        <div className="risk-card">
          <h3>Critical Issues</h3>
          <div className="critical-issues">
            <div className="critical-metric">
              <span className="metric-label">Critical Issues</span>
              <span className="metric-value critical">{stats.totalCriticalIssues}</span>
            </div>
            <div className="critical-metric">
              <span className="metric-label">Major Issues</span>
              <span className="metric-value major">{stats.totalMajorIssues}</span>
            </div>
            <div className="critical-metric">
              <span className="metric-label">Immediate Action Required</span>
              <span className="metric-value urgent">{complianceItems.filter(c => c.risks.identifiedRisks.some(r => r.status === 'active' || r.status === 'escalated')).length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAuditTrailTab = () => (
    <div className="audit-trail">
      <h2 className="section-title">Audit Trail & History</h2>
      <div className="audit-timeline">
        {complianceItems.filter(item => item.audits.lastAuditDate).map((item, index) => (
          <div key={index} className="audit-timeline-item">
            <div className="audit-date">{formatDate(item.audits.lastAuditDate)}</div>
            <div className="audit-content">
              <div className="audit-title">{item.title}</div>
              <div className="audit-auditor">Auditor: {item.audits.auditor}</div>
              <div className="audit-score">Score: {item.audits.auditScore}/100</div>
              <div className="audit-findings">{item.audits.findings}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <StandardLayout title="Compliance Management">
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">
            <span className="title-icon">⚖️</span>
            Compliance Management
          </h1>
          <p className="page-subtitle">
            Monitor and manage compliance with STEP methodology, regulations, and organizational policies
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${activeView === 'compliance' ? 'active' : ''}`}
            onClick={() => setActiveView('compliance')}
          >
            ⚖️ Compliance Registry
          </button>
          <button 
            className={`nav-tab ${activeView === 'risk' ? 'active' : ''}`}
            onClick={() => setActiveView('risk')}
          >
            🔴 Risk Dashboard
          </button>
          <button 
            className={`nav-tab ${activeView === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveView('audit')}
          >
            🔍 Audit Trail
          </button>
          <button 
            className={`nav-tab ${activeView === 'frameworks' ? 'active' : ''}`}
            onClick={() => setActiveView('frameworks')}
          >
            📋 Frameworks
          </button>
        </div>

        {/* Content based on active view */}
        {activeView === 'compliance' && renderComplianceTab()}
        {activeView === 'risk' && renderRiskDashboardTab()}
        {activeView === 'audit' && renderAuditTrailTab()}
        {activeView === 'frameworks' && (
          <div className="coming-soon">
            <h2>Compliance Frameworks</h2>
            <p>Framework management and mapping tools coming soon...</p>
          </div>
        )}

        {/* Modal for new compliance assessment */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h3>Create New Compliance Assessment</h3>
              <p>Compliance assessment creation form coming soon...</p>
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
