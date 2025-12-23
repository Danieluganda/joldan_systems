import React, { useState } from 'react';

const VersionHistory = ({ 
  documentId = null,
  documentName = 'Document',
  onVersionSelect = null,
  onRevert = null
}) => {
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [expandedVersion, setExpandedVersion] = useState(null);

  // Mock version history
  const mockVersions = [
    {
      version: 3,
      date: '2024-01-25',
      time: '14:30',
      editor: 'Jane Doe',
      action: 'Modified',
      changes: 'Updated evaluation criteria and scoring weights',
      status: 'active',
      size: 2.5,
      downloads: 12
    },
    {
      version: 2,
      date: '2024-01-22',
      time: '10:15',
      editor: 'John Smith',
      action: 'Modified',
      changes: 'Added section on supplier qualifications',
      status: 'archived',
      size: 2.3,
      downloads: 8
    },
    {
      version: 1,
      date: '2024-01-15',
      time: '09:00',
      editor: 'Mark Wilson',
      action: 'Created',
      changes: 'Initial version',
      status: 'archived',
      size: 1.8,
      downloads: 15
    },
  ];

  const handleSelectVersion = (version) => {
    setSelectedVersion(version.version);
    if (onVersionSelect) onVersionSelect(version);
  };

  const handleRevertVersion = (version) => {
    if (onRevert) onRevert(version);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>📜 Version History</h3>
          <small style={styles.subtitle}>{documentName}</small>
        </div>
        <div style={styles.headerStats}>
          <div style={styles.stat}>
            <span style={styles.statLabel}>Total Versions:</span>
            <span style={styles.statValue}>{mockVersions.length}</span>
          </div>
          <div style={styles.stat}>
            <span style={styles.statLabel}>Current:</span>
            <span style={styles.statValue}>v{mockVersions[0].version}</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div style={styles.timeline}>
        {mockVersions.map((version, idx) => {
          const isSelected = selectedVersion === version.version;
          const isCurrent = idx === 0;
          const isExpanded = expandedVersion === version.version;

          return (
            <div key={version.version}>
              {/* Timeline Item */}
              <div
                style={{
                  ...styles.timelineItem,
                  backgroundColor: isSelected ? '#e7f3ff' : isCurrent ? '#f0f8ff' : '#fff',
                  borderLeft: isSelected ? '4px solid #007bff' : '4px solid #ddd',
                }}
                onClick={() => handleSelectVersion(version)}
              >
                {/* Timeline Dot */}
                <div
                  style={{
                    ...styles.timelineDot,
                    backgroundColor: isCurrent ? '#28a745' : '#007bff',
                    boxShadow: isSelected ? '0 0 0 4px rgba(0, 123, 255, 0.25)' : 'none',
                  }}
                >
                  <span style={styles.versionNumber}>v{version.version}</span>
                </div>

                {/* Content */}
                <div style={styles.timelineContent}>
                  <div style={styles.versionHeader}>
                    <div style={styles.versionTitle}>
                      <strong>Version {version.version}</strong>
                      {isCurrent && (
                        <span style={styles.currentBadge}>Current</span>
                      )}
                      {version.status === 'archived' && (
                        <span style={styles.archivedBadge}>Archived</span>
                      )}
                    </div>
                    <small style={styles.versionDate}>
                      {version.date} {version.time}
                    </small>
                  </div>

                  <div style={styles.versionMeta}>
                    <span style={styles.metaItem}>
                      <strong>Editor:</strong> {version.editor}
                    </span>
                    <span style={styles.metaItem}>
                      <strong>Size:</strong> {version.size}MB
                    </span>
                    <span style={styles.metaItem}>
                      <strong>Downloads:</strong> {version.downloads}
                    </span>
                  </div>

                  {/* Expandable Details */}
                  {isExpanded && (
                    <div style={styles.versionDetails}>
                      <div style={styles.detailsSection}>
                        <strong>Changes:</strong>
                        <p style={styles.changesText}>{version.changes}</p>
                      </div>

                      <div style={styles.detailsSection}>
                        <strong>Metadata:</strong>
                        <ul style={styles.metadataList}>
                          <li>Action: {version.action}</li>
                          <li>Status: {version.status}</li>
                          <li>File Size: {version.size}MB</li>
                          <li>Editor: {version.editor}</li>
                        </ul>
                      </div>

                      <div style={styles.versionActions}>
                        <button
                          style={styles.previewBtn}
                          onClick={() => window.alert('Preview v' + version.version)}
                        >
                          👁️ Preview
                        </button>
                        <button
                          style={styles.downloadBtn}
                          onClick={() => window.alert('Download v' + version.version)}
                        >
                          ⬇️ Download
                        </button>
                        {!isCurrent && onRevert && (
                          <button
                            style={styles.revertBtn}
                            onClick={() => handleRevertVersion(version)}
                          >
                            ↶ Revert to this version
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Toggle Details Button */}
                  <button
                    onClick={() => setExpandedVersion(isExpanded ? null : version.version)}
                    style={styles.toggleBtn}
                  >
                    {isExpanded ? '▼ Hide Details' : '▶ Show Details'}
                  </button>
                </div>
              </div>

              {/* Timeline Connector */}
              {idx < mockVersions.length - 1 && (
                <div style={styles.timelineConnector} />
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div style={styles.summary}>
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>Total Size:</span>
          <span style={styles.summaryValue}>
            {mockVersions.reduce((sum, v) => sum + v.size, 0)}MB
          </span>
        </div>
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>Contributors:</span>
          <span style={styles.summaryValue}>
            {new Set(mockVersions.map(v => v.editor)).size}
          </span>
        </div>
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>Total Downloads:</span>
          <span style={styles.summaryValue}>
            {mockVersions.reduce((sum, v) => sum + v.downloads, 0)}
          </span>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  header: {
    padding: '20px',
    borderBottom: '1px solid #eee',
    backgroundColor: '#f9f9f9',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    margin: '0 0 5px 0',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    color: '#999',
    fontSize: '12px',
  },
  headerStats: {
    display: 'flex',
    gap: '20px',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  statLabel: {
    fontSize: '12px',
    color: '#999',
  },
  statValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#007bff',
  },
  timeline: {
    padding: '20px',
    maxHeight: '500px',
    overflowY: 'auto',
  },
  timelineItem: {
    display: 'flex',
    gap: '15px',
    padding: '15px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: '10px',
  },
  timelineDot: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '12px',
    minWidth: '50px',
    position: 'relative',
  },
  versionNumber: {
    fontSize: '11px',
    fontWeight: 'bold',
  },
  timelineContent: {
    flex: 1,
  },
  versionHeader: {
    marginBottom: '8px',
  },
  versionTitle: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    marginBottom: '4px',
  },
  currentBadge: {
    backgroundColor: '#28a745',
    color: '#fff',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 'bold',
  },
  archivedBadge: {
    backgroundColor: '#6c757d',
    color: '#fff',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 'bold',
  },
  versionDate: {
    color: '#999',
    fontSize: '12px',
  },
  versionMeta: {
    display: 'flex',
    gap: '12px',
    fontSize: '12px',
    marginBottom: '10px',
    flexWrap: 'wrap',
  },
  metaItem: {
    color: '#666',
  },
  versionDetails: {
    backgroundColor: '#f9f9f9',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '10px',
    fontSize: '13px',
    border: '1px solid #eee',
  },
  detailsSection: {
    marginBottom: '12px',
  },
  changesText: {
    margin: '6px 0 0 0',
    color: '#666',
    fontStyle: 'italic',
  },
  metadataList: {
    margin: '6px 0 0 20px',
    fontSize: '12px',
    color: '#666',
    paddingLeft: '0',
  },
  versionActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '10px',
    flexWrap: 'wrap',
  },
  previewBtn: {
    padding: '4px 10px',
    backgroundColor: '#17a2b8',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
  },
  downloadBtn: {
    padding: '4px 10px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
  },
  revertBtn: {
    padding: '4px 10px',
    backgroundColor: '#ffc107',
    color: '#333',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: '#007bff',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '0',
    textDecoration: 'underline',
  },
  timelineConnector: {
    height: '10px',
    width: '2px',
    backgroundColor: '#ddd',
    margin: '0 auto 0 24px',
  },
  summary: {
    display: 'flex',
    gap: '20px',
    padding: '15px 20px',
    backgroundColor: '#f9f9f9',
    borderTop: '1px solid #eee',
    fontSize: '12px',
  },
  summaryItem: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  summaryLabel: {
    fontWeight: '500',
    color: '#666',
  },
  summaryValue: {
    color: '#007bff',
    fontWeight: 'bold',
  },
};

export default VersionHistory;
