/**
 * Advanced Page Template Component
 * 
 * A comprehensive template for creating new pages in the procurement system.
 * This template includes all common patterns and best practices.
 * 
 * Features:
 * - Complete CRUD operations
 * - Search and filtering
 * - Pagination support
 * - Error handling and loading states
 * - Form validation
 * - Permission-based actions
 * - Responsive design
 * - Export functionality
 * - Bulk operations
 * - Real-time updates
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import StandardLayout from '../components/layout/StandardLayout';
import './pages.css';

const PageTemplate = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { permissions, hasPermission } = usePermissions();
  
  // Data state
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Form state
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    priority: 'medium'
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  
  // Selection state for bulk operations
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Load data on component mount and when filters change
  useEffect(() => {
    loadItems();
  }, [currentPage, searchTerm, statusFilter, dateFilter, sortBy, sortOrder]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (statusFilter) params.set('status', statusFilter);
    if (dateFilter) params.set('date', dateFilter);
    if (sortBy !== 'created_at') params.set('sortBy', sortBy);
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder);
    if (currentPage > 1) params.set('page', currentPage.toString());
    
    setSearchParams(params);
  }, [searchTerm, statusFilter, dateFilter, sortBy, sortOrder, currentPage, setSearchParams]);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        search: searchTerm,
        status: statusFilter,
        date: dateFilter,
        sortBy: sortBy,
        sortOrder: sortOrder
      });

      // TODO: Replace with actual API endpoint
      const response = await fetch(`/api/items?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to load items');
      }
      
      const result = await response.json();
      setItems(result.items || []);
      setTotalPages(result.totalPages || 1);
      setTotalItems(result.totalItems || 0);
      
    } catch (error) {
      console.error('Error loading items:', error);
      setError('Failed to load items. Please try again.');
      // Fallback to mock data for demo
      setItems(generateMockData());
      setTotalItems(generateMockData().length);
      setTotalPages(Math.ceil(generateMockData().length / itemsPerPage));
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchTerm, statusFilter, dateFilter, sortBy, sortOrder]);

  // Generate mock data for demo purposes
  const generateMockData = () => [
    {
      id: 1,
      name: 'Sample Item 1',
      description: 'Description for sample item 1',
      status: 'active',
      priority: 'high',
      created_at: '2025-01-15T10:30:00Z',
      updated_at: '2025-01-15T10:30:00Z'
    },
    {
      id: 2,
      name: 'Sample Item 2',
      description: 'Description for sample item 2',
      status: 'inactive',
      priority: 'medium',
      created_at: '2025-01-14T14:20:00Z',
      updated_at: '2025-01-14T14:20:00Z'
    },
    {
      id: 3,
      name: 'Sample Item 3',
      description: 'Description for sample item 3',
      status: 'pending',
      priority: 'low',
      created_at: '2025-01-13T09:15:00Z',
      updated_at: '2025-01-13T09:15:00Z'
    }
  ];

  // Form validation
  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }
    
    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }
    
    if (!['active', 'inactive', 'pending'].includes(formData.status)) {
      errors.status = 'Invalid status selected';
    }
    
    if (!['low', 'medium', 'high'].includes(formData.priority)) {
      errors.priority = 'Invalid priority selected';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission (create/update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSubmitting(true);
      const url = editingItem ? `/api/items/${editingItem.id}` : '/api/items';
      const method = editingItem ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        throw new Error(editingItem ? 'Failed to update item' : 'Failed to create item');
      }
      
      const result = await response.json();
      setSuccess(editingItem ? 'Item updated successfully!' : 'Item created successfully!');
      setShowModal(false);
      resetForm();
      await loadItems();
      
    } catch (error) {
      console.error('Error saving item:', error);
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle item deletion
  const handleDelete = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete item');
      }
      
      setSuccess('Item deleted successfully!');
      await loadItems();
      
    } catch (error) {
      console.error('Error deleting item:', error);
      setError('Failed to delete item. Please try again.');
    }
  };

  // Handle bulk operations
  const handleBulkAction = async (action) => {
    if (selectedItems.length === 0) {
      setError('Please select items to perform bulk action');
      return;
    }
    
    const confirmMessage = `Are you sure you want to ${action} ${selectedItems.length} item(s)?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch('/api/items/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          itemIds: selectedItems
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${action} items`);
      }
      
      setSuccess(`Successfully ${action}d ${selectedItems.length} item(s)`);
      setSelectedItems([]);
      setSelectAll(false);
      await loadItems();
      
    } catch (error) {
      console.error(`Error ${action}ing items:`, error);
      setError(`Failed to ${action} items. Please try again.`);
    }
  };

  // Handle export functionality
  const handleExport = async (format = 'csv') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: searchTerm,
        status: statusFilter,
        date: dateFilter,
        format
      });
      
      const response = await fetch(`/api/items/export?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to export data');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `items-export-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setSuccess(`Data exported successfully as ${format.toUpperCase()}`);
      
    } catch (error) {
      console.error('Error exporting data:', error);
      setError('Failed to export data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Utility functions
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      status: 'active',
      priority: 'medium'
    });
    setFormErrors({});
    setEditingItem(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setFormData({
      name: item.name,
      description: item.description,
      status: item.status,
      priority: item.priority
    });
    setEditingItem(item);
    setShowModal(true);
  };

  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    setSelectedItems(checked ? items.map(item => item.id) : []);
  };

  const handleItemSelect = (itemId, checked) => {
    if (checked) {
      setSelectedItems([...selectedItems, itemId]);
    } else {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
      setSelectAll(false);
    }
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const getStatusColor = (status) => {
    const colors = {
      active: '#28a745',
      inactive: '#6c757d',
      pending: '#ffc107',
      completed: '#17a2b8'
    };
    return colors[status] || '#6c757d';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: '#28a745',
      medium: '#ffc107',
      high: '#dc3545'
    };
    return colors[priority] || '#6c757d';
  };

  // Define header actions based on permissions
  const headerActions = [];

  // Add create action
  if (hasPermission('create_item')) {
    headerActions.push({
      label: '+ New Item',
      variant: 'primary',
      onClick: openCreateModal
    });
  }

  // Add export action
  if (hasPermission('export_data')) {
    headerActions.push({
      label: 'Export CSV',
      variant: 'secondary',
      onClick: () => handleExport('csv')
    });
    
    headerActions.push({
      label: 'Export Excel',
      variant: 'secondary',
      onClick: () => handleExport('xlsx')
    });
  }

  // Add bulk actions if items are selected
  if (selectedItems.length > 0 && hasPermission('bulk_operations')) {
    headerActions.push({
      label: `Bulk Actions (${selectedItems.length})`,
      variant: 'warning',
      dropdown: [
        {
          label: 'Delete Selected',
          onClick: () => handleBulkAction('delete'),
          destructive: true
        },
        {
          label: 'Activate Selected',
          onClick: () => handleBulkAction('activate')
        },
        {
          label: 'Deactivate Selected',
          onClick: () => handleBulkAction('deactivate')
        }
      ]
    });
  }

  return (
    <StandardLayout
      title="🎯 Advanced Template Page"
      description="A comprehensive template demonstrating all common page patterns"
      headerActions={headerActions}
    >
      {/* Status Messages */}
      {error && (
        <div className="alert alert-danger" style={{ 
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>⚠️ {error}</span>
          <button 
            onClick={clearMessages}
            className="btn-close"
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'inherit',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="alert alert-success" style={{ 
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>✅ {success}</span>
          <button 
            onClick={clearMessages}
            className="btn-close"
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'inherit',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Search and Filter Controls */}
      <div className="filters-section" style={{ 
        marginBottom: '25px',
        padding: '20px',
        background: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '15px',
          marginBottom: '15px'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Search Items
            </label>
            <input
              type="text"
              placeholder="🔍 Search by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control"
              style={{ width: '100%' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Status Filter
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-control"
              style={{ width: '100%' }}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Date Filter
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="form-control"
              style={{ width: '100%' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Sort By
            </label>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}
              className="form-control"
              style={{ width: '100%' }}
            >
              <option value="created_at-desc">Newest First</option>
              <option value="created_at-asc">Oldest First</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="priority-desc">High Priority First</option>
              <option value="priority-asc">Low Priority First</option>
            </select>
          </div>
        </div>
        
        {(searchTerm || statusFilter || dateFilter) && (
          <div>
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setDateFilter('');
              }}
              className="btn btn-secondary btn-small"
            >
              🗑️ Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="loading-state" style={{ 
          padding: '60px', 
          textAlign: 'center',
          background: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <div style={{ 
            display: 'inline-block', 
            animation: 'spin 1s linear infinite',
            fontSize: '24px',
            marginBottom: '15px'
          }}>
            ⏳
          </div>
          <p style={{ margin: '0', color: '#6c757d' }}>Loading items...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state" style={{ 
          padding: '60px', 
          textAlign: 'center',
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>📦</div>
          <h3 style={{ marginBottom: '10px', color: '#495057' }}>No Items Found</h3>
          <p style={{ marginBottom: '20px', color: '#6c757d' }}>
            {searchTerm || statusFilter || dateFilter 
              ? 'No items match your current filters. Try adjusting your search criteria.'
              : 'Get started by creating your first item.'
            }
          </p>
          {hasPermission('create_item') && !searchTerm && !statusFilter && !dateFilter && (
            <button
              className="btn btn-primary"
              onClick={openCreateModal}
            >
              + Create Your First Item
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Summary Bar */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '20px',
            padding: '15px 20px',
            background: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #dee2e6',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div>
              <strong style={{ color: '#495057' }}>
                Showing {items.length} of {totalItems} items
                {searchTerm && <span> (filtered)</span>}
              </strong>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px' }}>
                Items per page:
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{ padding: '4px 8px', border: '1px solid #ced4da', borderRadius: '4px' }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </label>
            </div>
          </div>

          {/* Data Table */}
          <div className="table-container" style={{
            background: '#ffffff',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid #dee2e6',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                minWidth: '800px'
              }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    {hasPermission('bulk_operations') && (
                      <th style={{ 
                        padding: '15px', 
                        borderBottom: '2px solid #dee2e6',
                        width: '50px',
                        textAlign: 'center'
                      }}>
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          style={{ transform: 'scale(1.2)' }}
                        />
                      </th>
                    )}
                    <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>
                      Name
                    </th>
                    <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>
                      Description
                    </th>
                    <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>
                      Status
                    </th>
                    <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>
                      Priority
                    </th>
                    <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>
                      Created
                    </th>
                    <th style={{ padding: '15px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontWeight: '600', width: '120px' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr 
                      key={item.id} 
                      style={{ 
                        borderBottom: '1px solid #dee2e6',
                        backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa'
                      }}
                      className="table-row-hover"
                    >
                      {hasPermission('bulk_operations') && (
                        <td style={{ padding: '15px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.id)}
                            onChange={(e) => handleItemSelect(item.id, e.target.checked)}
                            style={{ transform: 'scale(1.2)' }}
                          />
                        </td>
                      )}
                      <td style={{ padding: '15px' }}>
                        <div style={{ fontWeight: '500', color: '#495057' }}>
                          {item.name}
                        </div>
                      </td>
                      <td style={{ padding: '15px' }}>
                        <div style={{ 
                          color: '#6c757d',
                          maxWidth: '200px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {item.description}
                        </div>
                      </td>
                      <td style={{ padding: '15px' }}>
                        <span style={{
                          background: getStatusColor(item.status) + '20',
                          color: getStatusColor(item.status),
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '500',
                          textTransform: 'capitalize'
                        }}>
                          {item.status}
                        </span>
                      </td>
                      <td style={{ padding: '15px' }}>
                        <span style={{
                          background: getPriorityColor(item.priority) + '20',
                          color: getPriorityColor(item.priority),
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '500',
                          textTransform: 'capitalize'
                        }}>
                          {item.priority}
                        </span>
                      </td>
                      <td style={{ padding: '15px', color: '#6c757d', fontSize: '14px' }}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                          {hasPermission('edit_item') && (
                            <button
                              className="btn btn-small btn-info"
                              onClick={() => openEditModal(item)}
                              title="Edit item"
                              style={{ padding: '4px 8px' }}
                            >
                              ✏️
                            </button>
                          )}
                          {hasPermission('delete_item') && (
                            <button
                              className="btn btn-small btn-danger"
                              onClick={() => handleDelete(item.id)}
                              title="Delete item"
                              style={{ padding: '4px 8px' }}
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
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              gap: '10px',
              marginTop: '25px',
              padding: '20px'
            }}>
              <button
                className="btn btn-secondary btn-small"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                ← Previous
              </button>
              
              <div style={{ display: 'flex', gap: '5px' }}>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      className={`btn btn-small ${page === currentPage ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setCurrentPage(page)}
                      style={{ minWidth: '35px' }}
                    >
                      {page}
                    </button>
                  );
                })}
                {totalPages > 5 && (
                  <>
                    <span style={{ padding: '8px' }}>...</span>
                    <button
                      className="btn btn-small btn-secondary"
                      onClick={() => setCurrentPage(totalPages)}
                      style={{ minWidth: '35px' }}
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>
              
              <button
                className="btn btn-secondary btn-small"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
      {/* Create/Edit Modal */}
      {showModal && (
        <div 
          className="modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
            }
          }}
        >
          <div 
            className="modal-content"
            style={{
              background: '#ffffff',
              borderRadius: '8px',
              padding: '30px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
            }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '25px',
              paddingBottom: '15px',
              borderBottom: '1px solid #dee2e6'
            }}>
              <h3 style={{ margin: 0, color: '#495057' }}>
                {editingItem ? '✏️ Edit Item' : '➕ Create New Item'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6c757d'
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500',
                  color: '#495057'
                }}>
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
                  placeholder="Enter item name"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: formErrors.name ? '1px solid #dc3545' : '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
                {formErrors.name && (
                  <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '5px' }}>
                    {formErrors.name}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500',
                  color: '#495057'
                }}>
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`form-control ${formErrors.description ? 'is-invalid' : ''}`}
                  placeholder="Enter item description"
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: formErrors.description ? '1px solid #dc3545' : '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
                {formErrors.description && (
                  <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '5px' }}>
                    {formErrors.description}
                  </div>
                )}
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '20px',
                marginBottom: '25px'
              }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '500',
                    color: '#495057'
                  }}>
                    Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className={`form-control ${formErrors.status ? 'is-invalid' : ''}`}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: formErrors.status ? '1px solid #dc3545' : '1px solid #ced4da',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                  </select>
                  {formErrors.status && (
                    <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '5px' }}>
                      {formErrors.status}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '500',
                    color: '#495057'
                  }}>
                    Priority *
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className={`form-control ${formErrors.priority ? 'is-invalid' : ''}`}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: formErrors.priority ? '1px solid #dc3545' : '1px solid #ced4da',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  {formErrors.priority && (
                    <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '5px' }}>
                      {formErrors.priority}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                gap: '10px', 
                justifyContent: 'flex-end',
                paddingTop: '15px',
                borderTop: '1px solid #dee2e6'
              }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                  disabled={submitting}
                  style={{ padding: '10px 20px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ padding: '10px 20px' }}
                >
                  {submitting ? (
                    <>
                      <span style={{ marginRight: '8px' }}>⏳</span>
                      {editingItem ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <span style={{ marginRight: '8px' }}>
                        {editingItem ? '💾' : '➕'}
                      </span>
                      {editingItem ? 'Update Item' : 'Create Item'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom CSS for animations and hover effects */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .table-row-hover:hover {
          background-color: #e9ecef !important;
        }
        
        .btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
          transition: all 0.2s ease;
        }
        
        .form-control:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
        }
        
        .modal-overlay {
          animation: fadeIn 0.3s ease;
        }
        
        .modal-content {
          animation: slideIn 0.3s ease;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideIn {
          from { transform: translateY(-50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .alert {
          border-radius: 6px;
          border: none;
        }
        
        .alert-danger {
          background-color: #f8d7da;
          color: #721c24;
          border-left: 4px solid #dc3545;
        }
        
        .alert-success {
          background-color: #d4edda;
          color: #155724;
          border-left: 4px solid #28a745;
        }
      `}</style>
    </StandardLayout>
  );
};

export default PageTemplate;
