import React, { useState } from 'react';

const EvaluationTable = ({ 
  bids = [],
  criteria = [],
  evaluators = [],
  onBidSelect = null,
  onScoreUpdate = null,
  readOnly = false
}) => {
  const [selectedBid, setSelectedBid] = useState(null);
  const [expandedBid, setExpandedBid] = useState(null);
  const [sortBy, setSortBy] = useState('score'); // 'score', 'name', 'price'

  // Mock bids if none provided
  const mockBids = [
    {
      id: 1,
      supplierName: 'Supplier A Corp',
      bidAmount: 150000,
      deliveryDays: 30,
      quality: { evaluator: 'John', score: 9, notes: 'Excellent quality certifications' },
      price: { evaluator: 'Jane', score: 8, notes: 'Competitive pricing' },
      delivery: { evaluator: 'Mark', score: 7, notes: 'Standard delivery timeline' },
      experience: { evaluator: 'Sarah', score: 9, notes: 'Strong track record' },
      status: 'under_review'
    },
    {
      id: 2,
      supplierName: 'Global Supplies Inc',
      bidAmount: 135000,
      deliveryDays: 20,
      quality: { evaluator: 'John', score: 8, notes: 'Good quality' },
      price: { evaluator: 'Jane', score: 9, notes: 'Best price offer' },
      delivery: { evaluator: 'Mark', score: 9, notes: 'Express delivery' },
      experience: { evaluator: 'Sarah', score: 7, notes: 'Moderate experience' },
      status: 'under_review'
    },
    {
      id: 3,
      supplierName: 'Premium Solutions Ltd',
      bidAmount: 180000,
      deliveryDays: 15,
      quality: { evaluator: 'John', score: 10, notes: 'Premium quality' },
      price: { evaluator: 'Jane', score: 6, notes: 'Premium pricing' },
      delivery: { evaluator: 'Mark', score: 10, notes: 'Fastest delivery' },
      experience: { evaluator: 'Sarah', score: 10, notes: 'Excellent track record' },
      status: 'completed'
    }
  ];

  const displayBids = bids.length ? bids : mockBids;
  const evaluationCriteria = criteria.length ? criteria : [
    { name: 'quality', label: 'Quality', weight: 30 },
    { name: 'price', label: 'Price', weight: 25 },
    { name: 'delivery', label: 'Delivery', weight: 25 },
    { name: 'experience', label: 'Experience', weight: 20 }
  ];

  // Calculate weighted scores
  const calculateWeightedScore = (bid) => {
    let totalScore = 0;
    let totalWeight = 0;

    evaluationCriteria.forEach(criterion => {
      const bidCriterion = bid[criterion.name];
      if (bidCriterion && bidCriterion.score) {
        totalScore += bidCriterion.score * criterion.weight;
        totalWeight += criterion.weight;
      }
    });

    return totalWeight > 0 ? (totalScore / totalWeight).toFixed(2) : 0;
  };

  // Sort bids
  const sortedBids = [...displayBids].sort((a, b) => {
    if (sortBy === 'score') {
      return parseFloat(calculateWeightedScore(b)) - parseFloat(calculateWeightedScore(a));
    } else if (sortBy === 'name') {
      return a.supplierName.localeCompare(b.supplierName);
    } else if (sortBy === 'price') {
      return a.bidAmount - b.bidAmount;
    }
    return 0;
  });

  const handleBidSelect = (bid) => {
    setSelectedBid(bid.id);
    if (onBidSelect) onBidSelect(bid);
  };

  const getStatusColor = (status) => {
    const colors = {
      under_review: '#ffc107',
      completed: '#28a745',
      rejected: '#dc3545',
      draft: '#6c757d',
    };
    return colors[status] || '#6c757d';
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>📊 Evaluation Table</h3>
        <div style={styles.controls}>
          <label style={styles.label}>
            Sort by:
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={styles.select}
            >
              <option value="score">Weighted Score</option>
              <option value="name">Supplier Name</option>
              <option value="price">Bid Amount</option>
            </select>
          </label>
          <span style={styles.countBadge}>{sortedBids.length} bids</span>
        </div>
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              <th style={{...styles.th, flex: 2}}>Supplier Name</th>
              <th style={{...styles.th, flex: 1}}>Bid Amount</th>
              {evaluationCriteria.map(criterion => (
                <th key={criterion.name} style={{...styles.th, flex: 1}}>
                  {criterion.label}
                  <br />
                  <small style={styles.weight}>({criterion.weight}%)</small>
                </th>
              ))}
              <th style={{...styles.th, flex: 1.2}}>Weighted Score</th>
              <th style={{...styles.th, flex: 1}}>Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedBids.map((bid, idx) => {
              const isSelected = selectedBid === bid.id;
              const isExpanded = expandedBid === bid.id;
              const weightedScore = calculateWeightedScore(bid);

              return (
                <React.Fragment key={bid.id}>
                  <tr
                    style={{
                      ...styles.row,
                      backgroundColor: isSelected ? '#e7f3ff' : idx % 2 === 0 ? '#f9f9f9' : '#fff',
                      borderLeft: isSelected ? '4px solid #007bff' : 'none',
                    }}
                    onClick={() => handleBidSelect(bid)}
                  >
                    <td style={{...styles.td, flex: 2, fontWeight: 500}}>
                      {bid.supplierName}
                    </td>
                    <td style={{...styles.td, flex: 1}}>
                      ${bid.bidAmount.toLocaleString()}
                    </td>
                    {evaluationCriteria.map(criterion => {
                      const score = bid[criterion.name];
                      return (
                        <td
                          key={criterion.name}
                          style={{
                            ...styles.td,
                            flex: 1,
                            backgroundColor: score ? getScoreColor(score.score) : 'transparent',
                            fontWeight: 'bold',
                            color: score && score.score >= 8 ? '#fff' : '#333',
                          }}
                        >
                          {score ? score.score : '-'}
                        </td>
                      );
                    })}
                    <td style={{...styles.td, flex: 1.2}}>
                      <span
                        style={{
                          ...styles.scoreBadge,
                          backgroundColor: getScoreBgColor(parseFloat(weightedScore)),
                        }}
                      >
                        {weightedScore}
                      </span>
                    </td>
                    <td style={{...styles.td, flex: 1}}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          backgroundColor: getStatusColor(bid.status),
                        }}
                      >
                        {bid.status === 'under_review' ? '⏱ Reviewing' :
                         bid.status === 'completed' ? '✓ Complete' :
                         bid.status === 'rejected' ? '✕ Rejected' : 'Draft'}
                      </span>
                    </td>
                  </tr>

                  {/* Expandable Details */}
                  {isExpanded && (
                    <tr style={styles.expandedRow}>
                      <td colSpan="100%" style={styles.expandedCell}>
                        <div style={styles.detailsPanel}>
                          <div style={styles.detailsGrid}>
                            {evaluationCriteria.map(criterion => {
                              const score = bid[criterion.name];
                              return (
                                <div key={criterion.name} style={styles.detailsItem}>
                                  <div style={styles.detailsLabel}>
                                    {criterion.label} ({criterion.weight}%)
                                  </div>
                                  <div style={styles.detailsContent}>
                                    <div style={styles.scoreDisplay}>
                                      <span style={styles.scoreValue}>{score?.score || '-'}</span>
                                      <span style={styles.scoreMax}>/10</span>
                                    </div>
                                    <div style={styles.evaluatorInfo}>
                                      <small>By: {score?.evaluator}</small>
                                    </div>
                                    <div style={styles.notesInfo}>
                                      <small><strong>Notes:</strong> {score?.notes || 'No notes'}</small>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div style={styles.detailsFooter}>
                            <div style={styles.bidInfo}>
                              <span>Delivery: {bid.deliveryDays} days</span>
                            </div>
                            <button
                              style={styles.closeBtn}
                              onClick={() => setExpandedBid(null)}
                            >
                              Hide Details
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Toggle Details Button */}
                  {isSelected && (
                    <tr style={styles.actionRow}>
                      <td colSpan="100%">
                        <button
                          style={styles.toggleDetailsBtn}
                          onClick={() => setExpandedBid(isExpanded ? null : bid.id)}
                        >
                          {isExpanded ? '▼ Hide Evaluation Details' : '▶ Show Evaluation Details'}
                        </button>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div style={styles.summary}>
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>Highest Score:</span>
          <span style={styles.summaryValue}>
            {Math.max(...sortedBids.map(b => parseFloat(calculateWeightedScore(b))))}
          </span>
        </div>
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>Lowest Price:</span>
          <span style={styles.summaryValue}>
            ${Math.min(...sortedBids.map(b => b.bidAmount)).toLocaleString()}
          </span>
        </div>
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>Avg Score:</span>
          <span style={styles.summaryValue}>
            {(sortedBids.reduce((sum, b) => sum + parseFloat(calculateWeightedScore(b)), 0) / sortedBids.length).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};

const getScoreColor = (score) => {
  if (score >= 9) return '#d4edda'; // Green
  if (score >= 7) return '#cfe2ff'; // Blue
  if (score >= 5) return '#fff3cd'; // Yellow
  return '#f8d7da'; // Red
};

const getScoreBgColor = (score) => {
  if (score >= 9) return '#28a745';
  if (score >= 8) return '#17a2b8';
  if (score >= 7) return '#007bff';
  if (score >= 5) return '#ffc107';
  return '#dc3545';
};

const styles = {
  container: {
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  header: {
    padding: '15px 20px',
    backgroundColor: '#f9f9f9',
    borderBottom: '1px solid #ddd',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    fontWeight: '500',
  },
  select: {
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '12px',
    cursor: 'pointer',
  },
  countBadge: {
    backgroundColor: '#e9ecef',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#666',
    fontWeight: '500',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  headerRow: {
    backgroundColor: '#f5f5f5',
    borderBottom: '2px solid #ddd',
  },
  th: {
    padding: '12px 10px',
    textAlign: 'left',
    fontWeight: 'bold',
    color: '#666',
    borderRight: '1px solid #eee',
  },
  weight: {
    fontSize: '10px',
    color: '#999',
    fontWeight: 'normal',
  },
  row: {
    borderBottom: '1px solid #eee',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '12px 10px',
    borderRight: '1px solid #eee',
    display: 'flex',
    alignItems: 'center',
  },
  scoreBadge: {
    color: '#fff',
    padding: '4px 8px',
    borderRadius: '4px',
    fontWeight: 'bold',
    fontSize: '12px',
  },
  statusBadge: {
    color: '#fff',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '500',
  },
  expandedRow: {
    backgroundColor: '#f0f8ff',
  },
  expandedCell: {
    padding: '0',
  },
  detailsPanel: {
    padding: '15px',
    backgroundColor: '#f9f9f9',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '15px',
  },
  detailsItem: {
    backgroundColor: '#fff',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #eee',
  },
  detailsLabel: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px',
    fontSize: '12px',
  },
  detailsContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  scoreDisplay: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '4px',
  },
  scoreValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#007bff',
  },
  scoreMax: {
    fontSize: '12px',
    color: '#999',
  },
  evaluatorInfo: {
    color: '#666',
    fontSize: '11px',
  },
  notesInfo: {
    color: '#666',
    fontSize: '11px',
    fontStyle: 'italic',
  },
  detailsFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '10px',
    borderTop: '1px solid #eee',
  },
  bidInfo: {
    fontSize: '12px',
    color: '#666',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#007bff',
    cursor: 'pointer',
    fontSize: '12px',
    textDecoration: 'underline',
  },
  actionRow: {
    backgroundColor: '#e7f3ff',
  },
  toggleDetailsBtn: {
    background: 'none',
    border: 'none',
    color: '#007bff',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '8px',
    textDecoration: 'underline',
    width: '100%',
    textAlign: 'left',
  },
  summary: {
    display: 'flex',
    gap: '20px',
    padding: '15px 20px',
    backgroundColor: '#f9f9f9',
    borderTop: '1px solid #ddd',
    fontSize: '12px',
  },
  summaryItem: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  summaryLabel: {
    fontWeight: '500',
    color: '#666',
  },
  summaryValue: {
    color: '#007bff',
    fontWeight: 'bold',
  },
};

export default EvaluationTable;
