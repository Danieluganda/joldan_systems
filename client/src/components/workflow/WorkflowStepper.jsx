import React from 'react';

const WorkflowStepper = ({ 
  steps = [], 
  currentStep = 0, 
  onStepChange = null,
  orientation = 'horizontal',
  showLabels = true,
  completedSteps = []
}) => {
  // Default steps if none provided
  const defaultSteps = [
    { id: 1, label: 'Planning', description: 'Define scope' },
    { id: 2, label: 'Templates', description: 'Create templates' },
    { id: 3, label: 'RFQ', description: 'Publish RFQ' },
    { id: 4, label: 'Submission', description: 'Receive bids' },
    { id: 5, label: 'Evaluation', description: 'Evaluate bids' },
    { id: 6, label: 'Award', description: 'Make decision' },
    { id: 7, label: 'Contract', description: 'Execute contract' },
    { id: 8, label: 'Completed', description: 'Close process' },
  ];

  const displaySteps = steps.length ? steps : defaultSteps;
  const isVertical = orientation === 'vertical';

  return (
    <div style={{
      ...styles.container,
      flexDirection: isVertical ? 'column' : 'row',
    }}>
      {displaySteps.map((step, index) => {
        const isCompleted = completedSteps.includes(step.id) || index < currentStep;
        const isCurrent = index === currentStep;
        const isUpcoming = index > currentStep;

        return (
          <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            {/* Step Circle */}
            <div
              style={{
                ...styles.stepCircle,
                backgroundColor: isCompleted ? '#28a745' : isCurrent ? '#007bff' : '#e9ecef',
                color: (isCompleted || isCurrent) ? '#fff' : '#666',
                cursor: isCurrent && onStepChange ? 'pointer' : 'default',
                boxShadow: isCurrent ? '0 0 0 4px rgba(0, 123, 255, 0.25)' : 'none',
                transform: isCurrent ? 'scale(1.1)' : 'scale(1)',
                transition: 'all 0.3s ease',
              }}
              onClick={() => isCurrent && onStepChange && onStepChange(step.id)}
              title={step.label}
            >
              {isCompleted ? '✓' : index + 1}
            </div>

            {/* Step Info */}
            {showLabels && (
              <div style={{
                ...styles.stepInfo,
                marginLeft: isVertical ? '15px' : '10px',
                marginTop: isVertical ? '0' : '45px',
              }}>
                <div style={{
                  ...styles.stepLabel,
                  color: isCurrent ? '#007bff' : isCompleted ? '#28a745' : '#666',
                  fontWeight: isCurrent ? 'bold' : 'normal',
                }}>
                  {step.label}
                </div>
                {step.description && (
                  <div style={styles.stepDescription}>
                    {step.description}
                  </div>
                )}
              </div>
            )}

            {/* Connector Line */}
            {index < displaySteps.length - 1 && (
              <div
                style={{
                  ...styles.connector,
                  ...(isVertical ? styles.connectorVertical : styles.connectorHorizontal),
                  backgroundColor: isCompleted ? '#28a745' : '#ddd',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '5px',
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #ddd',
  },
  stepCircle: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '16px',
    minWidth: '40px',
    position: 'relative',
    zIndex: 2,
  },
  stepInfo: {
    minWidth: '80px',
  },
  stepLabel: {
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '2px',
  },
  stepDescription: {
    fontSize: '11px',
    color: '#999',
    marginTop: '2px',
  },
  connector: {
    position: 'absolute',
    zIndex: 1,
  },
  connectorHorizontal: {
    width: '100%',
    height: '2px',
    top: '20px',
    left: '40px',
  },
  connectorVertical: {
    width: '2px',
    height: '60px',
    left: '20px',
    top: '40px',
  },
};

export default WorkflowStepper;
