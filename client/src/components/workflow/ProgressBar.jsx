import React from 'react';

const ProgressBar = ({ 
  percentage = 0, 
  label = 'Progress',
  showLabel = true,
  showPercentage = true,
  animated = true,
  color = '#007bff',
  height = '30px',
  variant = 'primary'
}) => {
  // Determine color based on variant
  const getColor = () => {
    if (color && color.startsWith('#')) return color;
    
    const colorMap = {
      primary: '#007bff',
      success: '#28a745',
      warning: '#ffc107',
      danger: '#dc3545',
      info: '#17a2b8',
      dark: '#343a40',
    };
    return colorMap[variant] || colorMap.primary;
  };

  const barColor = getColor();
  const displayPercentage = Math.min(Math.max(percentage, 0), 100);

  // Determine status text based on percentage
  const getStatusText = () => {
    if (displayPercentage === 0) return 'Not Started';
    if (displayPercentage < 25) return 'In Progress';
    if (displayPercentage < 50) return 'Quarter Complete';
    if (displayPercentage < 75) return 'Half Complete';
    if (displayPercentage < 100) return 'Nearly Complete';
    return 'Completed';
  };

  return (
    <div style={styles.container}>
      {showLabel && (
        <div style={styles.labelContainer}>
          <div style={styles.label}>{label}</div>
          {showPercentage && (
            <div style={{...styles.percentage, color: barColor}}>
              {displayPercentage}%
            </div>
          )}
        </div>
      )}

      <div style={{
        ...styles.barContainer,
        height: height,
        backgroundColor: '#f0f0f0',
        borderRadius: '8px',
        overflow: 'hidden',
        border: `1px solid #ddd`,
      }}>
        <div
          style={{
            ...styles.bar,
            width: `${displayPercentage}%`,
            backgroundColor: barColor,
            height: '100%',
            transition: animated ? 'width 0.5s ease' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 'bold',
            animation: animated ? 'pulse 2s infinite' : 'none',
          }}
        >
          {displayPercentage > 10 && displayPercentage < 100 && (
            <span style={{ opacity: 0.8 }}>{displayPercentage}%</span>
          )}
        </div>
      </div>

      <div style={styles.statusContainer}>
        <span style={{...styles.status, color: barColor}}>
          {getStatusText()}
        </span>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

// Multi-stage progress bar for workflow
const MultiStageProgressBar = ({ 
  stages = [],
  currentStage = 0,
  height = '25px'
}) => {
  if (!stages.length) return null;

  const stageWidth = 100 / stages.length;

  return (
    <div style={styles.multiContainer}>
      <div style={{
        ...styles.multiBarContainer,
        height: height,
        display: 'flex',
        gap: '2px',
        backgroundColor: '#f0f0f0',
        borderRadius: '6px',
        padding: '2px',
        border: '1px solid #ddd',
      }}>
        {stages.map((stage, index) => (
          <div
            key={index}
            style={{
              flex: 1,
              height: '100%',
              backgroundColor: index <= currentStage ? stage.color || '#007bff' : '#e9ecef',
              borderRadius: '4px',
              transition: 'all 0.3s ease',
              position: 'relative',
            }}
            title={stage.label}
          >
            {index <= currentStage && (
              <div style={{
                ...styles.stageFill,
                animation: index === currentStage ? 'shimmer 2s infinite' : 'none',
              }} />
            )}
          </div>
        ))}
      </div>

      <div style={styles.stageLabels}>
        {stages.map((stage, index) => (
          <div key={index} style={{...styles.stageLabel, flex: 1}}>
            <small style={{
              fontSize: '11px',
              color: index <= currentStage ? '#007bff' : '#999',
              fontWeight: index === currentStage ? 'bold' : 'normal',
            }}>
              {stage.label}
            </small>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes shimmer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

// Circular progress indicator
const CircularProgressBar = ({ 
  percentage = 0, 
  size = 120,
  color = '#007bff',
  showText = true
}) => {
  const radius = (size / 2) - 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div style={{
      ...styles.circularContainer,
      width: size,
      height: size,
    }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e9ecef"
          strokeWidth="4"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>

      {showText && (
        <div style={{
          ...styles.circularText,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}>
          <div style={{ fontSize: size / 4, fontWeight: 'bold', color }}>
            {percentage}%
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    marginBottom: '20px',
  },
  labelContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
  },
  percentage: {
    fontSize: '14px',
    fontWeight: 'bold',
  },
  barContainer: {
    marginBottom: '8px',
    position: 'relative',
  },
  bar: {
    position: 'relative',
  },
  statusContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
  },
  status: {
    fontWeight: '500',
  },
  multiContainer: {
    marginBottom: '20px',
  },
  multiBarContainer: {
    marginBottom: '8px',
  },
  stageFill: {
    width: '100%',
    height: '100%',
    borderRadius: '4px',
  },
  stageLabels: {
    display: 'flex',
    gap: '2px',
  },
  stageLabel: {
    textAlign: 'center',
  },
  circularContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularText: {
    position: 'absolute',
    textAlign: 'center',
  },
};

export { MultiStageProgressBar, CircularProgressBar };
export default ProgressBar;
