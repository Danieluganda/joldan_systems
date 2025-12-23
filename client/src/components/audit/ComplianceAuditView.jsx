import React, { useState, useEffect } from 'react';

const ComplianceAuditView = ({ procurementId, onComplianceIssueSelect }) => {
  const [complianceData, setComplianceData] = useState({
    summary: {},
    issues: [],
    checks: [],
  });
  const [loading, setLoading] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedIssueId, setExpandedIssueId] = useState(null);

  // Mock compliance data
  const mockComplianceData = {
    summary: {
      totalChecks: 25,
      passed: 20,
      failed: 2,
      warnings: 3,
      complianceScore: 84,
      criticalIssues: 0,
      majorIssues: 2,
    },
    issues: [
      {
        id: 'comp-001',
        title: 'Documentation Incomplete',
        description: 'Supplier evaluation scorecard missing cost analysis breakdown',
        severity: 'major',
        status: 'open',
        affectedArea: 'Evaluation',
        discoveredDate: '2025-12-21T14:00:00Z',
        foundBy: 'Linda Davis',
        recommendedAction: 'Complete cost analysis breakdown before final approval',
        estimatedResolution: '2025-12-22T09:00:00Z',
        relatedChecks: ['eval-cost-analysis', 'eval-price-scoring'],
      },
      {
        id: 'comp-002',
        title: 'Process Timeline Deviation',
        description: 'Evaluation schedule exceeded planned duration by 2 days',
        severity: 'major',
        status: 'open',
        affectedArea: 'Process Adherence',
        discoveredDate: '2025-12-21T10:30:00Z',
        foundBy: 'John Smith',
        recommendedAction: 'Document reasons for delay and adjust future timelines',
        estimatedResolution: '2025-12-21T17:00:00Z',
        relatedChecks: ['process-timeline', 'process-milestones'],
      },
      {
        id: 'comp-003',
        title: 'Missing Signature Block',
        description: 'RFQ document lacks authorized signature from Finance Director',
        severity: 'warning',
        status: 'in-progress',
        affectedArea: 'Documentation',
        discoveredDate: '2025-12-17T11:00:00Z',
        foundBy: 'Sarah Williams',
        recommendedAction: 'Obtain Finance Director signature before distribution',
        estimatedResolution: '2025-12-18T15:00:00Z',
        relatedChecks: ['doc-authorization', 'doc-signatures'],
      },
      {
        id: 'comp-004',
        title: 'Potential Conflict of Interest',
        description: 'One evaluation committee member has direct relationship with bidding supplier',
        severity: 'critical',
        status: 'open',
        affectedArea: 'Ethics & Compliance',
        discoveredDate: '2025-12-20T08:00:00Z',
        foundBy: 'Compliance Officer',
        recommendedAction: 'Immediately remove committee member and reassign to alternate evaluator',
        estimatedResolution: '2025-12-20T12:00:00Z',
        relatedChecks: ['ethics-conflicts', 'eval-committee-independence'],
        escalated: true,
      },
      {
        id: 'comp-005',
        title: 'Supplier Compliance Verification Pending',
        description: 'Two suppliers have not submitted required compliance certifications',
        severity: 'warning',
        status: 'in-progress',
        affectedArea: 'Supplier Management',
        discoveredDate: '2025-12-19T14:00:00Z',
        foundBy: 'Michael Brown',
        recommendedAction: 'Request certification documents from suppliers',
        estimatedResolution: '2025-12-23T17:00:00Z',
        relatedChecks: ['supplier-certification', 'supplier-docs'],
      },
    ],
    checks: [
      {
        id: 'check-001',
        category: 'Process',
        name: 'Process Timeline Compliance',
        passed: true,
        message: 'Procurement followed schedule within acceptable variance',
      },
      {
        id: 'check-002',
        category: 'Documentation',
        name: 'Required Documents Present',
        passed: true,
        message: 'All core procurement documents submitted',
      },
      {
        id: 'check-003',
        category: 'Ethics',
        name: 'Conflict of Interest Check',
        passed: false,
        message: '1 conflict identified - requires resolution',
      },
      {
        id: 'check-004',
        category: 'Budget',
        name: 'Budget Adherence',
        passed: true,
        message: 'All bids within approved budget envelope',
      },
      {
        id: 'check-005',
        category: 'Supplier',
        name: 'Supplier Pre-qualification',
        passed: true,
        message: '15 suppliers verified as pre-qualified',
      },
      {
        id: 'check-006',
        category: 'Evaluation',
        name: 'Evaluation Criteria Met',
        passed: true,
        message: 'Evaluation includes all required scoring criteria',
      },
      {
        id: 'check-007',
        category: 'Documentation',
        name: 'Approval Chain Documented',
        passed: false,
        message: 'Missing approval signatures on key documents',
      },
      {
        id: 'check-008',
        category: 'Policy',
        name: 'Policy Compliance',
        passed: true,
        message: 'Process complies with procurement policies',
      },
    ],
  };

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setComplianceData(mockComplianceData);
      setLoading(false);
    }, 500);
  }, []);

  const getSeverityConfig = (severity) => {
    const config = {
      critical: { color: '#dc3545', bgColor: '#f8d7da', label: '🔴 Critical' },
      major: { color: '#fd7e14', bgColor: '#fff3cd', label: '🟠 Major' },
      warning: { color: '#ffc107', bgColor: '#fff8e1', label: '🟡 Warning' },
      info: { color: '#17a2b8', bgColor: '#d1ecf1', label: '🔵 Info' },
    };
    return config[severity] || config.info;
  };

  const getStatusConfig = (status) => {
    const config = {
      open: { color: '#dc3545', label: '● Open' },
      'in-progress': { color: '#ffc107', label: '◐ In Progress' },
      resolved: { color: '#28a745', label: '✓ Resolved' },
      closed: { color: '#6c757d', label: '◯ Closed' },
    };
    return config[status] || config.open;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredIssues = complianceData.issues.filter(issue => {
    const matchesSeverity = filterSeverity === 'all' || issue.severity === filterSeverity;
    const matchesStatus = filterStatus === 'all' || issue.status === filterStatus;
    return matchesSeverity && matchesStatus;
  });

  const passedChecks = complianceData.checks.filter(c => c.passed).length;
  const failedChecks = complianceData.checks.filter(c => !c.passed).length;

  if (loading) {
    return <div style={styles.container}><p>Loading compliance audit...</p></div>;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Compliance & Audit Review</h2>
          <p style={styles.subtitle}>Procurement ID: {procurementId}</p>
        </div>
      </div>

      {/* Compliance Score Card */}
      <div style={styles.scoreCard}>
        <div style={styles.scoreCircle}>
          <div style={styles.scoreValue}>{complianceData.summary.complianceScore}%</div>
          <div style={styles.scoreLabel}>Compliance Score</div>
        </div>

        <div style={styles.scoreStats}>
          <div style={styles.scoreStat}>
            <span style={styles.scoreStatLabel}>Total Checks</span>
            <span style={styles.scoreStatValue}>{complianceData.summary.totalChecks}</span>
          </div>
          <div style={styles.scoreStat}>
            <span style={styles.scoreStatLabel}>Passed</span>
            <span style={{ ...styles.scoreStatValue, color: '#28a745' }}>
              {complianceData.summary.passed}
            </span>
          </div>
          <div style={styles.scoreStat}>
            <span style={styles.scoreStatLabel}>Failed</span>
            <span style={{ ...styles.scoreStatValue, color: '#dc3545' }}>
              {complianceData.summary.failed}
            </span>
          </div>
          <div style={styles.scoreStat}>
            <span style={styles.scoreStatLabel}>Warnings</span>
            <span style={{ ...styles.scoreStatValue, color: '#ffc107' }}>
              {complianceData.summary.warnings}
            </span>
          </div>
          <div style={styles.scoreStat}>
            <span style={styles.scoreStatLabel}>Critical Issues</span>
            <span style={{ ...styles.scoreStatValue, color: '#dc3545' }}>
              {complianceData.summary.criticalIssues}
            </span>
          </div>
          <div style={styles.scoreStat}>
            <span style={styles.scoreStatLabel}>Major Issues</span>
            <span style={{ ...styles.scoreStatValue, color: '#fd7e14' }}>
              {complianceData.summary.majorIssues}
            </span>
          </div>
        </div>
      </div>

      {/* Checks Overview */}
      <div style={styles.checksSection}>
        <h3 style={styles.sectionTitle}>📋 Compliance Checks</h3>
        <div style={styles.checksGrid}>
          {complianceData.checks.map(check => (
            <div key={check.id} style={{
              ...styles.checkItem,
              borderLeftColor: check.passed ? '#28a745' : '#dc3545',
              backgroundColor: check.passed ? '#f0f9f5' : '#fff5f5',
            }}>
              <div style={styles.checkHeader}>
                <span style={styles.checkStatus}>
                  {check.passed ? '✓' : '✗'}
                </span>
                <div style={styles.checkInfo}>
                  <p style={styles.checkName}>{check.name}</p>
                  <p style={styles.checkCategory}>{check.category}</p>
                </div>
              </div>
              <p style={styles.checkMessage}>{check.message}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Issues and Actions */}
      <div style={styles.issuesSection}>
        <div style={styles.issuesHeader}>
          <h3 style={styles.sectionTitle}>⚠️ Compliance Issues ({filteredIssues.length})</h3>
          <div style={styles.filterArea}>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">All Severities</option>
              <option value="critical">🔴 Critical</option>
              <option value="major">🟠 Major</option>
              <option value="warning">🟡 Warning</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">All Status</option>
              <option value="open">● Open</option>
              <option value="in-progress">◐ In Progress</option>
              <option value="resolved">✓ Resolved</option>
            </select>
          </div>
        </div>

        {filteredIssues.length > 0 ? (
          <div style={styles.issuesList}>
            {filteredIssues.map(issue => {
              const severityConfig = getSeverityConfig(issue.severity);
              const statusConfig = getStatusConfig(issue.status);
              const isExpanded = expandedIssueId === issue.id;

              return (
                <div key={issue.id} style={styles.issueCard}>
                  {/* Issue Header */}
                  <div
                    style={{
                      ...styles.issueHeader,
                      borderLeftColor: severityConfig.color,
                    }}
                    onClick={() => setExpandedIssueId(isExpanded ? null : issue.id)}
                  >
                    <div style={styles.issueHeaderLeft}>
                      <span
                        style={{
                          ...styles.severityBadge,
                          backgroundColor: severityConfig.bgColor,
                          color: severityConfig.color,
                        }}
                      >
                        {severityConfig.label}
                      </span>
                      <h4 style={styles.issueTitle}>{issue.title}</h4>
                    </div>
                    <div style={styles.issueHeaderRight}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          color: statusConfig.color,
                        }}
                      >
                        {statusConfig.label}
                      </span>
                      <span style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
                    </div>
                  </div>

                  {/* Issue Body */}
                  {!isExpanded && (
                    <div style={styles.issuePreview}>
                      <p style={styles.issueDescription}>{issue.description}</p>
                      <div style={styles.issueMetaline}>
                        <span>{issue.affectedArea}</span>
                        <span>• Discovered {new Date(issue.discoveredDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div style={styles.issueExpanded}>
                      <p style={styles.issueDescription}>{issue.description}</p>

                      <div style={styles.detailsGrid}>
                        <div style={styles.detailItem}>
                          <span style={styles.detailLabel}>Affected Area</span>
                          <span style={styles.detailValue}>{issue.affectedArea}</span>
                        </div>
                        <div style={styles.detailItem}>
                          <span style={styles.detailLabel}>Discovered By</span>
                          <span style={styles.detailValue}>👤 {issue.foundBy}</span>
                        </div>
                        <div style={styles.detailItem}>
                          <span style={styles.detailLabel}>Discovered Date</span>
                          <span style={styles.detailValue}>{formatDate(issue.discoveredDate)}</span>
                        </div>
                        <div style={styles.detailItem}>
                          <span style={styles.detailLabel}>Est. Resolution</span>
                          <span style={styles.detailValue}>{formatDate(issue.estimatedResolution)}</span>
                        </div>
                      </div>

                      <div style={styles.recommendationBox}>
                        <h5 style={styles.recommendationTitle}>📝 Recommended Action</h5>
                        <p style={styles.recommendationText}>{issue.recommendedAction}</p>
                      </div>

                      {issue.escalated && (
                        <div style={styles.escalationBox}>
                          <span style={styles.escalationIcon}>🚨</span>
                          <span style={styles.escalationText}>
                            This issue has been escalated for immediate attention
                          </span>
                        </div>
                      )}

                      {issue.relatedChecks && issue.relatedChecks.length > 0 && (
                        <div style={styles.relatedChecksBox}>
                          <h5 style={styles.relatedChecksTitle}>Related Checks</h5>
                          <div style={styles.checkTagsList}>
                            {issue.relatedChecks.map(checkId => (
                              <span key={checkId} style={styles.checkTag}>
                                {checkId}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div style={styles.actionButtons}>
                        <button
                          onClick={() => onComplianceIssueSelect?.(issue)}
                          style={{ ...styles.actionBtn, backgroundColor: '#007bff' }}
                        >
                          📋 View Details
                        </button>
                        <button style={{ ...styles.actionBtn, backgroundColor: '#28a745' }}>
                          ✓ Mark as Resolved
                        </button>
                        <button style={{ ...styles.actionBtn, backgroundColor: '#6c757d' }}>
                          📝 Add Note
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={styles.noIssuesState}>
            <p style={styles.noIssuesText}>✓ No compliance issues match the selected filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '24px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '2px solid #e9ecef',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#212529',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '13px',
    color: '#6c757d',
    margin: '0',
  },
  scoreCard: {
    backgroundColor: 'white',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '24px',
    display: 'flex',
    gap: '32px',
    alignItems: 'center',
  },
  scoreCircle: {
    width: '140px',
    height: '140px',
    borderRadius: '50%',
    backgroundColor: '#f0f0f0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    border: '4px solid #007bff',
    flexShrink: 0,
  },
  scoreValue: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#007bff',
  },
  scoreLabel: {
    fontSize: '12px',
    color: '#6c757d',
    marginTop: '4px',
  },
  scoreStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '24px',
    flex: 1,
  },
  scoreStat: {
    display: 'flex',
    flexDirection: 'column',
  },
  scoreStatLabel: {
    fontSize: '12px',
    color: '#6c757d',
    fontWeight: '600',
  },
  scoreStatValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#212529',
    marginTop: '4px',
  },
  checksSection: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#212529',
    margin: '0 0 16px 0',
  },
  checksGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '12px',
  },
  checkItem: {
    backgroundColor: 'white',
    border: '1px solid #dee2e6',
    borderLeft: '4px solid #28a745',
    borderRadius: '6px',
    padding: '12px',
  },
  checkHeader: {
    display: 'flex',
    gap: '10px',
    marginBottom: '8px',
  },
  checkStatus: {
    fontSize: '18px',
    fontWeight: 'bold',
    minWidth: '24px',
  },
  checkInfo: {
    flex: 1,
  },
  checkName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#212529',
    margin: '0',
  },
  checkCategory: {
    fontSize: '11px',
    color: '#6c757d',
    margin: '4px 0 0 0',
  },
  checkMessage: {
    fontSize: '12px',
    color: '#495057',
    margin: '0',
    lineHeight: '1.4',
  },
  issuesSection: {
    marginBottom: '24px',
  },
  issuesHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    gap: '12px',
  },
  filterArea: {
    display: 'flex',
    gap: '8px',
  },
  filterSelect: {
    padding: '6px 10px',
    fontSize: '12px',
    border: '1px solid #dee2e6',
    borderRadius: '4px',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  issuesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  issueCard: {
    backgroundColor: 'white',
    border: '1px solid #dee2e6',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  issueHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #dee2e6',
    borderLeft: '4px solid #fd7e14',
    cursor: 'pointer',
    transition: 'backgroundColor 0.2s ease',
  },
  issueHeaderLeft: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flex: 1,
  },
  severityBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  issueTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#212529',
    margin: '0',
  },
  issueHeaderRight: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  statusBadge: {
    fontSize: '12px',
    fontWeight: '600',
  },
  expandIcon: {
    fontSize: '12px',
    color: '#6c757d',
  },
  issuePreview: {
    padding: '12px',
  },
  issueDescription: {
    fontSize: '13px',
    color: '#495057',
    margin: '0 0 8px 0',
    lineHeight: '1.4',
  },
  issueMetaline: {
    fontSize: '12px',
    color: '#6c757d',
  },
  issueExpanded: {
    padding: '16px',
    borderTop: '1px solid #dee2e6',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid #dee2e6',
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
  },
  detailLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#6c757d',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: '13px',
    color: '#212529',
    marginTop: '4px',
  },
  recommendationBox: {
    backgroundColor: '#d1ecf1',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '12px',
    border: '1px solid #bee5eb',
  },
  recommendationTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#0c5460',
    margin: '0 0 8px 0',
  },
  recommendationText: {
    fontSize: '13px',
    color: '#0c5460',
    margin: '0',
    lineHeight: '1.4',
  },
  escalationBox: {
    backgroundColor: '#f8d7da',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '12px',
    border: '1px solid #f5c6cb',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  escalationIcon: {
    fontSize: '14px',
  },
  escalationText: {
    fontSize: '12px',
    color: '#721c24',
    fontWeight: '600',
  },
  relatedChecksBox: {
    marginBottom: '12px',
  },
  relatedChecksTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#495057',
    margin: '0 0 8px 0',
  },
  checkTagsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  checkTag: {
    backgroundColor: '#e7f3ff',
    color: '#0066cc',
    padding: '4px 8px',
    borderRadius: '3px',
    fontSize: '11px',
    fontFamily: 'monospace',
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #dee2e6',
  },
  actionBtn: {
    flex: 1,
    padding: '8px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease',
  },
  noIssuesState: {
    backgroundColor: '#d4edda',
    padding: '24px',
    borderRadius: '6px',
    border: '1px solid #c3e6cb',
    textAlign: 'center',
  },
  noIssuesText: {
    color: '#155724',
    margin: '0',
    fontWeight: '500',
  },
};

export default ComplianceAuditView;
