import React, { useState, useEffect } from 'react';

const ApprovalQueue = ({ onApprovalSelect, onBatchApprove }) => {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [selectedApprovals, setSelectedApprovals] = useState(new Set());
  const [sortBy, setSortBy] = useState('dateSubmitted');

  // Mock approval queue data
  const mockApprovals = [
    {
      id: 'appr-001',
      procurementId: 'PROC-2025-001',
      documentType: 'RFQ',
      documentName: 'RFQ - IT Equipment v3.1',
      submittedBy: 'John Smith',
      submittedDate: '2025-12-16T10:00:00Z',
      requiredBy: '2025-12-17T17:00:00Z',
      status: 'pending',
      priority: 'high',
      description: 'Approval for finalized RFQ template before market distribution',
      dependencies: [],
      estimatedDuration: '2 hours',
    },
    {
      id: 'appr-002',
      procurementId: 'PROC-2025-001',
      documentType: 'Evaluation Results',
      documentName: 'Evaluation Scorecard - First Pass',
      submittedBy: 'Linda Davis',
      submittedDate: '2025-12-21T14:30:00Z',
      requiredBy: '2025-12-22T17:00:00Z',
      status: 'pending',
      priority: 'critical',
      description: 'Director approval required for evaluation results before award decision',
      dependencies: ['appr-003', 'appr-004'],
      estimatedDuration: '4 hours',
    },
    {
      id: 'appr-003',
      procurementId: 'PROC-2025-001',
      documentType: 'Budget Approval',
      documentName: 'Approved Budget Envelope',
      submittedBy: 'Sarah Williams',
      submittedDate: '2025-12-15T11:00:00Z',
      requiredBy: '2025-12-17T09:00:00Z',
      status: 'approved',
      priority: 'high',
      description: 'Finance approval of budget allocation',
      approvedBy: 'Finance Director',
      approvalDate: '2025-12-15T14:30:00Z',
      approvalComments: 'Budget approved with 10% contingency',
      dependencies: [],
      estimatedDuration: '1 hour',
    },
    {
      id: 'appr-004',
      procurementId: 'PROC-2025-001',
      documentType: 'Plan Approval',
      documentName: 'Procurement Plan v2.0',
      submittedBy: 'Alice Johnson',
      submittedDate: '2025-12-15T09:30:00Z',
      requiredBy: '2025-12-17T09:00:00Z',
      status: 'approved',
      priority: 'high',
      description: 'Management approval of procurement strategy and timeline',
      approvedBy: 'Procurement Manager',
      approvalDate: '2025-12-15T16:00:00Z',
      approvalComments: 'Plan approved with timeline optimization',
      dependencies: [],
      estimatedDuration: '2 hours',
    },
    {
      id: 'appr-005',
      procurementId: 'PROC-2025-001',
      documentType: 'Award Recommendation',
      documentName: 'Award Decision - TechSupply Inc',
      submittedBy: 'Linda Davis',
      submittedDate: '2025-12-21T15:00:00Z',
      requiredBy: '2025-12-23T17:00:00Z',
      status: 'pending',
      priority: 'critical',
      description: 'Executive approval for award to recommended supplier',
      dependencies: ['appr-002'],
      estimatedDuration: '3 hours',
    },
    {
      id: 'appr-006',
      procurementId: 'PROC-2025-002',
      documentType: 'RFQ',
      documentName: 'RFQ - Office Supplies',
      submittedBy: 'Robert Chen',
      submittedDate: '2025-12-18T13:00:00Z',
      requiredBy: '2025-12-20T17:00:00Z',
      status: 'pending',
      priority: 'medium',
      description: 'Approval for office supplies RFQ',
      dependencies: [],
      estimatedDuration: '1 hour',
    },
  ];

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setApprovals(mockApprovals);
      setLoading(false);
    }, 500);
  }, []);

  const getStatusConfig = (status) => {
    const config = {
      pending: { bg: '#fff3cd', color: '#856404', label: '⏳ Pending', icon: '●' },
      approved: { bg: '#d4edda', color: '#155724', label: '✓ Approved', icon: '✓' },
      rejected: { bg: '#f8d7da', color: '#721c24', label: '✗ Rejected', icon: '✗' },
      expired: { bg: '#e2e3e5', color: '#383d41', label: '⏱ Expired', icon: '⏱' },
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

  const formatTimeRemaining = (dateString) => {
    const now = new Date();
    const dueDate = new Date(dateString);
    const hours = Math.floor((dueDate - now) / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 0) return 'Overdue';
    if (hours < 24) return `${hours}h remaining`;
    return `${days}d remaining`;
  };

  const filteredApprovals = approvals.filter(a => {
    if (filterStatus === 'all') return true;
    return a.status === filterStatus;
  });

  const sortedApprovals = [...filteredApprovals].sort((a, b) => {
    if (sortBy === 'dateSubmitted') {
      return new Date(b.submittedDate) - new Date(a.submittedDate);
    } else if (sortBy === 'priority') {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    } else if (sortBy === 'dueDate') {
      return new Date(a.requiredBy) - new Date(b.requiredBy);
    }
    return 0;
  });

  const toggleSelection = (id) => {
    const newSelected = new Set(selectedApprovals);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedApprovals(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedApprovals.size === sortedApprovals.length) {
      setSelectedApprovals(new Set());
    } else {
      setSelectedApprovals(new Set(sortedApprovals.map(a => a.id)));
    }
  };

  if (loading) {
    return <div style={styles.container}><p>Loading approval queue...</p></div>;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>📋 Approval Queue</h2>
          <p style={styles.subtitle}>Total: {approvals.length} • Pending: {approvals.filter(a => a.status === 'pending').length}</p>
        </div>
      </div>

      {/* Statistics */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{approvals.filter(a => a.status === 'pending').length}</span>
          <span style={styles.statLabel}>Pending</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{approvals.filter(a => a.status === 'approved').length}</span>
          <span style={styles.statLabel}>Approved</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{approvals.filter(a => a.priority === 'critical').length}</span>
          <span style={styles.statLabel}>Critical</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{approvals.filter(a => a.status === 'rejected').length}</span>
          <span style={styles.statLabel}>Rejected</span>
        </div>
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        <div style={styles.filterControl}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="dateSubmitted">Sort by Date</option>
            <option value="priority">Sort by Priority</option>
            <option value="dueDate">Sort by Due Date</option>
          </select>
        </div>

        {selectedApprovals.size > 0 && (
          <button
            onClick={() => onBatchApprove?.(Array.from(selectedApprovals))}
            style={styles.batchApproveBtn}
          >
            ✓ Approve Selected ({selectedApprovals.size})
          </button>
        )}
      </div>

      {/* Approvals List */}
      <div style={styles.approvalsList}>
        {/* Select All Row */}
        {sortedApprovals.length > 0 && (
          <div style={styles.selectAllRow}>
            <input
              type="checkbox"
              checked={selectedApprovals.size === sortedApprovals.length && sortedApprovals.length > 0}
              onChange={handleSelectAll}
              style={styles.checkbox}
            />
            <span style={styles.selectAllLabel}>
              Select All ({selectedApprovals.size}/{sortedApprovals.length})
            </span>
          </div>
        )}

        {/* Approval Cards */}
        {sortedApprovals.map(approval => {
          const statusConfig = getStatusConfig(approval.status);
          const priorityConfig = getPriorityConfig(approval.priority);
          const isSelected = selectedApprovals.has(approval.id);

          return (
            <div
              key={approval.id}
              style={{
                ...styles.approvalCard,
                backgroundColor: isSelected ? '#e7f3ff' : 'white',
                borderLeftColor: priorityConfig.color,
              }}
              onClick={() => onApprovalSelect?.(approval)}
            >
              <div style={styles.cardContent}>
                <div style={styles.cardHeader}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelection(approval.id)}
                    onClick={(e) => e.stopPropagation()}
                    style={styles.checkbox}
                  />

                  <div style={styles.headerInfo}>
                    <h4 style={styles.documentName}>{approval.documentName}</h4>
                    <p style={styles.procurementId}>{approval.procurementId}</p>
                  </div>

                  <div style={styles.badges}>
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
                        backgroundColor: '#fff3cd',
                        color: priorityConfig.color,
                      }}
                    >
                      {priorityConfig.label}
                    </span>
                  </div>
                </div>

                <div style={styles.cardBody}>
                  <p style={styles.description}>{approval.description}</p>

                  <div style={styles.metaInfo}>
                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>Submitted By</span>
                      <span style={styles.metaValue}>👤 {approval.submittedBy}</span>
                    </div>
                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>Submitted Date</span>
                      <span style={styles.metaValue}>{formatDate(approval.submittedDate)}</span>
                    </div>
                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>Due Date</span>
                      <span style={styles.metaValue}>
                        {formatDate(approval.requiredBy)}
                      </span>
                    </div>
                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>Time Remaining</span>
                      <span style={{
                        ...styles.metaValue,
                        color: formatTimeRemaining(approval.requiredBy) === 'Overdue' ? '#dc3545' : '#495057',
                        fontWeight: 'bold',
                      }}>
                        {formatTimeRemaining(approval.requiredBy)}
                      </span>
                    </div>
                  </div>

                  {approval.status === 'approved' && (
                    <div style={styles.approvalDetails}>
                      <p style={styles.approvedLabel}>✓ Approved by {approval.approvedBy}</p>
                      <p style={styles.approvedComment}>{approval.approvalComments}</p>
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.cardActions}>
                <button
                  style={{ ...styles.actionBtn, backgroundColor: '#28a745' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onApprovalSelect?.(approval);
                  }}
                >
                  View & Approve
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {sortedApprovals.length === 0 && (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>No approvals found in this queue</p>
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
  controls: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  filterControl: {
    display: 'flex',
    gap: '8px',
  },
  filterSelect: {
    padding: '8px 12px',
    fontSize: '12px',
    border: '1px solid #dee2e6',
    borderRadius: '4px',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  batchApproveBtn: {
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white',
    backgroundColor: '#28a745',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  approvalsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  selectAllRow: {
    backgroundColor: 'white',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  selectAllLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#495057',
  },
  approvalCard: {
    backgroundColor: 'white',
    border: '1px solid #dee2e6',
    borderLeft: '4px solid #fd7e14',
    borderRadius: '6px',
    overflow: 'hidden',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    cursor: 'pointer',
    transition: 'box-shadow 0.2s ease',
  },
  cardContent: {
    flex: 1,
    padding: '12px',
  },
  cardHeader: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  headerInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#212529',
    margin: '0 0 4px 0',
  },
  procurementId: {
    fontSize: '12px',
    color: '#6c757d',
    margin: '0',
  },
  badges: {
    display: 'flex',
    gap: '8px',
  },
  badge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  cardBody: {
    marginTop: '8px',
  },
  description: {
    fontSize: '13px',
    color: '#495057',
    margin: '0 0 12px 0',
  },
  metaInfo: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
  },
  metaItem: {
    display: 'flex',
    flexDirection: 'column',
  },
  metaLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#6c757d',
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: '12px',
    color: '#495057',
    marginTop: '4px',
  },
  approvalDetails: {
    backgroundColor: '#d4edda',
    padding: '8px',
    borderRadius: '4px',
    marginTop: '8px',
    borderLeft: '3px solid #28a745',
  },
  approvedLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#155724',
    margin: '0 0 4px 0',
  },
  approvedComment: {
    fontSize: '12px',
    color: '#155724',
    margin: '0',
    fontStyle: 'italic',
  },
  cardActions: {
    padding: '12px',
    borderLeft: '1px solid #dee2e6',
    display: 'flex',
    gap: '8px',
  },
  actionBtn: {
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
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

export default ApprovalQueue;
