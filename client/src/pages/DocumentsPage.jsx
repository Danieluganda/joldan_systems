import React, { useState } from 'react';
import { usePermissions } from '../hooks/usePermissions';
import StandardLayout from '../components/layout/StandardLayout';
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
    <StandardLayout
      title="📄 Documents"
      description="Manage all procurement documents and files"
      headerActions={[
        { label: '+ Upload Document', variant: 'primary', onClick: () => console.log('Upload') },
        { label: '📁 New Folder', variant: 'secondary', onClick: () => console.log('New folder') }
      ]}
    >
      {/* Document List */}
      <div className="documents-section">
        <DocumentList 
          selectedFolder={selectedFolder}
          onSelectFolder={setSelectedFolder}
        />
      </div>
    </StandardLayout>
  );
};

export default DocumentsPage;
