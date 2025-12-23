import React, { useState, useEffect } from 'react';

const TimelineView = ({ procurementId, onEventSelect }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterBy, setFilterBy] = useState('all');

  // Mock timeline events
  const mockEvents = [
    {
      id: 'evt-001',
      timestamp: '2025-12-15T09:00:00Z',
      category: 'planning',
      title: 'Procurement Initiated',
      description: 'Procurement request submitted by John Smith (Procurement Manager)',
      actor: 'John Smith',
      details: 'Initial procurement for IT equipment with estimated budget of $150,000',
    },
    {
      id: 'evt-002',
      timestamp: '2025-12-15T14:30:00Z',
      category: 'planning',
      title: 'Planning Documents Prepared',
      description: 'Procurement plan and schedule created',
      actor: 'Alice Johnson',
      details: 'Timeline set for 45-day procurement cycle',
    },
    {
      id: 'evt-003',
      timestamp: '2025-12-16T10:00:00Z',
      category: 'template',
      title: 'RFQ Template Finalized',
      description: 'Request for Quotation template approved',
      actor: 'Robert Chen',
      details: 'RFQ includes 12 technical specifications and evaluation criteria',
    },
    {
      id: 'evt-004',
      timestamp: '2025-12-17T08:00:00Z',
      category: 'approval',
      title: 'RFQ Approved by Finance',
      description: 'Finance department approves RFQ for distribution',
      actor: 'Sarah Williams',
      details: 'Budget allocation confirmed, no modifications required',
    },
    {
      id: 'evt-005',
      timestamp: '2025-12-18T09:00:00Z',
      category: 'rfq',
      title: 'RFQ Released to Market',
      description: 'RFQ distributed to 15 pre-qualified suppliers',
      actor: 'Michael Brown',
      details: 'Closing date: December 20, 2025 at 17:00 EAT',
    },
    {
      id: 'evt-006',
      timestamp: '2025-12-19T11:30:00Z',
      category: 'clarification',
      title: 'Supplier Clarification Received',
      description: 'TechSupply Inc requests clarification on specification',
      actor: 'TechSupply Inc',
      details: 'Question: "Can delivery be split into 3 shipments?" - Answered: Yes',
    },
    {
      id: 'evt-007',
      timestamp: '2025-12-20T16:45:00Z',
      category: 'submission',
      title: 'Bid Submission Deadline Passed',
      description: '12 bids received, 2 bids rejected for non-compliance',
      actor: 'Linda Davis',
      details: 'All compliant bids logged and secured for evaluation',
    },
    {
      id: 'evt-008',
      timestamp: '2025-12-21T08:00:00Z',
      category: 'evaluation',
      title: 'Evaluation Started',
      description: 'Evaluation committee begins scoring bids',
      actor: 'Evaluation Committee',
      details: '4 evaluators assigned, evaluation matrix deployed',
    },
    {
      id: 'evt-009',
      timestamp: '2025-12-21T14:00:00Z',
      category: 'evaluation',
      title: 'First Round Evaluation Complete',
      description: 'Initial scores entered for all criteria',
      actor: 'Evaluation Team',
      details: 'TechSupply Inc leading with 8.5/10 weighted score',
    },
    {
      id: 'evt-010',
      timestamp: '2025-12-21T16:30:00Z',
      category: 'approval',
      title: 'Evaluation Results Awaiting Review',
      description: 'Results pending director approval',
      actor: 'System',
      details: 'Awaiting approval from Director of Procurement',
    },
  ];

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setEvents(mockEvents);
      setLoading(false);
    }, 500);
  }, []);

  const getCategoryColor = (category) => {
    switch (category) {
      case 'planning':
        return '#6c757d';
      case 'template':
        return '#007bff';
      case 'rfq':
        return '#17a2b8';
      case 'clarification':
        return '#ffc107';
      case 'submission':
        return '#20c997';
      case 'evaluation':
        return '#fd7e14';
      case 'approval':
        return '#28a745';
      case 'award':
        return '#6f42c1';
      default:
        return '#e9ecef';
    }
  };

  const getCategoryLabel = (category) => {
    switch (category) {
      case 'planning':
        return '📋 Planning';
      case 'template':
        return '📄 Template';
      case 'rfq':
        return '📢 RFQ';
      case 'clarification':
        return '❓ Clarification';
      case 'submission':
        return '📮 Submission';
      case 'evaluation':
        return '⭐ Evaluation';
      case 'approval':
        return '✓ Approval';
      case 'award':
        return '🏆 Award';
      default:
        return '○ Event';
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const filteredEvents = filterBy === 'all' ? events : events.filter(e => e.category === filterBy);

  const categories = [
    ...new Set(events.map(e => e.category)),
  ];

  if (loading) {
    return <div style={styles.container}><p>Loading timeline...</p></div>;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Procurement Timeline</h2>
          <p style={styles.subtitle}>Procurement ID: {procurementId} • {events.length} events</p>
        </div>
      </div>

      {/* Filter */}
      <div style={styles.filterSection}>
        <span style={styles.filterLabel}>Filter by:</span>
        <div style={styles.filterButtons}>
          <button
            onClick={() => setFilterBy('all')}
            style={{
              ...styles.filterBtn,
              backgroundColor: filterBy === 'all' ? '#007bff' : '#e9ecef',
              color: filterBy === 'all' ? 'white' : '#495057',
            }}
          >
            All Events ({events.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterBy(cat)}
              style={{
                ...styles.filterBtn,
                backgroundColor: filterBy === cat ? getCategoryColor(cat) : '#e9ecef',
                color: filterBy === cat ? 'white' : '#495057',
              }}
            >
              {getCategoryLabel(cat)} ({events.filter(e => e.category === cat).length})
            </button>
          ))}
        </div>
      </div>

      {/* Statistics */}
      <div style={styles.statsGrid}>
        <div style={styles.statBox}>
          <span style={styles.statValue}>{events.length}</span>
          <span style={styles.statLabel}>Total Events</span>
        </div>
        <div style={styles.statBox}>
          <span style={styles.statValue}>{events.filter(e => e.category === 'approval').length}</span>
          <span style={styles.statLabel}>Approvals</span>
        </div>
        <div style={styles.statBox}>
          <span style={styles.statValue}>{events.filter(e => e.category === 'evaluation').length}</span>
          <span style={styles.statLabel}>Evaluations</span>
        </div>
        <div style={styles.statBox}>
          <span style={styles.statValue}>{events.filter(e => e.category === 'clarification').length}</span>
          <span style={styles.statLabel}>Clarifications</span>
        </div>
      </div>

      {/* Timeline */}
      <div style={styles.timeline}>
        {filteredEvents.map((event, index) => (
          <div key={event.id}>
            {/* Connector */}
            {index < filteredEvents.length - 1 && (
              <div
                style={{
                  ...styles.connector,
                  backgroundColor: getCategoryColor(event.category),
                }}
              />
            )}

            {/* Event */}
            <div
              style={{
                ...styles.timelineEvent,
                borderLeftColor: getCategoryColor(event.category),
              }}
              onClick={() => onEventSelect?.(event)}
            >
              {/* Dot */}
              <div
                style={{
                  ...styles.dot,
                  backgroundColor: getCategoryColor(event.category),
                }}
              />

              {/* Content */}
              <div style={styles.eventContent}>
                <div style={styles.eventHeader}>
                  <h4 style={styles.eventTitle}>{event.title}</h4>
                  <span
                    style={{
                      ...styles.categoryBadge,
                      backgroundColor: getCategoryColor(event.category),
                    }}
                  >
                    {getCategoryLabel(event.category)}
                  </span>
                </div>

                <p style={styles.eventDescription}>{event.description}</p>

                <p style={styles.eventTime}>
                  {formatDateTime(event.timestamp)}
                  <span style={styles.timeAgo}> • {formatTimeAgo(event.timestamp)}</span>
                </p>

                <div style={styles.eventFooter}>
                  <span style={styles.actor}>👤 {event.actor}</span>
                  <span style={styles.details}>{event.details}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredEvents.length === 0 && (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>No events found for the selected filter</p>
        </div>
      )}

      {/* Export Section */}
      <div style={styles.exportSection}>
        <button style={{ ...styles.exportBtn, backgroundColor: '#007bff' }}>📥 Export Timeline</button>
        <button style={{ ...styles.exportBtn, backgroundColor: '#28a745' }}>🖨️ Print Report</button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '24px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '2px solid #e9ecef',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#212529',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '13px',
    color: '#6c757d',
    margin: '0',
  },
  filterSection: {
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
    marginBottom: '24px',
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#495057',
  },
  filterButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  filterBtn: {
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '500',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '12px',
    marginBottom: '24px',
  },
  statBox: {
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  statValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#212529',
  },
  statLabel: {
    fontSize: '12px',
    color: '#6c757d',
  },
  timeline: {
    position: 'relative',
    marginBottom: '24px',
  },
  connector: {
    marginLeft: '20px',
    borderLeft: '3px solid #dee2e6',
    height: '20px',
  },
  timelineEvent: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
    borderLeft: '4px solid #dee2e6',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  dot: {
    minWidth: '32px',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    marginTop: '4px',
  },
  eventContent: {
    flex: 1,
  },
  eventHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
    gap: '12px',
  },
  eventTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#212529',
    margin: '0',
  },
  categoryBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    color: 'white',
    fontSize: '11px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  eventDescription: {
    fontSize: '13px',
    color: '#495057',
    margin: '0 0 8px 0',
    lineHeight: '1.4',
  },
  eventTime: {
    fontSize: '12px',
    color: '#6c757d',
    margin: '0 0 8px 0',
  },
  timeAgo: {
    fontSize: '11px',
    fontStyle: 'italic',
  },
  eventFooter: {
    display: 'flex',
    gap: '16px',
    fontSize: '12px',
    color: '#6c757d',
  },
  actor: {
    fontWeight: '500',
  },
  details: {
    flex: 1,
  },
  emptyState: {
    backgroundColor: 'white',
    padding: '32px',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
    textAlign: 'center',
    marginBottom: '24px',
  },
  emptyText: {
    color: '#6c757d',
    margin: '0',
  },
  exportSection: {
    display: 'flex',
    gap: '12px',
  },
  exportBtn: {
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: '600',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};

export default TimelineView;
