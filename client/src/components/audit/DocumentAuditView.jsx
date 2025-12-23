import React, { useState, useEffect } from 'react';

const DocumentAuditView = ({ procurementId, onDocumentSelect }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock audit document data
  const mockDocuments = [
    {
      id: 'doc-001',
      name: 'Procurement Plan v2.0',
      type: 'plan',
      category: 'Planning',
      uploadedBy: 'John Smith',
      uploadedAt: '2025-12-15T09:00:00Z',
      lastModified: '2025-12-17T14:30:00Z',
      version: '2.0',
      status: 'approved',
      fileSize: '2.4 MB',
      hash: 'sha256_abc123...',
      approver: 'Sarah Williams',
      approvalDate: '2025-12-17T16:00:00Z',
      comments: 'Approved with minor formatting updates',
      changes: ['Timeline adjusted from 60 days to 45 days', 'Budget section updated'],
    },
    {
      id: 'doc-002',
      name: 'RFQ Template Standard v3.1',
      type: 'rfq',
      category: 'RFQ',
      uploadedBy: 'Robert Chen',
      uploadedAt: '2025-12-16T10:00:00Z',
      lastModified: '2025-12-16T10:00:00Z',
      version: '3.1',
      status: 'approved',
      fileSize: '1.8 MB',
      hash: 'sha256_def456...',
      approver: 'Michael Brown',
      approvalDate: '2025-12-17T08:00:00Z',
      comments: 'Standard template approved for use',
      changes: ['Added 12 technical specifications', 'Updated evaluation criteria'],
    },
    {
      id: 'doc-003',
      name: 'Supplier Prequalification List',
      type: 'supplier',
      category: 'Supplier Management',
      uploadedBy: 'Alice Johnson',
      uploadedAt: '2025-12-18T08:00:00Z',
      lastModified: '2025-12-18T08:00:00Z',
      version: '1.0',
      status: 'pending',
      fileSize: '920 KB',
      hash: 'sha256_ghi789...',
      comments: 'Awaiting compliance verification',
      changes: ['15 suppliers added', 'Compliance documents attached'],
    },
    {
      id: 'doc-004',
      name: 'Evaluation Scorecard',
      type: 'evaluation',
      category: 'Evaluation',
      uploadedBy: 'Linda Davis',
      uploadedAt: '2025-12-21T08:00:00Z',
      lastModified: '2025-12-21T14:30:00Z',
      version: '2.0',
      status: 'in-review',
      fileSize: '1.1 MB',
      hash: 'sha256_jkl012...',
      approver: 'Director of Procurement',
      comments: 'Evaluation in progress - 8 of 10 bids scored',
      changes: ['Added weighted scoring methodology', 'Price evaluation algorithm updated'],
    },
    {
      id: 'doc-005',
      name: 'RFQ Distribution Log',
      type: 'log',
      category: 'Audit Trail',
      uploadedBy: 'System',
      uploadedAt: '2025-12-18T09:00:00Z',
      lastModified: '2025-12-20T16:45:00Z',
      version: '1.0',
      status: 'approved',
      fileSize: '245 KB',
      hash: 'sha256_mno345...',
      comments: 'Complete distribution record for 15 suppliers',
      changes: ['12 deliveries confirmed', '2 bounced addresses', '1 pending'],
    },
    {
      id: 'doc-006',
      name: 'Supplier Clarification Responses',
      type: 'clarification',
      category: 'Clarifications',
      uploadedBy: 'Michael Brown',
      uploadedAt: '2025-12-19T15:00:00Z',
      lastModified: '2025-12-19T15:00:00Z',
      version: '1.0',
      status: 'approved',
      fileSize: '567 KB',
      hash: 'sha256_pqr678...',
      approver: 'John Smith',
      approvalDate: '2025-12-20T09:00:00Z',
      comments: 'All clarification requests answered, no substantive changes',
      changes: ['1 technical specification clarified', '2 delivery options approved'],
    },
  ];

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setDocuments(mockDocuments);
      setLoading(false);
    }, 500);
  }, []);

  const getStatusBadge = (status) => {
    const config = {
      approved: { bg: '#d4edda', color: '#155724', label: '✓ Approved' },
      pending: { bg: '#fff3cd', color: '#856404', label: '⏳ Pending' },
      'in-review': { bg: '#d1ecf1', color: '#0c5460', label: '🔍 In Review' },
      rejected: { bg: '#f8d7da', color: '#721c24', label: '✗ Rejected' },
    };
    return config[status] || config.pending;
  };

  const getTypeIcon = (type) => {
    const icons = {
      plan: '📋',
      rfq: '📢',
      supplier: '🏢',
      evaluation: '⭐',
      log: '📊',
      clarification: '❓',
    };
    return icons[type] || '📄';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesType = filterType === 'all' || doc.type === filterType;
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getDocumentTypes = () => {
    return [...new Set(documents.map(d => d.type))];
  };

  if (loading) {
    return <div style={styles.container}><p>Loading audit documents...</p></div>;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Document Audit Trail</h2>
          <p style={styles.subtitle}>Procurement ID: {procurementId} • {documents.length} documents tracked</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div style={styles.searchFilterSection}>
        <div style={styles.searchBox}>
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <span style={styles.searchIcon}>🔍</span>
        </div>

        <div style={styles.filterArea}>
          <span style={styles.filterLabel}>Filter:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">All Documents</option>
            {getDocumentTypes().map(type => (
              <option key={type} value={type}>
                {getTypeIcon(type)} {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Statistics */}
      <div style={styles.statsRow}>
        <div style={styles.statItem}>
          <span style={styles.statNumber}>{documents.length}</span>
          <span style={styles.statText}>Total</span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statNumber}>{documents.filter(d => d.status === 'approved').length}</span>
          <span style={styles.statText}>Approved</span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statNumber}>{documents.filter(d => d.status === 'in-review').length}</span>
          <span style={styles.statText}>In Review</span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statNumber}>{documents.filter(d => d.status === 'pending').length}</span>
          <span style={styles.statText}>Pending</span>
        </div>
      </div>

      {/* Documents List */}
      <div style={styles.documentsList}>
        {filteredDocuments.map(doc => {
          const statusConfig = getStatusBadge(doc.status);
          const isExpanded = expandedId === doc.id;

          return (
            <div key={doc.id} style={styles.documentCard}>
              {/* Card Header */}
              <div
                style={styles.cardHeader}
                onClick={() => setExpandedId(isExpanded ? null : doc.id)}
              >
                <div style={styles.headerLeft}>
                  <span style={styles.icon}>{getTypeIcon(doc.type)}</span>
                  <div style={styles.headerInfo}>
                    <h4 style={styles.docName}>{doc.name}</h4>
                    <p style={styles.docMeta}>
                      v{doc.version} • {doc.fileSize} • {doc.category}
                    </p>
                  </div>
                </div>

                <div style={styles.headerRight}>
                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: statusConfig.bg,
                      color: statusConfig.color,
                    }}
                  >
                    {statusConfig.label}
                  </span>
                  <span style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div style={styles.expandedContent}>
                  {/* Core Info */}
                  <div style={styles.infoGrid}>
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>Uploaded By</span>
                      <span style={styles.infoValue}>👤 {doc.uploadedBy}</span>
                    </div>
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>Uploaded Date</span>
                      <span style={styles.infoValue}>{formatDate(doc.uploadedAt)}</span>
                    </div>
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>Last Modified</span>
                      <span style={styles.infoValue}>{formatDate(doc.lastModified)}</span>
                    </div>
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>File Hash</span>
                      <span style={styles.infoValue} style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                        {doc.hash}
                      </span>
                    </div>
                  </div>

                  {/* Approval Info */}
                  {doc.approver && (
                    <div style={styles.approvalBox}>
                      <h5 style={styles.approvalTitle}>✓ Approval Details</h5>
                      <div style={styles.approvalGrid}>
                        <div>
                          <span style={styles.approvalLabel}>Approved By</span>
                          <span style={styles.approvalValue}>{doc.approver}</span>
                        </div>
                        <div>
                          <span style={styles.approvalLabel}>Approval Date</span>
                          <span style={styles.approvalValue}>{formatDate(doc.approvalDate)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Comments */}
                  {doc.comments && (
                    <div style={styles.commentsBox}>
                      <h5 style={styles.commentsTitle}>💬 Comments</h5>
                      <p style={styles.commentsText}>{doc.comments}</p>
                    </div>
                  )}

                  {/* Changes/History */}
                  {doc.changes && doc.changes.length > 0 && (
                    <div style={styles.changesBox}>
                      <h5 style={styles.changesTitle}>📝 Changes</h5>
                      <ul style={styles.changesList}>
                        {doc.changes.map((change, idx) => (
                          <li key={idx} style={styles.changeItem}>{change}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={styles.actionsBar}>
                    <button style={{ ...styles.actionBtn, backgroundColor: '#007bff', color: 'white' }}>
                      📥 Download
                    </button>
                    <button style={{ ...styles.actionBtn, backgroundColor: '#6c757d', color: 'white' }}>
                      🔍 Verify Hash
                    </button>
                    <button style={{ ...styles.actionBtn, backgroundColor: '#28a745', color: 'white' }}>
                      🔗 View History
                    </button>
                    <button
                      onClick={() => onDocumentSelect?.(doc)}
                      style={{ ...styles.actionBtn, backgroundColor: '#17a2b8', color: 'white' }}
                    >
                      → Full Audit
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredDocuments.length === 0 && (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>No documents found matching your criteria</p>
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
  searchFilterSection: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
  },
  searchBox: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchInput: {
    width: '100%',
    padding: '8px 12px 8px 32px',
    fontSize: '13px',
    border: '1px solid #dee2e6',
    borderRadius: '4px',
    outline: 'none',
  },
  searchIcon: {
    position: 'absolute',
    left: '8px',
    fontSize: '14px',
    pointerEvents: 'none',
  },
  filterArea: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#495057',
  },
  filterSelect: {
    padding: '6px 10px',
    fontSize: '12px',
    border: '1px solid #dee2e6',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: '12px',
    marginBottom: '24px',
  },
  statItem: {
    backgroundColor: 'white',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
    textAlign: 'center',
  },
  statNumber: {
    display: 'block',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: '4px',
  },
  statText: {
    display: 'block',
    fontSize: '12px',
    color: '#6c757d',
  },
  documentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  documentCard: {
    backgroundColor: 'white',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    cursor: 'pointer',
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #dee2e6',
    transition: 'backgroundColor 0.2s ease',
  },
  headerLeft: {
    display: 'flex',
    gap: '12px',
    flex: 1,
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: '20px',
  },
  headerInfo: {
    flex: 1,
  },
  docName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#212529',
    margin: '0 0 4px 0',
  },
  docMeta: {
    fontSize: '12px',
    color: '#6c757d',
    margin: '0',
  },
  headerRight: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
  },
  expandIcon: {
    fontSize: '12px',
    color: '#6c757d',
  },
  expandedContent: {
    padding: '16px',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid #dee2e6',
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
  approvalBox: {
    backgroundColor: '#d4edda',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '12px',
    border: '1px solid #c3e6cb',
  },
  approvalTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#155724',
    margin: '0 0 8px 0',
  },
  approvalGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  approvalLabel: {
    display: 'block',
    fontSize: '11px',
    fontWeight: '600',
    color: '#155724',
  },
  approvalValue: {
    display: 'block',
    fontSize: '13px',
    color: '#155724',
    marginTop: '4px',
  },
  commentsBox: {
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
  changesBox: {
    backgroundColor: '#fff3cd',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '12px',
    border: '1px solid #ffeaa7',
  },
  changesTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#856404',
    margin: '0 0 8px 0',
  },
  changesList: {
    listStyle: 'none',
    padding: '0',
    margin: '0',
  },
  changeItem: {
    fontSize: '13px',
    color: '#856404',
    padding: '4px 0 4px 20px',
    position: 'relative',
  },
  actionsBar: {
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
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease',
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

export default DocumentAuditView;
