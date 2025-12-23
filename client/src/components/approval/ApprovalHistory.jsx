import React, { useState, useEffect } from 'react';

const ApprovalHistory = ({ procurementId, onApprovalSelect }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  // Mock approval history data
  const mockHistory = [
    {
      id: 'appr-hist-001',
      procurementId,
      documentName: 'Procurement Plan v2.0',
      documentType: 'Plan',
      submittedBy: 'Alice Johnson',
      submittedDate: '2025-12-15T09:30:00Z',
      approvedBy: 'Sarah Manager',
      approvalDate: '2025-12-15T16:00:00Z',
      status: 'approved',
      comments: 'Plan approved with timeline optimization',
      duration: '6.5 hours',
      priority: 'high',
    },
    {
      id: 'appr-hist-002',
      procurementId,
      documentName: 'Budget Approval',
      documentType: 'Budget',
      submittedBy: 'Sarah Williams',
      submittedDate: '2025-12-15T11:00:00Z',
      approvedBy: 'Finance Director',
      approvalDate: '2025-12-15T14:30:00Z',
      status: 'approved',
      comments: 'Budget approved with 10% contingency',
      duration: '3.5 hours',
      priority: 'high',
    },
    {
      id: 'appr-hist-003',
      procurementId,
      documentName: 'RFQ Template Standard v3.1',
      documentType: 'RFQ',
      submittedBy: 'Robert Chen',
      submittedDate: '2025-12-16T10:00:00Z',
      approvedBy: 'Procurement Manager',
      approvalDate: '2025-12-17T08:00:00Z',
      status: 'approved',
      comments: 'Standard template approved for use',
      duration: '22 hours',
      priority: 'high',
    },
    {
      id: 'appr-hist-004',
      procurementId,
      documentName: 'Supplier Pre-qualification List',
      documentType: 'Supplier',
      submittedBy: 'Michael Brown',
      submittedDate: '2025-12-18T08:00:00Z',
      rejectedBy: 'Compliance Officer',
      rejectionDate: '2025-12-18T11:30:00Z',
      status: 'rejected',
      comments: 'Two suppliers missing compliance certifications. Resubmit with complete documentation.',
      duration: '3.5 hours',
      priority: 'high',
      rejectionReason: 'Incomplete documentation',
    },
    {
      id: 'appr-hist-005',
      procurementId,
      documentName: 'Supplier Pre-qualification List (Revised)',
      documentType: 'Supplier',
      submittedBy: 'Michael Brown',
      submittedDate: '2025-12-19T13:00:00Z',
      approvedBy: 'Compliance Officer',
      approvalDate: '2025-12-19T14:45:00Z',
      status: 'approved',
      comments: 'All supplier certifications now complete and verified',
      duration: '1.75 hours',
      priority: 'high',
    },
    {
      id: 'appr-hist-006',
      procurementId,
      documentName: 'Clarification Responses',
      documentType: 'Clarification',
      submittedBy: 'John Smith',
      submittedDate: '2025-12-19T15:00:00Z',
      approvedBy: 'Procurement Manager',
      approvalDate: '2025-12-20T09:00:00Z',
      status: 'approved',
      comments: 'All clarification requests answered appropriately',
      duration: '18 hours',
      priority: 'medium',
    },
    {
      id: 'appr-hist-007',
      procurementId,
      documentName: 'Evaluation Scorecard - First Pass',
      documentType: 'Evaluation',
      submittedBy: 'Linda Davis',
      submittedDate: '2025-12-21T14:30:00Z',
      requestedChangesBy: 'Director',
      changesRequestedDate: '2025-12-21T15:00:00Z',
      status: 'changes-requested',
      comments: 'Please add cost analysis breakdown for each bid',
      duration: '0.5 hours',
      priority: 'critical',
    },
  ];

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setHistory(mockHistory);
      setLoading(false);
    }, 500);
  }, []);

  const getStatusConfig = (status) => {
    const config = {
      approved: { bg: '#d4edda', color: '#155724', label: '✓ Approved', icon: '✓' },
      rejected: { bg: '#f8d7da', color: '#721c24', label: '✗ Rejected', icon: '✗' },
      'changes-requested': { bg: '#fff3cd', color: '#856404', label: '◐ Changes Requested', icon: '◐' },
      pending: { bg: '#d1ecf1', color: '#0c5460', label: '⏳ Pending', icon: '⏳' },
    };
    return config[status] || config.pending;
  };

  const getPriorityConfig = (priority) => {
    const config = {
      critical: { color: '#dc3545', label: '🔴 Critical' },
      high: { color: '#fd7e14', label: '🟠 High' },
      medium: { color: '#ffc107', label: '🟡 Medium' },
      low: { color: '#17a2b8', label: '🔵 Low' },
    };
    return config[priority] || config.medium;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const calculateDuration = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const hours = (end - start) / (1000 * 60 * 60);

    if (hours < 1) {
      const minutes = Math.round((hours * 60) % 60);
      return `${minutes}m`;
    } else if (hours < 24) {
      const wholeHours = Math.floor(hours);
      const minutes = Math.round((hours % 1) * 60);
      return `${wholeHours}h ${minutes}m`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.round(hours % 24);
      return `${days}d ${remainingHours}h`;
    }
  };

  const filteredHistory = history.filter(item => {
    if (filterStatus === 'all') return true;
    return item.status === filterStatus;
  });

  const getApproverInfo = (item) => {
    if (item.status === 'approved') {
      return { name: item.approvedBy, date: item.approvalDate, label: 'Approved by' };
    } else if (item.status === 'rejected') {
      return { name: item.rejectedBy, date: item.rejectionDate, label: 'Rejected by' };
    } else if (item.status === 'changes-requested') {
      return { name: item.requestedChangesBy, date: item.changesRequestedDate, label: 'Changes requested by' };
    }
    return null;
  };

  if (loading) {
    return <div style={styles.container}><p>Loading approval history...</p></div>;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>📋 Approval History</h2>
          <p style={styles.subtitle}>Procurement ID: {procurementId} • {history.length} approvals</p>
        </div>
      </div>

      {/* Statistics */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{history.filter(h => h.status === 'approved').length}</span>
          <span style={styles.statLabel}>Approved</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{history.filter(h => h.status === 'rejected').length}</span>
          <span style={styles.statLabel}>Rejected</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{history.filter(h => h.status === 'changes-requested').length}</span>
          <span style={styles.statLabel}>Changes Requested</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{history.length}</span>
          <span style={styles.statLabel}>Total</span>
        </div>
      </div>

      {/* Filter */}
      <div style={styles.filterSection}>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="all">All Statuses</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="changes-requested">Changes Requested</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Timeline */}
      <div style={styles.timeline}>
        {filteredHistory.map((item, index) => {
          const statusConfig = getStatusConfig(item.status);
          const priorityConfig = getPriorityConfig(item.priority);
          const approverInfo = getApproverInfo(item);
          const isExpanded = expandedId === item.id;

          return (
            <div key={item.id} style={styles.timelineItem}>
              {/* Timeline Connector */}
              {index < filteredHistory.length - 1 && (
                <div
                  style={{
                    ...styles.connector,
                    backgroundColor: statusConfig.color,
                  }}
                />
              )}

              {/* Timeline Card */}
              <div
                style={{
                  ...styles.card,
                  borderLeftColor: statusConfig.color,
                }}
              >
                {/* Card Header */}
                <div
                  style={styles.cardHeader}
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <div style={styles.headerLeft}>
                    {/* Dot */}
                    <div
                      style={{
                        ...styles.dot,
                        backgroundColor: statusConfig.color,
                      }}
                    />

                    {/* Content */}
                    <div style={styles.headerContent}>
                      <h4 style={styles.documentTitle}>{item.documentName}</h4>
                      <p style={styles.documentType}>{item.documentType}</p>
                    </div>
                  </div>

                  <div style={styles.headerRight}>
                    <span
                      style={{
                        ...styles.badge,
                        backgroundColor: statusConfig.bg,
                        color: statusConfig.color,
                      }}
                    >
                      {statusConfig.label}
                    </span>
                    <span
                      style={{
                        ...styles.badge,
                        backgroundColor: '#f0f0f0',
                        color: priorityConfig.color,
                      }}
                    >
                      {priorityConfig.label}
                    </span>
                    <span style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div style={styles.expandedContent}>
                    {/* Submission Info */}
                    <div style={styles.infoSection}>
                      <h5 style={styles.infoTitle}>📤 Submitted</h5>
                      <div style={styles.infoGrid}>
                        <div style={styles.infoItem}>
                          <span style={styles.infoLabel}>By</span>
                          <span style={styles.infoValue}>👤 {item.submittedBy}</span>
                        </div>
                        <div style={styles.infoItem}>
                          <span style={styles.infoLabel}>Date</span>
                          <span style={styles.infoValue}>{formatDate(item.submittedDate)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Approval Info */}
                    {approverInfo && (
                      <div style={styles.infoSection}>
                        <h5 style={styles.infoTitle}>
                          {item.status === 'approved' && '✓ Approved'}
                          {item.status === 'rejected' && '✗ Rejected'}
                          {item.status === 'changes-requested' && '◐ Changes Requested'}
                        </h5>
                        <div style={styles.infoGrid}>
                          <div style={styles.infoItem}>
                            <span style={styles.infoLabel}>{approverInfo.label}</span>
                            <span style={styles.infoValue}>👤 {approverInfo.name}</span>
                          </div>
                          <div style={styles.infoItem}>
                            <span style={styles.infoLabel}>Date</span>
                            <span style={styles.infoValue}>{formatDate(approverInfo.date)}</span>
                          </div>
                          <div style={styles.infoItem}>
                            <span style={styles.infoLabel}>Duration</span>
                            <span style={styles.infoValue}>{item.duration}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Comments */}
                    {item.comments && (
                      <div style={styles.commentsSection}>
                        <h5 style={styles.commentsTitle}>💬 Comments</h5>
                        <p style={styles.commentsText}>{item.comments}</p>
                      </div>
                    )}

                    {/* Rejection Reason */}
                    {item.rejectionReason && (
                      <div style={styles.rejectionBox}>
                        <h5 style={styles.rejectionTitle}>Reason for Rejection</h5>
                        <p style={styles.rejectionText}>{item.rejectionReason}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={styles.actions}>
                      <button
                        style={{ ...styles.actionBtn, backgroundColor: '#007bff' }}
                        onClick={() => onApprovalSelect?.(item)}
                      >
                        📋 View Full Details
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredHistory.length === 0 && (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>No approval history found for the selected filter</p>
        </div>
      )}
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
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: '12px',
    marginBottom: '24px',
  },
  statCard: {
    backgroundColor: 'white',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
    textAlign: 'center',
  },
  statValue: {
    display: 'block',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: '4px',
  },
  statLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#6c757d',
  },
  filterSection: {
    marginBottom: '24px',
  },
  filterSelect: {
    padding: '8px 12px',
    fontSize: '12px',
    border: '1px solid #dee2e6',
    borderRadius: '4px',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  timeline: {
    position: 'relative',
  },
  timelineItem: {
    position: 'relative',
    marginBottom: '16px',
  },
  connector: {
    marginLeft: '20px',
    height: '16px',
    borderLeft: '3px solid #dee2e6',
  },
  card: {
    backgroundColor: 'white',
    border: '1px solid #dee2e6',
    borderLeft: '4px solid #28a745',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #dee2e6',
    cursor: 'pointer',
    transition: 'backgroundColor 0.2s ease',
  },
  headerLeft: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flex: 1,
  },
  dot: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  headerContent: {
    flex: 1,
  },
  documentTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#212529',
    margin: '0',
  },
  documentType: {
    fontSize: '12px',
    color: '#6c757d',
    margin: '4px 0 0 0',
  },
  headerRight: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  badge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  expandIcon: {
    fontSize: '12px',
    color: '#6c757d',
  },
  expandedContent: {
    padding: '16px',
  },
  infoSection: {
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid #dee2e6',
  },
  infoTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#495057',
    margin: '0 0 12px 0',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
  },
  infoLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#6c757d',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: '13px',
    color: '#212529',
    marginTop: '4px',
  },
  commentsSection: {
    backgroundColor: '#d1ecf1',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '12px',
    border: '1px solid #bee5eb',
  },
  commentsTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#0c5460',
    margin: '0 0 8px 0',
  },
  commentsText: {
    fontSize: '13px',
    color: '#0c5460',
    margin: '0',
    lineHeight: '1.4',
  },
  rejectionBox: {
    backgroundColor: '#f8d7da',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '12px',
    border: '1px solid #f5c6cb',
  },
  rejectionTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#721c24',
    margin: '0 0 8px 0',
  },
  rejectionText: {
    fontSize: '13px',
    color: '#721c24',
    margin: '0',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #dee2e6',
  },
  actionBtn: {
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  emptyState: {
    backgroundColor: 'white',
    padding: '32px',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
    textAlign: 'center',
  },
  emptyText: {
    color: '#6c757d',
    margin: '0',
  },
};

export default ApprovalHistory;
