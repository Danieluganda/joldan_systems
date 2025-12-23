import React, { useState } from 'react';

const FolderBrowser = ({ 
  initialPath = '/',
  onFolderSelect = null,
  onFileSelect = null,
  allowFileUpload = true,
  readOnly = false
}) => {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [selectedItem, setSelectedItem] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set([initialPath]));

  // Mock folder structure
  const mockFolderStructure = {
    '/': {
      type: 'folder',
      name: 'Root',
      children: ['RFQ Documents', 'Submissions', 'Evaluations', 'Contracts', 'Archive']
    },
    '/RFQ Documents': {
      type: 'folder',
      name: 'RFQ Documents',
      parent: '/',
      children: [
        { type: 'file', name: 'RFQ_2024_001.pdf', size: 2.5, date: '2024-01-15' },
        { type: 'file', name: 'Technical_Specs.docx', size: 1.2, date: '2024-01-14' },
      ]
    },
    '/Submissions': {
      type: 'folder',
      name: 'Submissions',
      parent: '/',
      children: [
        { type: 'folder', name: 'Supplier_A', path: '/Submissions/Supplier_A' },
        { type: 'folder', name: 'Supplier_B', path: '/Submissions/Supplier_B' },
      ]
    },
    '/Submissions/Supplier_A': {
      type: 'folder',
      name: 'Supplier_A',
      parent: '/Submissions',
      children: [
        { type: 'file', name: 'Bid_Package.pdf', size: 3.1, date: '2024-01-20' },
        { type: 'file', name: 'References.docx', size: 0.8, date: '2024-01-20' },
      ]
    },
    '/Evaluations': {
      type: 'folder',
      name: 'Evaluations',
      parent: '/',
      children: [
        { type: 'file', name: 'Evaluation_Matrix.xlsx', size: 0.9, date: '2024-01-22' },
        { type: 'file', name: 'Scores_Summary.pdf', size: 1.5, date: '2024-01-23' },
      ]
    },
    '/Contracts': {
      type: 'folder',
      name: 'Contracts',
      parent: '/',
      children: [
        { type: 'file', name: 'Award_Letter.pdf', size: 0.3, date: '2024-01-25' },
        { type: 'file', name: 'Contract_Terms.docx', size: 2.1, date: '2024-01-26' },
      ]
    },
    '/Archive': {
      type: 'folder',
      name: 'Archive',
      parent: '/',
      children: [
        { type: 'file', name: 'Old_RFQ_2023.pdf', size: 1.8, date: '2023-12-01' },
      ]
    }
  };

  const currentFolder = mockFolderStructure[currentPath] || mockFolderStructure['/'];

  const toggleFolder = (folderPath) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const navigateToFolder = (folderPath) => {
    setCurrentPath(folderPath);
    setSelectedItem(null);
  };

  const breadcrumbs = currentPath.split('/').filter(Boolean);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>📁 Folder Browser</h3>
        <div style={styles.toolbar}>
          <button style={styles.toolBtn} title="New Folder">
            ➕ New Folder
          </button>
          {allowFileUpload && (
            <button style={styles.toolBtn} title="Upload">
              📤 Upload
            </button>
          )}
          <button style={styles.toolBtn} title="Download">
            📥 Download
          </button>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <div style={styles.breadcrumb}>
        <button
          onClick={() => navigateToFolder('/')}
          style={{
            ...styles.breadcrumbBtn,
            fontWeight: currentPath === '/' ? 'bold' : 'normal',
          }}
        >
          Home
        </button>
        {breadcrumbs.map((crumb, index) => {
          const path = '/' + breadcrumbs.slice(0, index + 1).join('/');
          return (
            <React.Fragment key={path}>
              <span style={styles.breadcrumbSeparator}>/</span>
              <button
                onClick={() => navigateToFolder(path)}
                style={{
                  ...styles.breadcrumbBtn,
                  fontWeight: currentPath === path ? 'bold' : 'normal',
                }}
              >
                {crumb}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      <div style={styles.content}>
        {/* Folder Tree (Left Sidebar) */}
        <div style={styles.sidebar}>
          <div style={styles.sidebarTitle}>Folders</div>
          <FolderTree
            folderStructure={mockFolderStructure}
            currentPath={currentPath}
            expandedFolders={expandedFolders}
            onToggle={toggleFolder}
            onNavigate={navigateToFolder}
          />
        </div>

        {/* File List (Main Content) */}
        <div style={styles.mainContent}>
          <div style={styles.folderInfo}>
            <span style={styles.folderName}>{currentFolder.name}</span>
            <span style={styles.itemCount}>
              {currentFolder.children?.length || 0} items
            </span>
          </div>

          <div style={styles.itemsList}>
            {currentFolder.children && currentFolder.children.length > 0 ? (
              currentFolder.children.map((item, idx) => {
                const isFolder = item.type === 'folder';
                const itemPath = item.path || `${currentPath}/${item.name}`;
                const isSelected = selectedItem === itemPath;

                return (
                  <div
                    key={idx}
                    style={{
                      ...styles.itemRow,
                      backgroundColor: isSelected ? '#e7f3ff' : idx % 2 === 0 ? '#fafafa' : '#fff',
                    }}
                    onClick={() => {
                      setSelectedItem(itemPath);
                      if (!isFolder && onFileSelect) onFileSelect(item);
                    }}
                    onDoubleClick={() => {
                      if (isFolder) navigateToFolder(itemPath);
                    }}
                  >
                    <span style={styles.itemIcon}>
                      {isFolder ? '📁' : '📄'}
                    </span>
                    <span style={styles.itemName}>{item.name}</span>
                    {!isFolder && (
                      <>
                        <span style={styles.itemSize}>{item.size}MB</span>
                        <span style={styles.itemDate}>
                          {new Date(item.date).toLocaleDateString()}
                        </span>
                      </>
                    )}
                    {isFolder && (
                      <span style={styles.itemSize}>
                        {item.children?.length || 0} items
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <div style={styles.emptyFolder}>
                <div style={styles.emptyIcon}>📂</div>
                <p>This folder is empty</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Panel */}
      {selectedItem && (
        <div style={styles.infoPanel}>
          <div style={styles.infoPanelTitle}>Details</div>
          <div style={styles.infoPair}>
            <span>Path:</span>
            <code style={styles.infoValue}>{selectedItem}</code>
          </div>
        </div>
      )}
    </div>
  );
};

const FolderTree = ({ folderStructure, currentPath, expandedFolders, onToggle, onNavigate }) => {
  const getFolders = () => {
    return Object.entries(folderStructure)
      .filter(([, item]) => item.type === 'folder' && item.parent === '/')
      .map(([path]) => path);
  };

  const renderFolderNode = (folderPath) => {
    const folder = folderStructure[folderPath];
    if (!folder) return null;

    const isExpanded = expandedFolders.has(folderPath);
    const isActive = currentPath === folderPath;
    const subFolders = folder.children
      ?.filter(child => typeof child === 'object' && child.type === 'folder')
      .map(child => child.path) || [];

    return (
      <div key={folderPath}>
        <div
          style={{
            ...styles.treeNode,
            backgroundColor: isActive ? '#e7f3ff' : 'transparent',
            paddingLeft: '10px',
            marginBottom: '4px',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {subFolders.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(folderPath); }}
              style={styles.expandBtn}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          <span
            onClick={() => onNavigate(folderPath)}
            style={styles.nodeLabel}
          >
            📁 {folderPath.split('/').pop() || 'Root'}
          </span>
        </div>
        {isExpanded && subFolders.map(subPath => renderFolderNode(subPath))}
      </div>
    );
  };

  const rootFolders = getFolders();

  return (
    <div style={styles.tree}>
      {rootFolders.map(folderPath => renderFolderNode(folderPath))}
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '8px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    height: '600px',
  },
  header: {
    backgroundColor: '#f9f9f9',
    padding: '15px',
    borderBottom: '1px solid #ddd',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
  },
  toolbar: {
    display: 'flex',
    gap: '8px',
  },
  toolBtn: {
    padding: '6px 12px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
  },
  breadcrumb: {
    padding: '10px 15px',
    backgroundColor: '#fafafa',
    borderBottom: '1px solid #eee',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    overflowX: 'auto',
  },
  breadcrumbBtn: {
    background: 'none',
    border: 'none',
    color: '#007bff',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '2px 0',
    textDecoration: 'underline',
  },
  breadcrumbSeparator: {
    color: '#999',
  },
  content: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    width: '200px',
    borderRight: '1px solid #eee',
    overflowY: 'auto',
    padding: '15px 10px',
    backgroundColor: '#fafafa',
  },
  sidebarTitle: {
    fontWeight: 'bold',
    fontSize: '12px',
    color: '#666',
    marginBottom: '10px',
    textTransform: 'uppercase',
  },
  tree: {
    fontSize: '12px',
  },
  treeNode: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '6px 8px',
  },
  expandBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    width: '16px',
    color: '#666',
  },
  nodeLabel: {
    cursor: 'pointer',
    color: '#333',
    fontSize: '12px',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  folderInfo: {
    padding: '12px 15px',
    backgroundColor: '#f9f9f9',
    borderBottom: '1px solid #eee',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
  },
  folderName: {
    fontWeight: 'bold',
    color: '#333',
  },
  itemCount: {
    color: '#999',
    fontSize: '12px',
  },
  itemsList: {
    flex: 1,
    overflowY: 'auto',
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 15px',
    borderBottom: '1px solid #eee',
    cursor: 'pointer',
    gap: '10px',
    transition: 'background-color 0.2s',
  },
  itemIcon: {
    fontSize: '16px',
  },
  itemName: {
    flex: 1,
    fontSize: '13px',
    fontWeight: '500',
    color: '#333',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  itemSize: {
    fontSize: '12px',
    color: '#999',
    minWidth: '60px',
    textAlign: 'right',
  },
  itemDate: {
    fontSize: '12px',
    color: '#999',
    minWidth: '80px',
    textAlign: 'right',
  },
  emptyFolder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    color: '#999',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '10px',
  },
  infoPanel: {
    padding: '12px 15px',
    backgroundColor: '#f0f0f0',
    borderTop: '1px solid #ddd',
    fontSize: '12px',
  },
  infoPanelTitle: {
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#666',
  },
  infoPair: {
    display: 'flex',
    gap: '10px',
    marginBottom: '6px',
  },
  infoValue: {
    fontFamily: 'monospace',
    fontSize: '11px',
    color: '#007bff',
    backgroundColor: '#fff',
    padding: '2px 6px',
    borderRadius: '3px',
  },
};

export default FolderBrowser;
