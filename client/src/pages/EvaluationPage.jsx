/**
 * EvaluationPage Component
 * 
 * Main evaluation management interface for managing procurement evaluations,
 * scoring processes, and assessment workflows. Provides access to various
 * evaluation methodologies including the World Bank 9-step process.
 * 
 * Features:
 * - Evaluation list and management
 * - Multiple evaluation methodologies
 * - Progress tracking and monitoring
 * - Team collaboration tools
 * - Report generation and export
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import StandardLayout from '../components/layout/StandardLayout';
import './pages.css';

const EvaluationPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { permissions } = usePermissions();
  
  // State management
  const [evaluations, setEvaluations] = useState([]);
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRfq, setSelectedRfq] = useState('');

  useEffect(() => {
    loadEvaluations();
    loadRfqs();
  }, [activeTab]);

  const loadEvaluations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/evaluations?status=${activeTab}`);
      const result = await response.json();
      setEvaluations(result.data || []);
    } catch (error) {
      console.error('Error loading evaluations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRfqs = async () => {
    try {
      const response = await fetch('/api/rfqs?status=published,submission_closing');
      const result = await response.json();
      setRfqs(result.data || []);
    } catch (error) {
      console.error('Error loading RFQs:', error);
    }
  };

  const handleCreateEvaluation = (type) => {
    if (type === 'nine-step') {
      navigate(`/evaluations/nine-step?rfqId=${selectedRfq}`);
    } else {
      // Handle other evaluation types
      setShowCreateModal(true);
    }
  };

  const handleViewEvaluation = (evaluation) => {
    if (evaluation.evaluationType === 'nine_step') {
      navigate(`/evaluations/nine-step/${evaluation.id}?rfqId=${evaluation.rfqId}`);
    } else {
      navigate(`/evaluations/${evaluation.id}`);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      not_started: { label: 'Not Started', class: 'badge-secondary' },
      in_progress: { label: 'In Progress', class: 'badge-warning' },
      completed: { label: 'Completed', class: 'badge-success' },
      consolidated: { label: 'Consolidated', class: 'badge-info' }
    };
    
    const config = statusConfig[status] || statusConfig.not_started;
    return <span className={`badge ${config.class}`}>{config.label}</span>;
  };

  const getEvaluationTypeLabel = (type) => {
    const types = {
      technical: '🔬 Technical',
      commercial: '💰 Commercial', 
      combined: '📊 Combined',
      nine_step: '🎯 9-Step Process',
      prequalification: '✅ Pre-qualification',
      post_award: '🏆 Post-Award'
    };
    return types[type] || type;
  };

  // Define header actions based on permissions
  const headerActions = [];
  
  if (permissions.includes('create_evaluation')) {
    headerActions.push({
      label: '+ New Evaluation',
      variant: 'primary',
      onClick: () => setShowCreateModal(true)
    });
  }

  if (permissions.includes('export_data')) {
    headerActions.push({
      label: 'Export Reports',
      variant: 'secondary',
      onClick: () => {/* TODO: Export functionality */}
    });
  }

  return (
    <StandardLayout
      title="📊 Evaluation & Scoring"
      description="Manage procurement evaluations and scoring processes"
      headerActions={headerActions}
    >
      {/* Evaluation Tabs */}
      <div className="evaluation-tabs">
        <div className="tab-nav">
          <button
            className={`tab-button ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            Active Evaluations
          </button>
          <button
            className={`tab-button ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Completed
          </button>
          <button
            className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Evaluations
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <p>Loading evaluations...</p>
        </div>
      ) : evaluations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No Evaluations Found</h3>
          <p>
            {activeTab === 'active' 
              ? 'No active evaluations at this time. Create a new evaluation to get started.'
              : 'No evaluations found for the selected criteria.'
            }
          </p>
          {permissions.includes('create_evaluation') && (
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              Create New Evaluation
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Quick Actions */}
          <div className="quick-actions">
            <div className="action-cards">
              <div className="action-card" onClick={() => handleCreateEvaluation('nine-step')}>
                <div className="action-icon">🎯</div>
                <div className="action-content">
                  <h4>9-Step Evaluation</h4>
                  <p>World Bank compliant systematic evaluation</p>
                </div>
              </div>
              <div className="action-card" onClick={() => handleCreateEvaluation('quick')}>
                <div className="action-icon">⚡</div>
                <div className="action-content">
                  <h4>Quick Evaluation</h4>
                  <p>Streamlined evaluation for simple procurements</p>
                </div>
              </div>
              <div className="action-card" onClick={() => navigate('/evaluations/templates')}>
                <div className="action-icon">📋</div>
                <div className="action-content">
                  <h4>Evaluation Templates</h4>
                  <p>Pre-configured evaluation criteria and workflows</p>
                </div>
              </div>
            </div>
          </div>

          {/* Evaluations Table */}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Evaluation Details</th>
                  <th>RFQ</th>
                  <th>Type</th>
                  <th>Progress</th>
                  <th>Team</th>
                  <th>Deadline</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.map((evaluation) => (
                  <tr key={evaluation.id}>
                    <td>
                      <div className="evaluation-info">
                        <h4 className="evaluation-title">{evaluation.title}</h4>
                        <p className="evaluation-description">{evaluation.description}</p>
                        <div className="evaluation-meta">
                          <span className="meta-item">ID: {evaluation.id}</span>
                          <span className="meta-item">Created: {new Date(evaluation.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="rfq-info">
                        <div className="rfq-title">{evaluation.rfq?.title || 'N/A'}</div>
                        <div className="rfq-id">RFQ-{evaluation.rfq?.id}</div>
                      </div>
                    </td>
                    <td>
                      <div className="type-badge">
                        {getEvaluationTypeLabel(evaluation.evaluationType)}
                      </div>
                    </td>
                    <td>
                      <div className="progress-info">
                        {getStatusBadge(evaluation.status)}
                        {evaluation.currentStep && (
                          <div className="step-info">
                            Step {evaluation.currentStep} of {evaluation.totalSteps || 9}
                          </div>
                        )}
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ 
                              width: `${((evaluation.currentStep || 0) / (evaluation.totalSteps || 9)) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="team-info">
                        <div className="evaluator-count">
                          {evaluation.evaluators?.length || 0} evaluators
                        </div>
                        <div className="team-avatars">
                          {(evaluation.evaluators || []).slice(0, 3).map((evaluator, index) => (
                            <div key={index} className="avatar" title={evaluator.name}>
                              {evaluator.name?.charAt(0) || 'E'}
                            </div>
                          ))}
                          {(evaluation.evaluators?.length || 0) > 3 && (
                            <div className="avatar more">+{evaluation.evaluators.length - 3}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="deadline-info">
                        {evaluation.deadlineDate ? (
                          <>
                            <div className="deadline-date">
                              {new Date(evaluation.deadlineDate).toLocaleDateString()}
                            </div>
                            <div className={`deadline-status ${
                              new Date(evaluation.deadlineDate) < new Date() ? 'overdue' : 'upcoming'
                            }`}>
                              {new Date(evaluation.deadlineDate) < new Date() ? 'Overdue' : 'Upcoming'}
                            </div>
                          </>
                        ) : (
                          <span className="text-muted">No deadline</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-small btn-primary"
                          onClick={() => handleViewEvaluation(evaluation)}
                        >
                          {evaluation.status === 'not_started' ? 'Start' : 'Continue'}
                        </button>
                        <button
                          className="btn btn-small btn-secondary"
                          onClick={() => navigate(`/evaluations/${evaluation.id}/report`)}
                        >
                          Report
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Create Evaluation Modal */}
      {showCreateModal && (
        <CreateEvaluationModal
          rfqs={rfqs}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateEvaluation}
          selectedRfq={selectedRfq}
          setSelectedRfq={setSelectedRfq}
        />
      )}
    </StandardLayout>
  );
};

// Create Evaluation Modal Component
const CreateEvaluationModal = ({ rfqs, onClose, onCreate, selectedRfq, setSelectedRfq }) => {
  const [evaluationType, setEvaluationType] = useState('nine_step');

  const evaluationTypes = [
    {
      id: 'nine_step',
      icon: '🎯',
      title: '9-Step Evaluation Process',
      description: 'Comprehensive World Bank compliant evaluation methodology',
      recommended: true
    },
    {
      id: 'technical',
      icon: '🔬',
      title: 'Technical Evaluation',
      description: 'Focus on technical specifications and compliance'
    },
    {
      id: 'commercial',
      icon: '💰',
      title: 'Commercial Evaluation',
      description: 'Evaluate pricing and commercial terms'
    },
    {
      id: 'combined',
      icon: '📊',
      title: 'Combined Evaluation',
      description: 'Technical and commercial evaluation combined'
    }
  ];

  const handleCreate = () => {
    if (selectedRfq && evaluationType) {
      if (evaluationType === 'nine_step') {
        onCreate('nine-step');
      } else {
        onCreate('standard');
      }
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create New Evaluation</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="form-group">
            <label>Select RFQ to Evaluate</label>
            <select
              value={selectedRfq}
              onChange={(e) => setSelectedRfq(e.target.value)}
              className="form-select"
            >
              <option value="">Choose an RFQ...</option>
              {rfqs.map((rfq) => (
                <option key={rfq.id} value={rfq.id}>
                  {rfq.title} (RFQ-{rfq.id})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Evaluation Type</label>
            <div className="evaluation-types">
              {evaluationTypes.map((type) => (
                <div
                  key={type.id}
                  className={`evaluation-type-card ${
                    evaluationType === type.id ? 'selected' : ''
                  }`}
                  onClick={() => setEvaluationType(type.id)}
                >
                  <div className="type-icon">{type.icon}</div>
                  <div className="type-content">
                    <h4>
                      {type.title}
                      {type.recommended && <span className="recommended-badge">Recommended</span>}
                    </h4>
                    <p>{type.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={!selectedRfq || !evaluationType}
          >
            Create Evaluation
          </button>
        </div>
      </div>
    </div>
  );
};

export default EvaluationPage;

