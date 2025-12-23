import React, { useState } from 'react';
import { usePermissions } from '../hooks/usePermissions';
import DocumentList from '../components/documents/DocumentList';
import './pages.css';

/**
 * Documents Page
 * 
 * Manages and displays all documents in the procurement system
 */
const DocumentsPage = () => {
  const { permissions } = usePermissions();
  const [selectedFolder, setSelectedFolder] = useState(null);

  return (
    <div className="page-wrapper">
      <div className="page-container">
        {/* Page Header */}
        <div className="page-header">
          <h1>📄 Documents</h1>
          <p>Manage all procurement documents and files</p>
        </div>

        {/* Document List */}
        <div className="documents-section">
          <DocumentList 
            selectedFolder={selectedFolder}
            onSelectFolder={setSelectedFolder}
          />
        </div>
      </div>
    </div>
  );
};

export default DocumentsPage;
