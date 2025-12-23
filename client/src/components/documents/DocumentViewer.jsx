import React, { useState } from 'react';

const DocumentViewer = ({ 
  document = null, 
  onClose = null,
  fullscreen = false
}) => {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  if (!document) {
    return (
      <div style={styles.placeholder}>
        <div style={styles.placeholderIcon}>📄</div>
        <p>Select a document to view</p>
      </div>
    );
  }

  const getPreviewContent = () => {
    const type = document.type || 'pdf';
    
    if (type === 'pdf') {
      return `PDF Preview: ${document.name}`;
    } else if (type === 'doc') {
      return `Document Preview: ${document.name}`;
    } else if (type === 'image') {
      return `Image: ${document.name}`;
    } else if (type === 'spreadsheet') {
      return `Spreadsheet: ${document.name}`;
    }
    return 'Document Preview';
  };

  return (
    <div style={{
      ...styles.container,
      position: fullscreen ? 'fixed' : 'relative',
      top: fullscreen ? 0 : 'auto',
      left: fullscreen ? 0 : 'auto',
      right: fullscreen ? 0 : 'auto',
      bottom: fullscreen ? 0 : 'auto',
      zIndex: fullscreen ? 10000 : 'auto',
    }}>
      {/* Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.toolbarSection}>
          <div style={styles.fileName}>
            <span style={styles.fileIcon}>📄</span>
            {document.name}
          </div>
          {document.uploadedDate && (
            <small style={styles.fileDate}>
              Uploaded: {new Date(document.uploadedDate).toLocaleDateString()}
            </small>
          )}
        </div>

        <div style={styles.toolbarSection}>
          {/* Zoom Controls */}
          <div style={styles.zoomControls}>
            <button
              onClick={() => setZoom(Math.max(50, zoom - 10))}
              style={styles.toolBtn}
              title="Zoom Out"
            >
              −
            </button>
            <span style={styles.zoomDisplay}>{zoom}%</span>
            <button
              onClick={() => setZoom(Math.min(200, zoom + 10))}
              style={styles.toolBtn}
              title="Zoom In"
            >
              +
            </button>
            <button
              onClick={() => setZoom(100)}
              style={styles.toolBtn}
              title="Reset Zoom"
            >
              🔍
            </button>
          </div>

          {/* Rotation Controls */}
          <div style={styles.rotationControls}>
            <button
              onClick={() => setRotation((rotation - 90) % 360)}
              style={styles.toolBtn}
              title="Rotate Left"
            >
              ↺
            </button>
            <button
              onClick={() => setRotation((rotation + 90) % 360)}
              style={styles.toolBtn}
              title="Rotate Right"
            >
              ↻
            </button>
          </div>

          {/* Action Buttons */}
          <button style={styles.toolBtn} title="Download">
            ⬇️
          </button>
          <button style={styles.toolBtn} title="Print">
            🖨️
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{...styles.toolBtn, color: '#dc3545'}}
              title="Close"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Viewer Area */}
      <div style={{
        ...styles.viewerArea,
        transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
        transition: 'transform 0.3s ease',
      }}>
        <div style={styles.documentPreview}>
          <div style={styles.documentContent}>
            {/* Placeholder for actual document rendering */}
            <div style={styles.previewPlaceholder}>
              <div style={styles.previewIcon}>📄</div>
              <div style={styles.previewText}>{getPreviewContent()}</div>
              {document.uploadedBy && (
                <small style={styles.previewMeta}>
                  By: {document.uploadedBy} | v{document.version}
                </small>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Document Info Panel */}
      <div style={styles.infoPanel}>
        <div style={styles.infoPanelSection}>
          <div style={styles.infoTitle}>Document Details</div>
          <div style={styles.infoPair}>
            <span style={styles.infoLabel}>Type:</span>
            <span style={styles.infoValue}>{document.type}</span>
          </div>
          <div style={styles.infoPair}>
            <span style={styles.infoLabel}>Size:</span>
            <span style={styles.infoValue}>{document.size}MB</span>
          </div>
          <div style={styles.infoPair}>
            <span style={styles.infoLabel}>Version:</span>
            <span style={styles.infoValue}>v{document.version}</span>
          </div>
          <div style={styles.infoPair}>
            <span style={styles.infoLabel}>Status:</span>
            <span style={{
              ...styles.infoValue,
              color: document.status === 'active' ? '#28a745' : '#ffc107',
              fontWeight: 'bold',
            }}>
              {document.status}
            </span>
          </div>
          <div style={styles.infoPair}>
            <span style={styles.infoLabel}>Uploaded By:</span>
            <span style={styles.infoValue}>{document.uploadedBy}</span>
          </div>
          <div style={styles.infoPair}>
            <span style={styles.infoLabel}>Date:</span>
            <span style={styles.infoValue}>
              {new Date(document.uploadedDate).toLocaleDateString()}
            </span>
          </div>
        </div>

        {document.tags && document.tags.length > 0 && (
          <div style={styles.infoPanelSection}>
            <div style={styles.infoTitle}>Tags</div>
            <div style={styles.tagsList}>
              {document.tags.map(tag => (
                <span key={tag} style={styles.tag}>{tag}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    height: '600px',
  },
  placeholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#999',
  },
  placeholderIcon: {
    fontSize: '48px',
    marginBottom: '10px',
  },
  toolbar: {
    backgroundColor: '#fff',
    borderBottom: '1px solid #ddd',
    padding: '12px 15px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '15px',
    flexWrap: 'wrap',
  },
  toolbarSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  fileName: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: '500',
    color: '#333',
  },
  fileIcon: {
    fontSize: '16px',
  },
  fileDate: {
    display: 'block',
    color: '#999',
    fontSize: '11px',
    marginTop: '3px',
  },
  zoomControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '4px 8px',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
  },
  rotationControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  zoomDisplay: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#666',
    minWidth: '45px',
    textAlign: 'center',
  },
  toolBtn: {
    backgroundColor: 'transparent',
    border: '1px solid #ddd',
    borderRadius: '4px',
    padding: '4px 10px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
    color: '#333',
  },
  viewerArea: {
    flex: 1,
    display: 'flex',
    overflow: 'auto',
    backgroundColor: '#e9e9e9',
    alignItems: 'center',
    justifyContent: 'center',
    transformOrigin: 'center center',
  },
  documentPreview: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentContent: {
    width: '95%',
    height: '95%',
    backgroundColor: '#fff',
    borderRadius: '4px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    padding: '20px',
    overflow: 'auto',
  },
  previewPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#999',
  },
  previewIcon: {
    fontSize: '64px',
    marginBottom: '15px',
  },
  previewText: {
    fontSize: '16px',
    fontWeight: '500',
    marginBottom: '10px',
  },
  previewMeta: {
    display: 'block',
    fontSize: '12px',
    color: '#bbb',
    marginTop: '15px',
  },
  infoPanel: {
    width: '200px',
    backgroundColor: '#f9f9f9',
    borderLeft: '1px solid #ddd',
    padding: '15px',
    overflowY: 'auto',
    fontSize: '12px',
  },
  infoPanelSection: {
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '1px solid #eee',
  },
  infoTitle: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '10px',
    fontSize: '13px',
  },
  infoPair: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    padding: '4px 0',
  },
  infoLabel: {
    fontWeight: '500',
    color: '#666',
  },
  infoValue: {
    color: '#999',
    textAlign: 'right',
    flex: 1,
    marginLeft: '5px',
    wordBreak: 'break-word',
  },
  tagsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '5px',
  },
  tag: {
    backgroundColor: '#e7f3ff',
    padding: '3px 6px',
    borderRadius: '3px',
    color: '#007bff',
    fontSize: '10px',
  },
};

export default DocumentViewer;
