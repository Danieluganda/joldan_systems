import React from 'react';

const StepGate = ({ currentStep, onStepChange, blockingIssues = [] }) => {
  const steps = [
    { id: 'planning', label: 'Planning', icon: '📋', color: '#007bff' },
    { id: 'templates', label: 'Templates', icon: '📄', color: '#6f42c1' },
    { id: 'rfq', label: 'RFQ', icon: '📢', color: '#fd7e14' },
    { id: 'submission', label: 'Submission', icon: '📮', color: '#17a2b8' },
    { id: 'evaluation', label: 'Evaluation', icon: '⭐', color: '#ffc107' },
    { id: 'clarification', label: 'Clarification', icon: '❓', color: '#e83e8c' },
    { id: 'award', label: 'Award', icon: '🏆', color: '#28a745' },
    { id: 'contract', label: 'Contract', icon: '✅', color: '#20c997' },
    { id: 'completed', label: 'Completed', icon: '🎉', color: '#198754' }
  ];

  const currentIndex = steps.findIndex(s => s.id === currentStep);
  const isBlocked = blockingIssues.length > 0;

  const handleStepClick = (stepId) => {
    const stepIndex = steps.findIndex(s => s.id === stepId);
    if (stepIndex <= currentIndex && onStepChange) {
      onStepChange(stepId);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Workflow Gate System</h2>
        {isBlocked && (
          <div style={styles.blockedAlert}>
            ⚠️ {blockingIssues.length} blocking issue(s) preventing next step
          </div>
        )}
      </div>

      <div style={styles.stepsContainer}>
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = step.id === currentStep;
          const isNext = index === currentIndex + 1;
          const isLocked = index > currentIndex;

          return (
            <div key={step.id} style={styles.stepWrapper}>
              <div
                style={{
                  ...styles.stepGate,
                  backgroundColor: isCompleted ? '#28a745' :
                                   isCurrent ? step.color :
                                   isNext && isBlocked ? '#dc3545' :
                                   isNext ? '#ffc107' :
                                   isLocked ? '#e9ecef' : '#f8f9fa',
                  borderColor: isCurrent ? step.color : '#ddd',
                  opacity: isLocked ? 0.6 : 1,
                  cursor: !isLocked && onStepChange ? 'pointer' : 'default',
                }}
                onClick={() => handleStepClick(step.id)}
                title={isLocked ? 'Complete previous steps to unlock' : step.label}
              >
                <div style={styles.stepIcon}>{step.icon}</div>
                <div style={styles.stepLabel}>{step.label}</div>
                {isCurrent && <div style={styles.currentBadge}>Current</div>}
                {isCompleted && <div style={styles.completedCheck}>✓</div>}
              </div>

              {index < steps.length - 1 && (
                <div
                  style={{
                    ...styles.stepConnector,
                    backgroundColor: isCompleted ? '#28a745' : '#ddd',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      <div style={styles.footer}>
        <div style={styles.stats}>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Progress:</span>
            <span style={styles.statValue}>
              {currentIndex + 1} of {steps.length} steps
            </span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Status:</span>
            <span style={{
              ...styles.statValue,
              color: isBlocked ? '#dc3545' : currentIndex === steps.length - 1 ? '#28a745' : '#007bff'
            }}>
              {isBlocked ? 'Blocked' : currentIndex === steps.length - 1 ? 'Completed' : 'In Progress'}
            </span>
          </div>
        </div>
      </div>

      {blockingIssues.length > 0 && (
        <div style={styles.issuesPanel}>
          <div style={styles.issuesTitle}>Blocking Issues:</div>
          <ul style={styles.issuesList}>
            {blockingIssues.map((issue, idx) => (
              <li key={idx} style={styles.issueItem}>
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
  },
  header: {
    marginBottom: '20px',
  },
  title: {
    margin: '0 0 10px 0',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
  },
  blockedAlert: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '10px 15px',
    borderRadius: '4px',
    fontSize: '14px',
  },
  stepsContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    marginBottom: '20px',
    overflowX: 'auto',
    paddingBottom: '10px',
  },
  stepWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: '1',
    minWidth: '100px',
  },
  stepGate: {
    flex: 1,
    border: '2px solid',
    borderRadius: '8px',
    padding: '12px',
    textAlign: 'center',
    transition: 'all 0.3s ease',
    position: 'relative',
  },
  stepIcon: {
    fontSize: '24px',
    marginBottom: '5px',
  },
  stepLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#333',
  },
  currentBadge: {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    backgroundColor: '#007bff',
    color: '#fff',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: 'bold',
  },
  completedCheck: {
    position: 'absolute',
    top: '2px',
    right: '6px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  stepConnector: {
    width: '8px',
    height: '3px',
    borderRadius: '2px',
  },
  footer: {
    borderTop: '1px solid #eee',
    paddingTop: '15px',
  },
  stats: {
    display: 'flex',
    gap: '20px',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statLabel: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#666',
  },
  statValue: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#007bff',
  },
  issuesPanel: {
    marginTop: '15px',
    padding: '12px',
    backgroundColor: '#fff3cd',
    border: '1px solid #ffc107',
    borderRadius: '4px',
  },
  issuesTitle: {
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: '8px',
    fontSize: '13px',
  },
  issuesList: {
    margin: '0',
    paddingLeft: '20px',
    color: '#856404',
    fontSize: '13px',
  },
  issueItem: {
    marginBottom: '5px',
  },
};

export default StepGate;
