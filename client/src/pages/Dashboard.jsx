// client/src/pages/Dashboard.jsx
import React, { useState } from 'react';
import './pages.css';

/**
 * Dashboard Component
 * Main overview page showing procurement metrics and recent activity
 */
export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Sample stats data
  const stats = [
    { label: 'Active Procurements', value: '12', icon: '📊', color: '#3498db' },
    { label: 'Pending Approvals', value: '5', icon: '⏳', color: '#f39c12' },
    { label: 'Completed This Month', value: '28', icon: '✅', color: '#2ecc71' },
    { label: 'Total Vendors', value: '47', icon: '🏢', color: '#9b59b6' }
  ];

  // Recent activities
  const activities = [
    { id: 1, type: 'Procurement', title: 'Office Equipment RFQ', status: 'In Evaluation', time: '2 hours ago', icon: '📋' },
    { id: 2, type: 'Approval', title: 'Budget Allocation Approved', status: 'Completed', time: '5 hours ago', icon: '✔️' },
    { id: 3, type: 'Document', title: 'New Template Added', status: 'Published', time: '1 day ago', icon: '📄' },
    { id: 4, type: 'Award', title: 'Vendor Selected for IT', status: 'Announced', time: '2 days ago', icon: '🎖️' },
    { id: 5, type: 'Clarification', title: 'RFQ Clarification Response', status: 'Answered', time: '3 days ago', icon: '❓' }
  ];

  return (
    <div className="dashboard-layout">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Dashboard</h1>
          <p>Welcome back! Here's an overview of your procurement activities.</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary">+ New Procurement</button>
          <button className="btn-secondary">📅 Schedule</button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: stat.color + '20', color: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-content">
              <p className="stat-label">{stat.label}</p>
              <p className="stat-value">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Recent Activity */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2>Recent Activity</h2>
            <a href="#" className="view-all">View all →</a>
          </div>
          <div className="activity-list">
            {activities.map((activity) => (
              <div key={activity.id} className="activity-item">
                <div className="activity-icon">{activity.icon}</div>
                <div className="activity-content">
                  <div className="activity-title">{activity.title}</div>
                  <div className="activity-meta">
                    <span className="activity-type">{activity.type}</span>
                    <span className="activity-time">{activity.time}</span>
                  </div>
                </div>
                <div className={`activity-status status-${activity.status.toLowerCase().replace(' ', '-')}`}>
                  {activity.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="dashboard-card compact">
          <div className="card-header">
            <h2>Quick Stats</h2>
          </div>
          <div className="quick-stats">
            <div className="quick-stat">
              <span className="label">Avg Processing Time</span>
              <span className="value">14 days</span>
            </div>
            <div className="quick-stat">
              <span className="label">Compliance Rate</span>
              <span className="value">98%</span>
            </div>
            <div className="quick-stat">
              <span className="label">Cost Savings</span>
              <span className="value">$124K</span>
            </div>
            <div className="quick-stat">
              <span className="label">Open Tenders</span>
              <span className="value">8</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="dashboard-grid">
        {/* Upcoming */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2>Upcoming Deadlines</h2>
          </div>
          <div className="deadline-list">
            <div className="deadline-item urgent">
              <span className="deadline-date">Dec 25</span>
              <div>
                <p className="deadline-title">RFQ Submission Deadline</p>
                <p className="deadline-desc">Office Supplies</p>
              </div>
            </div>
            <div className="deadline-item">
              <span className="deadline-date">Dec 28</span>
              <div>
                <p className="deadline-title">Evaluation Meeting</p>
                <p className="deadline-desc">IT Equipment</p>
              </div>
            </div>
            <div className="deadline-item">
              <span className="deadline-date">Jan 5</span>
              <div>
                <p className="deadline-title">Award Announcement</p>
                <p className="deadline-desc">Transport Services</p>
              </div>
            </div>
          </div>
        </div>

        {/* My Tasks */}
        <div className="dashboard-card compact">
          <div className="card-header">
            <h2>My Tasks</h2>
            <a href="#" className="view-all">View all →</a>
          </div>
          <div className="task-list">
            <label className="task-item">
              <input type="checkbox" defaultChecked />
              <span>Review supplier qualifications</span>
            </label>
            <label className="task-item">
              <input type="checkbox" defaultChecked />
              <span>Approve budget allocation</span>
            </label>
            <label className="task-item">
              <input type="checkbox" />
              <span>Schedule evaluation meeting</span>
            </label>
            <label className="task-item">
              <input type="checkbox" />
              <span>Prepare tender documents</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

