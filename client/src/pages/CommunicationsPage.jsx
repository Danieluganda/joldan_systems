import React, { useState, useEffect } from 'react';
import StandardLayout from '../components/layout/StandardLayout';
import './pages.css';

export default function CommunicationsPage() {
  const [activeView, setActiveView] = useState('communications');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedCommunication, setSelectedCommunication] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Comprehensive communications data - STEP methodology compliant
  const [communications] = useState([
    {
      id: 'COMM-2025-001',
      type: 'procurement_notice',
      status: 'published',
      priority: 'high',
      subject: 'Request for Quotations - Medical Equipment Procurement',
      category: 'tender_announcement',
      procurementRef: 'PROC-2025-001',
      publishDate: '2025-12-20',
      effectiveDate: '2025-12-20',
      expiryDate: '2026-01-15',
      lastUpdated: '2025-12-22',
      recipient: {
        type: 'public',
        targetAudience: 'all_suppliers',
        distributionChannels: ['website', 'email_blast', 'newspaper'],
        totalRecipients: 250
      },
      content: {
        summary: 'The Ministry of Health invites qualified suppliers to submit quotations for the procurement of medical equipment including ventilators, patient monitors, and diagnostic equipment.',
        details: 'This procurement follows the World Bank STEP methodology and is open to all eligible suppliers meeting the qualification requirements. The estimated contract value is $2.5M with delivery required within 6 months.',
        attachments: ['rfq_medical_equipment.pdf', 'technical_specifications.pdf', 'bidding_documents.pdf'],
        wordCount: 1250,
        language: 'English'
      },
      compliance: {
        stepCompliant: true,
        transparencyLevel: 'full_disclosure',
        publicNoticeRequired: true,
        minimumPublicationPeriod: 14, // days
        actualPublicationPeriod: 26,
        approvalRequired: true,
        approvedBy: 'Maria Rodriguez',
        approvalDate: '2025-12-19'
      },
      tracking: {
        views: 1250,
        downloads: 89,
        responses: 12,
        inquiries: 5,
        websiteViews: 980,
        emailOpens: 187,
        emailClicks: 45
      },
      metadata: {
        createdBy: 'procurement_officer_1',
        reviewedBy: 'senior_procurement_officer',
        version: '2.1',
        confidential: false,
        archived: false
      }
    },
    {
      id: 'COMM-2025-002',
      type: 'amendment_notice',
      status: 'draft',
      priority: 'medium',
      subject: 'Amendment to RFQ-2025-001 - Extended Submission Deadline',
      category: 'tender_amendment',
      procurementRef: 'PROC-2025-001',
      publishDate: null,
      effectiveDate: '2025-12-26',
      expiryDate: '2026-01-20',
      lastUpdated: '2025-12-25',
      recipient: {
        type: 'targeted',
        targetAudience: 'registered_bidders',
        distributionChannels: ['email', 'portal_notification'],
        totalRecipients: 12
      },
      content: {
        summary: 'Due to the holiday period, the submission deadline for RFQ-2025-001 has been extended by 5 working days to January 20, 2026.',
        details: 'All other terms and conditions remain unchanged. Bidders who have already submitted their quotations may revise and resubmit if desired. This amendment is issued to ensure fair competition and adequate preparation time.',
        attachments: ['amendment_notice.pdf'],
        wordCount: 89,
        language: 'English'
      },
      compliance: {
        stepCompliant: true,
        transparencyLevel: 'targeted_disclosure',
        publicNoticeRequired: true,
        minimumPublicationPeriod: 7,
        actualPublicationPeriod: null,
        approvalRequired: true,
        approvedBy: null,
        approvalDate: null
      },
      tracking: {
        views: 0,
        downloads: 0,
        responses: 0,
        inquiries: 0,
        websiteViews: 0,
        emailOpens: 0,
        emailClicks: 0
      },
      metadata: {
        createdBy: 'procurement_officer_2',
        reviewedBy: null,
        version: '1.0',
        confidential: false,
        archived: false
      }
    },
    {
      id: 'COMM-2025-003',
      type: 'evaluation_notification',
      status: 'sent',
      priority: 'high',
      subject: 'Bid Evaluation Results - Infrastructure Development Project',
      category: 'evaluation_results',
      procurementRef: 'PROC-2024-089',
      publishDate: '2025-12-18',
      effectiveDate: '2025-12-18',
      expiryDate: '2025-12-25',
      lastUpdated: '2025-12-18',
      recipient: {
        type: 'targeted',
        targetAudience: 'participating_bidders',
        distributionChannels: ['email', 'registered_mail'],
        totalRecipients: 8
      },
      content: {
        summary: 'The evaluation of bids for the Infrastructure Development Project has been completed. Individual results are being communicated to each bidder.',
        details: 'The evaluation was conducted in accordance with the criteria specified in the bidding documents. All bidders will receive detailed feedback on their technical and commercial proposals. The standstill period begins immediately.',
        attachments: ['evaluation_summary.pdf', 'feedback_template.pdf'],
        wordCount: 156,
        language: 'English'
      },
      compliance: {
        stepCompliant: true,
        transparencyLevel: 'confidential_disclosure',
        publicNoticeRequired: false,
        minimumPublicationPeriod: 0,
        actualPublicationPeriod: 7,
        approvalRequired: true,
        approvedBy: 'Carlos Martinez',
        approvalDate: '2025-12-17'
      },
      tracking: {
        views: 45,
        downloads: 23,
        responses: 3,
        inquiries: 2,
        websiteViews: 12,
        emailOpens: 8,
        emailClicks: 6
      },
      metadata: {
        createdBy: 'evaluation_committee',
        reviewedBy: 'senior_procurement_officer',
        version: '1.2',
        confidential: true,
        archived: false
      }
    },
    {
      id: 'COMM-2024-078',
      type: 'contract_award',
      status: 'published',
      priority: 'high',
      subject: 'Contract Award Notification - IT Services Procurement',
      category: 'award_notification',
      procurementRef: 'PROC-2024-078',
      publishDate: '2025-12-15',
      effectiveDate: '2025-12-15',
      expiryDate: '2026-01-15',
      lastUpdated: '2025-12-15',
      recipient: {
        type: 'public',
        targetAudience: 'all_stakeholders',
        distributionChannels: ['website', 'email_blast', 'press_release'],
        totalRecipients: 500
      },
      content: {
        summary: 'The contract for IT Services has been awarded to TechCore Systems following a competitive bidding process.',
        details: 'TechCore Systems was selected based on their technical excellence and competitive pricing. The contract value is $850,000 over 24 months. All unsuccessful bidders have been notified and the standstill period has concluded.',
        attachments: ['award_letter.pdf', 'contract_summary.pdf', 'public_notice.pdf'],
        wordCount: 234,
        language: 'English'
      },
      compliance: {
        stepCompliant: true,
        transparencyLevel: 'full_disclosure',
        publicNoticeRequired: true,
        minimumPublicationPeriod: 14,
        actualPublicationPeriod: 30,
        approvalRequired: true,
        approvedBy: 'Maria Rodriguez',
        approvalDate: '2025-12-14'
      },
      tracking: {
        views: 2300,
        downloads: 156,
        responses: 0,
        inquiries: 8,
        websiteViews: 1890,
        emailOpens: 234,
        emailClicks: 67
      },
      metadata: {
        createdBy: 'procurement_officer_1',
        reviewedBy: 'senior_procurement_officer',
        version: '1.0',
        confidential: false,
        archived: false
      }
    },
    {
      id: 'COMM-2025-004',
      type: 'clarification_response',
      status: 'pending_approval',
      priority: 'medium',
      subject: 'Response to Supplier Clarifications - Construction Materials RFQ',
      category: 'clarification_notice',
      procurementRef: 'PROC-2025-004',
      publishDate: null,
      effectiveDate: '2025-12-27',
      expiryDate: null,
      lastUpdated: '2025-12-24',
      recipient: {
        type: 'targeted',
        targetAudience: 'registered_bidders',
        distributionChannels: ['email', 'website_posting'],
        totalRecipients: 15
      },
      content: {
        summary: 'Responses to clarification requests from suppliers regarding technical specifications and delivery requirements for construction materials.',
        details: 'Multiple suppliers requested clarification on concrete grades, steel specifications, and delivery schedules. All responses are provided to maintain transparency and ensure equal treatment of all bidders.',
        attachments: ['clarification_responses.pdf', 'revised_specifications.pdf'],
        wordCount: 567,
        language: 'English'
      },
      compliance: {
        stepCompliant: true,
        transparencyLevel: 'targeted_disclosure',
        publicNoticeRequired: true,
        minimumPublicationPeriod: 3,
        actualPublicationPeriod: null,
        approvalRequired: true,
        approvedBy: null,
        approvalDate: null
      },
      tracking: {
        views: 0,
        downloads: 0,
        responses: 0,
        inquiries: 0,
        websiteViews: 0,
        emailOpens: 0,
        emailClicks: 0
      },
      metadata: {
        createdBy: 'procurement_officer_2',
        reviewedBy: 'technical_specialist',
        version: '1.1',
        confidential: false,
        archived: false
      }
    },
    {
      id: 'COMM-2025-005',
      type: 'market_announcement',
      status: 'scheduled',
      priority: 'low',
      subject: 'Prior Information Notice - Upcoming Healthcare Equipment Procurement',
      category: 'market_notice',
      procurementRef: 'PROC-2026-001',
      publishDate: '2026-01-02',
      effectiveDate: '2026-01-02',
      expiryDate: '2026-03-01',
      lastUpdated: '2025-12-23',
      recipient: {
        type: 'public',
        targetAudience: 'potential_suppliers',
        distributionChannels: ['website', 'industry_portals', 'trade_publications'],
        totalRecipients: 1000
      },
      content: {
        summary: 'Prior information about a major healthcare equipment procurement planned for Q1 2026, estimated value $5M.',
        details: 'This notice provides early information to allow suppliers to prepare for the upcoming procurement. The tender will include advanced diagnostic equipment, surgical instruments, and patient care devices. Final procurement documents will be available in February 2026.',
        attachments: ['prior_info_notice.pdf', 'preliminary_requirements.pdf'],
        wordCount: 445,
        language: 'English'
      },
      compliance: {
        stepCompliant: true,
        transparencyLevel: 'full_disclosure',
        publicNoticeRequired: true,
        minimumPublicationPeriod: 30,
        actualPublicationPeriod: 58,
        approvalRequired: true,
        approvedBy: 'Maria Rodriguez',
        approvalDate: '2025-12-22'
      },
      tracking: {
        views: 0,
        downloads: 0,
        responses: 0,
        inquiries: 0,
        websiteViews: 0,
        emailOpens: 0,
        emailClicks: 0
      },
      metadata: {
        createdBy: 'procurement_officer_1',
        reviewedBy: 'senior_procurement_officer',
        version: '1.0',
        confidential: false,
        archived: false
      }
    }
  ]);

  // Communications statistics
  const stats = {
    totalCommunications: communications.length,
    publishedCommunications: communications.filter(c => c.status === 'published').length,
    draftCommunications: communications.filter(c => c.status === 'draft').length,
    pendingCommunications: communications.filter(c => c.status === 'pending_approval').length,
    scheduledCommunications: communications.filter(c => c.status === 'scheduled').length,
    totalViews: communications.reduce((sum, c) => sum + c.tracking.views, 0),
    totalDownloads: communications.reduce((sum, c) => sum + c.tracking.downloads, 0),
    avgEngagementRate: 12.5, // percentage
    stepCompliantRate: Math.round((communications.filter(c => c.compliance.stepCompliant).length / communications.length) * 100)
  };

  // Filter communications
  const filteredCommunications = communications.filter(comm => {
    const matchesSearch = comm.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         comm.content.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         comm.procurementRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         comm.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || comm.status === statusFilter;
    const matchesType = typeFilter === 'all' || comm.type === typeFilter;
    const matchesPriority = priorityFilter === 'all' || comm.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesType && matchesPriority;
  });

  // Status configurations
  const statusConfig = {
    published: { label: 'Published', color: '#10b981', bg: '#d1fae5', icon: '🌐' },
    draft: { label: 'Draft', color: '#6b7280', bg: '#f9fafb', icon: '📝' },
    sent: { label: 'Sent', color: '#3b82f6', bg: '#dbeafe', icon: '📤' },
    pending_approval: { label: 'Pending Approval', color: '#f59e0b', bg: '#fef3c7', icon: '⏳' },
    scheduled: { label: 'Scheduled', color: '#8b5cf6', bg: '#ede9fe', icon: '📅' },
    archived: { label: 'Archived', color: '#6b7280', bg: '#f3f4f6', icon: '📁' }
  };

  // Type configurations
  const typeConfig = {
    procurement_notice: { label: 'Procurement Notice', icon: '📢', color: '#3b82f6' },
    amendment_notice: { label: 'Amendment Notice', icon: '📝', color: '#f59e0b' },
    evaluation_notification: { label: 'Evaluation Notification', icon: '📊', color: '#8b5cf6' },
    contract_award: { label: 'Contract Award', icon: '🏆', color: '#10b981' },
    clarification_response: { label: 'Clarification Response', icon: '❓', color: '#06b6d4' },
    market_announcement: { label: 'Market Announcement', icon: '📈', color: '#ef4444' }
  };

  // Priority configurations
  const priorityConfig = {
    high: { label: 'High', color: '#ef4444', bg: '#fee2e2', icon: '🔴' },
    medium: { label: 'Medium', color: '#f59e0b', bg: '#fef3c7', icon: '🟡' },
    low: { label: 'Low', color: '#10b981', bg: '#d1fae5', icon: '🟢' }
  };

  const getStatusBadge = (status) => {
    const config = statusConfig[status];
    return (
      <span 
        className="status-badge"
        style={{
          backgroundColor: config.bg,
          color: config.color,
          padding: '0.5rem 0.75rem',
          borderRadius: '20px',
          fontSize: '0.8rem',
          fontWeight: '600',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        <span>{config.icon}</span>
        {config.label}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const config = priorityConfig[priority];
    return (
      <span 
        className="priority-badge"
        style={{
          backgroundColor: config.bg,
          color: config.color,
          padding: '0.4rem 0.6rem',
          borderRadius: '16px',
          fontSize: '0.75rem',
          fontWeight: '600',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem'
        }}
      >
        <span>{config.icon}</span>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };

  const renderCommunicationsTab = () => (
    <div className="communications-content">
      {/* Statistics Section */}
      <div className="stats-section">
        <h2 className="section-title">Communications Overview</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.totalCommunications}</div>
            <div className="stat-label">Total Communications</div>
            <div className="stat-icon">📬</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.publishedCommunications}</div>
            <div className="stat-label">Published</div>
            <div className="stat-icon">🌐</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.draftCommunications}</div>
            <div className="stat-label">Drafts</div>
            <div className="stat-icon">📝</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.pendingCommunications}</div>
            <div className="stat-label">Pending Approval</div>
            <div className="stat-icon">⏳</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatNumber(stats.totalViews)}</div>
            <div className="stat-label">Total Views</div>
            <div className="stat-icon">👁️</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.stepCompliantRate}%</div>
            <div className="stat-label">STEP Compliant</div>
            <div className="stat-icon">✅</div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="search-group">
          <label>Search Communications</label>
          <input
            type="text"
            placeholder="Search by subject, content, reference, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-group">
          <label>Status</label>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Type</label>
          <select 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="procurement_notice">Procurement Notice</option>
            <option value="amendment_notice">Amendment Notice</option>
            <option value="evaluation_notification">Evaluation Notification</option>
            <option value="contract_award">Contract Award</option>
            <option value="clarification_response">Clarification Response</option>
            <option value="market_announcement">Market Announcement</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Priority</label>
          <select 
            value={priorityFilter} 
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Communications Table */}
      <div className="table-section">
        <div className="table-header">
          <h3>Communications Registry ({filteredCommunications.length})</h3>
          <button 
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
          >
            + Create Communication
          </button>
        </div>
        
        <div className="table-container">
          <table className="communications-table">
            <thead>
              <tr>
                <th>Communication Details</th>
                <th>Type & Category</th>
                <th>Status & Timeline</th>
                <th>Recipients & Distribution</th>
                <th>Compliance & Approval</th>
                <th>Engagement Metrics</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCommunications.map((comm) => (
                <tr key={comm.id}>
                  <td>
                    <div className="communication-info">
                      <div className="comm-ref">{comm.id}</div>
                      <div className="comm-subject">{comm.subject}</div>
                      <div className="comm-summary">{comm.content.summary.substring(0, 120)}...</div>
                      <div className="proc-ref">Proc: {comm.procurementRef}</div>
                      <div className="attachments-info">
                        {comm.content.attachments.length > 0 && 
                          `📎 ${comm.content.attachments.length} attachment(s)`}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="type-info">
                      <div 
                        className="type-badge"
                        style={{ 
                          backgroundColor: `${typeConfig[comm.type]?.color}15`, 
                          color: typeConfig[comm.type]?.color 
                        }}
                      >
                        <span className="type-icon">{typeConfig[comm.type]?.icon}</span>
                        {typeConfig[comm.type]?.label}
                      </div>
                      <div className="category-label">{comm.category.replace('_', ' ')}</div>
                      <div className="priority-display">{getPriorityBadge(comm.priority)}</div>
                    </div>
                  </td>
                  <td>
                    <div className="status-timeline">
                      <div className="status-display">{getStatusBadge(comm.status)}</div>
                      <div className="publish-date">Published: {formatDate(comm.publishDate)}</div>
                      <div className="effective-date">Effective: {formatDate(comm.effectiveDate)}</div>
                      {comm.expiryDate && (
                        <div className="expiry-date">Expires: {formatDate(comm.expiryDate)}</div>
                      )}
                      <div className="last-updated">Updated: {formatDate(comm.lastUpdated)}</div>
                    </div>
                  </td>
                  <td>
                    <div className="recipient-info">
                      <div className="audience-type">
                        {comm.recipient.type === 'public' ? '🌐 Public' : '🎯 Targeted'}
                      </div>
                      <div className="target-audience">{comm.recipient.targetAudience.replace('_', ' ')}</div>
                      <div className="total-recipients">Recipients: {formatNumber(comm.recipient.totalRecipients)}</div>
                      <div className="distribution-channels">
                        {comm.recipient.distributionChannels.map((channel, idx) => (
                          <span key={idx} className="channel-badge">{channel.replace('_', ' ')}</span>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="compliance-info">
                      <div className={`step-compliance ${comm.compliance.stepCompliant ? 'compliant' : 'non-compliant'}`}>
                        {comm.compliance.stepCompliant ? '✅ STEP Compliant' : '❌ Non-Compliant'}
                      </div>
                      <div className="transparency-level">
                        Transparency: {comm.compliance.transparencyLevel.replace('_', ' ')}
                      </div>
                      <div className="approval-info">
                        {comm.compliance.approvedBy ? (
                          <>
                            <div>✅ Approved by: {comm.compliance.approvedBy}</div>
                            <div>Date: {formatDate(comm.compliance.approvalDate)}</div>
                          </>
                        ) : (
                          <div className="pending-approval">⏳ Awaiting Approval</div>
                        )}
                      </div>
                      <div className="publication-period">
                        Publication: {comm.compliance.actualPublicationPeriod || 0} days
                        {comm.compliance.minimumPublicationPeriod > 0 && 
                          ` (min: ${comm.compliance.minimumPublicationPeriod})`}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="engagement-metrics">
                      <div className="metric-item">
                        <span className="metric-label">Views:</span>
                        <span className="metric-value">{formatNumber(comm.tracking.views)}</span>
                      </div>
                      <div className="metric-item">
                        <span className="metric-label">Downloads:</span>
                        <span className="metric-value">{formatNumber(comm.tracking.downloads)}</span>
                      </div>
                      <div className="metric-item">
                        <span className="metric-label">Responses:</span>
                        <span className="metric-value">{comm.tracking.responses}</span>
                      </div>
                      <div className="metric-item">
                        <span className="metric-label">Email Opens:</span>
                        <span className="metric-value">{comm.tracking.emailOpens}</span>
                      </div>
                      <div className="engagement-rate">
                        {comm.tracking.views > 0 ? 
                          `${Math.round((comm.tracking.emailOpens / comm.tracking.views) * 100)}% open rate` :
                          'No engagement yet'
                        }
                      </div>
                    </div>
                  </td>
                  <td className="actions-cell">
                    <div className="action-buttons">
                      <button className="action-btn" title="View Details">👁️</button>
                      <button className="action-btn" title="Edit">✏️</button>
                      <button className="action-btn" title="Publish">📢</button>
                      <button className="action-btn" title="Archive">📁</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="analytics-section">
      <h2 className="section-title">Communications Analytics</h2>
      <div className="analytics-grid">
        <div className="analytics-card">
          <h3>Communication Types</h3>
          <div className="type-chart">
            <div className="chart-item">
              <span>📢 Procurement Notice</span>
              <span>2</span>
            </div>
            <div className="chart-item">
              <span>📝 Amendment Notice</span>
              <span>1</span>
            </div>
            <div className="chart-item">
              <span>📊 Evaluation Notification</span>
              <span>1</span>
            </div>
            <div className="chart-item">
              <span>🏆 Contract Award</span>
              <span>1</span>
            </div>
            <div className="chart-item">
              <span>❓ Clarification Response</span>
              <span>1</span>
            </div>
          </div>
        </div>
        
        <div className="analytics-card">
          <h3>Engagement Performance</h3>
          <div className="performance-metrics">
            <div className="metric">
              <span className="metric-label">Total Views</span>
              <span className="metric-value">{formatNumber(stats.totalViews)}</span>
            </div>
            <div className="metric">
              <span className="metric-label">Total Downloads</span>
              <span className="metric-value">{formatNumber(stats.totalDownloads)}</span>
            </div>
            <div className="metric">
              <span className="metric-label">Avg Engagement Rate</span>
              <span className="metric-value">{stats.avgEngagementRate}%</span>
            </div>
            <div className="metric">
              <span className="metric-label">STEP Compliance</span>
              <span className="metric-value">{stats.stepCompliantRate}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <StandardLayout title="Communications Management">
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">
            <span className="title-icon">📬</span>
            Communications Management
          </h1>
          <p className="page-subtitle">
            Manage procurement communications, notices, and stakeholder engagement following STEP methodology
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${activeView === 'communications' ? 'active' : ''}`}
            onClick={() => setActiveView('communications')}
          >
            📬 Communications Registry
          </button>
          <button 
            className={`nav-tab ${activeView === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveView('templates')}
          >
            📝 Templates
          </button>
          <button 
            className={`nav-tab ${activeView === 'distribution' ? 'active' : ''}`}
            onClick={() => setActiveView('distribution')}
          >
            📤 Distribution Lists
          </button>
          <button 
            className={`nav-tab ${activeView === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveView('analytics')}
          >
            📊 Analytics
          </button>
        </div>

        {/* Content based on active view */}
        {activeView === 'communications' && renderCommunicationsTab()}
        {activeView === 'templates' && (
          <div className="coming-soon">
            <h2>Communication Templates</h2>
            <p>Standard templates for different communication types coming soon...</p>
          </div>
        )}
        {activeView === 'distribution' && (
          <div className="coming-soon">
            <h2>Distribution Management</h2>
            <p>Supplier lists, stakeholder groups, and distribution channel management coming soon...</p>
          </div>
        )}
        {activeView === 'analytics' && renderAnalyticsTab()}

        {/* Modal for new communication */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h3>Create New Communication</h3>
              <p>Communication creation form coming soon...</p>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </StandardLayout>
  );
}
