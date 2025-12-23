import React, { useState, useEffect } from 'react';

const ResultsView = ({ procurementId, bids = [], onExport, onClose }) => {
  const [sortBy, setSortBy] = useState('weightedScore');
  const [selectedBid, setSelectedBid] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(false);

  // Mock evaluation data
  const mockEvaluations = [
    {
      bidId: 'bid-001',
      supplierName: 'TechSupply Inc',
      bidAmount: 150000,
      evaluations: [
        { evaluatorName: 'John Smith', quality: 9, price: 7, delivery: 8, experience: 9, notes: 'High quality materials, good track record' },
        { evaluatorName: 'Jane Doe', quality: 8, price: 8, delivery: 9, experience: 8, notes: 'Reliable delivery, responsive team' },
      ],
    },
    {
      bidId: 'bid-002',
      supplierName: 'GlobalTrade Ltd',
      bidAmount: 140000,
      evaluations: [
        { evaluatorName: 'John Smith', quality: 7, price: 9, delivery: 7, experience: 7, notes: 'Competitive price, adequate quality' },
        { evaluatorName: 'Jane Doe', quality: 6, price: 9, delivery: 6, experience: 6, notes: 'Lowest cost option, limited experience' },
      ],
    },
    {
      bidId: 'bid-003',
      supplierName: 'Premium Solutions',
      bidAmount: 175000,
      evaluations: [
        { evaluatorName: 'John Smith', quality: 6, price: 5, delivery: 5, experience: 7, notes: 'Premium offering, higher cost' },
        { evaluatorName: 'Jane Doe', quality: 7, price: 4, delivery: 6, experience: 8, notes: 'Good experience, premium pricing' },
      ],
    },
  ];

  const mockBids = [
    { id: 'bid-001', supplier: 'TechSupply Inc', amount: 150000, status: 'Evaluated' },
    { id: 'bid-002', supplier: 'GlobalTrade Ltd', amount: 140000, status: 'Evaluated' },
    { id: 'bid-003', supplier: 'Premium Solutions', amount: 175000, status: 'Evaluated' },
  ];

  const criteria = [
    { id: 'quality', label: 'Quality', weight: 30 },
    { id: 'price', label: 'Price', weight: 25 },
    { id: 'delivery', label: 'Delivery', weight: 25 },
    { id: 'experience', label: 'Experience', weight: 20 },
  ];

  useEffect(() => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setEvaluations(mockEvaluations);
      setLoading(false);
    }, 500);
  }, []);

  const calculateAverageScore = (evaluations, criterion) => {
    if (evaluations.length === 0) return 0;
    const sum = evaluations.reduce((acc, ev) => acc + (ev[criterion] || 0), 0);
    return (sum / evaluations.length).toFixed(1);
  };

  const calculateWeightedScore = (evaluation) => {
    let totalWeight = 0;
    let weightedSum = 0;

    criteria.forEach(criterion => {
      const avgScore = parseFloat(calculateAverageScore(evaluation.evaluations, criterion.id));
      const weight = criterion.weight || 0;
      weightedSum += avgScore * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? (weightedSum / totalWeight).toFixed(2) : 0;
  };

  const sortedEvaluations = [...evaluations].sort((a, b) => {
    switch (sortBy) {
      case 'weightedScore':
        return parseFloat(calculateWeightedScore(b)) - parseFloat(calculateWeightedScore(a));
      case 'bidAmount':
        return a.bidAmount - b.bidAmount;
      case 'supplierName':
        return a.supplierName.localeCompare(b.supplierName);
      default:
        return 0;
    }
  });

  const getScoreColor = (score) => {
    const numScore = parseFloat(score);
    if (numScore >= 8) return '#28a745';
    if (numScore >= 6) return '#ffc107';
    if (numScore >= 4) return '#fd7e14';
    return '#dc3545';
  };

  const topThreeBids = sortedEvaluations.slice(0, 3);
  const winnerBid = sortedEvaluations[0];

  const getScoreDistribution = () => {
    const distribution = { 'High (8-10)': 0, 'Medium (6-8)': 0, 'Low (4-6)': 0, 'Poor (<4)': 0 };
    evaluations.forEach(eval => {
      const score = parseFloat(calculateWeightedScore(eval));
      if (score >= 8) distribution['High (8-10)']++;
      else if (score >= 6) distribution['Medium (6-8)']++;
      else if (score >= 4) distribution['Low (4-6)']++;
      else distribution['Poor (<4)']++;
    });
    return distribution;
  };

  if (loading) {
    return <div style={styles.container}><p>Loading evaluation results...</p></div>;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Evaluation Results</h2>
          <p style={styles.subtitle}>Procurement ID: {procurementId} | Total Bids: {evaluations.length}</p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={() => onExport?.('pdf')} style={{ ...styles.button, ...styles.exportBtn }}>📥 Export PDF</button>
          <button onClick={() => onExport?.('csv')} style={{ ...styles.button, ...styles.exportBtn }}>📊 Export CSV</button>
          <button onClick={onClose} style={{ ...styles.button, ...styles.closeBtn }}>✕ Close</button>
        </div>
      </div>

      {/* Recommendation Banner */}
      {winnerBid && (
        <div style={styles.recommendationBanner}>
          <div style={styles.bannerContent}>
            <div style={styles.bannerText}>
              <h3 style={styles.bannerTitle}>🏆 Recommended Supplier</h3>
              <p style={styles.bannerDetail}>
                <strong>{winnerBid.supplierName}</strong> - Score: {calculateWeightedScore(winnerBid)}/10 | Bid Amount: ${winnerBid.bidAmount.toLocaleString()}
              </p>
              <p style={styles.bannerHint}>Highest weighted score across all evaluation criteria</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div style={styles.gridContainer}>
        {/* Left Column: Rankings */}
        <div style={styles.column}>
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>📊 Bid Rankings</h3>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={styles.sortSelect}>
                <option value="weightedScore">Sort by Score</option>
                <option value="bidAmount">Sort by Price</option>
                <option value="supplierName">Sort by Name</option>
              </select>
            </div>

            <div style={styles.rankingsList}>
              {sortedEvaluations.map((evaluation, index) => (
                <div
                  key={evaluation.bidId}
                  style={{
                    ...styles.rankingCard,
                    ...(selectedBid?.bidId === evaluation.bidId ? styles.rankingCardSelected : {}),
                    borderLeftColor: getScoreColor(calculateWeightedScore(evaluation)),
                  }}
                  onClick={() => setSelectedBid(evaluation)}
                >
                  <div style={styles.rankingRow}>
                    <div style={styles.rankBadge}>{index + 1}</div>
                    <div style={styles.rankingInfo}>
                      <h4 style={styles.supplierName}>{evaluation.supplierName}</h4>
                      <p style={styles.bidDetails}>${evaluation.bidAmount.toLocaleString()}</p>
                    </div>
                    <div style={{ ...styles.scoreCircle, backgroundColor: getScoreColor(calculateWeightedScore(evaluation)) }}>
                      {calculateWeightedScore(evaluation)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Score Distribution */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>📈 Score Distribution</h3>
            <div style={styles.distributionGrid}>
              {Object.entries(getScoreDistribution()).map(([label, count]) => (
                <div key={label} style={styles.distributionItem}>
                  <div style={styles.distLabel}>{label}</div>
                  <div style={styles.distBar}>
                    <div
                      style={{
                        width: `${(count / evaluations.length) * 100}%`,
                        height: '100%',
                        backgroundColor: label.includes('High') ? '#28a745' : label.includes('Medium') ? '#ffc107' : label.includes('Low') ? '#fd7e14' : '#dc3545',
                        borderRadius: '2px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                  <span style={styles.distCount}>{count} bid{count !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Details */}
        <div style={styles.column}>
          {selectedBid ? (
            <>
              {/* Selected Bid Details */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Selected Bid Details</h3>
                <div style={styles.bidDetailsPanel}>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Supplier:</span>
                    <span style={styles.detailValue}>{selectedBid.supplierName}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Bid Amount:</span>
                    <span style={styles.detailValue}>${selectedBid.bidAmount.toLocaleString()}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Weighted Score:</span>
                    <span style={{ ...styles.detailValue, ...styles.boldValue }}>
                      {calculateWeightedScore(selectedBid)}/10
                    </span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Number of Evaluators:</span>
                    <span style={styles.detailValue}>{selectedBid.evaluations.length}</span>
                  </div>
                </div>
              </div>

              {/* Criterion Breakdown */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Criterion Scores</h3>
                <div style={styles.criterionBreakdown}>
                  {criteria.map((criterion) => {
                    const avgScore = calculateAverageScore(selectedBid.evaluations, criterion.id);
                    return (
                      <div key={criterion.id} style={styles.criterionRow}>
                        <div style={styles.criterionName}>
                          {criterion.label}
                          <span style={styles.weightTag}>{criterion.weight}%</span>
                        </div>
                        <div style={styles.scoreBar}>
                          <div
                            style={{
                              width: `${(avgScore / 10) * 100}%`,
                              height: '100%',
                              backgroundColor: getScoreColor(avgScore),
                              borderRadius: '2px',
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                        <div style={{ ...styles.scoreValue, color: getScoreColor(avgScore) }}>
                          {avgScore}/10
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Evaluator Comments */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Evaluator Comments</h3>
                <div style={styles.commentsList}>
                  {selectedBid.evaluations.map((evaluation, idx) => (
                    <div key={idx} style={styles.commentCard}>
                      <div style={styles.commentHeader}>
                        <strong>{evaluation.evaluatorName}</strong>
                        <span style={styles.commentDate}>General Comments</span>
                      </div>
                      <p style={styles.commentText}>{evaluation.notes}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={styles.section}>
              <p style={styles.emptyState}>Select a bid from the rankings to view detailed evaluation results</p>
            </div>
          )}
        </div>
      </div>

      {/* Summary Footer */}
      <div style={styles.footer}>
        <div style={styles.footerStat}>
          <span style={styles.statLabel}>Total Bids Evaluated:</span>
          <span style={styles.statValue}>{evaluations.length}</span>
        </div>
        <div style={styles.footerStat}>
          <span style={styles.statLabel}>Average Score:</span>
          <span style={styles.statValue}>
            {(evaluations.reduce((sum, e) => sum + parseFloat(calculateWeightedScore(e)), 0) / evaluations.length).toFixed(2)}/10
          </span>
        </div>
        <div style={styles.footerStat}>
          <span style={styles.statLabel}>Price Range:</span>
          <span style={styles.statValue}>
            ${Math.min(...evaluations.map(e => e.bidAmount)).toLocaleString()} - ${Math.max(...evaluations.map(e => e.bidAmount)).toLocaleString()}
          </span>
        </div>
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
    minHeight: '600px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '2px solid #e9ecef',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#212529',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6c757d',
    margin: '0',
  },
  headerActions: {
    display: 'flex',
    gap: '8px',
  },
  recommendationBanner: {
    backgroundColor: '#d4edda',
    border: '1px solid #c3e6cb',
    borderRadius: '6px',
    padding: '16px',
    marginBottom: '24px',
  },
  bannerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#155724',
    margin: '0 0 4px 0',
  },
  bannerDetail: {
    fontSize: '14px',
    color: '#155724',
    margin: '0 0 4px 0',
  },
  bannerHint: {
    fontSize: '12px',
    color: '#1e7e34',
    margin: '0',
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginBottom: '24px',
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  section: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#212529',
    margin: '0',
  },
  sortSelect: {
    padding: '6px 10px',
    fontSize: '13px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  rankingsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  rankingCard: {
    backgroundColor: '#f8f9fa',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
    borderLeft: '4px solid #dee2e6',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  rankingCardSelected: {
    backgroundColor: '#e7f3ff',
    borderColor: '#007bff',
    boxShadow: '0 2px 8px rgba(0, 123, 255, 0.15)',
  },
  rankingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  rankBadge: {
    minWidth: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#007bff',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  rankingInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#212529',
    margin: '0 0 4px 0',
  },
  bidDetails: {
    fontSize: '12px',
    color: '#6c757d',
    margin: '0',
  },
  scoreCircle: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '16px',
  },
  distributionGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  distributionItem: {
    display: 'grid',
    gridTemplateColumns: '80px 1fr 50px',
    gap: '12px',
    alignItems: 'center',
  },
  distLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#495057',
  },
  distBar: {
    height: '20px',
    backgroundColor: '#e9ecef',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  distCount: {
    fontSize: '12px',
    color: '#6c757d',
    textAlign: 'right',
  },
  bidDetailsPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    paddingBottom: '8px',
    borderBottom: '1px solid #e9ecef',
  },
  detailLabel: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#495057',
  },
  detailValue: {
    fontSize: '13px',
    color: '#212529',
  },
  boldValue: {
    fontWeight: '600',
  },
  criterionBreakdown: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  criterionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  criterionName: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#495057',
    minWidth: '100px',
    display: 'flex',
    gap: '6px',
  },
  weightTag: {
    fontSize: '11px',
    backgroundColor: '#e9ecef',
    padding: '2px 6px',
    borderRadius: '3px',
    color: '#6c757d',
  },
  scoreBar: {
    flex: 1,
    height: '24px',
    backgroundColor: '#e9ecef',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  scoreValue: {
    fontSize: '13px',
    fontWeight: '600',
    minWidth: '45px',
    textAlign: 'right',
  },
  commentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  commentCard: {
    backgroundColor: '#f8f9fa',
    padding: '12px',
    borderRadius: '4px',
    border: '1px solid #e9ecef',
  },
  commentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '13px',
  },
  commentDate: {
    fontSize: '11px',
    color: '#6c757d',
  },
  commentText: {
    fontSize: '13px',
    color: '#495057',
    margin: '0',
    lineHeight: '1.4',
  },
  emptyState: {
    textAlign: 'center',
    color: '#6c757d',
    padding: '32px 0',
    margin: '0',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-around',
    padding: '16px',
    backgroundColor: 'white',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
  },
  footerStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  statLabel: {
    fontSize: '12px',
    color: '#6c757d',
    fontWeight: '500',
  },
  statValue: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#212529',
  },
  button: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '500',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  exportBtn: {
    backgroundColor: '#007bff',
    color: 'white',
  },
  closeBtn: {
    backgroundColor: '#6c757d',
    color: 'white',
  },
};

export default ResultsView;
