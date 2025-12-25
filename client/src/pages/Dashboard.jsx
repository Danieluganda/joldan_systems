// client/src/pages/Dashboard.jsx
import React from 'react';
import StandardLayout from '../components/layout/StandardLayout';
import './pages.css';

/**
 * Dashboard Component - STEP-Based Procurement Tracking
 * Main overview page showing procurement metrics aligned with World Bank STEP system
 * Tracks 7 procurement methods, planned vs actual dates, and complete workflow stages
 */
export default function Dashboard() {
  // Key Procurement Metrics (from STEP system requirements)
  const stats = [
    { 
      label: 'Active Procurements', 
      value: '23', 
      change: '+5 this month',
      icon: '📊', 
      color: '#3498db' 
    },
    { 
      label: 'Pending Prior Review', 
      value: '7', 
      change: 'Bank approval required',
      icon: '🏦', 
      color: '#e74c3c' 
    },
    { 
      label: 'On-Time Rate', 
      value: '87%', 
      change: 'Planned vs Actual',
      icon: '⏱️', 
      color: '#2ecc71' 
    },
    { 
      label: 'Total Budget (USD)', 
      value: '$2.4M', 
      change: '$890K awarded',
      icon: '💰', 
      color: '#f39c12' 
    }
  ];

  // Procurement Methods Distribution (7 methods from STEP)
  const methodsBreakdown = [
    { method: 'RFB', name: 'Request for Bids', count: 8, color: '#3498db' },
    { method: 'RFQ', name: 'Request for Quotations', count: 6, color: '#2ecc71' },
    { method: 'QCBS', name: 'Quality & Cost Based', count: 4, color: '#9b59b6' },
    { method: 'CQS', name: 'Consultant Qualification', count: 3, color: '#e67e22' },
    { method: 'INDV', name: 'Individual Consultant', count: 2, color: '#1abc9c' }
  ];

  // Recent Procurement Activities (STEP workflow stages)
  const activities = [
    { 
      id: 1, 
      ref: 'OUL-10X-GO-2025-042',
      title: 'Office Equipment & Furniture', 
      method: 'RFB',
      stage: 'Bid Evaluation Report',
      status: 'In Progress',
      reviewType: 'Post',
      plannedDate: '2025-12-28',
      actualDate: null,
      daysDelayed: 0,
      time: '3 hours ago', 
      icon: '📋' 
    },
    { 
      id: 2, 
      ref: 'OUL-10X-CONS-2025-034',
      title: 'Inclusion & Accessibility Consultancy', 
      method: 'QCBS',
      stage: 'Signed Contract',
      status: 'Completed',
      reviewType: 'Prior',
      plannedDate: '2025-11-23',
      actualDate: '2025-11-23',
      daysDelayed: 0,
      time: '2 days ago', 
      icon: '✅' 
    },
    { 
      id: 3, 
      ref: 'OUL-10X-GO-2025-038',
      title: 'Digital Learning Devices (200 units)', 
      method: 'RFB',
      stage: 'Draft Bidding Documents',
      status: 'Waiting Bank Approval',
      reviewType: 'Prior',
      plannedDate: '2025-12-15',
      actualDate: '2025-12-20',
      daysDelayed: 5,
      time: '1 week ago', 
      icon: '🏦' 
    },
    { 
      id: 4, 
      ref: 'OUL-10X-CW-2025-029',
      title: 'Training Center Renovations', 
      method: 'RFB',
      stage: 'Bid Submission/Opening',
      status: 'On Track',
      reviewType: 'Post',
      plannedDate: '2026-01-10',
      actualDate: null,
      daysDelayed: 0,
      time: '2 weeks ago', 
      icon: '🏗️' 
    },
    { 
      id: 5, 
      ref: 'OUL-10X-CONS-2025-031',
      title: 'M&E Specialist - Individual', 
      method: 'INDV',
      stage: 'Notification of Award',
      status: 'Completed',
      reviewType: 'Post',
      plannedDate: '2025-12-01',
      actualDate: '2025-11-28',
      daysDelayed: -3,
      time: '3 weeks ago', 
      icon: '🎖️' 
    }
  ];

  // Alerts & Warnings (STEP compliance checks)
  const alerts = [
    {
      type: 'urgent',
      icon: '⚠️',
      message: 'Debarred list check required for OUL-10X-GO-2025-042',
      action: 'Review Now'
    },
    {
      type: 'warning',
      icon: '📅',
      message: '3 procurements delayed beyond planned dates',
      action: 'View Report'
    },
    {
      type: 'info',
      icon: '📄',
      message: '5 UNSPSC codes need verification',
      action: 'Update Codes'
    }
  ];

  // Workflow Stage Distribution (15 stages from STEP)
  const stageDistribution = [
    { stage: 'Planning & Approval', count: 5 },
    { stage: 'Document Preparation', count: 4 },
    { stage: 'Bidding & Submission', count: 7 },
    { stage: 'Evaluation', count: 4 },
    { stage: 'Award & Contract', count: 3 }
  ];

  // Upcoming Critical Deadlines
  const deadlines = [
    {
      date: 'Dec 26',
      urgent: true,
      title: 'Bid Submission Deadline',
      ref: 'OUL-10X-GO-2025-042',
      desc: 'Office Equipment RFB',
      stage: 'Bid Submission/Opening'
    },
    {
      date: 'Dec 28',
      urgent: true,
      title: 'Evaluation Report Due',
      ref: 'OUL-10X-GO-2025-042',
      desc: 'Technical & Financial Evaluation',
      stage: 'Bid Evaluation Report'
    },
    {
      date: 'Jan 5',
      urgent: false,
      title: 'Bank No Objection Required',
      ref: 'OUL-10X-GO-2025-038',
      desc: 'Draft Documents - Prior Review',
      stage: 'Draft Bidding Documents'
    },
    {
      date: 'Jan 10',
      urgent: false,
      title: 'Procurement Notice Publication',
      ref: 'OUL-10X-CW-2025-029',
      desc: 'Auto-publish to 4 outlets',
      stage: 'Specific Procurement Notice'
    }
  ];

  // My Tasks (Role-based)
  const myTasks = [
    { id: 1, done: true, task: 'Complete technical evaluation for OUL-10X-GO-2025-042', priority: 'high' },
    { id: 2, done: true, task: 'Upload signed contract for OUL-10X-CONS-2025-034', priority: 'medium' },
    { id: 3, done: false, task: 'Check debarred list for 3 shortlisted bidders', priority: 'high' },
    { id: 4, done: false, task: 'Update UNSPSC codes for 5 procurement items', priority: 'medium' },
    { id: 5, done: false, task: 'Submit evaluation report to Bank (Prior Review)', priority: 'high' },
    { id: 6, done: false, task: 'Respond to 2 clarification requests', priority: 'low' }
  ];

  // Header Actions
  const headerActions = [
    { label: '+ New Procurement Plan', variant: 'primary', onClick: () => console.log('New procurement') },
    { label: '📊 Reports', variant: 'secondary', onClick: () => console.log('Reports') },
    { label: '📧 Communication Log', variant: 'secondary', onClick: () => console.log('Comm Log') }
  ];

  return (
    <StandardLayout
      title="📊 Procurement Dashboard"
      description="STEP-based procurement tracking and monitoring system"
      headerActions={headerActions}
      className="dashboard-layout"
    >
      <div className="dashboard-container" style={{overflowY: 'auto', maxHeight: '100vh', paddingBottom: '2rem'}}>
        {/* Key Metrics */}
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <div key={index} className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: stat.color + '20', color: stat.color }}>
                {stat.icon}
              </div>
              <div className="stat-content">
                <p className="stat-label">{stat.label}</p>
                <p className="stat-value">{stat.value}</p>
                <p style={{margin: '0.3rem 0 0 0', fontSize: '0.8rem', color: '#666'}}>{stat.change}</p>
              </div>
            </div>
          ))}
        </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="alerts-section">
          {alerts.map((alert, index) => (
            <div key={index} className={`alert alert-${alert.type}`}>
              <span className="alert-icon">{alert.icon}</span>
              <span className="alert-message">{alert.message}</span>
              <button className="alert-action">{alert.action}</button>
            </div>
          ))}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Recent Procurement Activities */}
        <div className="dashboard-card" style={{gridColumn: 'span 2'}}>
          <div className="card-header">
            <h2>📋 Recent Procurement Activities</h2>
            <a href="#" className="view-all">View all →</a>
          </div>
          <div className="procurement-list">
            <table className="procurement-table">
              <thead>
                <tr>
                  <th>Ref Number</th>
                  <th>Description</th>
                  <th>Method</th>
                  <th>Current Stage</th>
                  <th>Review</th>
                  <th>Status</th>
                  <th>Timeline</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity) => (
                  <tr key={activity.id}>
                    <td className="ref-number">{activity.ref}</td>
                    <td className="procurement-title">
                      <div className="title-icon">{activity.icon}</div>
                      <div>
                        <div className="title-text">{activity.title}</div>
                        <div className="title-meta">{activity.time}</div>
                      </div>
                    </td>
                    <td>
                      <span className="method-badge">{activity.method}</span>
                    </td>
                    <td className="stage-name">{activity.stage}</td>
                    <td>
                      <span className={`review-badge review-${activity.reviewType.toLowerCase()}`}>
                        {activity.reviewType}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge status-${activity.status.toLowerCase().replace(/\s+/g, '-')}`}>
                        {activity.status}
                      </span>
                    </td>
                    <td>
                      {activity.daysDelayed > 0 ? (
                        <span className="timeline-delayed">+{activity.daysDelayed} days</span>
                      ) : activity.daysDelayed < 0 ? (
                        <span className="timeline-early">{activity.daysDelayed} days</span>
                      ) : activity.actualDate ? (
                        <span className="timeline-ontime">On time</span>
                      ) : (
                        <span className="timeline-scheduled">Scheduled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Procurement Methods Breakdown */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2>📊 Procurement Methods</h2>
            <span className="card-subtitle">Active procurements by method</span>
          </div>
          <div className="methods-breakdown">
            {methodsBreakdown.map((item, index) => (
              <div key={index} className="method-item">
                <div className="method-header">
                  <div className="method-info">
                    <span className="method-code" style={{ color: item.color }}>{item.method}</span>
                    <span className="method-name">{item.name}</span>
                  </div>
                  <span className="method-count">{item.count}</span>
                </div>
                <div className="method-bar">
                  <div 
                    className="method-bar-fill" 
                    style={{ 
                      width: `${(item.count / 23) * 100}%`,
                      backgroundColor: item.color 
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Workflow Stage Distribution */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2>🔄 Workflow Stages</h2>
            <span className="card-subtitle">Distribution across 15 STEP stages</span>
          </div>
          <div className="stage-distribution">
            {stageDistribution.map((item, index) => (
              <div key={index} className="stage-item">
                <span className="stage-label">{item.stage}</span>
                <div className="stage-metric">
                  <span className="stage-count">{item.count}</span>
                  <span className="stage-percent">{Math.round((item.count / 23) * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="dashboard-grid">
        {/* Upcoming Deadlines */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2>📅 Upcoming Deadlines</h2>
            <span className="card-subtitle">Critical procurement milestones</span>
          </div>
          <div className="deadline-list">
            {deadlines.map((item, index) => (
              <div key={index} className={`deadline-item ${item.urgent ? 'urgent' : ''}`}>
                <span className="deadline-date">{item.date}</span>
                <div className="deadline-content">
                  <p className="deadline-title">{item.title}</p>
                  <p className="deadline-desc">{item.desc}</p>
                  <div style={{fontSize: '0.8rem', color: '#666', marginTop: '0.5rem'}}>
                    <div>{item.ref}</div>
                    <div>Stage: {item.stage}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* My Tasks */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2>✓ My Tasks</h2>
            <a href="#" className="view-all">View all →</a>
          </div>
          <div className="task-list">
            {myTasks.map((task) => (
              <label key={task.id} className="task-item">
                <input type="checkbox" defaultChecked={task.done} />
                <span>{task.task}</span>
                <span className={`activity-status status-${task.priority}`} style={{
                  background: task.priority === 'high' ? '#fee2e2' : task.priority === 'medium' ? '#fff3cd' : '#f0f8ff',
                  color: task.priority === 'high' ? '#dc2626' : task.priority === 'medium' ? '#f59e0b' : '#3b82f6',
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  marginLeft: 'auto'
                }}>
                  {task.priority}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions Footer */}
      <div className="dashboard-footer">
        <div className="quick-actions">
          <button className="quick-action-btn">
            <span className="action-icon">📝</span>
            <span className="action-label">Create Procurement Plan</span>
          </button>
          <button className="quick-action-btn">
            <span className="action-icon">📤</span>
            <span className="action-label">Submit to Bank</span>
          </button>
          <button className="quick-action-btn">
            <span className="action-icon">🔍</span>
            <span className="action-label">Check Debarred List</span>
          </button>
          <button className="quick-action-btn">
            <span className="action-icon">📊</span>
            <span className="action-label">Generate Report</span>
          </button>
          <button className="quick-action-btn">
            <span className="action-icon">🔔</span>
            <span className="action-label">View Notifications</span>
          </button>
        </div>
      </div>
      </div>
    </StandardLayout>
  );
}