import React, { useState, useEffect } from 'react';

const ApprovalTrail = ({ procurementId, onClose }) => {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedApproval, setExpandedApproval] = useState(null);

  // Mock approval trail data
  const mockApprovals = [
    {
      id: 'approval-trail-1',
      step: 'RFQ Release',
      action: 'approved',
      approver: 'Alice Johnson',
      approverRole: 'Procurement Manager',
      approverEmail: 'alice.johnson@company.com',
      timestamp: '2025-12-18T08:00:00Z',
      comments: 'RFQ templates and documentation verified. Ready for distribution to suppliers.',
    },
    {
      id: 'approval-trail-2',
      step: 'Evaluation Plan',
      action: 'approved',
      approver: 'Robert Chen',
      approverRole: 'Finance Director',
      approverEmail: 'robert.chen@company.com',
      timestamp: '2025-12-18T14:30:00Z',
      comments: 'Budget allocation approved. Evaluation criteria align with company standards.',
    },
    {
      id: 'approval-trail-3',
      step: 'Bid Reception',
      action: 'approved',
      approver: 'Sarah Williams',
      approverRole: 'Chief Operating Officer',
      approverEmail: 'sarah.williams@company.com',
      timestamp: '2025-12-20T16:45:00Z',
      comments: 'All bids received on time. Quality check completed.',
    },
    {
      id: 'approval-trail-4',
      step: 'Evaluation Results',
      action: 'approved',
      approver: 'Michael Brown',
      approverRole: 'Compliance Officer',
      approverEmail: 'michael.brown@company.com',
      timestamp: '2025-12-21T10:15:00Z',
      comments: 'Evaluation process complies with PPDA 2005. All documentation verified.',
    },
    {
      id: 'approval-trail-5',
      step: 'Contract Award',
      action: 'pending',
      approver: 'Linda Davis',
      approverRole: 'Director of Procurement',
      approverEmail: 'linda.davis@company.com',
      timestamp: null,
      comments: 'Awaiting review',
    },
    {
      id: 'approval-trail-6',
      step: 'Supplier Notification',
      action: 'blocked',
      approver: 'James Wilson',
      approverRole: 'Communications Manager',
      approverEmail: 'james.wilson@company.com',
      timestamp: null,
      comments: 'Awaiting contract award approval',
    },
  ];

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setApprovals(mockApprovals);
      setLoading(false);
    }, 500);
  }, []);

  const getActionIcon = (action) => {
    switch (action) {
      case 'approved':
        return '✓';
      case 'rejected':
        return '✕';
      case 'pending':
        return '⏱';
      case 'blocked':
        return '🔒';
      default:
        return '○';
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'approved':
        return '#28a745';
      case 'rejected':
        return '#dc3545';
      case 'pending':
        return '#ffc107';
      case 'blocked':
        return '#6c757d';
      default:
        return '#e9ecef';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Pending';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const approvedCount = approvals.filter(a => a.action === 'approved').length;
  const totalCompleted = approvals.filter(a => a.action === 'approved' || a.action === 'rejected').length;
  const completionPercentage = (totalCompleted / approvals.length) * 100;

  if (loading) {
    return <div style={styles.container}><p>Loading approval trail...</p></div>;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Approval Audit Trail</h2>
          <p style={styles.subtitle}>Procurement ID: {procurementId}</p>
        </div>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>
      </div>

      {/* Progress Summary */}
      <div style={styles.summaryBar}>
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>Workflow Progress</span>
          <div style={styles.progressBar}>
            <div
              style={{
                width: `${completionPercentage}%`,
                height: '100%',
                backgroundColor: '#007bff',
                borderRadius: '4px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <span style={styles.summaryValue}>{totalCompleted} of {approvals.length} steps completed</span>
        </div>
      </div>

      {/* Statistics */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <span style={styles.statIcon}>✓</span>
          <span style={styles.statValue}>{approvedCount}</span>
          <span style={styles.statLabel}>Approved</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statIcon}>✕</span>
          <span style={styles.statValue}>{approvals.filter(a => a.action === 'rejected').length}</span>
          <span style={styles.statLabel}>Rejected</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statIcon}>⏱</span>
          <span style={styles.statValue}>{approvals.filter(a => a.action === 'pending').length}</span>
          <span style={styles.statLabel}>Pending</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statIcon}>🔒</span>
          <span style={styles.statValue}>{approvals.filter(a => a.action === 'blocked').length}</span>
          <span style={styles.statLabel}>Blocked</span>
        </div>
      </div>

      {/* Timeline */}
      <div style={styles.timeline}>
        {approvals.map((approval, index) => (
          <div key={approval.id}>
            {/* Timeline Connector */}
            {index < approvals.length - 1 && (
              <div
                style={{
                  ...styles.timelineConnector,
                  backgroundColor: getActionColor(approval.action),
                }}
              />
            )}

            {/* Timeline Item */}
            <div
              style={{
                ...styles.timelineItem,
                borderLeftColor: getActionColor(approval.action),
              }}
            >
              {/* Timeline Dot */}
              <div
                style={{
                  ...styles.timelineDot,
                  backgroundColor: getActionColor(approval.action),
                }}
              >
                <span style={styles.timelineIcon}>{getActionIcon(approval.action)}</span>
              </div>

              {/* Item Content */}
              <div style={styles.itemContent}>
                <div style={styles.itemHeader}>
                  <h4 style={styles.itemTitle}>{approval.step}</h4>
                  <div
                    style={{
                      ...styles.itemBadge,
                      backgroundColor: getActionColor(approval.action),
                    }}
                  >
                    {approval.action === 'approved'
                      ? 'Approved'
                      : approval.action === 'rejected'
                      ? 'Rejected'
                      : approval.action === 'pending'
                      ? 'Pending'
                      : 'Blocked'}
                  </div>
                </div>

                <p style={styles.approverInfo}>
                  <strong>{approval.approver}</strong> • {approval.approverRole}
                </p>

                {approval.timestamp && (
                  <p style={styles.timestamp}>
                    {formatDateTime(approval.timestamp)}
                    <span style={styles.timeAgo}> ({formatTimeAgo(approval.timestamp)})</span>
                  </p>
                )}

                {/* Expandable Comments */}
                <div
                  style={styles.commentsSection}
                  onClick={() =>
                    setExpandedApproval(expandedApproval === approval.id ? null : approval.id)
                  }
                >
                  <div style={styles.commentsHeader}>
                    <span style={styles.commentsToggle}>
                      {expandedApproval === approval.id ? '▼' : '▶'}
                    </span>
                    <span style={styles.commentsLabel}>Comments & Notes</span>
                  </div>

                  {expandedApproval === approval.id && (
                    <div style={styles.commentsContent}>
                      <p style={styles.commentsText}>{approval.comments}</p>
                      <div style={styles.approverContact}>
                        <span style={styles.contactLabel}>Contact:</span>
                        <span style={styles.contactEmail}>{approval.approverEmail}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Export Section */}
      <div style={styles.exportSection}>
        <h4 style={styles.exportTitle}>Export Audit Trail</h4>
        <div style={styles.exportButtons}>
          <button style={{ ...styles.exportBtn, backgroundColor: '#007bff' }}>
            📥 Export as PDF
          </button>
          <button style={{ ...styles.exportBtn, backgroundColor: '#28a745' }}>
            📊 Export as CSV
          </button>
          <button style={{ ...styles.exportBtn, backgroundColor: '#6c757d' }}>
            🖨️ Print Report
          </button>
        </div>
      </div>

      {/* Summary Footer */}
      <div style={styles.footer}>
        <div style={styles.footerText}>
          <p style={styles.footerTitle}>Trail Summary</p>
          <p style={styles.footerDetail}>
            {approvedCount} approvals granted | {totalCompleted} of {approvals.length} steps completed
            {approvals.filter(a => a.action === 'rejected').length > 0 &&
              ` | ${approvals.filter(a => a.action === 'rejected').length} rejections noted`}
          </p>
        </div>
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  closeBtn: {
    padding: '8px 12px',
    fontSize: '16px',
    backgroundColor: '#e9ecef',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  summaryBar: {
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
    marginBottom: '24px',
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  summaryLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#495057',
  },
  progressBar: {
    width: '100%',
    height: '20px',
    backgroundColor: '#e9ecef',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  summaryValue: {
    fontSize: '12px',
    color: '#6c757d',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '12px',
    marginBottom: '24px',
  },
  statCard: {
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  statIcon: {
    fontSize: '20px',
  },
  statValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#212529',
  },
  statLabel: {
    fontSize: '12px',
    color: '#6c757d',
  },
  timeline: {
    position: 'relative',
    marginBottom: '24px',
  },
  timelineConnector: {
    marginLeft: '20px',
    borderLeft: '3px solid #dee2e6',
    height: '20px',
  },
  timelineItem: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
    borderLeft: '4px solid #dee2e6',
  },
  timelineDot: {
    minWidth: '40px',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '18px',
    marginTop: '2px',
  },
  timelineIcon: {
    fontSize: '18px',
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
    gap: '12px',
  },
  itemTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#212529',
    margin: '0',
  },
  itemBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    color: 'white',
    fontSize: '11px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  approverInfo: {
    fontSize: '13px',
    color: '#6c757d',
    margin: '0 0 6px 0',
  },
  timestamp: {
    fontSize: '12px',
    color: '#6c757d',
    margin: '0 0 12px 0',
  },
  timeAgo: {
    fontSize: '11px',
    fontStyle: 'italic',
  },
  commentsSection: {
    backgroundColor: '#f8f9fa',
    padding: '12px',
    borderRadius: '4px',
    border: '1px solid #e9ecef',
    cursor: 'pointer',
  },
  commentsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: '500',
  },
  commentsToggle: {
    fontSize: '12px',
    color: '#6c757d',
  },
  commentsLabel: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#495057',
  },
  commentsContent: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #e9ecef',
  },
  commentsText: {
    fontSize: '13px',
    color: '#495057',
    margin: '0 0 8px 0',
    lineHeight: '1.4',
  },
  approverContact: {
    display: 'flex',
    gap: '8px',
    fontSize: '12px',
    color: '#6c757d',
  },
  contactLabel: {
    fontWeight: '500',
  },
  contactEmail: {
    color: '#007bff',
  },
  exportSection: {
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
    marginBottom: '24px',
  },
  exportTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#495057',
    margin: '0 0 12px 0',
  },
  exportButtons: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  exportBtn: {
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: '500',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  footer: {
    backgroundColor: '#e7f3ff',
    padding: '16px',
    borderRadius: '6px',
    border: '1px solid #b3d9ff',
  },
  footerText: {
    margin: '0',
  },
  footerTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#004085',
    margin: '0 0 4px 0',
  },
  footerDetail: {
    fontSize: '13px',
    color: '#004085',
    margin: '0',
  },
};

export default ApprovalTrail;
