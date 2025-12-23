/**
 * PAGE_NAME Component
 * 
 * Brief description of what this page does
 * 
 * Features:
 * - Feature 1
 * - Feature 2
 * - Feature 3
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import StandardLayout from '../components/layout/StandardLayout';
import './pages.css';

const PageName = () => {
  const navigate = useNavigate();
  const { permissions } = usePermissions();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load data on component mount
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      const response = await fetch('/api/endpoint');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handler for primary action
  const handlePrimaryAction = () => {
    // TODO: Implement primary action
    console.log('Primary action clicked');
  };

  // Handler for secondary action
  const handleSecondaryAction = () => {
    // TODO: Implement secondary action
    console.log('Secondary action clicked');
  };

  // Define header actions
  const headerActions = [];

  // Add primary action if user has permission
  if (permissions.includes('create_item')) {
    headerActions.push({
      label: '+ New Item',
      variant: 'primary',
      onClick: handlePrimaryAction
    });
  }

  // Add secondary action if user has permission
  if (permissions.includes('export_data')) {
    headerActions.push({
      label: 'Export',
      variant: 'secondary',
      onClick: handleSecondaryAction
    });
  }

  return (
    <StandardLayout
      title="📌 Page Title"
      description="Brief description of this page"
      headerActions={headerActions}
    >
      {/* TODO: Replace with actual content */}

      {loading ? (
        <div className="loading-state">
          <p>Loading...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="empty-state">
          <p>No items found</p>
          {permissions.includes('create_item') && (
            <button
              className="btn btn-primary"
              onClick={handlePrimaryAction}
            >
              Create your first item
            </button>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Column 1</th>
                <th>Column 2</th>
                <th>Column 3</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id}>
                  <td>{item.column1}</td>
                  <td>{item.column2}</td>
                  <td>{item.column3}</td>
                  <td>
                    <button
                      className="btn btn-small btn-info"
                      onClick={() => {
                        /* Edit action */
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </StandardLayout>
  );
};

export default PageName;
