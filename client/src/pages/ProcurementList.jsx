import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProcurement } from '../hooks/useProcurement';
import { usePermissions } from '../hooks/usePermissions';
import StandardLayout from '../components/layout/StandardLayout';
import './pages.css';

/**
 * Procurement List Page
 * 
 * Enhanced procurement listing with advanced filtering, sorting, batch operations,
 * and comprehensive CRUD capabilities following STEP procurement methodology
 */
const ProcurementList = () => {
  const navigate = useNavigate();
  const { permissions } = usePermissions();
  const { 
    procurements, 
    loading, 
    error, 
    deleteProcurement, 
    updateProcurement,
    fetchProcurements 
  } = useProcurement();

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMethod, setFilterMethod] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('table'); // table, grid

  // UI state
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);
  const [bulkAction, setBulkAction] = useState('');

  // Clear message after 5 seconds
  const showMessage = useCallback((type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }, []);

  // Get unique values for filters
  const uniqueDepartments = useMemo(() => {
    const depts = [...new Set(procurements.map(p => p.department || 'Unknown').filter(Boolean))];
    return depts.sort();
  }, [procurements]);

  const uniqueStatuses = useMemo(() => {
    const statuses = [...new Set(procurements.map(p => p.status || p.currentStage || 'Draft').filter(Boolean))];
    return statuses.sort();
  }, [procurements]);

  const procurementMethods = [
    'RFB - Request for Bids',
    'RFQ - Request for Quotations', 
    'QCBS - Quality & Cost Based Selection',
    'CQS - Consultant Qualification Selection',
    'INDV - Individual Consultant',
    'SBD - Shopping - Bidding Documents',
    'DCB - Direct Contracting'
  ];

  // Filter and sort procurements
  const filteredProcurements = useMemo(() => {
    let filtered = procurements.filter(p => {
      const matchSearch = !searchQuery || 
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.reference?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchStatus = filterStatus === 'all' || 
        (p.status || p.currentStage || 'Draft').toLowerCase() === filterStatus.toLowerCase();
      
      const matchMethod = filterMethod === 'all' || p.method === filterMethod;
      
      const matchDepartment = filterDepartment === 'all' || 
        (p.department || 'Unknown') === filterDepartment;
      
      return matchSearch && matchStatus && matchMethod && matchDepartment;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle different data types
      if (sortBy === 'budget' || sortBy === 'estimatedBudget') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      } else if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else {
        aValue = String(aValue || '').toLowerCase();
        bValue = String(bValue || '').toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [procurements, searchQuery, filterStatus, filterMethod, filterDepartment, sortBy, sortOrder]);

  // Handle item selection
  const handleSelectItem = (id) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredProcurements.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredProcurements.map(p => p.id)));
    }
  };

  // Handle bulk actions
  const handleBulkAction = async () => {
    if (!bulkAction || selectedItems.size === 0) return;

    const selectedIds = Array.from(selectedItems);
    setSubmitting(true);

    try {
      switch (bulkAction) {
        case 'delete':
          if (window.confirm(`Are you sure you want to delete ${selectedIds.length} procurement(s)? This action cannot be undone.`)) {
            await Promise.all(selectedIds.map(id => deleteProcurement(id)));
            showMessage('success', `${selectedIds.length} procurement(s) deleted successfully`);
            setSelectedItems(new Set());
          }
          break;
        case 'archive':
          await Promise.all(selectedIds.map(id => updateProcurement(id, { status: 'archived' })));
          showMessage('success', `${selectedIds.length} procurement(s) archived successfully`);
          setSelectedItems(new Set());
          break;
        case 'activate':
          await Promise.all(selectedIds.map(id => updateProcurement(id, { status: 'active' })));
          showMessage('success', `${selectedIds.length} procurement(s) activated successfully`);
          setSelectedItems(new Set());
          break;
        default:
          break;
      }
    } catch (error) {
      showMessage('error', 'Error performing bulk action: ' + error.message);
    } finally {
      setSubmitting(false);
      setBulkAction('');
    }
  };

  // Export functionality
  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Name,Status,Method,Budget,Department,Created\n" +
      filteredProcurements.map(p => (
        `"${p.name || ''}","${p.status || p.currentStage || 'Draft'}","${p.method || ''}","${p.budget || p.estimatedBudget || 0}","${p.department || ''}","${new Date(p.createdAt).toLocaleDateString()}"`
      )).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `procurements-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showMessage('success', 'Procurement data exported successfully');
  };

  // Get status style
  const getStatusStyle = (status) => {
    const statusLower = (status || 'draft').toLowerCase();
    switch (statusLower) {
      case 'planning': return { background: '#fff3cd', color: '#856404', border: '1px solid #ffeaa7' };
      case 'active': return { background: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' };
      case 'rfq published': case 'published': return { background: '#cce7ff', color: '#004085', border: '1px solid #b3d7ff' };
      case 'evaluation': return { background: '#e2e3e5', color: '#383d41', border: '1px solid #d6d8db' };
      case 'awarded': return { background: '#d1ecf1', color: '#0c5460', border: '1px solid #bee5eb' };
      case 'completed': case 'closed': return { background: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' };
      case 'cancelled': case 'archived': return { background: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' };
      default: return { background: '#e2e3e5', color: '#383d41', border: '1px solid #d6d8db' };
    }
  };

  // Get method badge color
  const getMethodColor = (method) => {
    const colors = {
      'RFB': '#007bff',
      'RFQ': '#28a745', 
      'QCBS': '#6f42c1',
      'CQS': '#fd7e14',
      'INDV': '#20c997',
      'SBD': '#6c757d',
      'DCB': '#e83e8c'
    };
    return colors[method?.split(' ')[0]] || '#6c757d';
  };

  const headerActions = [
    {
      label: '📊 Export Data',
      variant: 'info',
      onClick: handleExport
    },
    {
      label: '🔄 Refresh',
      variant: 'secondary',
      onClick: fetchProcurements
    }
  ];

  if (permissions.includes('create_procurement')) {
    headerActions.unshift({
      label: '➕ New Procurement',
      variant: 'primary',
      onClick: () => navigate('/procurements/new')
    });
  }

  return (
    <StandardLayout
      title="📦 Procurements"
      description={`Manage and track all procurement activities (${filteredProcurements.length} total)`}
      headerActions={headerActions}
    >
      {/* Message Display */}
      {message.text && (
        <div className={`alert alert-${message.type === 'success' ? 'info' : message.type === 'error' ? 'urgent' : 'warning'}`} style={{ marginBottom: '24px' }}>
          <span className="alert-icon">
            {message.type === 'success' ? '✅' : message.type === 'error' ? '❌' : 'ℹ️'}
          </span>
          <span className="alert-message">{message.text}</span>
        </div>
      )}

      {/* Controls Bar */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-body">
          <div className="controls-grid">
            {/* Search */}
            <div className="search-section">
              <div className="input-group">
                <label>Search</label>
                <input
                  type="text"
                  placeholder="Search by name, description, or reference..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            {/* Filters Toggle */}
            <div className="filters-toggle">
              <button 
                className={`btn btn-secondary ${showFilters ? 'active' : ''}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                🔍 Filters ({[filterStatus, filterMethod, filterDepartment].filter(f => f !== 'all').length})
              </button>
            </div>

            {/* View Mode */}
            <div className="view-controls">
              <div className="btn-group">
                <button 
                  className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setViewMode('table')}
                  title="Table View"
                >
                  📊
                </button>
                <button 
                  className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                >
                  ⊞
                </button>
              </div>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="filters-section">
              <div className="filters-grid">
                <div className="input-group">
                  <label>Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="form-select"
                  >
                    <option value="all">All Statuses</option>
                    {uniqueStatuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label>Method</label>
                  <select
                    value={filterMethod}
                    onChange={(e) => setFilterMethod(e.target.value)}
                    className="form-select"
                  >
                    <option value="all">All Methods</option>
                    {procurementMethods.map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label>Department</label>
                  <select
                    value={filterDepartment}
                    onChange={(e) => setFilterDepartment(e.target.value)}
                    className="form-select"
                  >
                    <option value="all">All Departments</option>
                    {uniqueDepartments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label>Sort By</label>
                  <div className="sort-controls">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="form-select"
                    >
                      <option value="createdAt">Created Date</option>
                      <option value="name">Name</option>
                      <option value="status">Status</option>
                      <option value="budget">Budget</option>
                      <option value="department">Department</option>
                    </select>
                    <button
                      className={`btn btn-sm ${sortOrder === 'asc' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                    >
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <div className="bulk-actions-bar">
          <div className="bulk-info">
            <span>{selectedItems.size} item(s) selected</span>
          </div>
          <div className="bulk-controls">
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="form-select"
            >
              <option value="">Choose action...</option>
              {permissions.includes('delete_procurement') && <option value="delete">Delete</option>}
              {permissions.includes('edit_procurement') && (
                <>
                  <option value="archive">Archive</option>
                  <option value="activate">Activate</option>
                </>
              )}
            </select>
            <button
              onClick={handleBulkAction}
              disabled={!bulkAction || submitting}
              className={`btn btn-warning ${submitting ? 'loading' : ''}`}
            >
              {submitting ? '⏳ Processing...' : '⚡ Execute'}
            </button>
            <button
              onClick={() => setSelectedItems(new Set())}
              className="btn btn-secondary"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="alert alert-urgent">
          <span className="alert-icon">❌</span>
          <span className="alert-message">{error}</span>
          <button onClick={fetchProcurements} className="alert-action">Retry</button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading procurements...</p>
        </div>
      ) : (
        <>
          {/* Results Summary */}
          <div className="results-summary">
            <p>
              Showing <strong>{filteredProcurements.length}</strong> of <strong>{procurements.length}</strong> procurements
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
          </div>

          {/* Content */}
          {filteredProcurements.length > 0 ? (
            viewMode === 'table' ? (
              /* Table View */
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          checked={selectedItems.size === filteredProcurements.length && filteredProcurements.length > 0}
                          onChange={handleSelectAll}
                          title="Select all"
                        />
                      </th>
                      <th>Name & Reference</th>
                      <th>Status</th>
                      <th>Method</th>
                      <th>Budget</th>
                      <th>Department</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProcurements.map((proc) => (
                      <tr key={proc.id} className={selectedItems.has(proc.id) ? 'selected' : ''}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedItems.has(proc.id)}
                            onChange={() => handleSelectItem(proc.id)}
                          />
                        </td>
                        <td className="cell-name">
                          <div className="proc-info">
                            <strong>{proc.name}</strong>
                            {proc.reference && (
                              <small className="proc-reference">{proc.reference}</small>
                            )}
                            {proc.description && (
                              <small className="proc-description">{proc.description}</small>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="status-badge" style={getStatusStyle(proc.status || proc.currentStage)}>
                            {proc.status || proc.currentStage || 'Draft'}
                          </span>
                        </td>
                        <td>
                          {proc.method ? (
                            <span className="method-badge" style={{ 
                              background: getMethodColor(proc.method), 
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}>
                              {proc.method.split(' ')[0]}
                            </span>
                          ) : (
                            <span className="text-muted">Not set</span>
                          )}
                        </td>
                        <td className="cell-amount">
                          {(proc.budget || proc.estimatedBudget) ? (
                            <strong>${(proc.budget || proc.estimatedBudget).toLocaleString()}</strong>
                          ) : (
                            <span className="text-muted">Not set</span>
                          )}
                        </td>
                        <td>{proc.department || 'Unknown'}</td>
                        <td>{new Date(proc.createdAt).toLocaleDateString()}</td>
                        <td className="cell-actions">
                          <div className="action-buttons">
                            <button
                              onClick={() => navigate(`/procurements/${proc.id}`)}
                              className="btn btn-sm btn-info"
                              title="View details"
                            >
                              👁️
                            </button>
                            {permissions.includes('edit_procurement') && (
                              <button
                                onClick={() => navigate(`/procurements/${proc.id}/edit`)}
                                className="btn btn-sm btn-secondary"
                                title="Edit"
                              >
                                ✏️
                              </button>
                            )}
                            {permissions.includes('delete_procurement') && (
                              <button
                                onClick={async () => {
                                  if (window.confirm(`Delete "${proc.name}"? This cannot be undone.`)) {
                                    try {
                                      await deleteProcurement(proc.id);
                                      showMessage('success', 'Procurement deleted successfully');
                                    } catch (error) {
                                      showMessage('error', 'Error deleting procurement: ' + error.message);
                                    }
                                  }
                                }}
                                className="btn btn-sm btn-danger"
                                title="Delete"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Grid View */
              <div className="procurement-grid">
                {filteredProcurements.map((proc) => (
                  <div key={proc.id} className={`procurement-card ${selectedItems.has(proc.id) ? 'selected' : ''}`}>
                    <div className="card-header">
                      <div className="card-header-left">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(proc.id)}
                          onChange={() => handleSelectItem(proc.id)}
                        />
                        <h4>{proc.name}</h4>
                      </div>
                      <div className="card-actions">
                        <button
                          onClick={() => navigate(`/procurements/${proc.id}`)}
                          className="btn btn-sm btn-info"
                          title="View"
                        >
                          👁️
                        </button>
                        {permissions.includes('edit_procurement') && (
                          <button
                            onClick={() => navigate(`/procurements/${proc.id}/edit`)}
                            className="btn btn-sm btn-secondary"
                            title="Edit"
                          >
                            ✏️
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="card-body">
                      {proc.reference && <p className="proc-reference">{proc.reference}</p>}
                      {proc.description && <p className="proc-description">{proc.description}</p>}
                      
                      <div className="card-meta">
                        <div className="meta-row">
                          <span className="meta-label">Status:</span>
                          <span className="status-badge" style={getStatusStyle(proc.status || proc.currentStage)}>
                            {proc.status || proc.currentStage || 'Draft'}
                          </span>
                        </div>
                        
                        <div className="meta-row">
                          <span className="meta-label">Method:</span>
                          <span>{proc.method ? proc.method.split(' ')[0] : 'Not set'}</span>
                        </div>
                        
                        <div className="meta-row">
                          <span className="meta-label">Budget:</span>
                          <span>{(proc.budget || proc.estimatedBudget) ? `$${(proc.budget || proc.estimatedBudget).toLocaleString()}` : 'Not set'}</span>
                        </div>
                        
                        <div className="meta-row">
                          <span className="meta-label">Department:</span>
                          <span>{proc.department || 'Unknown'}</span>
                        </div>
                        
                        <div className="meta-row">
                          <span className="meta-label">Created:</span>
                          <span>{new Date(proc.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Empty State */
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <h4>No procurements found</h4>
              {searchQuery ? (
                <p>No procurements match your search criteria. Try adjusting your filters.</p>
              ) : (
                <p>Get started by creating your first procurement.</p>
              )}
              {permissions.includes('create_procurement') && (
                <button
                  onClick={() => navigate('/procurements/new')}
                  className="btn btn-primary"
                >
                  ➕ Create Procurement
                </button>
              )}
            </div>
          )}
        </>
      )}
    </StandardLayout>
  );
};

export default ProcurementList;
