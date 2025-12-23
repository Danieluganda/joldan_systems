import React, { useState, useEffect } from 'react';

const AuditPackStatus = ({ procurementId, onClose }) => {
  const [packStatus, setPackStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  // Mock audit pack status
  const mockPackStatus = {
    id: 'audit-pack-001',
    procurementId: procurementId,
    createdAt: '2025-12-21T08:00:00Z',
    generatedBy: 'Michael Brown',
    generatorRole: 'Compliance Officer',
    totalPages: 0,
    currentProgress: 65,
    status: 'generating',
    sections: [
      { name: 'Procurement Overview', status: 'completed', pages: 3, description: 'Executive summary of procurement' },
      { name: 'RFQ Documentation', status: 'completed', pages: 8, description: 'RFQ terms and conditions' },
      { name: 'Bid Evaluation', status: 'in-progress', pages: 0, description: 'Evaluation criteria and scores' },
      { name: 'Approval Chain', status: 'pending', pages: 0, description: 'All approval records' },
      { name: 'Audit Trail', status: 'pending', pages: 0, description: 'Complete activity log' },
      { name: 'Compliance Checklist', status: 'pending', pages: 0, description: 'PPDA 2005 compliance verification' },
      { name: 'Risk Assessment', status: 'pending', pages: 0, description: 'Identified risks and mitigation' },
      { name: 'Financial Summary', status: 'pending', pages: 0, description: 'Budget and cost analysis' },
    ],
    estimatedCompletion: '2025-12-21T12:30:00Z',
  };

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setPackStatus(mockPackStatus);
      setLoading(false);
    }, 500);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#28a745';
      case 'in-progress':
        return '#007bff';
      case 'pending':
        return '#6c757d';
      case 'error':
        return '#dc3545';
      default:
        return '#e9ecef';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'in-progress':
        return '⏳';
      case 'pending':
        return '○';
      case 'error':
        return '✕';
      default:
        return '?';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const estimatedMinutes = Math.ceil((100 - packStatus.currentProgress) / 10);
  const completedPages = packStatus.sections.filter(s => s.status === 'completed').reduce((sum, s) => sum + s.pages, 0);

  if (loading) {
    return <div style={styles.container}><p>Loading audit pack status...</p></div>;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Audit Pack Generation Status</h2>
          <p style={styles.subtitle}>Procurement ID: {procurementId}</p>
        </div>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>
      </div>

      {/* Overall Progress */}
      <div style={styles.progressSection}>
        <div style={styles.progressHeader}>
          <h3 style={styles.progressTitle}>Overall Progress</h3>
          <span style={styles.progressPercent}>{packStatus.currentProgress}%</span>
        </div>

        <div style={styles.progressBar}>
          <div
            style={{
              width: `${packStatus.currentProgress}%`,
              height: '100%',
              backgroundColor: packStatus.currentProgress === 100 ? '#28a745' : '#007bff',
              borderRadius: '4px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        <div style={styles.progressInfo}>
          <p style={styles.progressStatus}>
            {packStatus.status === 'generating' ? '⏳ Generating...' : packStatus.status === 'completed' ? '✓ Completed' : '⚠️ ' + packStatus.status}
          </p>
          <p style={styles.progressDetails}>
            {completedPages} pages generated • Estimated completion: {estimatedMinutes} minutes
          </p>
        </div>
      </div>

      {/* Generation Info */}
      <div style={styles.infoSection}>
        <div style={styles.infoItem}>
          <span style={styles.infoLabel}>Started By:</span>
          <span style={styles.infoValue}>{packStatus.generatedBy} ({packStatus.generatorRole})</span>
        </div>
        <div style={styles.infoItem}>
          <span style={styles.infoLabel}>Start Time:</span>
          <span style={styles.infoValue}>{formatDate(packStatus.createdAt)}</span>
        </div>
        <div style={styles.infoItem}>
          <span style={styles.infoLabel}>Estimated Completion:</span>
          <span style={styles.infoValue}>{formatDate(packStatus.estimatedCompletion)}</span>
        </div>
      </div>

      {/* Sections Status */}
      <div style={styles.sectionsContainer}>
        <h3 style={styles.sectionTitle}>Report Sections</h3>

        <div style={styles.sectionsList}>
          {packStatus.sections.map((section, idx) => (
            <div
              key={idx}
              style={{
                ...styles.sectionItem,
                backgroundColor:
                  section.status === 'completed'
                    ? '#f0f8f5'
                    : section.status === 'in-progress'
                    ? '#e7f3ff'
                    : '#f5f5f5',
                borderLeftColor: getStatusColor(section.status),
              }}
            >
              <div style={styles.sectionItemHeader}>
                <div style={{ ...styles.statusDot, backgroundColor: getStatusColor(section.status) }}>
                  {getStatusIcon(section.status)}
                </div>
                <div style={styles.sectionInfo}>
                  <h4 style={styles.sectionName}>{section.name}</h4>
                  <p style={styles.sectionDesc}>{section.description}</p>
                </div>
                {section.pages > 0 && <span style={styles.pageCount}>{section.pages} pages</span>}
              </div>

              {section.status === 'in-progress' && (
                <div style={styles.sectionProgress}>
                  <div style={styles.miniProgressBar}>
                    <div
                      style={{
                        width: '35%',
                        height: '100%',
                        backgroundColor: '#007bff',
                        borderRadius: '2px',
                      }}
                    />
                  </div>
                  <span style={styles.progressSmall}>35% complete</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={styles.actions}>
        <button style={{ ...styles.button, ...styles.pauseBtn }}>⏸️ Pause Generation</button>
        <button style={{ ...styles.button, ...styles.downloadBtn }}>📥 Download Current Version</button>
        <button style={{ ...styles.button, ...styles.viewBtn }}>👁️ Preview Pack</button>
      </div>

      {/* Status Messages */}
      {packStatus.status === 'generating' && (
        <div style={styles.messageBox}>
          <p style={styles.messageText}>⏳ Your audit pack is being generated. You can close this window and the process will continue in the background.</p>
        </div>
      )}

      {packStatus.currentProgress === 100 && (
        <div style={{ ...styles.messageBox, backgroundColor: '#d4edda', borderColor: '#c3e6cb', color: '#155724' }}>
          <p style={styles.messageText}>✓ Audit pack generation completed successfully. Ready for download and distribution.</p>
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
  progressSection: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
    marginBottom: '24px',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  progressTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#212529',
    margin: '0',
  },
  progressPercent: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#007bff',
  },
  progressBar: {
    width: '100%',
    height: '24px',
    backgroundColor: '#e9ecef',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '12px',
  },
  progressInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
  },
  progressStatus: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#212529',
    margin: '0',
  },
  progressDetails: {
    fontSize: '13px',
    color: '#6c757d',
    margin: '0',
  },
  infoSection: {
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
    marginBottom: '24px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  infoLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6c757d',
  },
  infoValue: {
    fontSize: '14px',
    color: '#212529',
  },
  sectionsContainer: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#212529',
    margin: '0 0 16px 0',
  },
  sectionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sectionItem: {
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
    borderLeft: '4px solid #dee2e6',
  },
  sectionItemHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  statusDot: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '14px',
    flexShrink: 0,
  },
  sectionInfo: {
    flex: 1,
  },
  sectionName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#212529',
    margin: '0 0 4px 0',
  },
  sectionDesc: {
    fontSize: '12px',
    color: '#6c757d',
    margin: '0',
  },
  pageCount: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#495057',
    whiteSpace: 'nowrap',
  },
  sectionProgress: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #e9ecef',
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  miniProgressBar: {
    flex: 1,
    height: '4px',
    backgroundColor: '#e9ecef',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  progressSmall: {
    fontSize: '11px',
    color: '#6c757d',
    whiteSpace: 'nowrap',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  button: {
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  pauseBtn: {
    backgroundColor: '#ffc107',
    color: '#212529',
  },
  downloadBtn: {
    backgroundColor: '#28a745',
    color: 'white',
  },
  viewBtn: {
    backgroundColor: '#007bff',
    color: 'white',
  },
  messageBox: {
    backgroundColor: '#fff3cd',
    border: '1px solid #ffeaa7',
    borderRadius: '4px',
    padding: '12px',
    color: '#856404',
  },
  messageText: {
    fontSize: '13px',
    margin: '0',
    lineHeight: '1.4',
  },
};

export default AuditPackStatus;
