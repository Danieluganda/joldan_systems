import React, { useState } from 'react';

const ApprovalForm = ({ approval, onApprove, onReject, onCancel }) => {
  const [action, setAction] = useState(null);
  const [approvalComments, setApprovalComments] = useState('');
  const [conditions, setConditions] = useState('');
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!action) {
      newErrors.action = 'Please select an action (Approve or Reject)';
    }

    if (action === 'reject' && !approvalComments.trim()) {
      newErrors.approvalComments = 'Rejection reason is required';
    }

    if (action === 'approve' && conditions && conditions.trim().length < 10) {
      newErrors.conditions = 'Please provide detailed conditions (minimum 10 characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const submissionData = {
      ...approval,
      approverAction: action,
      approvalComments: action === 'approve' ? conditions : approvalComments,
      approvalDate: new Date().toISOString(),
      approverName: 'Current User', // Should be replaced with actual logged-in user
    };

    if (action === 'approve') {
      onApprove?.(submissionData);
    } else {
      onReject?.(submissionData);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderDocumentPreview = () => {
    return (
      <div style={styles.documentPreview}>
        <h4 style={styles.previewTitle}>📄 Document Details</h4>

        <div style={styles.previewGrid}>
          <div style={styles.previewItem}>
            <span style={styles.previewLabel}>Document Type</span>
            <span style={styles.previewValue}>{approval.documentType}</span>
          </div>
          <div style={styles.previewItem}>
            <span style={styles.previewLabel}>Document Name</span>
            <span style={styles.previewValue}>{approval.documentName}</span>
          </div>
          <div style={styles.previewItem}>
            <span style={styles.previewLabel}>Procurement ID</span>
            <span style={styles.previewValue}>{approval.procurementId}</span>
          </div>
          <div style={styles.previewItem}>
            <span style={styles.previewLabel}>Submitted By</span>
            <span style={styles.previewValue}>👤 {approval.submittedBy}</span>
          </div>
          <div style={styles.previewItem}>
            <span style={styles.previewLabel}>Submitted Date</span>
            <span style={styles.previewValue}>{formatDate(approval.submittedDate)}</span>
          </div>
          <div style={styles.previewItem}>
            <span style={styles.previewLabel}>Required By</span>
            <span style={styles.previewValue}>{formatDate(approval.requiredBy)}</span>
          </div>
        </div>

        <p style={styles.previewDescription}>{approval.description}</p>

        {approval.dependencies && approval.dependencies.length > 0 && (
          <div style={styles.dependenciesBox}>
            <h5 style={styles.dependenciesTitle}>⚙️ Dependencies</h5>
            <p style={styles.dependenciesText}>
              This approval depends on: <strong>{approval.dependencies.join(', ')}</strong>
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>✓ Review & Approve Document</h2>
        <p style={styles.subtitle}>
          {approval.documentName} • {approval.procurementId}
        </p>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Document Preview */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Document Information</h3>
          {renderDocumentPreview()}
        </div>

        {/* Action Selection */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Decision</h3>

          <div style={styles.actionButtons}>
            <button
              type="button"
              onClick={() => {
                setAction('approve');
                setApprovalComments('');
                setErrors({});
              }}
              style={{
                ...styles.actionButton,
                backgroundColor: action === 'approve' ? '#28a745' : '#e9ecef',
                color: action === 'approve' ? 'white' : '#495057',
                borderColor: action === 'approve' ? '#28a745' : '#dee2e6',
              }}
            >
              <span style={styles.actionIcon}>✓</span>
              <span>Approve</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAction('reject');
                setConditions('');
                setErrors({});
              }}
              style={{
                ...styles.actionButton,
                backgroundColor: action === 'reject' ? '#dc3545' : '#e9ecef',
                color: action === 'reject' ? 'white' : '#495057',
                borderColor: action === 'reject' ? '#dc3545' : '#dee2e6',
              }}
            >
              <span style={styles.actionIcon}>✗</span>
              <span>Reject</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAction('request-changes');
                setErrors({});
              }}
              style={{
                ...styles.actionButton,
                backgroundColor: action === 'request-changes' ? '#ffc107' : '#e9ecef',
                color: action === 'request-changes' ? 'white' : '#495057',
                borderColor: action === 'request-changes' ? '#ffc107' : '#dee2e6',
              }}
            >
              <span style={styles.actionIcon}>◐</span>
              <span>Request Changes</span>
            </button>
          </div>

          {errors.action && <span style={styles.errorText}>{errors.action}</span>}
        </div>

        {/* Comments Section */}
        {action && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              {action === 'approve' && '✓ Conditions (Optional)'}
              {action === 'reject' && '✗ Reason for Rejection'}
              {action === 'request-changes' && '◐ Requested Changes'}
            </h3>

            <div style={styles.formGroup}>
              <textarea
                placeholder={
                  action === 'approve'
                    ? 'Enter any conditions or notes for this approval...'
                    : action === 'reject'
                      ? 'Please provide a reason for rejection...'
                      : 'Please specify the changes required...'
                }
                value={action === 'approve' ? conditions : approvalComments}
                onChange={(e) => {
                  if (action === 'approve') {
                    setConditions(e.target.value);
                  } else {
                    setApprovalComments(e.target.value);
                  }
                }}
                style={{
                  ...styles.textarea,
                  borderColor: errors.approvalComments || errors.conditions ? '#dc3545' : '#dee2e6',
                  minHeight: '120px',
                }}
              />
              {(errors.approvalComments || errors.conditions) && (
                <span style={styles.errorText}>{errors.approvalComments || errors.conditions}</span>
              )}

              {action === 'approve' && (
                <p style={styles.helperText}>
                  💡 Use this field to note any special conditions or requirements
                </p>
              )}
            </div>
          </div>
        )}

        {/* Approval Summary */}
        {action && (
          <div style={styles.summaryCard}>
            <h4 style={styles.summaryTitle}>📋 Approval Summary</h4>
            <div style={styles.summaryContent}>
              <p>
                <strong>Document:</strong> {approval.documentName}
              </p>
              <p>
                <strong>Action:</strong> {action === 'approve' ? 'Approve' : action === 'reject' ? 'Reject' : 'Request Changes'}
              </p>
              <p>
                <strong>Comments:</strong>{' '}
                {action === 'approve'
                  ? conditions || 'No conditions specified'
                  : action === 'reject'
                    ? approvalComments || 'No reason provided'
                    : approvalComments || 'No changes specified'}
              </p>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div style={styles.formActions}>
          <button type="button" onClick={onCancel} style={styles.cancelBtn}>
            ✕ Cancel
          </button>

          {action && (
            <>
              <button
                type="button"
                onClick={() => setAction(null)}
                style={styles.backBtn}
              >
                ← Back
              </button>

              <button
                type="submit"
                style={{
                  ...styles.submitBtn,
                  backgroundColor:
                    action === 'approve'
                      ? '#28a745'
                      : action === 'reject'
                        ? '#dc3545'
                        : '#ffc107',
                }}
              >
                {action === 'approve'
                  ? '✓ Confirm Approval'
                  : action === 'reject'
                    ? '✗ Confirm Rejection'
                    : '◐ Request Changes'}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
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
  form: {
    backgroundColor: 'white',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
    overflow: 'hidden',
  },
  section: {
    padding: '24px',
    borderBottom: '1px solid #dee2e6',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#212529',
    margin: '0 0 16px 0',
  },
  documentPreview: {
    backgroundColor: '#f8f9fa',
    padding: '16px',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
  },
  previewTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#212529',
    margin: '0 0 12px 0',
  },
  previewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
    marginBottom: '16px',
  },
  previewItem: {
    display: 'flex',
    flexDirection: 'column',
  },
  previewLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#6c757d',
    textTransform: 'uppercase',
  },
  previewValue: {
    fontSize: '13px',
    color: '#212529',
    marginTop: '4px',
  },
  previewDescription: {
    fontSize: '13px',
    color: '#495057',
    margin: '0',
    lineHeight: '1.5',
  },
  dependenciesBox: {
    backgroundColor: '#fff3cd',
    padding: '12px',
    borderRadius: '4px',
    marginTop: '12px',
    border: '1px solid #ffeaa7',
  },
  dependenciesTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#856404',
    margin: '0 0 8px 0',
  },
  dependenciesText: {
    fontSize: '12px',
    color: '#856404',
    margin: '0',
  },
  actionButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  actionButton: {
    padding: '12px',
    fontSize: '13px',
    fontWeight: '600',
    border: '2px solid',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
  },
  actionIcon: {
    fontSize: '20px',
  },
  errorText: {
    color: '#dc3545',
    fontSize: '12px',
    marginTop: '8px',
    display: 'block',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  textarea: {
    padding: '12px',
    fontSize: '13px',
    border: '1px solid #dee2e6',
    borderRadius: '4px',
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  helperText: {
    fontSize: '12px',
    color: '#6c757d',
    marginTop: '8px',
    fontStyle: 'italic',
  },
  summaryCard: {
    backgroundColor: '#d1ecf1',
    padding: '16px',
    borderRadius: '6px',
    border: '1px solid #bee5eb',
    margin: '0 24px -1px 24px',
  },
  summaryTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#0c5460',
    margin: '0 0 12px 0',
  },
  summaryContent: {
    fontSize: '13px',
    color: '#0c5460',
  },
  formActions: {
    display: 'flex',
    gap: '8px',
    padding: '24px',
    backgroundColor: '#f8f9fa',
    borderTop: '1px solid #dee2e6',
  },
  submitBtn: {
    flex: 1,
    padding: '12px',
    fontSize: '13px',
    fontWeight: '600',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#dc3545',
    backgroundColor: '#f8d7da',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  backBtn: {
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#6c757d',
    backgroundColor: '#e9ecef',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};

export default ApprovalForm;
