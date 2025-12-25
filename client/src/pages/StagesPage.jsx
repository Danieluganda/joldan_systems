import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import StandardLayout from '../components/layout/StandardLayout';
import './pages.css';

/**
 * Stages Page - Comprehensive Procurement Workflow Management
 * 
 * Advanced stage tracking and workflow management system featuring:
 * - Visual workflow progress tracking
 * - Stage-specific analytics and metrics
 * - Workflow configuration and customization
 * - Real-time status monitoring
 * - Stage transition management
 * - Performance analytics
 * - Professional dashboard interface
 */
export default function StagesPage() {
  const navigate = useNavigate();
  const { permissions } = usePermissions();
  
  // Data state
  const [procurements, setProcurements] = useState([]);
  const [stageStats, setStageStats] = useState({});
  const [workflowTemplates, setWorkflowTemplates] = useState([]);
  const [activeTransitions, setActiveTransitions] = useState([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState('overview'); // 'overview', 'workflow', 'analytics', 'settings'
  const [selectedProcurement, setSelectedProcurement] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [filters, setFilters] = useState({
    search: '',
    stage: 'all',
    status: 'all',
    dateRange: 'all'
  });

  // Workflow stages configuration
  const procurementStages = [
    {
      id: 'planning',
      name: 'Planning',
      icon: '📋',
      description: 'Initial procurement planning and requirements gathering',
      color: '#6c757d',
      duration: '5-10 days',
      required: true,
      actions: ['Create Plan', 'Define Requirements', 'Budget Approval']
    },
    {
      id: 'rfq_preparation',
      name: 'RFQ Preparation',
      icon: '📝',
      description: 'Preparing Request for Quotation documents',
      color: '#0dcaf0',
      duration: '3-7 days',
      required: true,
      actions: ['Draft RFQ', 'Technical Specs', 'Legal Review']
    },
    {
      id: 'approval',
      name: 'Approval',
      icon: '✅',
      description: 'Management approval for RFQ publication',
      color: '#ffc107',
      duration: '1-3 days',
      required: true,
      actions: ['Submit for Approval', 'Review Comments', 'Final Approval']
    },
    {
      id: 'publication',
      name: 'Publication',
      icon: '📢',
      description: 'Publishing RFQ to suppliers',
      color: '#0d6efd',
      duration: '1 day',
      required: true,
      actions: ['Publish RFQ', 'Notify Suppliers', 'Set Deadlines']
    },
    {
      id: 'submission',
      name: 'Submission Period',
      icon: '📥',
      description: 'Collecting supplier submissions',
      color: '#20c997',
      duration: '10-30 days',
      required: true,
      actions: ['Monitor Submissions', 'Handle Clarifications', 'Deadline Management']
    },
    {
      id: 'evaluation',
      name: 'Evaluation',
      icon: '⚖️',
      description: 'Technical and financial evaluation of submissions',
      color: '#6f42c1',
      duration: '5-15 days',
      required: true,
      actions: ['Technical Review', 'Financial Analysis', 'Scoring']
    },
    {
      id: 'award',
      name: 'Award',
      icon: '🏆',
      description: 'Selecting winning supplier and award notification',
      color: '#fd7e14',
      duration: '2-5 days',
      required: true,
      actions: ['Award Decision', 'Notify Winners', 'Issue Award Letter']
    },
    {
      id: 'contract',
      name: 'Contract',
      icon: '📄',
      description: 'Contract negotiation and signing',
      color: '#198754',
      duration: '5-10 days',
      required: true,
      actions: ['Contract Draft', 'Negotiation', 'Signing']
    },
    {
      id: 'execution',
      name: 'Execution',
      icon: '🚀',
      description: 'Contract execution and delivery monitoring',
      color: '#dc3545',
      duration: 'Variable',
      required: false,
      actions: ['Monitor Progress', 'Milestone Tracking', 'Performance Review']
    },
    {
      id: 'closure',
      name: 'Closure',
      icon: '✓',
      description: 'Procurement closure and documentation',
      color: '#28a745',
      duration: '2-3 days',
      required: false,
      actions: ['Final Review', 'Documentation', 'Lessons Learned']
    }
  ];

  // Load data
  const fetchProcurements = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/procurements?includeStages=true');
      if (!response.ok) throw new Error('Failed to fetch procurements');
      
      const data = await response.json();
      const procurementList = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
      
      setProcurements(procurementList);
      calculateStageStats(procurementList);
      
    } catch (error) {
      console.error('Error fetching procurements:', error);
      showMessage('error', 'Failed to load procurement data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWorkflowTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/workflow/templates');
      if (!response.ok) throw new Error('Failed to fetch templates');
      
      const data = await response.json();
      setWorkflowTemplates(Array.isArray(data) ? data : []);
      
    } catch (error) {
      console.error('Error fetching workflow templates:', error);
    }
  }, []);

  const fetchActiveTransitions = useCallback(async () => {
    try {
      const response = await fetch('/api/stages/transitions/active');
      if (!response.ok) throw new Error('Failed to fetch transitions');
      
      const data = await response.json();
      setActiveTransitions(Array.isArray(data) ? data : []);
      
    } catch (error) {
      console.error('Error fetching active transitions:', error);
    }
  }, []);

  // Calculate stage statistics
  const calculateStageStats = (procurementList) => {
    const stats = {};
    
    procurementStages.forEach(stage => {
      const stageData = {
        total: 0,
        active: 0,
        completed: 0,
        overdue: 0,
        avgDuration: 0,
        procurements: []
      };
      
      procurementList.forEach(proc => {
        if (proc.currentStage === stage.id) {
          stageData.active++;
          stageData.procurements.push(proc);
        }
        
        // Check if stage was completed
        if (proc.stageHistory && proc.stageHistory.some(h => h.stage === stage.id && h.status === 'completed')) {
          stageData.completed++;
        }
        
        // Check for overdue items
        if (proc.currentStage === stage.id && proc.stageDeadline && new Date(proc.stageDeadline) < new Date()) {
          stageData.overdue++;
        }
      });
      
      stageData.total = stageData.active + stageData.completed;
      stats[stage.id] = stageData;
    });
    
    setStageStats(stats);
  };

  useEffect(() => {
    fetchProcurements();
    fetchWorkflowTemplates();
    fetchActiveTransitions();
  }, [fetchProcurements, fetchWorkflowTemplates, fetchActiveTransitions]);

  // Show message with timeout
  const showMessage = useCallback((type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }, []);

  // Handle stage transition
  const handleStageTransition = async (procurementId, fromStage, toStage, comments) => {
    try {
      const response = await fetch(`/api/procurements/${procurementId}/stage/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromStage,
          toStage,
          comments,
          transitionedBy: 'current-user' // Should come from auth context
        })
      });

      if (!response.ok) throw new Error('Failed to transition stage');
      
      showMessage('success', `Stage transitioned successfully from ${fromStage} to ${toStage}`);
      fetchProcurements(); // Refresh data
      
    } catch (error) {
      showMessage('error', 'Failed to transition stage: ' + error.message);
    }
  };

  // Format duration
  const formatDuration = (days) => {
    if (!days) return 'N/A';
    if (days < 1) return '< 1 day';
    if (days === 1) return '1 day';
    return `${Math.round(days)} days`;
  };

  // Filter procurements
  const filteredProcurements = procurements.filter(proc => {
    if (filters.search && !proc.name?.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.stage !== 'all' && proc.currentStage !== filters.stage) {
      return false;
    }
    if (filters.status !== 'all' && proc.status !== filters.status) {
      return false;
    }
    return true;
  });

  // Header actions
  const headerActions = [
    {
      label: '📊 Analytics',
      variant: 'info',
      onClick: () => setSelectedView('analytics')
    },
    {
      label: '⚙️ Workflow Settings',
      variant: 'secondary',
      onClick: () => setSelectedView('settings')
    },
    {
      label: '📋 Create Template',
      variant: 'primary',
      onClick: () => showMessage('info', 'Template creation coming soon!')
    }
  ];

  return (
    <StandardLayout 
      title="🔄 Procurement Stages & Workflow" 
      breadcrumb="Stages Management"
      actions={headerActions}
    >
      {/* Status Messages */}
      {message.text && (
        <div className={`alert alert-${message.type === 'error' ? 'danger' : message.type} alert-dismissible`}>
          {message.text}
          <button type="button" className="btn-close" onClick={() => setMessage({ type: '', text: '' })}></button>
        </div>
      )}

      {/* View Navigation */}
      <div className="stages-navigation">
        <div className="nav-tabs-custom">
          <button 
            className={`nav-tab ${selectedView === 'overview' ? 'active' : ''}`}
            onClick={() => setSelectedView('overview')}
          >
            📊 Overview
          </button>
          <button 
            className={`nav-tab ${selectedView === 'workflow' ? 'active' : ''}`}
            onClick={() => setSelectedView('workflow')}
          >
            🔄 Workflow
          </button>
          <button 
            className={`nav-tab ${selectedView === 'analytics' ? 'active' : ''}`}
            onClick={() => setSelectedView('analytics')}
          >
            📈 Analytics
          </button>
          <button 
            className={`nav-tab ${selectedView === 'settings' ? 'active' : ''}`}
            onClick={() => setSelectedView('settings')}
          >
            ⚙️ Settings
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading stages...</span>
          </div>
          <p className="mt-2">Loading procurement stages and workflow data...</p>
        </div>
      ) : (
        <>
          {selectedView === 'overview' && (
            <div className="stages-overview">
              {/* Quick Stats */}
              <div className="row mb-4">
                <div className="col-md-3">
                  <div className="stat-card primary">
                    <div className="stat-value">{procurements.length}</div>
                    <div className="stat-label">Total Procurements</div>
                    <div className="stat-icon">📋</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="stat-card success">
                    <div className="stat-value">
                      {Object.values(stageStats).reduce((acc, stage) => acc + stage.active, 0)}
                    </div>
                    <div className="stat-label">Active Stages</div>
                    <div className="stat-icon">🔄</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="stat-card warning">
                    <div className="stat-value">
                      {Object.values(stageStats).reduce((acc, stage) => acc + stage.overdue, 0)}
                    </div>
                    <div className="stat-label">Overdue</div>
                    <div className="stat-icon">⚠️</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="stat-card info">
                    <div className="stat-value">{activeTransitions.length}</div>
                    <div className="stat-label">Pending Transitions</div>
                    <div className="stat-icon">🔄</div>
                  </div>
                </div>
              </div>

              {/* Stage Progress Overview */}
              <div className="card mb-4">
                <div className="card-header">
                  <h5 className="card-title">🔄 Stage Progress Overview</h5>
                </div>
                <div className="card-body">
                  <div className="workflow-stages-horizontal">
                    {procurementStages.map((stage, index) => {
                      const stats = stageStats[stage.id] || { active: 0, total: 0, overdue: 0 };
                      return (
                        <div 
                          key={stage.id} 
                          className={`workflow-stage ${stats.active > 0 ? 'has-active' : ''} ${stats.overdue > 0 ? 'has-overdue' : ''}`}
                          style={{ '--stage-color': stage.color }}
                        >
                          <div className="stage-icon">{stage.icon}</div>
                          <div className="stage-content">
                            <div className="stage-name">{stage.name}</div>
                            <div className="stage-stats">
                              <span className="active-count">{stats.active} active</span>
                              {stats.overdue > 0 && (
                                <span className="overdue-count">{stats.overdue} overdue</span>
                              )}
                            </div>
                          </div>
                          {index < procurementStages.length - 1 && (
                            <div className="stage-connector"></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Active Procurements by Stage */}
              <div className="row">
                {procurementStages.map(stage => {
                  const stats = stageStats[stage.id] || { active: 0, procurements: [] };
                  if (stats.active === 0) return null;

                  return (
                    <div key={stage.id} className="col-md-6 col-lg-4 mb-4">
                      <div className="stage-detail-card">
                        <div className="stage-header" style={{ backgroundColor: stage.color }}>
                          <span className="stage-icon">{stage.icon}</span>
                          <div className="stage-info">
                            <h6 className="stage-name">{stage.name}</h6>
                            <div className="stage-count">{stats.active} active</div>
                          </div>
                        </div>
                        <div className="stage-body">
                          <p className="stage-description">{stage.description}</p>
                          <div className="procurement-list">
                            {stats.procurements.slice(0, 3).map(proc => (
                              <div key={proc._id} className="procurement-item">
                                <div className="procurement-name">{proc.name}</div>
                                <div className="procurement-meta">
                                  <span className="procurement-id">#{proc.procurementNumber}</span>
                                  <span className={`procurement-status ${proc.status}`}>
                                    {proc.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                            {stats.procurements.length > 3 && (
                              <div className="more-procurements">
                                +{stats.procurements.length - 3} more...
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {selectedView === 'workflow' && (
            <div className="workflow-view">
              {/* Filters */}
              <div className="card mb-4">
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-3">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search procurements..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      />
                    </div>
                    <div className="col-md-3">
                      <select 
                        className="form-select"
                        value={filters.stage}
                        onChange={(e) => setFilters({ ...filters, stage: e.target.value })}
                      >
                        <option value="all">All Stages</option>
                        {procurementStages.map(stage => (
                          <option key={stage.id} value={stage.id}>
                            {stage.icon} {stage.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <select 
                        className="form-select"
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      >
                        <option value="all">All Status</option>
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <button 
                        className="btn btn-outline-secondary w-100"
                        onClick={() => setFilters({ search: '', stage: 'all', status: 'all', dateRange: 'all' })}
                      >
                        Clear Filters
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Procurement Workflow List */}
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title">🔄 Procurement Workflows ({filteredProcurements.length})</h5>
                </div>
                <div className="card-body">
                  {filteredProcurements.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">📋</div>
                      <h4>No Procurements Found</h4>
                      <p>No procurements match your current filter criteria.</p>
                    </div>
                  ) : (
                    <div className="procurement-workflow-list">
                      {filteredProcurements.map(procurement => {
                        const currentStage = procurementStages.find(s => s.id === procurement.currentStage);
                        const currentStageIndex = procurementStages.findIndex(s => s.id === procurement.currentStage);
                        const progress = ((currentStageIndex + 1) / procurementStages.length) * 100;

                        return (
                          <div key={procurement._id} className="workflow-procurement-item">
                            <div className="procurement-header">
                              <div className="procurement-info">
                                <h6 className="procurement-name">{procurement.name}</h6>
                                <div className="procurement-meta">
                                  <span className="procurement-number">#{procurement.procurementNumber}</span>
                                  <span className={`procurement-status ${procurement.status}`}>
                                    {procurement.status}
                                  </span>
                                  <span className="procurement-value">
                                    ${procurement.estimatedValue?.toLocaleString() || 'N/A'}
                                  </span>
                                </div>
                              </div>
                              <div className="current-stage-info">
                                <div className="current-stage">
                                  <span className="stage-icon">{currentStage?.icon}</span>
                                  <span className="stage-name">{currentStage?.name}</span>
                                </div>
                                <div className="stage-progress">
                                  <div className="progress">
                                    <div 
                                      className="progress-bar" 
                                      style={{ 
                                        width: `${progress}%`,
                                        backgroundColor: currentStage?.color 
                                      }}
                                    ></div>
                                  </div>
                                  <span className="progress-text">{Math.round(progress)}% Complete</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="workflow-timeline">
                              {procurementStages.map((stage, index) => {
                                const isActive = stage.id === procurement.currentStage;
                                const isCompleted = index < currentStageIndex;
                                const isPending = index > currentStageIndex;

                                return (
                                  <div 
                                    key={stage.id}
                                    className={`timeline-stage ${
                                      isActive ? 'active' : isCompleted ? 'completed' : 'pending'
                                    }`}
                                  >
                                    <div className="stage-marker" style={{ color: stage.color }}>
                                      {isCompleted ? '✓' : stage.icon}
                                    </div>
                                    <div className="stage-details">
                                      <div className="stage-name">{stage.name}</div>
                                      <div className="stage-duration">{stage.duration}</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="procurement-actions">
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => setSelectedProcurement(procurement)}
                              >
                                View Details
                              </button>
                              {permissions.includes('manage_stages') && procurement.status === 'active' && (
                                <button
                                  className="btn btn-sm btn-success"
                                  onClick={() => {
                                    // Handle stage transition
                                    const nextStageIndex = currentStageIndex + 1;
                                    if (nextStageIndex < procurementStages.length) {
                                      const nextStage = procurementStages[nextStageIndex];
                                      handleStageTransition(
                                        procurement._id,
                                        procurement.currentStage,
                                        nextStage.id,
                                        'Auto-transition to next stage'
                                      );
                                    }
                                  }}
                                  disabled={currentStageIndex >= procurementStages.length - 1}
                                >
                                  Advance Stage →
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {selectedView === 'analytics' && (
            <div className="analytics-view">
              {/* Stage Performance Metrics */}
              <div className="row mb-4">
                <div className="col-lg-8">
                  <div className="card">
                    <div className="card-header">
                      <h5 className="card-title">📊 Stage Performance Overview</h5>
                    </div>
                    <div className="card-body">
                      <div className="stage-metrics">
                        {procurementStages.map(stage => {
                          const stats = stageStats[stage.id] || { 
                            total: 0, 
                            active: 0, 
                            completed: 0, 
                            overdue: 0,
                            avgDuration: 0 
                          };
                          
                          return (
                            <div key={stage.id} className="stage-metric-row">
                              <div className="stage-info">
                                <span className="stage-icon" style={{ color: stage.color }}>
                                  {stage.icon}
                                </span>
                                <span className="stage-name">{stage.name}</span>
                              </div>
                              <div className="stage-numbers">
                                <div className="metric">
                                  <span className="metric-value">{stats.active}</span>
                                  <span className="metric-label">Active</span>
                                </div>
                                <div className="metric">
                                  <span className="metric-value">{stats.completed}</span>
                                  <span className="metric-label">Completed</span>
                                </div>
                                <div className="metric">
                                  <span className="metric-value text-danger">{stats.overdue}</span>
                                  <span className="metric-label">Overdue</span>
                                </div>
                                <div className="metric">
                                  <span className="metric-value">{formatDuration(stats.avgDuration)}</span>
                                  <span className="metric-label">Avg Duration</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="col-lg-4">
                  <div className="card">
                    <div className="card-header">
                      <h5 className="card-title">⚡ Quick Actions</h5>
                    </div>
                    <div className="card-body">
                      <div className="d-grid gap-2">
                        <button className="btn btn-primary">
                          📊 Generate Stage Report
                        </button>
                        <button className="btn btn-info">
                          📈 Export Analytics
                        </button>
                        <button className="btn btn-warning">
                          ⚠️ View Bottlenecks
                        </button>
                        <button className="btn btn-success">
                          🔄 Optimize Workflow
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedView === 'settings' && (
            <div className="settings-view">
              <div className="row">
                <div className="col-lg-8">
                  <div className="card">
                    <div className="card-header">
                      <h5 className="card-title">⚙️ Workflow Configuration</h5>
                    </div>
                    <div className="card-body">
                      <div className="workflow-config">
                        <p className="text-muted mb-3">
                          Configure your procurement workflow stages and settings.
                        </p>
                        
                        <div className="stage-config-list">
                          {procurementStages.map((stage, index) => (
                            <div key={stage.id} className="stage-config-item">
                              <div className="stage-config-header">
                                <span className="stage-icon" style={{ color: stage.color }}>
                                  {stage.icon}
                                </span>
                                <div className="stage-config-info">
                                  <div className="stage-name">{stage.name}</div>
                                  <div className="stage-description">{stage.description}</div>
                                </div>
                                <div className="stage-config-controls">
                                  <span className={`badge ${stage.required ? 'bg-danger' : 'bg-secondary'}`}>
                                    {stage.required ? 'Required' : 'Optional'}
                                  </span>
                                  <button className="btn btn-sm btn-outline-primary">
                                    Configure
                                  </button>
                                </div>
                              </div>
                              
                              <div className="stage-config-details">
                                <div className="row">
                                  <div className="col-md-4">
                                    <small className="text-muted">Expected Duration</small>
                                    <div>{stage.duration}</div>
                                  </div>
                                  <div className="col-md-8">
                                    <small className="text-muted">Available Actions</small>
                                    <div className="action-tags">
                                      {stage.actions.map(action => (
                                        <span key={action} className="badge bg-light text-dark">
                                          {action}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="col-lg-4">
                  <div className="card">
                    <div className="card-header">
                      <h5 className="card-title">📋 Workflow Templates</h5>
                    </div>
                    <div className="card-body">
                      <p className="text-muted">
                        Pre-configured workflow templates for different procurement types.
                      </p>
                      
                      <div className="template-list">
                        <div className="template-item">
                          <div className="template-name">Standard Procurement</div>
                          <div className="template-stages">10 stages</div>
                        </div>
                        <div className="template-item">
                          <div className="template-name">Emergency Procurement</div>
                          <div className="template-stages">6 stages</div>
                        </div>
                        <div className="template-item">
                          <div className="template-name">Framework Agreement</div>
                          <div className="template-stages">8 stages</div>
                        </div>
                      </div>
                      
                      <button className="btn btn-primary w-100 mt-3">
                        Create Custom Template
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </StandardLayout>
  );
}
