import React, { useState, useEffect } from 'react';

const ScoringForm = ({ bidId, criteria = [], onSubmit, onCancel, currentScores = null, readOnly = false }) => {
  const [scores, setScores] = useState({});
  const [notes, setNotes] = useState({});
  const [evaluatorName, setEvaluatorName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Mock criteria if not provided
  const defaultCriteria = [
    { id: 'quality', label: 'Quality', description: 'Product/service quality and specifications compliance', weight: 30 },
    { id: 'price', label: 'Price Competitiveness', description: 'Cost-effectiveness and value for money', weight: 25 },
    { id: 'delivery', label: 'Delivery Timeline', description: 'Ability to meet delivery schedules', weight: 25 },
    { id: 'experience', label: 'Experience & Capacity', description: 'Supplier track record and capabilities', weight: 20 },
  ];

  const activeCriteria = criteria.length > 0 ? criteria : defaultCriteria;

  useEffect(() => {
    if (currentScores) {
      setScores(currentScores.scores || {});
      setNotes(currentScores.notes || {});
      setEvaluatorName(currentScores.evaluatorName || '');
    } else {
      const initialScores = {};
      const initialNotes = {};
      activeCriteria.forEach(c => {
        initialScores[c.id] = 5;
        initialNotes[c.id] = '';
      });
      setScores(initialScores);
      setNotes(initialNotes);
    }
  }, [currentScores, activeCriteria]);

  const handleScoreChange = (criterionId, value) => {
    const numValue = Math.max(0, Math.min(10, parseInt(value) || 0));
    setScores(prev => ({ ...prev, [criterionId]: numValue }));
  };

  const handleNotesChange = (criterionId, value) => {
    setNotes(prev => ({ ...prev, [criterionId]: value }));
  };

  const calculateWeightedScore = () => {
    let totalWeight = 0;
    let weightedSum = 0;

    activeCriteria.forEach(criterion => {
      const score = scores[criterion.id] || 0;
      const weight = criterion.weight || 0;
      weightedSum += score * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? (weightedSum / totalWeight).toFixed(2) : 0;
  };

  const validateForm = () => {
    if (!evaluatorName.trim()) {
      setError('Evaluator name is required');
      return false;
    }

    for (let criterion of activeCriteria) {
      if (scores[criterion.id] === undefined || scores[criterion.id] === null) {
        setError(`Score for ${criterion.label} is required`);
        return false;
      }
      if (notes[criterion.id].trim().length < 10) {
        setError(`Notes for ${criterion.label} must be at least 10 characters`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const scoreData = {
        bidId,
        evaluatorName,
        scores,
        notes,
        weightedScore: calculateWeightedScore(),
        submittedAt: new Date().toISOString(),
      };

      // Mock API call - replace with actual endpoint
      console.log('Submitting scores:', scoreData);
      
      if (onSubmit) {
        await onSubmit(scoreData);
      }
    } catch (err) {
      setError('Failed to submit scores. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 8) return '#28a745'; // green
    if (score >= 6) return '#ffc107'; // yellow
    if (score >= 4) return '#fd7e14'; // orange
    return '#dc3545'; // red
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Bid Evaluation Scoring Form</h2>
        <p style={styles.subtitle}>Bid ID: {bidId}</p>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Evaluator Info */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Evaluator Information</h3>
          <div style={styles.formGroup}>
            <label style={styles.label}>Evaluator Name *</label>
            <input
              type="text"
              value={evaluatorName}
              onChange={(e) => setEvaluatorName(e.target.value)}
              disabled={readOnly}
              style={styles.input}
              placeholder="Enter your name"
              required
            />
          </div>
        </div>

        {/* Scoring Section */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Criterion Scoring</h3>
          <p style={styles.sectionHint}>Rate each criterion from 0-10. Total weight: {activeCriteria.reduce((sum, c) => sum + (c.weight || 0), 0)}%</p>

          {activeCriteria.map((criterion) => (
            <div key={criterion.id} style={styles.criterionCard}>
              <div style={styles.criterionHeader}>
                <div>
                  <h4 style={styles.criterionLabel}>
                    {criterion.label}
                    <span style={styles.weightBadge}>{criterion.weight}%</span>
                  </h4>
                  <p style={styles.criterionDesc}>{criterion.description}</p>
                </div>
              </div>

              <div style={styles.criterionContent}>
                {/* Score Input */}
                <div style={styles.scoreControl}>
                  <div style={styles.scoreInputWrapper}>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={scores[criterion.id] || 0}
                      onChange={(e) => handleScoreChange(criterion.id, e.target.value)}
                      disabled={readOnly}
                      style={{...styles.slider, borderColor: getScoreColor(scores[criterion.id] || 0)}}
                    />
                    <div style={{...styles.scoreDisplay, backgroundColor: getScoreColor(scores[criterion.id] || 0)}}>
                      {scores[criterion.id]}/10
                    </div>
                  </div>
                  <p style={styles.scoreHint}>Drag slider or click to set score</p>
                </div>

                {/* Notes */}
                <div style={styles.notesControl}>
                  <label style={styles.label}>Evaluation Notes *</label>
                  <textarea
                    value={notes[criterion.id] || ''}
                    onChange={(e) => handleNotesChange(criterion.id, e.target.value)}
                    disabled={readOnly}
                    style={styles.textarea}
                    placeholder="Explain your score and key observations..."
                    rows="3"
                  />
                  <p style={styles.charCount}>
                    {(notes[criterion.id] || '').length}/100 characters
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Scoring Summary</h3>
          <div style={styles.summaryGrid}>
            {activeCriteria.map((criterion) => (
              <div key={criterion.id} style={styles.summaryItem}>
                <span style={styles.summaryLabel}>{criterion.label}</span>
                <div style={{...styles.summaryScore, backgroundColor: getScoreColor(scores[criterion.id] || 0)}}>
                  {scores[criterion.id]}/10
                </div>
              </div>
            ))}
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Weighted Score</span>
              <div style={{...styles.summaryScore, backgroundColor: '#007bff', fontSize: '18px', fontWeight: 'bold'}}>
                {calculateWeightedScore()}
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div style={styles.errorAlert}>
            ⚠️ {error}
          </div>
        )}

        {/* Action Buttons */}
        {!readOnly && (
          <div style={styles.buttonGroup}>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{...styles.button, ...styles.submitButton}}
            >
              {isSubmitting ? '⏳ Submitting...' : '✓ Submit Scores'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              style={{...styles.button, ...styles.cancelButton}}
            >
              ✕ Cancel
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '24px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    marginBottom: '32px',
    borderBottom: '2px solid #e9ecef',
    paddingBottom: '16px',
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
  form: {
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
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#212529',
    margin: '0 0 8px 0',
    paddingBottom: '12px',
    borderBottom: '1px solid #e9ecef',
  },
  sectionHint: {
    fontSize: '13px',
    color: '#6c757d',
    margin: '8px 0 16px 0',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#495057',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease-in-out',
  },
  criterionCard: {
    backgroundColor: '#f8f9fa',
    padding: '16px',
    borderRadius: '6px',
    marginBottom: '16px',
    border: '1px solid #e9ecef',
  },
  criterionHeader: {
    marginBottom: '16px',
  },
  criterionLabel: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#212529',
    margin: '0 0 4px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  weightBadge: {
    fontSize: '12px',
    backgroundColor: '#007bff',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '12px',
    fontWeight: 'normal',
  },
  criterionDesc: {
    fontSize: '13px',
    color: '#6c757d',
    margin: '0',
  },
  criterionContent: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
  },
  scoreControl: {
    flex: '0 1 200px',
  },
  scoreInputWrapper: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    marginBottom: '8px',
  },
  slider: {
    flex: 1,
    height: '6px',
    borderRadius: '3px',
    outline: 'none',
    cursor: 'pointer',
    accentColor: '#007bff',
  },
  scoreDisplay: {
    minWidth: '50px',
    padding: '6px 8px',
    borderRadius: '4px',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '14px',
    textAlign: 'center',
  },
  scoreHint: {
    fontSize: '12px',
    color: '#6c757d',
    margin: '0',
  },
  notesControl: {
    flex: '1 1 400px',
    minWidth: '300px',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontFamily: 'inherit',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  charCount: {
    fontSize: '12px',
    color: '#6c757d',
    margin: '4px 0 0 0',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '12px',
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  summaryLabel: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#495057',
  },
  summaryScore: {
    padding: '12px 8px',
    borderRadius: '4px',
    color: 'white',
    fontWeight: '600',
    fontSize: '16px',
    textAlign: 'center',
  },
  errorAlert: {
    padding: '12px 16px',
    backgroundColor: '#f8d7da',
    border: '1px solid #f5c6cb',
    borderRadius: '4px',
    color: '#721c24',
    fontSize: '14px',
    marginTop: '16px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  button: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '500',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
  },
  submitButton: {
    backgroundColor: '#28a745',
    color: 'white',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    color: 'white',
  },
};

export default ScoringForm;
