/**
 * NoticesPage Component
 * 
 * Manages procurement notices and public announcements including tender notices,
 * award notices, amendments, and other procurement-related communications.
 * Handles publication, tracking, and compliance with transparency requirements.
 * 
 * Features:
 * - Multiple notice types and templates
 * - Publication workflow and scheduling
 * - Public portal integration
 * - Compliance tracking and reporting
 * - Amendment and addendum management
 * - Multi-language support ready
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import StandardLayout from '../components/layout/StandardLayout';
import './pages.css';

const NoticesPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { permissions } = usePermissions();
  
  // State management
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [errors, setErrors] = useState({});

  // Notice types configuration
  const noticeTypes = [
    {
      id: 'tender_notice',
      label: 'Tender Notice',
      icon: '📢',
      description: 'Public announcement of upcoming procurement opportunities',
      color: '#0052cc',
      template: 'tender'
    },
    {
      id: 'award_notice',
      label: 'Award Notice',
      icon: '🏆',
      description: 'Announcement of contract award decisions',
      color: '#28a745',
      template: 'award'
    },
    {
      id: 'amendment',
      label: 'Amendment Notice',
      icon: '📝',
      description: 'Modifications to existing tender documents or notices',
      color: '#ffc107',
      template: 'amendment'
    },
    {
      id: 'cancellation',
      label: 'Cancellation Notice',
      icon: '❌',
      description: 'Cancellation of procurement processes',
      color: '#dc3545',
      template: 'cancellation'
    },
    {
      id: 'pre_qualification',
      label: 'Pre-qualification Notice',
      icon: '✅',
      description: 'Invitation for supplier pre-qualification',
      color: '#17a2b8',
      template: 'prequalification'
    },
    {
      id: 'clarification',
      label: 'Clarification Notice',
      icon: '❓',
      description: 'Responses to bidder inquiries and clarifications',
      color: '#6f42c1',
      template: 'clarification'
    },
    {
      id: 'extension',
      label: 'Extension Notice',
      icon: '⏰',
      description: 'Deadline extensions and timeline changes',
      color: '#fd7e14',
      template: 'extension'
    }
  ];

  useEffect(() => {
    loadNotices();
  }, [activeTab, searchTerm, selectedType]);

  const loadNotices = async () => {
    try {
      setLoading(true);
      setErrors({});

      const params = new URLSearchParams();
      if (activeTab !== 'all') params.append('status', activeTab);
      if (searchTerm) params.append('search', searchTerm);
      if (selectedType) params.append('type', selectedType);

      const response = await fetch(`/api/notices?${params}`);
      const result = await response.json();
      setNotices(result.data || []);

    } catch (error) {
      console.error('Error loading notices:', error);
      setErrors({ general: 'Failed to load notices' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNotice = (type) => {
    navigate(`/notices/create?type=${type}`);
  };

  const handleViewNotice = (notice) => {
    navigate(`/notices/${notice.id}`);
  };

  const handlePublishNotice = async (noticeId) => {
    try {
      const response = await fetch(`/api/notices/${noticeId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        await loadNotices();
      } else {
        console.error('Failed to publish notice');
      }
    } catch (error) {
      console.error('Error publishing notice:', error);
    }
  };

  const handleUnpublishNotice = async (noticeId) => {
    try {
      const response = await fetch(`/api/notices/${noticeId}/unpublish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        await loadNotices();
      } else {
        console.error('Failed to unpublish notice');
      }
    } catch (error) {
      console.error('Error unpublishing notice:', error);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { label: 'Draft', class: 'badge-secondary' },
      pending_review: { label: 'Pending Review', class: 'badge-warning' },
      approved: { label: 'Approved', class: 'badge-info' },
      published: { label: 'Published', class: 'badge-success' },
      archived: { label: 'Archived', class: 'badge-dark' }
    };
    
    const config = statusConfig[status] || statusConfig.draft;
    return <span className={`badge ${config.class}`}>{config.label}</span>;
  };

  const getNoticeTypeInfo = (typeId) => {
    return noticeTypes.find(type => type.id === typeId) || 
           { label: typeId, icon: '📄', color: '#666', description: '' };
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Define header actions based on permissions
  const headerActions = [];
  
  if (permissions.includes('create_notice')) {
    headerActions.push({
      label: '+ Create Notice',
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

  const filteredNotices = notices.filter(notice => {
    if (activeTab !== 'all' && notice.status !== activeTab) return false;
    if (searchTerm && !notice.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (selectedType && notice.type !== selectedType) return false;
    return true;
  });

  return (
    <StandardLayout
      title="📢 Procurement Notices"
      description="Manage public procurement notices and announcements"
      headerActions={headerActions}
    >
      {/* Quick Stats */}
      <div className="notices-stats">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{notices.filter(n => n.status === 'published').length}</div>
            <div className="stat-label">Published</div>
            <div className="stat-icon">🌐</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{notices.filter(n => n.status === 'draft').length}</div>
            <div className="stat-label">Drafts</div>
            <div className="stat-icon">📝</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{notices.filter(n => n.status === 'pending_review').length}</div>
            <div className="stat-label">Pending Review</div>
            <div className="stat-icon">⏳</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{notices.filter(n => new Date(n.expiryDate) < new Date()).length}</div>
            <div className="stat-label">Expired</div>
            <div className="stat-icon">⚠️</div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="notices-controls">
        <div className="notices-tabs">
          <div className="tab-nav">
            <button
              className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All Notices
            </button>
            <button
              className={`tab-button ${activeTab === 'published' ? 'active' : ''}`}
              onClick={() => setActiveTab('published')}
            >
              Published
            </button>
            <button
              className={`tab-button ${activeTab === 'draft' ? 'active' : ''}`}
              onClick={() => setActiveTab('draft')}
            >
              Drafts
            </button>
            <button
              className={`tab-button ${activeTab === 'pending_review' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending_review')}
            >
              Pending Review
            </button>
          </div>
        </div>

        <div className="search-filters">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search notices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-select">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="form-select"
            >
              <option value="">All Types</option>
              {noticeTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <p>Loading notices...</p>
        </div>
      ) : errors.general ? (
        <div className="error-message">
          {errors.general}
        </div>
      ) : filteredNotices.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📢</div>
          <h3>No Notices Found</h3>
          <p>
            {searchTerm || selectedType 
              ? 'No notices match your current filters. Try adjusting your search criteria.'
              : 'No notices have been created yet. Create your first notice to get started.'
            }
          </p>
          {permissions.includes('create_notice') && !searchTerm && !selectedType && (
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              Create First Notice
            </button>
          )}
        </div>
      ) : (
        <div className="notices-container">
          <div className="notices-grid">
            {filteredNotices.map((notice) => {
              const typeInfo = getNoticeTypeInfo(notice.type);
              return (
                <div key={notice.id} className="notice-card">
                  <div className="notice-header">
                    <div className="notice-type" style={{ borderColor: typeInfo.color }}>
                      <span className="type-icon">{typeInfo.icon}</span>
                      <div className="type-info">
                        <span className="type-label" style={{ color: typeInfo.color }}>
                          {typeInfo.label}
                        </span>
                      </div>
                    </div>
                    <div className="notice-status">
                      {getStatusBadge(notice.status)}
                    </div>
                  </div>

                  <div className="notice-content">
                    <h3 className="notice-title" onClick={() => handleViewNotice(notice)}>
                      {notice.title}
                    </h3>
                    <p className="notice-description">{notice.description}</p>
                    
                    {notice.procurementId && (
                      <div className="notice-procurement">
                        <strong>Related Procurement:</strong> {notice.procurementTitle}
                      </div>
                    )}
                  </div>

                  <div className="notice-timeline">
                    <div className="timeline-item">
                      <strong>Created:</strong> {formatDate(notice.createdAt)}
                    </div>
                    {notice.publishedAt && (
                      <div className="timeline-item">
                        <strong>Published:</strong> {formatDate(notice.publishedAt)}
                      </div>
                    )}
                    {notice.expiryDate && (
                      <div className="timeline-item">
                        <strong>Expires:</strong> 
                        <span className={new Date(notice.expiryDate) < new Date() ? 'expired' : ''}>
                          {formatDate(notice.expiryDate)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="notice-actions">
                    <button
                      className="btn btn-small btn-primary"
                      onClick={() => handleViewNotice(notice)}
                    >
                      View Details
                    </button>
                    
                    {permissions.includes('edit_notice') && notice.status !== 'published' && (
                      <button
                        className="btn btn-small btn-secondary"
                        onClick={() => navigate(`/notices/${notice.id}/edit`)}
                      >
                        Edit
                      </button>
                    )}
                    
                    {permissions.includes('publish_notice') && (
                      <>
                        {notice.status === 'approved' && (
                          <button
                            className="btn btn-small btn-success"
                            onClick={() => handlePublishNotice(notice.id)}
                          >
                            Publish
                          </button>
                        )}
                        {notice.status === 'published' && (
                          <button
                            className="btn btn-small btn-warning"
                            onClick={() => handleUnpublishNotice(notice.id)}
                          >
                            Unpublish
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Notice Type Selection Modal */}
      {showCreateModal && (
        <CreateNoticeModal
          noticeTypes={noticeTypes}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateNotice}
        />
      )}
    </StandardLayout>
  );
};

// Create Notice Type Selection Modal
const CreateNoticeModal = ({ noticeTypes, onClose, onCreate }) => {
  const [selectedType, setSelectedType] = useState('');

  const handleCreate = () => {
    if (selectedType) {
      onCreate(selectedType);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create New Notice</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <p>Select the type of notice you want to create:</p>
          
          <div className="notice-types-grid">
            {noticeTypes.map((type) => (
              <div
                key={type.id}
                className={`notice-type-card ${
                  selectedType === type.id ? 'selected' : ''
                }`}
                onClick={() => setSelectedType(type.id)}
                style={{ borderColor: selectedType === type.id ? type.color : '#e1e8ed' }}
              >
                <div className="type-header">
                  <span className="type-icon">{type.icon}</span>
                  <h4 style={{ color: type.color }}>{type.label}</h4>
                </div>
                <p className="type-description">{type.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={!selectedType}
          >
            Create Notice
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoticesPage;
