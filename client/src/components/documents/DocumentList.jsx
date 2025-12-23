import React, { useState } from 'react';

const DocumentList = ({ 
  documents = [], 
  onSelect = null,
  onDelete = null,
  onDownload = null,
  showActions = true,
  sortBy = 'date' // 'date', 'name', 'size'
}) => {
  const [filter, setFilter] = useState('all'); // 'all', 'pdf', 'doc', 'image', 'spreadsheet'
  const [selectedDocs, setSelectedDocs] = useState([]);

  // Mock documents if none provided
  const mockDocs = [
    {
      id: 1,
      name: 'RFQ_2024.pdf',
      type: 'pdf',
      size: 2.5,
      uploadedBy: 'John Smith',
      uploadedDate: '2024-01-15',
      version: 1,
      status: 'active',
      tags: ['rfq', 'published']
    },
    {
      id: 2,
      name: 'Technical_Specifications.docx',
      type: 'doc',
      size: 1.2,
      uploadedBy: 'Jane Doe',
      uploadedDate: '2024-01-14',
      version: 2,
      status: 'active',
      tags: ['specs', 'technical']
    },
    {
      id: 3,
      name: 'Evaluation_Criteria.xlsx',
      type: 'spreadsheet',
      size: 0.8,
      uploadedBy: 'Mark Wilson',
      uploadedDate: '2024-01-10',
      version: 1,
      status: 'draft',
      tags: ['evaluation']
    },
  ];

  const displayDocs = documents.length ? documents : mockDocs;

  // Filter documents
  const filteredDocs = displayDocs.filter(doc => {
    if (filter === 'all') return true;
    return doc.type === filter;
  });

  // Sort documents
  const sortedDocs = [...filteredDocs].sort((a, b) => {
    if (sortBy === 'date') return new Date(b.uploadedDate) - new Date(a.uploadedDate);
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'size') return b.size - a.size;
    return 0;
  });

  const getFileIcon = (type) => {
    const icons = {
      pdf: '📄',
      doc: '📝',
      image: '🖼️',
      spreadsheet: '📊',
      default: '📁'
    };
    return icons[type] || icons.default;
  };

  const getTypeColor = (type) => {
    const colors = {
      pdf: '#dc3545',
      doc: '#007bff',
      image: '#17a2b8',
      spreadsheet: '#28a745',
    };
    return colors[type] || '#6c757d';
  };

  const toggleSelectDoc = (docId) => {
    setSelectedDocs(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const handleSelectAll = () => {
    if (selectedDocs.length === sortedDocs.length) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(sortedDocs.map(doc => doc.id));
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Document Library</h3>
        <div style={styles.filterBar}>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">All Types</option>
            <option value="pdf">PDF</option>
            <option value="doc">Documents</option>
            <option value="spreadsheet">Spreadsheets</option>
            <option value="image">Images</option>
          </select>
          <span style={styles.countBadge}>
            {sortedDocs.length} documents
          </span>
        </div>
      </div>

      {sortedDocs.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📂</div>
          <p>No documents found</p>
        </div>
      ) : (
        <div style={styles.listContainer}>
          {/* Header Row */}
          <div style={styles.headerRow}>
            <input
              type="checkbox"
              checked={selectedDocs.length === sortedDocs.length && sortedDocs.length > 0}
              onChange={handleSelectAll}
              style={styles.checkbox}
            />
            <div style={{...styles.col, flex: 3}}>Name</div>
            <div style={{...styles.col, flex: 1}}>Size</div>
            <div style={{...styles.col, flex: 1.5}}>Uploaded</div>
            <div style={{...styles.col, flex: 1}}>Version</div>
            <div style={{...styles.col, flex: 1}}>Status</div>
            {showActions && <div style={{...styles.col, flex: 1}}>Actions</div>}
          </div>

          {/* Document Rows */}
          {sortedDocs.map((doc, idx) => (
            <div
              key={doc.id}
              style={{
                ...styles.row,
                backgroundColor: selectedDocs.includes(doc.id) ? '#e7f3ff' : idx % 2 === 0 ? '#f9f9f9' : '#fff',
                borderLeft: selectedDocs.includes(doc.id) ? '3px solid #007bff' : 'none',
              }}
              onClick={() => onSelect && onSelect(doc)}
            >
              <input
                type="checkbox"
                checked={selectedDocs.includes(doc.id)}
                onChange={() => toggleSelectDoc(doc.id)}
                onClick={(e) => e.stopPropagation()}
                style={styles.checkbox}
              />

              <div style={{...styles.col, flex: 3}}>
                <span style={styles.icon}>{getFileIcon(doc.type)}</span>
                <span style={styles.docName}>{doc.name}</span>
              </div>

              <div style={{...styles.col, flex: 1}}>
                <small style={styles.text}>{doc.size}MB</small>
              </div>

              <div style={{...styles.col, flex: 1.5}}>
                <small style={styles.text}>
                  {new Date(doc.uploadedDate).toLocaleDateString()}
                  <br />
                  <span style={styles.uploadedBy}>{doc.uploadedBy}</span>
                </small>
              </div>

              <div style={{...styles.col, flex: 1}}>
                <span style={styles.versionBadge}>v{doc.version}</span>
              </div>

              <div style={{...styles.col, flex: 1}}>
                <span
                  style={{
                    ...styles.statusBadge,
                    backgroundColor: doc.status === 'active' ? '#d4edda' : '#fff3cd',
                    color: doc.status === 'active' ? '#155724' : '#856404',
                  }}
                >
                  {doc.status === 'active' ? '✓ Active' : '⏱ Draft'}
                </span>
              </div>

              {showActions && (
                <div style={{...styles.col, flex: 1, display: 'flex', gap: '5px'}}>
                  {onDownload && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDownload(doc); }}
                      style={styles.actionBtn}
                      title="Download"
                    >
                      ⬇️
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(doc.id); }}
                      style={{...styles.actionBtn, color: '#dc3545'}}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Tags Summary */}
          {sortedDocs.length > 0 && (
            <div style={styles.tagsSummary}>
              <strong>Tags: </strong>
              {Array.from(new Set(sortedDocs.flatMap(d => d.tags || []))).map(tag => (
                <span key={tag} style={styles.tag}>{tag}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bulk Actions */}
      {selectedDocs.length > 0 && (
        <div style={styles.bulkActions}>
          <span>{selectedDocs.length} document(s) selected</span>
          <div style={{display: 'flex', gap: '10px'}}>
            {onDownload && (
              <button style={styles.bulkBtn} onClick={() => {}}>
                Download Selected
              </button>
            )}
            {onDelete && (
              <button
                style={{...styles.bulkBtn, backgroundColor: '#dc3545'}}
                onClick={() => {
                  selectedDocs.forEach(id => onDelete && onDelete(id));
                  setSelectedDocs([]);
                }}
              >
                Delete Selected
              </button>
            )}
            <button
              style={{...styles.bulkBtn, backgroundColor: '#6c757d'}}
              onClick={() => setSelectedDocs([])}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
  },
  header: {
    marginBottom: '20px',
  },
  title: {
    margin: '0 0 15px 0',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
  },
  filterBar: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  filterSelect: {
    padding: '6px 10px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '13px',
    cursor: 'pointer',
  },
  countBadge: {
    backgroundColor: '#e9ecef',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#666',
    fontWeight: '500',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#999',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '10px',
  },
  listContainer: {
    borderTop: '1px solid #eee',
  },
  headerRow: {
    display: 'flex',
    backgroundColor: '#f5f5f5',
    fontWeight: 'bold',
    fontSize: '13px',
    padding: '12px 10px',
    borderBottom: '2px solid #ddd',
    alignItems: 'center',
    color: '#666',
  },
  row: {
    display: 'flex',
    padding: '12px 10px',
    borderBottom: '1px solid #eee',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  col: {
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
  },
  checkbox: {
    marginRight: '10px',
    cursor: 'pointer',
  },
  icon: {
    fontSize: '18px',
    marginRight: '8px',
  },
  docName: {
    fontWeight: '500',
    color: '#007bff',
    textDecoration: 'underline',
    cursor: 'pointer',
  },
  text: {
    color: '#666',
    fontSize: '12px',
  },
  uploadedBy: {
    display: 'block',
    fontSize: '10px',
    color: '#999',
    marginTop: '2px',
  },
  versionBadge: {
    backgroundColor: '#e9ecef',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#666',
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '500',
  },
  actionBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '2px 4px',
    color: '#007bff',
    transition: 'opacity 0.2s',
  },
  tagsSummary: {
    padding: '12px 10px',
    backgroundColor: '#f9f9f9',
    borderTop: '1px solid #eee',
    fontSize: '12px',
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  tag: {
    backgroundColor: '#e7f3ff',
    padding: '3px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    color: '#007bff',
  },
  bulkActions: {
    marginTop: '15px',
    padding: '12px 15px',
    backgroundColor: '#e7f3ff',
    borderRadius: '6px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
    color: '#007bff',
  },
  bulkBtn: {
    padding: '6px 12px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'opacity 0.2s',
  },
};

export default DocumentList;
