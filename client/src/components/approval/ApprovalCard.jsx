import React, { useState } from 'react';

const ApprovalCard = ({ approval = {}, onApprove, onReject, readOnly = false }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [decision, setDecision] = useState('pending');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock approval data
  const mockApproval = {
    id: 'approval-req-001',
    title: 'Contract Award to TechSupply Inc',
    requester: 'John Smith',
    requesterRole: 'Procurement Manager',
    requesterEmail: 'john.smith@company.com',
    department: 'Procurement',
    submittedAt: '2025-12-21T09:30:00Z',
    priority: 'high',
    description:
      'Request to award contract for IT equipment procurement to TechSupply Inc based on evaluation results. Total contract value: $150,000 for 12-month supply agreement.',
    items: [
      { name: 'Contract Type', value: 'Supply Agreement' },
      { name: 'Supplier', value: 'TechSupply Inc' },
      { name: 'Contract Value', value: '$150,000' },
      { name: 'Duration', value: '12 months' },
      { name: 'Evaluation Score', value: '8.5/10' },
    ],
    attachments: [
      { id: 'att-1', name: 'Contract_Draft.pdf', size: '245 KB' },
      { id: 'att-2', name: 'Evaluation_Summary.xlsx', size: '120 KB' },
      { id: 'att-3', name: 'Supplier_Profile.docx', size: '80 KB' },
    ],
  };

  const activeApproval = Object.keys(approval).length > 0 ? approval : mockApproval;

  const handleApprove = async () => {
    if (!comments.trim()) {
      alert('Please provide approval comments');
      return;
    }

    setIsSubmitting(true);
    try {
      const approvalData = {
        approvalId: activeApproval.id,
        decision: 'approved',
        comments,
        approvedAt: new Date().toISOString(),
      };
      console.log('Approving:', approvalData);
      if (onApprove) {
        await onApprove(approvalData);
      }
      setDecision('approved');
    } catch (err) {
      alert('Failed to submit approval');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!comments.trim()) {
      alert('Please provide rejection reason');
      return;
    }

    setIsSubmitting(true);
    try {
      const rejectionData = {
        approvalId: activeApproval.id,
        decision: 'rejected',
        reason: comments,
        rejectedAt: new Date().toISOString(),
      };
      console.log('Rejecting:', rejectionData);
      if (onReject) {
        await onReject(rejectionData);
      }
      setDecision('rejected');
    } catch (err) {
      alert('Failed to submit rejection');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return '#dc3545';
      case 'medium':
        return '#ffc107';
      case 'low':
        return '#28a745';
      default:
        return '#6c757d';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (decision !== 'pending') {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.resultBox, borderLeftColor: decision === 'approved' ? '#28a745' : '#dc3545' }}>
          <h3 style={styles.resultTitle}>
            {decision === 'approved' ? '✓ Approval Submitted' : '✕ Rejection Submitted'}
          </h3>
          <p style={styles.resultText}>Your decision has been recorded.</p>
          <p style={styles.resultComment}>Your comments: {comments}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h2 style={styles.title}>{activeApproval.title}</h2>
          <div style={styles.meta}>
            <span style={styles.requester}>From: {activeApproval.requester} ({activeApproval.requesterRole})</span>
            <span style={styles.date}>Submitted: {formatDate(activeApproval.submittedAt)}</span>
            <span style={{ ...styles.priority, backgroundColor: getPriorityColor(activeApproval.priority) }}>
              {activeApproval.priority.toUpperCase()} PRIORITY
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Description</h3>
        <p style={styles.description}>{activeApproval.description}</p>
      </div>

      {/* Details */}
      <div style={styles.section}>
        <div style={styles.detailsHeader} onClick={() => setShowDetails(!showDetails)}>
          <h3 style={styles.sectionTitle}>{showDetails ? '▼' : '▶'} Approval Details</h3>
        </div>

        {showDetails && (
          <div style={styles.detailsGrid}>
            {activeApproval.items.map((item, idx) => (
              <div key={idx} style={styles.detailItem}>
                <span style={styles.detailLabel}>{item.name}</span>
                <span style={styles.detailValue}>{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attachments */}
      {activeApproval.attachments && activeApproval.attachments.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>📎 Attachments</h3>
          <div style={styles.attachmentsList}>
            {activeApproval.attachments.map((attachment) => (
              <div key={attachment.id} style={styles.attachmentItem}>
                <span style={styles.attachmentIcon}>📄</span>
                <span style={styles.attachmentName}>{attachment.name}</span>
                <span style={styles.attachmentSize}>({attachment.size})</span>
                <button style={styles.downloadBtn}>⬇</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Section */}
      {!readOnly && (
        <div style={styles.actionSection}>
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Your Decision</h3>

            <div style={styles.formGroup}>
              <label style={styles.label}>Decision *</label>
              <div style={styles.decisionButtons}>
                <button
                  onClick={() => setDecision('temp-approve')}
                  style={{
                    ...styles.decisionBtn,
                    backgroundColor: '#28a745',
                    opacity: decision === 'temp-approve' ? 1 : 0.6,
                  }}
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => setDecision('temp-reject')}
                  style={{
                    ...styles.decisionBtn,
                    backgroundColor: '#dc3545',
                    opacity: decision === 'temp-reject' ? 1 : 0.6,
                  }}
                >
                  ✕ Reject
                </button>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                {decision === 'temp-reject' ? 'Rejection Reason' : 'Approval Comments'} *
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                style={styles.textarea}
                placeholder={
                  decision === 'temp-reject'
                    ? 'Explain why this request is being rejected...'
                    : 'Add any comments or conditions for approval...'
                }
                rows="4"
              />
              <p style={styles.charCount}>{comments.length}/500 characters</p>
            </div>

            {decision !== 'pending' && (
              <div style={styles.submitButtons}>
                <button
                  onClick={decision === 'temp-reject' ? handleReject : handleApprove}
                  disabled={isSubmitting}
                  style={{...styles.submitBtn, backgroundColor: decision === 'temp-reject' ? '#dc3545' : '#28a745'}}
                >
                  {isSubmitting ? '⏳ Submitting...' : `${decision === 'temp-reject' ? '✕ Reject Request' : '✓ Approve Request'}`}
                </button>
                <button
                  onClick={() => setDecision('pending')}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
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
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
    marginBottom: '24px',
  },
  headerContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  title: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#212529',
    margin: '0',
  },
  meta: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  requester: {
    fontSize: '13px',
    color: '#6c757d',
  },
  date: {
    fontSize: '13px',
    color: '#6c757d',
  },
  priority: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'white',
    padding: '4px 10px',
    borderRadius: '12px',
  },
  section: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#212529',
    margin: '0 0 16px 0',
  },
  description: {
    fontSize: '14px',
    color: '#495057',
    lineHeight: '1.6',
    margin: '0',
  },
  detailsHeader: {
    cursor: 'pointer',
    userSelect: 'none',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    marginTop: '16px',
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  detailLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6c757d',
  },
  detailValue: {
    fontSize: '14px',
    color: '#212529',
    fontWeight: '500',
  },
  attachmentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  attachmentItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
    border: '1px solid #e9ecef',
  },
  attachmentIcon: {
    fontSize: '18px',
  },
  attachmentName: {
    flex: 1,
    fontSize: '13px',
    fontWeight: '500',
    color: '#212529',
  },
  attachmentSize: {
    fontSize: '12px',
    color: '#6c757d',
  },
  downloadBtn: {
    padding: '6px 10px',
    fontSize: '12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  actionSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#495057',
    marginBottom: '12px',
  },
  decisionButtons: {
    display: 'flex',
    gap: '12px',
  },
  decisionBtn: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontFamily: 'inherit',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  charCount: {
    fontSize: '12px',
    color: '#6c757d',
    margin: '4px 0 0 0',
  },
  submitButtons: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
  },
  submitBtn: {
    flex: 1,
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#495057',
    backgroundColor: '#e9ecef',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  resultBox: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
    borderLeft: '4px solid #dee2e6',
  },
  resultTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#212529',
    margin: '0 0 8px 0',
  },
  resultText: {
    fontSize: '14px',
    color: '#495057',
    margin: '0 0 12px 0',
  },
  resultComment: {
    fontSize: '13px',
    color: '#6c757d',
    margin: '0',
    fontStyle: 'italic',
  },
};

export default ApprovalCard;
