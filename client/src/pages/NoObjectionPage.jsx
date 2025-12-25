/**
 * NoObjectionPage Component
 * 
 * Manages World Bank No-Objection (NOL) requests for procurement activities.
 * Handles the submission, review, approval, and tracking of no-objection
 * requests as required by World Bank procurement guidelines.
 * 
 * Features:
 * - Submit no-objection requests
 * - Track request status and timeline
 * - Review and approval workflows
 * - Comment and collaboration system
 * - Document attachment support
 * - Compliance tracking and reporting
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import StandardLayout from '../components/layout/StandardLayout';
import './pages.css';

const NoObjectionPage = () => {
  const navigate = useNavigate();
  const { procurementId } = useParams();
  const [searchParams] = useSearchParams();
  const { permissions } = usePermissions();
  
  // State management
  const [requests, setRequests] = useState([]);
  const [procurementDetails, setProcurementDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [errors, setErrors] = useState({});

  // Form state
  const [formData, setFormData] = useState({
    category: '',
    reason: '',
    description: '',
    urgency: 'normal',
    documents: []
  });

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [commentingOn, setCommentingOn] = useState(null);

  // No-objection request categories
  const requestCategories = [
    {
      id: 'procurement_method',
      label: 'Procurement Method',
      description: 'Request approval for procurement methodology',
      icon: '🎯',
      required: true
    },
    {
      id: 'rfq_documents',
      label: 'RFQ Documents',
      description: 'Approval for tender documents and specifications',
      icon: '📄',
      required: true
    },
    {
      id: 'evaluation_criteria',
      label: 'Evaluation Criteria',
      description: 'Approval for evaluation methodology and criteria',
      icon: '⭐',
      required: true
    },
    {
      id: 'contract_award',
      label: 'Contract Award',
      description: 'Final approval for contract award recommendation',
      icon: '🏆',
      required: true
    },
    {
      id: 'modification',
      label: 'Procurement Modification',
      description: 'Changes to approved procurement plans',
      icon: '🔄',
      required: false
    },
    {
      id: 'extension',
      label: 'Timeline Extension',
      description: 'Extension of procurement timelines',
      icon: '⏰',
      required: false
    }
  ];

  useEffect(() => {
    loadData();
  }, [procurementId, activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrors({});

      // Load procurement details
      if (procurementId) {
        const procurementResponse = await fetch(`/api/procurements/${procurementId}`);
        if (procurementResponse.ok) {
          const procurementData = await procurementResponse.json();
          setProcurementDetails(procurementData);
        }
      }

      // Load no-objection requests
      const requestsUrl = procurementId 
        ? `/api/no-objections?procurementId=${procurementId}&status=${activeTab !== 'all' ? activeTab : ''}`
        : `/api/no-objections?status=${activeTab !== 'all' ? activeTab : ''}`;
      
      const requestsResponse = await fetch(requestsUrl);
      const requestsData = await requestsResponse.json();
      setRequests(requestsData.data || []);

    } catch (error) {
      console.error('Error loading data:', error);
      setErrors({ general: 'Failed to load no-objection requests' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    
    if (!formData.category || !formData.reason || !formData.description) {
      setErrors({ form: 'Please fill in all required fields' });
      return;
    }

    try {
      setSubmitting(true);
      setErrors({});

      const requestData = {
        ...formData,
        procurementId: procurementId || null,
        submittedBy: 'current_user', // This should come from auth context
        submittedAt: new Date().toISOString(),
        status: 'pending'
      };

      const response = await fetch('/api/no-objections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        setShowCreateModal(false);
        setFormData({ category: '', reason: '', description: '', urgency: 'normal', documents: [] });
        await loadData();
      } else {
        const error = await response.json();
        setErrors({ form: error.message || 'Failed to submit request' });
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      setErrors({ form: 'Failed to submit request' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (requestId, newStatus) => {
    try {
      const response = await fetch(`/api/no-objections/${requestId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        await loadData();
      } else {
        console.error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleAddComment = async (requestId) => {
    if (!commentText.trim()) return;

    try {
      const response = await fetch(`/api/no-objections/${requestId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          comment: commentText,
          author: 'current_user' // This should come from auth context
        })
      });

      if (response.ok) {
        setCommentText('');
        setCommentingOn(null);
        await loadData();
      } else {
        console.error('Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Pending Review', class: 'badge-warning' },
      under_review: { label: 'Under Review', class: 'badge-info' },
      approved: { label: 'Approved', class: 'badge-success' },
      rejected: { label: 'Rejected', class: 'badge-danger' },
      withdrawn: { label: 'Withdrawn', class: 'badge-secondary' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return <span className={`badge ${config.class}`}>{config.label}</span>;
  };

  const getUrgencyBadge = (urgency) => {
    const urgencyConfig = {
      low: { label: 'Low', class: 'urgency-low' },
      normal: { label: 'Normal', class: 'urgency-normal' },
      high: { label: 'High', class: 'urgency-high' },
      urgent: { label: 'Urgent', class: 'urgency-urgent' }
    };
    
    const config = urgencyConfig[urgency] || urgencyConfig.normal;
    return <span className={`urgency-badge ${config.class}`}>{config.label}</span>;
  };

  const getCategoryInfo = (categoryId) => {
    return requestCategories.find(cat => cat.id === categoryId) || 
           { label: categoryId, icon: '📝', description: '' };
  };

  // Define header actions based on permissions
  const headerActions = [];
  
  if (permissions.includes('create_no_objection')) {
    headerActions.push({
      label: '+ New Request',
      variant: 'primary',
      onClick: () => setShowCreateModal(true)
    });
  }

  if (permissions.includes('export_data')) {
    headerActions.push({
      label: 'Export Report',
      variant: 'secondary',
      onClick: () => {/* TODO: Export functionality */}
    });
  }

  const filteredRequests = requests.filter(request => {
    if (activeTab === 'all') return true;
    return request.status === activeTab;
  });

  return (
    <StandardLayout
      title="🔒 No-Objection Requests"
      description={procurementDetails 
        ? `Managing no-objection requests for: ${procurementDetails.title}`
        : "World Bank no-objection request management"
      }
      headerActions={headerActions}
    >
      {/* Procurement Context */}
      {procurementDetails && (
        <div className="procurement-context">
          <div className="context-card">
            <div className="context-header">
              <h3>📋 Procurement Context</h3>
              <button 
                className="btn btn-small btn-secondary"
                onClick={() => navigate(`/procurements/${procurementId}`)}
              >
                View Procurement
              </button>
            </div>
            <div className="context-info">
              <div className="info-item">
                <strong>Title:</strong> {procurementDetails.title}
              </div>
              <div className="info-item">
                <strong>Method:</strong> {procurementDetails.procurementMethod}
              </div>
              <div className="info-item">
                <strong>Status:</strong> {procurementDetails.status}
              </div>
              <div className="info-item">
                <strong>Value:</strong> ${(procurementDetails.estimatedValue || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Tabs */}
      <div className="request-tabs">
        <div className="tab-nav">
          <button
            className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Requests
          </button>
          <button
            className={`tab-button ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending
          </button>
          <button
            className={`tab-button ${activeTab === 'under_review' ? 'active' : ''}`}
            onClick={() => setActiveTab('under_review')}
          >
            Under Review
          </button>
          <button
            className={`tab-button ${activeTab === 'approved' ? 'active' : ''}`}
            onClick={() => setActiveTab('approved')}
          >
            Approved
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <p>Loading no-objection requests...</p>
        </div>
      ) : errors.general ? (
        <div className="error-message">
          {errors.general}
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔒</div>
          <h3>No Requests Found</h3>
          <p>
            {activeTab === 'all' 
              ? 'No no-objection requests have been submitted yet.'
              : `No ${activeTab} requests at this time.`
            }
          </p>
          {permissions.includes('create_no_objection') && (
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              Submit New Request
            </button>
          )}
        </div>
      ) : (
        <div className="requests-container">
          <div className="requests-grid">
            {filteredRequests.map((request) => {
              const categoryInfo = getCategoryInfo(request.category);
              return (
                <div key={request.id} className="request-card">
                  <div className="request-header">
                    <div className="request-category">
                      <span className="category-icon">{categoryInfo.icon}</span>
                      <div className="category-info">
                        <h4>{categoryInfo.label}</h4>
                        <p>{categoryInfo.description}</p>
                      </div>
                    </div>
                    <div className="request-meta">
                      {getStatusBadge(request.status)}
                      {getUrgencyBadge(request.urgency)}
                    </div>
                  </div>

                  <div className="request-content">
                    <div className="request-reason">
                      <strong>Reason:</strong> {request.reason}
                    </div>
                    <div className="request-description">
                      {request.description}
                    </div>
                  </div>

                  <div className="request-timeline">
                    <div className="timeline-item">
                      <strong>Submitted:</strong> {new Date(request.submittedAt).toLocaleDateString()}
                    </div>
                    <div className="timeline-item">
                      <strong>By:</strong> {request.submittedBy || 'Unknown'}
                    </div>
                    {request.reviewedAt && (
                      <div className="timeline-item">
                        <strong>Reviewed:</strong> {new Date(request.reviewedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {/* Comments Section */}
                  {request.comments && request.comments.length > 0 && (
                    <div className="request-comments">
                      <h5>Comments</h5>
                      <div className="comments-list">
                        {request.comments.map((comment, index) => (
                          <div key={index} className="comment-item">
                            <div className="comment-author">{comment.author || 'Unknown'}</div>
                            <div className="comment-text">{comment.text}</div>
                            <div className="comment-date">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="request-actions">
                    {permissions.includes('review_no_objection') && request.status === 'pending' && (
                      <div className="review-actions">
                        <button
                          className="btn btn-small btn-success"
                          onClick={() => handleStatusUpdate(request.id, 'approved')}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-small btn-danger"
                          onClick={() => handleStatusUpdate(request.id, 'rejected')}
                        >
                          Reject
                        </button>
                        <button
                          className="btn btn-small btn-info"
                          onClick={() => handleStatusUpdate(request.id, 'under_review')}
                        >
                          Under Review
                        </button>
                      </div>
                    )}

                    <div className="comment-actions">
                      {commentingOn === request.id ? (
                        <div className="comment-form">
                          <textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Add your comment..."
                            rows="2"
                          />
                          <div className="comment-form-actions">
                            <button
                              className="btn btn-small btn-primary"
                              onClick={() => handleAddComment(request.id)}
                            >
                              Add Comment
                            </button>
                            <button
                              className="btn btn-small btn-secondary"
                              onClick={() => {
                                setCommentingOn(null);
                                setCommentText('');
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="btn btn-small btn-outline"
                          onClick={() => setCommentingOn(request.id)}
                        >
                          Add Comment
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Request Modal */}
      {showCreateModal && (
        <CreateRequestModal
          formData={formData}
          setFormData={setFormData}
          categories={requestCategories}
          onClose={() => {
            setShowCreateModal(false);
            setErrors({});
            setFormData({ category: '', reason: '', description: '', urgency: 'normal', documents: [] });
          }}
          onSubmit={handleSubmitRequest}
          submitting={submitting}
          errors={errors}
        />
      )}
    </StandardLayout>
  );
};

// Create Request Modal Component
const CreateRequestModal = ({ 
  formData, 
  setFormData, 
  categories, 
  onClose, 
  onSubmit, 
  submitting, 
  errors 
}) => {
  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Submit No-Objection Request</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={onSubmit} className="modal-body">
          {errors.form && (
            <div className="error-message">
              {errors.form}
            </div>
          )}

          <div className="form-grid">
            <div className="form-group">
              <label>Request Category *</label>
              <div className="category-selector">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className={`category-option ${
                      formData.category === category.id ? 'selected' : ''
                    }`}
                    onClick={() => updateFormData('category', category.id)}
                  >
                    <div className="category-icon">{category.icon}</div>
                    <div className="category-content">
                      <h4>
                        {category.label}
                        {category.required && <span className="required-indicator">*</span>}
                      </h4>
                      <p>{category.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Urgency Level</label>
                <select
                  value={formData.urgency}
                  onChange={(e) => updateFormData('urgency', e.target.value)}
                  className="form-select"
                >
                  <option value="low">Low Priority</option>
                  <option value="normal">Normal Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Request Reason *</label>
              <input
                type="text"
                value={formData.reason}
                onChange={(e) => updateFormData('reason', e.target.value)}
                placeholder="Brief reason for this no-objection request"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label>Detailed Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => updateFormData('description', e.target.value)}
                placeholder="Provide detailed information about this request, including context and justification"
                rows="4"
                className="form-textarea"
                required
              />
            </div>
          </div>
        </form>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            onClick={onSubmit}
            disabled={submitting || !formData.category || !formData.reason || !formData.description}
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoObjectionPage;
