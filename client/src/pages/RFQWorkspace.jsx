import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import StandardLayout from '../components/layout/StandardLayout';
import './pages.css';
import '../styles/RFQWorkspaceEnhanced.css';

/**
 * RFQ Workspace - Comprehensive Request for Quotation Management
 * 
 * Advanced RFQ management interface featuring:
 * - Real-time RFQ listing with advanced filtering
 * - Quick create functionality
 * - Status management and workflow tracking
 * - Analytics dashboard
 * - Bulk operations
 * - Template management
 * - Professional UI/UX
 */
export default function RFQWorkspace() {
  const navigate = useNavigate();
  const { permissions } = usePermissions();
  
  // Data state
  const [rfqs, setRfqs] = useState([]);
  const [filteredRfqs, setFilteredRfqs] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    published: 0,
    closed: 0,
    evaluated: 0
  });
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedRfqs, setSelectedRfqs] = useState(new Set());
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  
  // Filter and search state
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    dateRange: 'all',
    procurementType: 'all',
    priority: 'all'
  });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
  
  // Quick create form
  const [quickCreateData, setQuickCreateData] = useState({
    title: '',
    description: '',
    template: 'standard',
    procurementId: '',
    publishImmediately: false
  });

  // Configuration data
  const rfqTemplates = [
    { value: 'standard', label: '📋 Standard RFQ', description: 'Basic goods and services procurement' },
    { value: 'technical', label: '🔧 Technical Specification', description: 'Detailed technical requirements' },
    { value: 'construction', label: '🏗️ Construction Works', description: 'Infrastructure and construction projects' },
    { value: 'consulting', label: '👥 Consulting Services', description: 'Professional and advisory services' },
    { value: 'framework', label: '📑 Framework Agreement', description: 'Multi-supplier long-term arrangements' },
    { value: 'custom', label: '⚙️ Custom Template', description: 'Customized RFQ template' }
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status', count: 0 },
    { value: 'draft', label: '📝 Draft', count: 0, color: '#6c757d' },
    { value: 'under_review', label: '👀 Under Review', count: 0, color: '#ffc107' },
    { value: 'approved', label: '✅ Approved', count: 0, color: '#20c997' },
    { value: 'published', label: '📢 Published', count: 0, color: '#0d6efd' },
    { value: 'open', label: '🟢 Open', count: 0, color: '#198754' },
    { value: 'closed', label: '🔴 Closed', count: 0, color: '#dc3545' },
    { value: 'evaluated', label: '⚖️ Evaluated', count: 0, color: '#6f42c1' },
    { value: 'awarded', label: '🏆 Awarded', count: 0, color: '#fd7e14' },
    { value: 'cancelled', label: '❌ Cancelled', count: 0, color: '#adb5bd' }
  ];

  // Generate mock RFQ data
  const generateMockRfqs = () => {
    const mockRfqs = [
      {
        id: 1,
        title: 'Office Supplies & Stationery Q1 2025',
        reference: 'RFQ-2025-001',
        description: 'Procurement of general office supplies including stationery, printing materials, and basic office equipment for Q1 2025.',
        status: 'published',
        rfqType: 'Goods',
        priority: 'medium',
        closingDate: '2025-02-15T23:59:59Z',
        createdAt: '2025-01-10T09:00:00Z',
        updatedAt: '2025-01-12T14:30:00Z',
        submissionCount: 8,
        estimatedValue: 45000,
        category: 'Office Supplies'
      },
      {
        id: 2,
        title: 'IT Infrastructure Upgrade Services',
        reference: 'RFQ-2025-002',
        description: 'Professional services for upgrading network infrastructure, server migration, and security system implementation.',
        status: 'open',
        rfqType: 'Services',
        priority: 'high',
        closingDate: '2025-02-28T17:00:00Z',
        createdAt: '2025-01-15T11:20:00Z',
        updatedAt: '2025-01-20T16:45:00Z',
        submissionCount: 3,
        estimatedValue: 250000,
        category: 'IT Services'
      },
      {
        id: 3,
        title: 'Construction Materials for Building Extension',
        reference: 'RFQ-2025-003',
        description: 'Supply of construction materials including cement, steel, bricks, and finishing materials for office building extension project.',
        status: 'draft',
        rfqType: 'Works',
        priority: 'urgent',
        closingDate: '2025-03-10T18:00:00Z',
        createdAt: '2025-01-18T08:15:00Z',
        updatedAt: '2025-01-22T10:20:00Z',
        submissionCount: 0,
        estimatedValue: 180000,
        category: 'Construction'
      },
      {
        id: 4,
        title: 'Legal Advisory Services',
        reference: 'RFQ-2025-004',
        description: 'Retainer agreement for legal advisory services covering contract review, compliance, and general legal consultation.',
        status: 'evaluated',
        rfqType: 'Services',
        priority: 'medium',
        closingDate: '2025-01-30T17:00:00Z',
        createdAt: '2025-01-05T13:00:00Z',
        updatedAt: '2025-01-25T09:30:00Z',
        submissionCount: 12,
        estimatedValue: 75000,
        category: 'Professional Services'
      },
      {
        id: 5,
        title: 'Vehicle Fleet Management System',
        reference: 'RFQ-2025-005',
        description: 'Software solution for comprehensive vehicle fleet management including GPS tracking, maintenance scheduling, and reporting.',
        status: 'closed',
        rfqType: 'Goods',
        priority: 'low',
        closingDate: '2025-01-20T23:59:59Z',
        createdAt: '2024-12-20T10:00:00Z',
        updatedAt: '2025-01-21T15:45:00Z',
        submissionCount: 6,
        estimatedValue: 95000,
        category: 'Software'
      },
      {
        id: 6,
        title: 'Catering Services Contract',
        reference: 'RFQ-2025-006',
        description: 'Annual catering services contract for staff meals, meeting refreshments, and special events.',
        status: 'awarded',
        rfqType: 'Services',
        priority: 'medium',
        closingDate: '2025-01-15T16:00:00Z',
        createdAt: '2024-12-15T14:20:00Z',
        updatedAt: '2025-01-23T11:10:00Z',
        submissionCount: 9,
        estimatedValue: 120000,
        category: 'Catering'
      }
    ];
    return mockRfqs;
  };

  // Load RFQs and calculate stats
  const fetchRfqs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/rfqs');
      let rfqList = [];
      
      if (response.ok) {
        const data = await response.json();
        rfqList = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
      } else {
        // Fallback to mock data
        rfqList = generateMockRfqs();
        showMessage('info', 'Loading sample RFQ data for demonstration');
      }
      
      setRfqs(rfqList);
      
      // Calculate statistics
      const newStats = rfqList.reduce((acc, rfq) => {
        acc.total++;
        acc[rfq.status] = (acc[rfq.status] || 0) + 1;
        return acc;
      }, { total: 0, draft: 0, published: 0, open: 0, closed: 0, evaluated: 0, awarded: 0 });
      
      setStats(newStats);
      
      if (rfqList.length > 0) {
        showMessage('success', `Successfully loaded ${rfqList.length} RFQs`);
      }
    } catch (error) {
      console.error('Error fetching RFQs:', error);
      // Use mock data as fallback
      const mockData = generateMockRfqs();
      setRfqs(mockData);
      
      const newStats = mockData.reduce((acc, rfq) => {
        acc.total++;
        acc[rfq.status] = (acc[rfq.status] || 0) + 1;
        return acc;
      }, { total: 0, draft: 0, published: 0, open: 0, closed: 0, evaluated: 0, awarded: 0 });
      
      setStats(newStats);
      showMessage('warning', 'Using sample data - API connection failed');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchRfqs();
  }, [fetchRfqs]);

  // Filter and sort RFQs
  useEffect(() => {
    let filtered = [...rfqs];
    
    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(rfq => 
        rfq.title?.toLowerCase().includes(searchTerm) ||
        rfq.reference?.toLowerCase().includes(searchTerm) ||
        rfq.description?.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(rfq => rfq.status === filters.status);
    }
    
    // Apply date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (filters.dateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          filterDate.setMonth(now.getMonth() - 3);
          break;
        default:
          break;
      }
      
      if (filters.dateRange !== 'all') {
        filtered = filtered.filter(rfq => new Date(rfq.createdAt) >= filterDate);
      }
    }
    
    // Apply priority filter
    if (filters.priority !== 'all') {
      filtered = filtered.filter(rfq => rfq.priority === filters.priority);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      // Handle date fields
      if (sortBy.includes('Date') || sortBy === 'createdAt' || sortBy === 'updatedAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    setFilteredRfqs(filtered);
  }, [rfqs, filters, sortBy, sortOrder]);

  // Show message with timeout
  const showMessage = useCallback((type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }, []);

  // Handle quick create
  const handleQuickCreate = async (e) => {
    e.preventDefault();
    if (!quickCreateData.title.trim()) {
      showMessage('error', 'RFQ title is required');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/rfqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...quickCreateData,
          status: quickCreateData.publishImmediately ? 'published' : 'draft'
        })
      });

      if (!response.ok) throw new Error('Failed to create RFQ');
      
      const newRfq = await response.json();
      
      // Reset form
      setQuickCreateData({
        title: '',
        description: '',
        template: 'standard',
        procurementId: '',
        publishImmediately: false
      });
      
      setShowQuickCreate(false);
      
      const actionText = quickCreateData.publishImmediately ? 'created and published' : 'created';
      showMessage('success', `RFQ ${actionText} successfully!`);
      
      // Refresh the list
      fetchRfqs();
      
      // Navigate to editor if needed
      if (!quickCreateData.publishImmediately) {
        setTimeout(() => {
          navigate(`/rfqs/edit/${newRfq.id}`);
        }, 1000);
      }
      
    } catch (error) {
      console.error('Error creating RFQ:', error);
      showMessage('error', 'Failed to create RFQ: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  // Handle RFQ actions
  const handleEdit = (rfqId) => {
    navigate(`/rfqs/edit/${rfqId}`);
  };

  const handleView = (rfqId) => {
    navigate(`/rfqs/${rfqId}`);
  };

  const handlePublish = async (rfqId) => {
    try {
      const response = await fetch(`/api/rfqs/${rfqId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error('Failed to publish RFQ');
      
      showMessage('success', 'RFQ published successfully!');
      fetchRfqs();
    } catch (error) {
      showMessage('error', 'Failed to publish RFQ');
    }
  };

  const handleDelete = async (rfqId) => {
    if (!window.confirm('Are you sure you want to delete this RFQ? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/rfqs/${rfqId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete RFQ');
      
      showMessage('success', 'RFQ deleted successfully!');
      fetchRfqs();
    } catch (error) {
      showMessage('error', 'Failed to delete RFQ');
    }
  };

  // Enhanced bulk export operations
  const handleBulkExport = async (format) => {
    if (selectedRfqs.size === 0) {
      showMessage('warning', 'Please select RFQs to export');
      return;
    }

    const rfqIds = Array.from(selectedRfqs);
    const selectedRfqData = rfqs.filter(rfq => rfqIds.includes(rfq.id));

    try {
      if (format === 'excel') {
        // Create Excel-compatible data structure
        const excelData = selectedRfqData.map(rfq => ({
          'RFQ Reference': rfq.reference,
          'Title': rfq.title,
          'Status': rfq.status,
          'Type': rfq.rfqType,
          'Priority': rfq.priority,
          'Category': rfq.category,
          'Estimated Value': rfq.estimatedValue ? `$${rfq.estimatedValue.toLocaleString()}` : 'N/A',
          'Submissions': rfq.submissionCount,
          'Closing Date': new Date(rfq.closingDate).toLocaleDateString(),
          'Created Date': new Date(rfq.createdAt).toLocaleDateString(),
          'Description': rfq.description
        }));

        // Convert to CSV format for download
        const headers = Object.keys(excelData[0]);
        const csvContent = [
          headers.join(','),
          ...excelData.map(row => headers.map(header => `"${row[header]}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `rfqs_export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        showMessage('success', `${rfqIds.length} RFQs exported to Excel format`);
      } else if (format === 'pdf') {
        // For PDF, we would typically use a library like jsPDF
        // For now, we'll create a printable HTML version
        const printContent = `
          <html>
            <head>
              <title>RFQ Export - ${new Date().toLocaleDateString()}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .rfq-item { margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 15px; }
                .rfq-title { font-weight: bold; font-size: 16px; color: #333; }
                .rfq-details { margin-top: 5px; }
                .detail-row { margin: 3px 0; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>RFQ Export Report</h1>
                <p>Generated on: ${new Date().toLocaleString()}</p>
                <p>Total RFQs: ${selectedRfqData.length}</p>
              </div>
              ${selectedRfqData.map(rfq => `
                <div class="rfq-item">
                  <div class="rfq-title">${rfq.title} (${rfq.reference})</div>
                  <div class="rfq-details">
                    <div class="detail-row"><strong>Status:</strong> ${rfq.status}</div>
                    <div class="detail-row"><strong>Type:</strong> ${rfq.rfqType}</div>
                    <div class="detail-row"><strong>Priority:</strong> ${rfq.priority}</div>
                    <div class="detail-row"><strong>Category:</strong> ${rfq.category}</div>
                    <div class="detail-row"><strong>Estimated Value:</strong> ${rfq.estimatedValue ? `$${rfq.estimatedValue.toLocaleString()}` : 'N/A'}</div>
                    <div class="detail-row"><strong>Submissions:</strong> ${rfq.submissionCount}</div>
                    <div class="detail-row"><strong>Closing Date:</strong> ${new Date(rfq.closingDate).toLocaleDateString()}</div>
                    <div class="detail-row"><strong>Description:</strong> ${rfq.description}</div>
                  </div>
                </div>
              `).join('')}
            </body>
          </html>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();

        showMessage('success', `${rfqIds.length} RFQs prepared for PDF export`);
      }
    } catch (error) {
      showMessage('error', `Failed to export RFQs in ${format} format`);
    }
  };

  // Handle bulk operations
  const handleBulkAction = async (action) => {
    if (selectedRfqs.size === 0) {
      showMessage('warning', 'Please select RFQs first');
      return;
    }

    const rfqIds = Array.from(selectedRfqs);
    const confirmMessage = `Are you sure you want to ${action} ${rfqIds.length} selected RFQ(s)?`;
    
    if (!window.confirm(confirmMessage)) return;

    try {
      // Simulate API call with mock response
      const mockSuccess = true; // In real app, this would be the API response
      
      if (mockSuccess) {
        // Update local state to reflect changes
        if (action === 'delete') {
          setRfqs(prevRfqs => prevRfqs.filter(rfq => !rfqIds.includes(rfq.id)));
        } else if (action === 'archive') {
          setRfqs(prevRfqs => prevRfqs.map(rfq => 
            rfqIds.includes(rfq.id) ? { ...rfq, status: 'archived' } : rfq
          ));
        } else if (action === 'publish') {
          setRfqs(prevRfqs => prevRfqs.map(rfq => 
            rfqIds.includes(rfq.id) ? { ...rfq, status: 'published' } : rfq
          ));
        }
        
        showMessage('success', `${rfqIds.length} RFQ(s) ${action}ed successfully!`);
        setSelectedRfqs(new Set());
        
        // Recalculate stats
        const updatedRfqs = rfqs.filter(rfq => action !== 'delete' || !rfqIds.includes(rfq.id));
        const newStats = updatedRfqs.reduce((acc, rfq) => {
          acc.total++;
          acc[rfq.status] = (acc[rfq.status] || 0) + 1;
          return acc;
        }, { total: 0, draft: 0, published: 0, open: 0, closed: 0, evaluated: 0, awarded: 0, archived: 0 });
        
        setStats(newStats);
      }
    } catch (error) {
      showMessage('error', `Failed to ${action} RFQs`);
    }
  };

  // Toggle RFQ selection
  const toggleRfqSelection = (rfqId) => {
    const newSelected = new Set(selectedRfqs);
    if (newSelected.has(rfqId)) {
      newSelected.delete(rfqId);
    } else {
      newSelected.add(rfqId);
    }
    setSelectedRfqs(newSelected);
  };

  // Select all filtered RFQs
  const toggleSelectAll = () => {
    if (selectedRfqs.size === filteredRfqs.length) {
      setSelectedRfqs(new Set());
    } else {
      setSelectedRfqs(new Set(filteredRfqs.map(rfq => rfq.id)));
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format status
  const getStatusInfo = (status) => {
    return statusOptions.find(s => s.value === status) || { label: status, color: '#6c757d' };
  };

  // Header actions
  const headerActions = [
    {
      label: '➕ New RFQ',
      variant: 'primary',
      onClick: () => navigate('/rfqs/create')
    },
    {
      label: '⚡ Quick Create',
      variant: 'secondary',
      onClick: () => setShowQuickCreate(true)
    },
    {
      label: '📊 Analytics',
      variant: 'info',
      onClick: () => showMessage('info', 'Analytics feature coming soon!')
    }
  ];

  // Check permissions
  if (!permissions.includes('view_rfq')) {
    return (
      <StandardLayout title="❌ Access Denied">
        <div className="empty-state">
          <div className="empty-icon">🔒</div>
          <h4>Access Denied</h4>
          <p>You don't have permission to view RFQs.</p>
          <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
            ← Back to Dashboard
          </button>
        </div>
      </StandardLayout>
    );
  }

  return (
    <StandardLayout
      title="📋 RFQ Workspace"
      description="Comprehensive Request for Quotation management and workflow"
      headerActions={headerActions}
    >
      <div className="rfq-workspace-container">
        {/* Loading overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">⏳ Loading RFQs...</div>
        </div>
      )}

      {/* Message Display */}
      {message.text && (
        <div className={`alert alert-${message.type === 'success' ? 'info' : message.type === 'error' ? 'urgent' : 'warning'}`} style={{ marginBottom: '24px' }}>
          <span className="alert-icon">
            {message.type === 'success' ? '✅' : message.type === 'error' ? '❌' : message.type === 'warning' ? '⚠️' : 'ℹ️'}
          </span>
          <span className="alert-message">{message.text}</span>
        </div>
      )}

      {/* Enhanced Statistics Dashboard */}
      <div className="stats-grid" style={{ marginBottom: '30px' }}>
        <div className="stat-card stat-card-primary">
          <div className="stat-card-content">
            <div className="stat-icon">
              <span className="material-icons">assessment</span>
            </div>
            <div className="stat-details">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total RFQs</div>
              <div className="stat-subtitle">
                {stats.total > 0 && (
                  <span className="growth-indicator positive">
                    <span className="material-icons-outlined">trending_up</span>
                    Active Pipeline
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="stat-gradient stat-gradient-primary"></div>
        </div>
        
        <div className="stat-card stat-card-secondary">
          <div className="stat-card-content">
            <div className="stat-icon">
              <span className="material-icons">draft</span>
            </div>
            <div className="stat-details">
              <div className="stat-value">{stats.draft || 0}</div>
              <div className="stat-label">Draft</div>
              <div className="stat-subtitle">
                <span className="status-indicator status-draft">In Progress</span>
              </div>
            </div>
          </div>
          <div className="stat-gradient stat-gradient-secondary"></div>
        </div>
        
        <div className="stat-card stat-card-success">
          <div className="stat-card-content">
            <div className="stat-icon">
              <span className="material-icons">publish</span>
            </div>
            <div className="stat-details">
              <div className="stat-value">{stats.published || 0}</div>
              <div className="stat-label">Published</div>
              <div className="stat-subtitle">
                <span className="status-indicator status-published">Ready</span>
              </div>
            </div>
          </div>
          <div className="stat-gradient stat-gradient-success"></div>
        </div>
        
        <div className="stat-card stat-card-warning">
          <div className="stat-card-content">
            <div className="stat-icon">
              <span className="material-icons">schedule</span>
            </div>
            <div className="stat-details">
              <div className="stat-value">{stats.open || 0}</div>
              <div className="stat-label">Active</div>
              <div className="stat-subtitle">
                <span className="status-indicator status-open">Accepting Bids</span>
              </div>
            </div>
          </div>
          <div className="stat-gradient stat-gradient-warning"></div>
        </div>
        
        <div className="stat-card stat-card-info">
          <div className="stat-card-content">
            <div className="stat-icon">
              <span className="material-icons">rate_review</span>
            </div>
            <div className="stat-details">
              <div className="stat-value">{stats.evaluated || 0}</div>
              <div className="stat-label">Evaluated</div>
              <div className="stat-subtitle">
                <span className="status-indicator status-evaluated">Under Review</span>
              </div>
            </div>
          </div>
          <div className="stat-gradient stat-gradient-info"></div>
        </div>
        
        <div className="stat-card stat-card-dark">
          <div className="stat-card-content">
            <div className="stat-icon">
              <span className="material-icons">emoji_events</span>
            </div>
            <div className="stat-details">
              <div className="stat-value">{stats.awarded || 0}</div>
              <div className="stat-label">Awarded</div>
              <div className="stat-subtitle">
                <span className="status-indicator status-awarded">Complete</span>
              </div>
            </div>
          </div>
          <div className="stat-gradient stat-gradient-dark"></div>
        </div>
      </div>

      {/* Enhanced Filters and Controls */}
      <div className="controls-section">
        <div className="controls-row">
          {/* Enhanced Search */}
          <div className="search-container enhanced">
            <div className="search-input-wrapper">
              <span className="material-icons search-icon">search</span>
              <input
                type="text"
                placeholder="Search RFQs by title, reference, description, or category..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="form-input search-enhanced"
              />
              {filters.search && (
                <button 
                  className="clear-search-btn"
                  onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                  title="Clear search"
                >
                  <span className="material-icons">clear</span>
                </button>
              )}
            </div>
            {filters.search && (
              <div className="search-suggestions">
                <div className="search-help">
                  <span className="material-icons-outlined">info</span>
                  Searching across: titles, references, descriptions, and categories
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Filters */}
          <div className="filter-controls enhanced">
            <div className="filter-group">
              <label className="filter-label">
                <span className="material-icons">filter_list</span>
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="form-select enhanced"
              >
                {statusOptions.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">
                <span className="material-icons">schedule</span>
                Date Range
              </label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                className="form-select enhanced"
              >
                <option value="all">📅 All Time</option>
                <option value="today">📍 Today</option>
                <option value="week">📆 This Week</option>
                <option value="month">🗓️ This Month</option>
                <option value="quarter">📋 This Quarter</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">
                <span className="material-icons">priority_high</span>
                Priority
              </label>
              <select
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                className="form-select enhanced"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">🔴 Urgent</option>
                <option value="high">🟠 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>

            <button
              className="clear-filters-btn enhanced"
              onClick={() => setFilters({ search: '', status: 'all', dateRange: 'all', priority: 'all' })}
              title="Clear all filters"
              disabled={!filters.search && filters.status === 'all' && filters.dateRange === 'all' && filters.priority === 'all'}
            >
              <span className="material-icons">clear_all</span>
              Reset
            </button>
          </div>

          {/* Enhanced View Toggle */}
          <div className="view-toggle enhanced">
            <div className="toggle-group">
              <button
                onClick={() => setViewMode('table')}
                className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary active' : 'btn-secondary'}`}
                title="Table View"
              >
                <span className="material-icons">view_list</span>
                Table
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`btn btn-sm ${viewMode === 'cards' ? 'btn-primary active' : 'btn-secondary'}`}
                title="Cards View"
              >
                <span className="material-icons">view_module</span>
                Cards
              </button>
            </div>
          </div>
        </div>

        {/* Active Filters Display */}
        {(filters.search || filters.status !== 'all' || filters.dateRange !== 'all' || filters.priority !== 'all') && (
          <div className="active-filters">
            <span className="active-filters-label">
              <span className="material-icons">local_offer</span>
              Active filters:
            </span>
            <div className="filter-chips">
              {filters.search && (
                <span className="filter-chip">
                  Search: "{filters.search}"
                  <button onClick={() => setFilters(prev => ({ ...prev, search: '' }))}>
                    <span className="material-icons">close</span>
                  </button>
                </span>
              )}
              {filters.status !== 'all' && (
                <span className="filter-chip">
                  Status: {statusOptions.find(s => s.value === filters.status)?.label}
                  <button onClick={() => setFilters(prev => ({ ...prev, status: 'all' }))}>
                    <span className="material-icons">close</span>
                  </button>
                </span>
              )}
              {filters.dateRange !== 'all' && (
                <span className="filter-chip">
                  Date: {filters.dateRange}
                  <button onClick={() => setFilters(prev => ({ ...prev, dateRange: 'all' }))}>
                    <span className="material-icons">close</span>
                  </button>
                </span>
              )}
              {filters.priority !== 'all' && (
                <span className="filter-chip">
                  Priority: {filters.priority}
                  <button onClick={() => setFilters(prev => ({ ...prev, priority: 'all' }))}>
                    <span className="material-icons">close</span>
                  </button>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Bulk Actions */}
        {selectedRfqs.size > 0 && (
          <div className="bulk-actions enhanced">
            <div className="bulk-header">
              <span className="selection-info">
                <span className="material-icons">checklist</span>
                {selectedRfqs.size} RFQ(s) selected
              </span>
              <button
                onClick={() => setSelectedRfqs(new Set())}
                className="clear-selection-btn"
                title="Clear selection"
              >
                <span className="material-icons">clear</span>
              </button>
            </div>
            
            <div className="bulk-buttons">
              <div className="bulk-button-group">
                <button
                  onClick={() => handleBulkAction('publish')}
                  className="btn btn-sm btn-success bulk-btn"
                  disabled={loading}
                  title="Publish selected RFQs"
                >
                  <span className="material-icons">publish</span>
                  Publish Selected
                </button>
                <button
                  onClick={() => handleBulkAction('archive')}
                  className="btn btn-sm btn-warning bulk-btn"
                  disabled={loading}
                  title="Archive selected RFQs"
                >
                  <span className="material-icons">archive</span>
                  Archive Selected
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="btn btn-sm btn-danger bulk-btn"
                  disabled={loading}
                  title="Delete selected RFQs"
                >
                  <span className="material-icons">delete</span>
                  Delete Selected
                </button>
              </div>
              
              <div className="bulk-export-group">
                <button
                  onClick={() => handleBulkExport('excel')}
                  className="btn btn-sm btn-info bulk-btn"
                  disabled={loading}
                  title="Export selected to Excel"
                >
                  <span className="material-icons">file_download</span>
                  Export Excel
                </button>
                <button
                  onClick={() => handleBulkExport('pdf')}
                  className="btn btn-sm btn-secondary bulk-btn"
                  disabled={loading}
                  title="Export selected to PDF"
                >
                  <span className="material-icons">picture_as_pdf</span>
                  Export PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RFQ List */}
      <div className="rfq-workspace-content">
        {filteredRfqs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h4>
              {filters.search || filters.status !== 'all' || filters.dateRange !== 'all' 
                ? 'No RFQs match your filters' 
                : 'No RFQs yet'}
            </h4>
            <p>
              {filters.search || filters.status !== 'all' || filters.dateRange !== 'all'
                ? 'Try adjusting your search criteria or filters'
                : 'Create your first RFQ to get started with procurement management'}
            </p>
            {(!filters.search && filters.status === 'all' && filters.dateRange === 'all') && (
              <button
                onClick={() => navigate('/rfqs/create')}
                className="btn btn-primary"
              >
                ➕ Create First RFQ
              </button>
            )}
          </div>
        ) : viewMode === 'table' ? (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selectedRfqs.size === filteredRfqs.length && filteredRfqs.length > 0}
                      onChange={toggleSelectAll}
                      className="form-checkbox"
                    />
                  </th>
                  <th
                    className="sortable"
                    onClick={() => {
                      setSortBy('title');
                      setSortOrder(sortBy === 'title' && sortOrder === 'asc' ? 'desc' : 'asc');
                    }}
                  >
                    RFQ Title {sortBy === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="sortable"
                    onClick={() => {
                      setSortBy('status');
                      setSortOrder(sortBy === 'status' && sortOrder === 'asc' ? 'desc' : 'asc');
                    }}
                  >
                    Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="sortable"
                    onClick={() => {
                      setSortBy('rfqType');
                      setSortOrder(sortBy === 'rfqType' && sortOrder === 'asc' ? 'desc' : 'asc');
                    }}
                  >
                    Type {sortBy === 'rfqType' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="sortable"
                    onClick={() => {
                      setSortBy('priority');
                      setSortOrder(sortBy === 'priority' && sortOrder === 'asc' ? 'desc' : 'asc');
                    }}
                  >
                    Priority {sortBy === 'priority' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="sortable"
                    onClick={() => {
                      setSortBy('closingDate');
                      setSortOrder(sortBy === 'closingDate' && sortOrder === 'asc' ? 'desc' : 'asc');
                    }}
                  >
                    Closing Date {sortBy === 'closingDate' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Submissions</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRfqs.map((rfq) => {
                  const statusInfo = getStatusInfo(rfq.status);
                  return (
                    <tr key={rfq.id} className={selectedRfqs.has(rfq.id) ? 'selected' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedRfqs.has(rfq.id)}
                          onChange={() => toggleRfqSelection(rfq.id)}
                          className="form-checkbox"
                        />
                      </td>
                      <td>
                        <div className="rfq-title-cell">
                          <strong
                            onClick={() => handleView(rfq.id)}
                            style={{ cursor: 'pointer', color: '#0d6efd' }}
                          >
                            {rfq.title}
                          </strong>
                          {rfq.reference && (
                            <div className="rfq-reference">{rfq.reference}</div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span
                          className="status-badge"
                          style={{ 
                            backgroundColor: statusInfo.color + '20', 
                            color: statusInfo.color,
                            border: `1px solid ${statusInfo.color}40`
                          }}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td>
                        <span className="rfq-type">{rfq.rfqType || 'Standard'}</span>
                      </td>
                      <td>
                        <span className={`priority-badge priority-${rfq.priority || 'medium'}`}>
                          {rfq.priority === 'urgent' ? '🔴' : 
                           rfq.priority === 'high' ? '🟠' : 
                           rfq.priority === 'low' ? '🟢' : '🟡'} 
                          {rfq.priority || 'Medium'}
                        </span>
                      </td>
                      <td>
                        <div className="date-cell">
                          {formatDate(rfq.closingDate)}
                          {rfq.closingDate && new Date(rfq.closingDate) < new Date() && (
                            <div className="date-warning">⚠️ Overdue</div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="submission-count">
                          {rfq.submissionCount || 0} submissions
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => handleView(rfq.id)}
                            className="btn btn-sm btn-info"
                            title="View Details"
                          >
                            👁️
                          </button>
                          {permissions.includes('edit_rfq') && (
                            <button
                              onClick={() => handleEdit(rfq.id)}
                              className="btn btn-sm btn-primary"
                              title="Edit RFQ"
                            >
                              ✏️
                            </button>
                          )}
                          {permissions.includes('publish_rfq') && rfq.status === 'draft' && (
                            <button
                              onClick={() => handlePublish(rfq.id)}
                              className="btn btn-sm btn-success"
                              title="Publish RFQ"
                            >
                              📢
                            </button>
                          )}
                          {permissions.includes('delete_rfq') && (
                            <button
                              onClick={() => handleDelete(rfq.id)}
                              className="btn btn-sm btn-danger"
                              title="Delete RFQ"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          // Card view
          <div className="cards-grid">
            {filteredRfqs.map((rfq) => {
              const statusInfo = getStatusInfo(rfq.status);
              return (
                <div key={rfq.id} className={`rfq-card ${selectedRfqs.has(rfq.id) ? 'selected' : ''}`}>
                  <div className="card-header">
                    <div className="card-title-row">
                      <input
                        type="checkbox"
                        checked={selectedRfqs.has(rfq.id)}
                        onChange={() => toggleRfqSelection(rfq.id)}
                        className="form-checkbox"
                      />
                      <h4 className="card-title" onClick={() => handleView(rfq.id)}>
                        {rfq.title}
                      </h4>
                    </div>
                    <span
                      className="status-badge"
                      style={{ backgroundColor: statusInfo.color + '20', color: statusInfo.color }}
                    >
                      {statusInfo.label}
                    </span>
                  </div>
                  
                  <div className="card-content">
                    <div className="card-meta">
                      <div className="meta-item">
                        <span className="meta-label">Reference:</span>
                        <span className="meta-value">{rfq.reference || 'N/A'}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Type:</span>
                        <span className="meta-value">{rfq.rfqType || 'Standard'}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Priority:</span>
                        <span className={`priority-badge priority-${rfq.priority || 'medium'}`}>
                          {rfq.priority || 'Medium'}
                        </span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Closing Date:</span>
                        <span className="meta-value">{formatDate(rfq.closingDate)}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Submissions:</span>
                        <span className="meta-value">{rfq.submissionCount || 0}</span>
                      </div>
                    </div>
                    
                    {rfq.description && (
                      <div className="card-description">
                        {rfq.description.length > 100 
                          ? rfq.description.substring(0, 100) + '...'
                          : rfq.description}
                      </div>
                    )}
                  </div>
                  
                  <div className="card-actions">
                    <button
                      onClick={() => handleView(rfq.id)}
                      className="btn btn-sm btn-info"
                    >
                      👁️ View
                    </button>
                    {permissions.includes('edit_rfq') && (
                      <button
                        onClick={() => handleEdit(rfq.id)}
                        className="btn btn-sm btn-primary"
                      >
                        ✏️ Edit
                      </button>
                    )}
                    {permissions.includes('publish_rfq') && rfq.status === 'draft' && (
                      <button
                        onClick={() => handlePublish(rfq.id)}
                        className="btn btn-sm btn-success"
                      >
                        📢 Publish
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Enhanced Quick Create Modal */}
      {showQuickCreate && (
        <div className="modal-overlay enhanced" onClick={() => setShowQuickCreate(false)}>
          <div className="modal-content enhanced-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header enhanced-header">
              <div className="modal-title-section">
                <span className="modal-icon">
                  <span className="material-icons">add_circle</span>
                </span>
                <div>
                  <h3>Quick Create RFQ</h3>
                  <p className="modal-subtitle">Create a new RFQ quickly with essential details</p>
                </div>
              </div>
              <button
                onClick={() => setShowQuickCreate(false)}
                className="modal-close enhanced-close"
                title="Close modal"
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            
            <form onSubmit={handleQuickCreate} className="modal-body enhanced-body">
              <div className="form-grid">
                <div className="input-group enhanced-input-group">
                  <label htmlFor="quickTitle" className="form-label">
                    <span className="material-icons">title</span>
                    RFQ Title *
                  </label>
                  <input
                    id="quickTitle"
                    type="text"
                    placeholder="e.g., Office Supplies Q1 2025, IT Infrastructure Upgrade"
                    value={quickCreateData.title}
                    onChange={(e) => setQuickCreateData(prev => ({ ...prev, title: e.target.value }))}
                    className="form-input enhanced"
                    required
                    autoFocus
                  />
                  <div className="input-feedback">
                    {quickCreateData.title.length > 0 && (
                      <span className="character-count">
                        {quickCreateData.title.length}/100 characters
                      </span>
                    )}
                  </div>
                </div>

                <div className="input-group enhanced-input-group">
                  <label htmlFor="quickType" className="form-label">
                    <span className="material-icons">category</span>
                    RFQ Type *
                  </label>
                  <select
                    id="quickType"
                    value={quickCreateData.rfqType || 'Goods'}
                    onChange={(e) => setQuickCreateData(prev => ({ ...prev, rfqType: e.target.value }))}
                    className="form-select enhanced"
                    required
                  >
                    <option value="Goods">🏪 Goods</option>
                    <option value="Services">🛠️ Services</option>
                    <option value="Works">🔨 Works</option>
                  </select>
                </div>

                <div className="input-group enhanced-input-group">
                  <label htmlFor="quickPriority" className="form-label">
                    <span className="material-icons">priority_high</span>
                    Priority
                  </label>
                  <select
                    id="quickPriority"
                    value={quickCreateData.priority || 'medium'}
                    onChange={(e) => setQuickCreateData(prev => ({ ...prev, priority: e.target.value }))}
                    className="form-select enhanced"
                  >
                    <option value="low">🟢 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🟠 High</option>
                    <option value="urgent">🔴 Urgent</option>
                  </select>
                </div>

                <div className="input-group enhanced-input-group">
                  <label htmlFor="quickCategory" className="form-label">
                    <span className="material-icons">bookmark</span>
                    Category
                  </label>
                  <input
                    id="quickCategory"
                    type="text"
                    placeholder="e.g., Office Supplies, IT Services, Construction"
                    value={quickCreateData.category || ''}
                    onChange={(e) => setQuickCreateData(prev => ({ ...prev, category: e.target.value }))}
                    className="form-input enhanced"
                  />
                </div>
              </div>

              <div className="input-group enhanced-input-group full-width">
                <label htmlFor="quickTemplate" className="form-label">
                  <span className="material-icons">description</span>
                  Template
                </label>
                <select
                  id="quickTemplate"
                  value={quickCreateData.template}
                  onChange={(e) => setQuickCreateData(prev => ({ ...prev, template: e.target.value }))}
                  className="form-select enhanced"
                >
                  {rfqTemplates.map(template => (
                    <option key={template.value} value={template.value}>
                      {template.label}
                    </option>
                  ))}
                </select>
                <small className="input-help enhanced">
                  <span className="material-icons-outlined">info</span>
                  {rfqTemplates.find(t => t.value === quickCreateData.template)?.description}
                </small>
              </div>

              <div className="input-group enhanced-input-group full-width">
                <label htmlFor="quickDescription" className="form-label">
                  <span className="material-icons">notes</span>
                  Description
                </label>
                <textarea
                  id="quickDescription"
                  placeholder="Provide a detailed description of what you're looking to procure..."
                  value={quickCreateData.description}
                  onChange={(e) => setQuickCreateData(prev => ({ ...prev, description: e.target.value }))}
                  className="form-textarea enhanced"
                  rows="4"
                />
                <div className="input-feedback">
                  {quickCreateData.description && (
                    <span className="character-count">
                      {quickCreateData.description.length}/500 characters
                    </span>
                  )}
                </div>
              </div>

              <div className="input-group enhanced-input-group full-width">
                <label htmlFor="quickClosingDate" className="form-label">
                  <span className="material-icons">schedule</span>
                  Closing Date
                </label>
                <input
                  id="quickClosingDate"
                  type="datetime-local"
                  value={quickCreateData.closingDate || ''}
                  onChange={(e) => setQuickCreateData(prev => ({ ...prev, closingDate: e.target.value }))}
                  className="form-input enhanced"
                  min={new Date().toISOString().slice(0, 16)}
                />
                <small className="input-help enhanced">
                  <span className="material-icons-outlined">schedule</span>
                  When should suppliers submit their bids by?
                </small>
              </div>

              <div className="checkbox-section">
                <div className="checkbox-group enhanced">
                  <label className="checkbox-label enhanced">
                    <input
                      type="checkbox"
                      checked={quickCreateData.publishImmediately}
                      onChange={(e) => setQuickCreateData(prev => ({ ...prev, publishImmediately: e.target.checked }))}
                      className="form-checkbox enhanced"
                    />
                    <span className="checkbox-indicator"></span>
                    <div className="checkbox-content">
                      <span className="checkbox-text">Publish Immediately</span>
                      <small className="checkbox-description">
                        {quickCreateData.publishImmediately 
                          ? 'RFQ will be published and available to suppliers immediately'
                          : 'RFQ will be saved as draft for further editing and review'}
                      </small>
                    </div>
                  </label>
                </div>
              </div>

              <div className="modal-actions enhanced-actions">
                <button
                  type="button"
                  onClick={() => setShowQuickCreate(false)}
                  className="btn btn-secondary enhanced"
                  disabled={creating}
                >
                  <span className="material-icons">cancel</span>
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn ${quickCreateData.publishImmediately ? 'btn-success' : 'btn-primary'} enhanced ${creating ? 'loading' : ''}`}
                  disabled={creating || !quickCreateData.title}
                >
                  <span className="material-icons">
                    {creating 
                      ? 'hourglass_empty'
                      : quickCreateData.publishImmediately 
                        ? 'rocket_launch'
                        : 'save'}
                  </span>
                  {creating 
                    ? 'Creating...'
                    : quickCreateData.publishImmediately 
                      ? 'Create & Publish'
                      : 'Create Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

        {/* Results Summary */}
        <div className="results-summary">
          Showing {filteredRfqs.length} of {rfqs.length} RFQs
          {(filters.search || filters.status !== 'all' || filters.dateRange !== 'all') && (
            <button
              onClick={() => setFilters({ search: '', status: 'all', dateRange: 'all', procurementType: 'all', priority: 'all' })}
              className="clear-filters"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>
    </StandardLayout>
  );
}

