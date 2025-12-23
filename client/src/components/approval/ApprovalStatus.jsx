import React, { useState, useEffect } from 'react';

const ApprovalStatus = ({ procurementId, onStepChange }) => {
  const [approvalChain, setApprovalChain] = useState([]);
  const [currentApprover, setCurrentApprover] = useState(null);
  const [loading, setLoading] = useState(false);

  // Mock approval chain
  const mockApprovalChain = [
    {
      id: 'approval-1',
      step: 'Procurement Manager Review',
      approver: 'Alice Johnson',
      role: 'Procurement Manager',
      status: 'approved',
      approvedAt: '2025-12-20T10:30:00Z',
      notes: 'Templates and plan verified. Proceeding to RFQ phase.',
    },
    {
      id: 'approval-2',
      step: 'Finance Director Review',
      approver: 'Robert Chen',
      role: 'Finance Director',
      status: 'approved',
      approvedAt: '2025-12-20T14:45:00Z',
      notes: 'Budget allocation confirmed. No concerns.',
    },
    {
      id: 'approval-3',
      step: 'Executive Approval',
      approver: 'Sarah Williams',
      role: 'Chief Operating Officer',
      status: 'pending',
      approvedAt: null,
      notes: 'Awaiting review',
    },
    {
      id: 'approval-4',
      step: 'Compliance Check',
      approver: 'Michael Brown',
      role: 'Compliance Officer',
      status: 'blocked',
      approvedAt: null,
      notes: 'Awaiting executive approval',
    },
  ];

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setApprovalChain(mockApprovalChain);
      const pending = mockApprovalChain.find(a => a.status === 'pending');
      setCurrentApprover(pending || mockApprovalChain[mockApprovalChain.length - 1]);
      setLoading(false);
    }, 500);
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
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

  const getStatusColor = (status) => {
    switch (status) {
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

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const approvedCount = approvalChain.filter(a => a.status === 'approved').length;
  const totalSteps = approvalChain.length;

  if (loading) {
    return <div style={styles.container}><p>Loading approval chain...</p></div>;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Approval Workflow Status</h2>
        <p style={styles.subtitle}>Procurement ID: {procurementId}</p>
      </div>

      {/* Progress Summary */}
      <div style={styles.summaryCard}>
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>Progress</span>
          <div style={styles.progressBar}>
            <div
              style={{
                width: `${(approvedCount / totalSteps) * 100}%`,
                height: '100%',
                backgroundColor: '#007bff',
                borderRadius: '4px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <span style={styles.progressText}>{approvedCount} of {totalSteps} approvals</span>
        </div>

        {currentApprover && (
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Awaiting Approval</span>
            <div style={styles.awaitingBox}>
              <p style={styles.approverName}>{currentApprover.approver}</p>
              <p style={styles.approverRole}>{currentApprover.role}</p>
              <p style={styles.approverStep}>{currentApprover.step}</p>
            </div>
          </div>
        )}
      </div>

      {/* Approval Chain Timeline */}
      <div style={styles.timelineContainer}>
        {approvalChain.map((approval, index) => (
          <div key={approval.id}>
            {/* Timeline Connector */}
            {index < approvalChain.length - 1 && (
              <div
                style={{
                  ...styles.connector,
                  backgroundColor: getStatusColor(approval.status),
                }}
              />
            )}

            {/* Approval Step Card */}
            <div
              style={{
                ...styles.approvalCard,
                borderLeftColor: getStatusColor(approval.status),
                backgroundColor:
                  approval.status === 'pending'
                    ? '#fffbea'
                    : approval.status === 'approved'
                    ? '#f0f8f5'
                    : approval.status === 'rejected'
                    ? '#fdf5f5'
                    : '#f5f5f5',
              }}
            >
              <div style={styles.cardHeader}>
                <div style={styles.stepInfo}>
                  <h4 style={styles.stepTitle}>{approval.step}</h4>
                  <p style={styles.stepApprover}>
                    {approval.approver} • {approval.role}
                  </p>
                </div>

                <div style={{ ...styles.statusBadge, backgroundColor: getStatusColor(approval.status) }}>
                  <span style={styles.statusIcon}>{getStatusIcon(approval.status)}</span>
                  <span style={styles.statusText}>
                    {approval.status === 'pending'
                      ? 'Pending'
                      : approval.status === 'approved'
                      ? 'Approved'
                      : approval.status === 'rejected'
                      ? 'Rejected'
                      : 'Blocked'}
                  </span>
                </div>
              </div>

              {approval.approvedAt && (
                <p style={styles.approvedDate}>Approved on {formatDate(approval.approvedAt)}</p>
              )}

              {approval.notes && (
                <div style={styles.notesBox}>
                  <p style={styles.notesTitle}>Notes:</p>
                  <p style={styles.notesContent}>{approval.notes}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Status Summary */}
      <div style={styles.summaryFooter}>
        <div style={styles.statBox}>
          <span style={styles.statIcon}>✓</span>
          <span style={styles.statText}>
            {approvalChain.filter(a => a.status === 'approved').length} Approved
          </span>
        </div>
        <div style={styles.statBox}>
          <span style={styles.statIcon}>⏱</span>
          <span style={styles.statText}>
            {approvalChain.filter(a => a.status === 'pending').length} Pending
          </span>
        </div>
        <div style={styles.statBox}>
          <span style={styles.statIcon}>✕</span>
          <span style={styles.statText}>
            {approvalChain.filter(a => a.status === 'rejected').length} Rejected
          </span>
        </div>
        <div style={styles.statBox}>
          <span style={styles.statIcon}>🔒</span>
          <span style={styles.statText}>
            {approvalChain.filter(a => a.status === 'blocked').length} Blocked
          </span>
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
    marginBottom: '24px',
    borderBottom: '2px solid #e9ecef',
    paddingBottom: '16px',
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
  summaryCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
    marginBottom: '24px',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  summaryLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#495057',
  },
  progressBar: {
    width: '100%',
    height: '24px',
    backgroundColor: '#e9ecef',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressText: {
    fontSize: '13px',
    color: '#6c757d',
  },
  awaitingBox: {
    backgroundColor: '#fffbea',
    padding: '12px',
    borderRadius: '4px',
    border: '1px solid #ffeaa7',
  },
  approverName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#212529',
    margin: '0 0 4px 0',
  },
  approverRole: {
    fontSize: '12px',
    color: '#6c757d',
    margin: '0 0 4px 0',
  },
  approverStep: {
    fontSize: '13px',
    color: '#495057',
    margin: '0',
  },
  timelineContainer: {
    position: 'relative',
    marginBottom: '24px',
  },
  connector: {
    position: 'relative',
    height: '30px',
    marginLeft: '20px',
    borderLeft: '3px solid #dee2e6',
    marginBottom: '4px',
  },
  approvalCard: {
    backgroundColor: 'white',
    border: '1px solid #dee2e6',
    borderLeft: '4px solid #dee2e6',
    borderRadius: '6px',
    padding: '16px',
    marginBottom: '12px',
    marginLeft: '8px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
    gap: '16px',
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#212529',
    margin: '0 0 4px 0',
  },
  stepApprover: {
    fontSize: '13px',
    color: '#6c757d',
    margin: '0',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '12px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  statusIcon: {
    fontSize: '14px',
  },
  statusText: {
    fontSize: '12px',
  },
  approvedDate: {
    fontSize: '12px',
    color: '#6c757d',
    margin: '0 0 12px 0',
    fontStyle: 'italic',
  },
  notesBox: {
    backgroundColor: '#f8f9fa',
    padding: '12px',
    borderRadius: '4px',
    borderLeft: '3px solid #007bff',
  },
  notesTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#495057',
    margin: '0 0 4px 0',
  },
  notesContent: {
    fontSize: '13px',
    color: '#495057',
    margin: '0',
    lineHeight: '1.4',
  },
  summaryFooter: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '12px',
  },
  statBox: {
    backgroundColor: 'white',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statIcon: {
    fontSize: '18px',
  },
  statText: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#495057',
  },
};

export default ApprovalStatus;
