import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import StandardLayout from '../components/layout/StandardLayout';
import './pages.css';

/**
 * Procurement List Page
 * 
 * Displays all procurements with filtering, searching, and action capabilities
 */
const ProcurementList = () => {
  const navigate = useNavigate();
  const { permissions } = usePermissions();
  const [procurements, setProcurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    // Fetch procurements from API
    fetchProcurements();
  }, []);

  const fetchProcurements = async () => {
    try {
      setLoading(true);
      // Mock data for demo
      const mockData = [
        {
          id: 1,
          name: 'Office Equipment Procurement',
          status: 'Planning',
          date: '2025-01-15',
          budget: 50000,
          department: 'Operations'
        },
        {
          id: 2,
          name: 'IT Infrastructure',
          status: 'RFQ Published',
          date: '2025-01-10',
          budget: 150000,
          department: 'IT'
        },
        {
          id: 3,
          name: 'Fleet Vehicles',
          status: 'Evaluation',
          date: '2024-12-20',
          budget: 300000,
          department: 'Logistics'
        }
      ];
      setProcurements(mockData);
    } catch (error) {
      console.error('Error fetching procurements:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProcurements = procurements.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFilter = filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchFilter;
  });

  const getStatusColor = (status) => {
    const colors = {
      'Planning': '#4da3ff',
      'RFQ Published': '#2ecc71',
      'Evaluation': '#f39c12',
      'Awarded': '#27ae60',
      'Closed': '#e74c3c'
    };
    return colors[status] || '#95a5a6';
  };

  return (
    <StandardLayout
      title="📦 Procurements"
      description="Manage and track all procurement activities"
      headerActions={permissions.includes('create_procurement') ? [{ label: '➕ New Procurement', variant: 'primary', onClick: () => navigate('/procurements/new') }] : []}
    >
      {/* Controls */}
      <div className="controls-section">
        <div className="search-filter-group">
          <input
            type="text"
            placeholder="Search procurements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <select
            value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="Planning">Planning</option>
              <option value="RFQ Published">RFQ Published</option>
              <option value="Evaluation">Evaluation</option>
              <option value="Awarded">Awarded</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

        </div>

        {/* Loading State */}
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading procurements...</p>
          </div>
        ) : (
          <>
            {/* Results Count */}
            <div className="results-info">
              <p>{filteredProcurements.length} procurement(s) found</p>
            </div>

            {/* Procurements Table */}
            {filteredProcurements.length > 0 ? (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Budget</th>
                      <th>Department</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProcurements.map((proc) => (
                      <tr key={proc.id}>
                        <td className="cell-name">{proc.name}</td>
                        <td>
                          <span
                            className="status-badge"
                            style={{
                              backgroundColor: getStatusColor(proc.status),
                              color: '#fff',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}
                          >
                            {proc.status}
                          </span>
                        </td>
                        <td>{proc.date}</td>
                        <td className="cell-amount">
                          ${proc.budget.toLocaleString()}
                        </td>
                        <td>{proc.department}</td>
                        <td className="cell-actions">
                          <button
                            onClick={() => navigate(`/procurements/${proc.id}`)}
                            className="btn btn-small btn-info"
                            title="View details"
                          >
                            👁️
                          </button>
                          {permissions.includes('edit_procurement') && (
                            <button
                              onClick={() => navigate(`/procurements/${proc.id}/edit`)}
                              className="btn btn-small btn-warning"
                              title="Edit"
                            >
                              ✏️
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <p>📭 No procurements found</p>
                {permissions.includes('create_procurement') && (
                  <p className="empty-state-hint">
                    <button
                      onClick={() => navigate('/procurements/new')}
                      className="btn btn-primary"
                    >
                      Create your first procurement
                    </button>
                  </p>
                )}
              </div>
            )}
          </>
        )}
    </StandardLayout>
  );
};

export default ProcurementList;
