/**
 * NineStepEvaluationPage Component
 * 
 * Implements the World Bank's 9-Step Evaluation Methodology for procurement evaluations.
 * This page guides evaluators through a structured process ensuring comprehensive 
 * and compliant bid evaluation.
 * 
 * Features:
 * - Step-by-step evaluation workflow
 * - Progress tracking and validation
 * - Automated compliance checks
 * - Consolidated scoring interface
 * - Evaluation report generation
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import StandardLayout from '../components/layout/StandardLayout';
import './pages.css';

const NineStepEvaluationPage = () => {
  const navigate = useNavigate();
  const { evaluationId } = useParams();
  const [searchParams] = useSearchParams();
  const rfqId = searchParams.get('rfqId');
  const { permissions } = usePermissions();
  
  // State management
  const [currentStep, setCurrentStep] = useState(1);
  const [evaluationData, setEvaluationData] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [stepData, setStepData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // 9-Step Evaluation Structure based on World Bank methodology
  const evaluationSteps = [
    {
      id: 1,
      title: "Preparation & Setup",
      description: "Setup evaluation criteria and team assignments",
      icon: "🔧",
      required: true
    },
    {
      id: 2,
      title: "Preliminary Examination",
      description: "Check submission completeness and basic requirements",
      icon: "📋",
      required: true
    },
    {
      id: 3,
      title: "Technical Evaluation",
      description: "Assess technical specifications and compliance",
      icon: "🔬",
      required: true
    },
    {
      id: 4,
      title: "Commercial Evaluation", 
      description: "Review commercial terms and pricing structure",
      icon: "💰",
      required: true
    },
    {
      id: 5,
      title: "Qualification Assessment",
      description: "Verify bidder qualifications and capacity",
      icon: "✅",
      required: true
    },
    {
      id: 6,
      title: "Scoring & Rating",
      description: "Apply weighted scoring matrix to all criteria",
      icon: "📊",
      required: true
    },
    {
      id: 7,
      title: "Consensus Building",
      description: "Resolve evaluator differences and build consensus",
      icon: "🤝",
      required: false
    },
    {
      id: 8,
      title: "Final Assessment",
      description: "Consolidate results and perform final checks",
      icon: "🏆",
      required: true
    },
    {
      id: 9,
      title: "Report Generation",
      description: "Generate evaluation report and recommendations",
      icon: "📄",
      required: true
    }
  ];

  useEffect(() => {
    loadEvaluationData();
  }, [evaluationId, rfqId]);

  const loadEvaluationData = async () => {
    try {
      setLoading(true);
      
      // Load evaluation data
      if (evaluationId) {
        const evalResponse = await fetch(`/api/evaluations/${evaluationId}`);
        const evalData = await evalResponse.json();
        setEvaluationData(evalData);
        setCurrentStep(evalData.currentStep || 1);
      }

      // Load submissions for the RFQ
      const submissionsResponse = await fetch(`/api/submissions?rfqId=${rfqId || evaluationData?.rfqId}`);
      const submissionsData = await submissionsResponse.json();
      setSubmissions(submissionsData.data || []);

    } catch (error) {
      console.error('Error loading evaluation data:', error);
      setErrors({ general: 'Failed to load evaluation data' });
    } finally {
      setLoading(false);
    }
  };

  const handleStepChange = (stepId) => {
    if (stepId <= currentStep + 1) {
      setCurrentStep(stepId);
    }
  };

  const handleStepComplete = async (stepId, data) => {
    try {
      setSaving(true);
      
      // Update step data
      const updatedStepData = { ...stepData, [stepId]: data };
      setStepData(updatedStepData);

      // Save progress to backend
      await fetch(`/api/evaluations/${evaluationId}/steps/${stepId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      // Move to next step if current step is completed
      if (stepId === currentStep && stepId < 9) {
        setCurrentStep(stepId + 1);
      }

    } catch (error) {
      console.error('Error saving step data:', error);
      setErrors({ [stepId]: 'Failed to save step data' });
    } finally {
      setSaving(false);
    }
  };

  const handleStartEvaluation = async () => {
    try {
      setSaving(true);
      
      const response = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rfqId: rfqId,
          title: 'Nine-Step Evaluation Process',
          evaluationType: 'combined',
          scoringMethod: 'weighted_scoring',
          maxScore: 100,
          criteria: [],
          evaluators: []
        })
      });

      const newEvaluation = await response.json();
      navigate(`/evaluations/nine-step/${newEvaluation.id}?rfqId=${rfqId}`);
      
    } catch (error) {
      console.error('Error creating evaluation:', error);
      setErrors({ general: 'Failed to create evaluation' });
    } finally {
      setSaving(false);
    }
  };

  const renderStepContent = () => {
    const step = evaluationSteps.find(s => s.id === currentStep);
    
    switch (currentStep) {
      case 1:
        return <PreparationStep 
          data={stepData[1]} 
          submissions={submissions}
          onComplete={(data) => handleStepComplete(1, data)}
          saving={saving}
        />;
      case 2:
        return <PreliminaryExaminationStep 
          data={stepData[2]}
          submissions={submissions}
          onComplete={(data) => handleStepComplete(2, data)}
          saving={saving}
        />;
      case 3:
        return <TechnicalEvaluationStep 
          data={stepData[3]}
          submissions={submissions}
          criteria={evaluationData?.criteria || []}
          onComplete={(data) => handleStepComplete(3, data)}
          saving={saving}
        />;
      case 4:
        return <CommercialEvaluationStep 
          data={stepData[4]}
          submissions={submissions}
          onComplete={(data) => handleStepComplete(4, data)}
          saving={saving}
        />;
      case 5:
        return <QualificationAssessmentStep 
          data={stepData[5]}
          submissions={submissions}
          onComplete={(data) => handleStepComplete(5, data)}
          saving={saving}
        />;
      case 6:
        return <ScoringRatingStep 
          data={stepData[6]}
          submissions={submissions}
          criteria={evaluationData?.criteria || []}
          stepResults={stepData}
          onComplete={(data) => handleStepComplete(6, data)}
          saving={saving}
        />;
      case 7:
        return <ConsensusBuildingStep 
          data={stepData[7]}
          submissions={submissions}
          evaluators={evaluationData?.evaluators || []}
          onComplete={(data) => handleStepComplete(7, data)}
          saving={saving}
        />;
      case 8:
        return <FinalAssessmentStep 
          data={stepData[8]}
          submissions={submissions}
          stepResults={stepData}
          onComplete={(data) => handleStepComplete(8, data)}
          saving={saving}
        />;
      case 9:
        return <ReportGenerationStep 
          data={stepData[9]}
          evaluationData={evaluationData}
          stepResults={stepData}
          submissions={submissions}
          onComplete={(data) => handleStepComplete(9, data)}
          saving={saving}
        />;
      default:
        return <div>Invalid step</div>;
    }
  };

  // If no evaluation ID, show start screen
  if (!evaluationId) {
    return (
      <StandardLayout
        title="🎯 9-Step Evaluation Process"
        description="World Bank compliant systematic evaluation methodology"
      >
        <div className="evaluation-start">
          <div className="start-card">
            <h2>Start New 9-Step Evaluation</h2>
            <p>Begin a comprehensive evaluation process following World Bank procurement guidelines.</p>
            
            <div className="steps-overview">
              <h3>Evaluation Process Overview</h3>
              <div className="steps-grid">
                {evaluationSteps.map((step, index) => (
                  <div key={step.id} className="step-preview">
                    <div className="step-number">{step.id}</div>
                    <div className="step-icon">{step.icon}</div>
                    <div className="step-info">
                      <h4>{step.title}</h4>
                      <p>{step.description}</p>
                      {step.required && <span className="required-badge">Required</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="start-actions">
              <button
                className="btn btn-primary btn-large"
                onClick={handleStartEvaluation}
                disabled={!rfqId || saving}
              >
                {saving ? 'Creating...' : 'Start Evaluation Process'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/evaluations')}
              >
                Back to Evaluations
              </button>
            </div>
          </div>
        </div>
      </StandardLayout>
    );
  }

  const headerActions = [
    {
      label: 'Save Progress',
      variant: 'secondary',
      onClick: () => handleStepComplete(currentStep, stepData[currentStep]),
      disabled: saving
    },
    {
      label: 'Export Report',
      variant: 'primary',
      onClick: () => navigate(`/evaluations/${evaluationId}/report`),
      disabled: currentStep < 9
    }
  ];

  return (
    <StandardLayout
      title="🎯 9-Step Evaluation Process"
      description={`Step ${currentStep} of 9: ${evaluationSteps.find(s => s.id === currentStep)?.title}`}
      headerActions={headerActions}
    >
      {loading ? (
        <div className="loading-state">
          <p>Loading evaluation data...</p>
        </div>
      ) : (
        <div className="nine-step-evaluation">
          {/* Progress Indicator */}
          <div className="evaluation-progress">
            <div className="steps-nav">
              {evaluationSteps.map((step) => (
                <div
                  key={step.id}
                  className={`step-nav-item ${
                    step.id === currentStep ? 'active' : 
                    step.id < currentStep ? 'completed' : 'pending'
                  }`}
                  onClick={() => handleStepChange(step.id)}
                >
                  <div className="step-nav-icon">{step.icon}</div>
                  <div className="step-nav-label">{step.title}</div>
                  <div className="step-nav-number">{step.id}</div>
                </div>
              ))}
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${((currentStep - 1) / 8) * 100}%` }}
              />
            </div>
          </div>

          {/* Step Content */}
          <div className="evaluation-content">
            {errors.general && (
              <div className="error-message">
                {errors.general}
              </div>
            )}
            
            {renderStepContent()}
          </div>

          {/* Navigation */}
          <div className="evaluation-navigation">
            <button
              className="btn btn-secondary"
              onClick={() => handleStepChange(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
            >
              ← Previous Step
            </button>
            
            <div className="step-info">
              Step {currentStep} of {evaluationSteps.length}
            </div>
            
            <button
              className="btn btn-primary"
              onClick={() => handleStepChange(Math.min(9, currentStep + 1))}
              disabled={currentStep === 9}
            >
              Next Step →
            </button>
          </div>
        </div>
      )}
    </StandardLayout>
  );
};

// Step Components (to be implemented)
const PreparationStep = ({ data, submissions, onComplete, saving }) => {
  const [formData, setFormData] = useState({
    evaluationTeam: [],
    criteria: [],
    weightings: {},
    timeline: {},
    ...data
  });

  return (
    <div className="evaluation-step">
      <h3>🔧 Step 1: Preparation & Setup</h3>
      <p>Configure the evaluation framework and assign responsibilities.</p>
      
      <div className="step-content">
        <div className="form-section">
          <h4>Evaluation Team</h4>
          <div className="team-setup">
            <p>Assign evaluators and define their roles for this procurement.</p>
            <div className="info-box">
              <p><strong>Submissions to Evaluate:</strong> {submissions.length}</p>
              <p><strong>Recommended Team Size:</strong> {Math.min(5, Math.max(3, Math.ceil(submissions.length / 2)))}</p>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h4>Evaluation Criteria</h4>
          <p>Define the technical and commercial evaluation criteria.</p>
          <div className="criteria-setup">
            {/* Criteria configuration form */}
            <p className="placeholder-text">Evaluation criteria configuration interface will be implemented here.</p>
          </div>
        </div>

        <div className="step-actions">
          <button 
            className="btn btn-primary"
            onClick={() => onComplete(formData)}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Complete Step 1'}
          </button>
        </div>
      </div>
    </div>
  );
};

const PreliminaryExaminationStep = ({ data, submissions, onComplete, saving }) => {
  return (
    <div className="evaluation-step">
      <h3>📋 Step 2: Preliminary Examination</h3>
      <p>Verify submission completeness and basic compliance requirements.</p>
      
      <div className="step-content">
        <div className="submissions-check">
          {submissions.map((submission, index) => (
            <div key={submission.id} className="submission-card">
              <h4>Submission {index + 1}: {submission.bidderName}</h4>
              <div className="compliance-checklist">
                <div className="check-item">
                  <input type="checkbox" id={`complete-${submission.id}`} />
                  <label htmlFor={`complete-${submission.id}`}>All required documents submitted</label>
                </div>
                <div className="check-item">
                  <input type="checkbox" id={`format-${submission.id}`} />
                  <label htmlFor={`format-${submission.id}`}>Submission format compliant</label>
                </div>
                <div className="check-item">
                  <input type="checkbox" id={`deadline-${submission.id}`} />
                  <label htmlFor={`deadline-${submission.id}`}>Submitted before deadline</label>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="step-actions">
          <button 
            className="btn btn-primary"
            onClick={() => onComplete({})}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Complete Step 2'}
          </button>
        </div>
      </div>
    </div>
  );
};

const TechnicalEvaluationStep = ({ data, submissions, criteria, onComplete, saving }) => {
  return (
    <div className="evaluation-step">
      <h3>🔬 Step 3: Technical Evaluation</h3>
      <p>Assess technical specifications and compliance with requirements.</p>
      
      <div className="step-content">
        <p className="placeholder-text">Technical evaluation interface will be implemented here.</p>
        
        <div className="step-actions">
          <button 
            className="btn btn-primary"
            onClick={() => onComplete({})}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Complete Step 3'}
          </button>
        </div>
      </div>
    </div>
  );
};

const CommercialEvaluationStep = ({ data, submissions, onComplete, saving }) => {
  return (
    <div className="evaluation-step">
      <h3>💰 Step 4: Commercial Evaluation</h3>
      <p>Review commercial terms, pricing, and financial proposals.</p>
      
      <div className="step-content">
        <p className="placeholder-text">Commercial evaluation interface will be implemented here.</p>
        
        <div className="step-actions">
          <button 
            className="btn btn-primary"
            onClick={() => onComplete({})}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Complete Step 4'}
          </button>
        </div>
      </div>
    </div>
  );
};

const QualificationAssessmentStep = ({ data, submissions, onComplete, saving }) => {
  return (
    <div className="evaluation-step">
      <h3>✅ Step 5: Qualification Assessment</h3>
      <p>Verify bidder qualifications, experience, and capacity.</p>
      
      <div className="step-content">
        <p className="placeholder-text">Qualification assessment interface will be implemented here.</p>
        
        <div className="step-actions">
          <button 
            className="btn btn-primary"
            onClick={() => onComplete({})}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Complete Step 5'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ScoringRatingStep = ({ data, submissions, criteria, stepResults, onComplete, saving }) => {
  return (
    <div className="evaluation-step">
      <h3>📊 Step 6: Scoring & Rating</h3>
      <p>Apply weighted scoring matrix to consolidate evaluation results.</p>
      
      <div className="step-content">
        <p className="placeholder-text">Scoring and rating interface will be implemented here.</p>
        
        <div className="step-actions">
          <button 
            className="btn btn-primary"
            onClick={() => onComplete({})}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Complete Step 6'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ConsensusBuildingStep = ({ data, submissions, evaluators, onComplete, saving }) => {
  return (
    <div className="evaluation-step">
      <h3>🤝 Step 7: Consensus Building</h3>
      <p>Resolve evaluator differences and build consensus on final rankings.</p>
      
      <div className="step-content">
        <p className="placeholder-text">Consensus building interface will be implemented here.</p>
        
        <div className="step-actions">
          <button 
            className="btn btn-primary"
            onClick={() => onComplete({})}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Complete Step 7'}
          </button>
        </div>
      </div>
    </div>
  );
};

const FinalAssessmentStep = ({ data, submissions, stepResults, onComplete, saving }) => {
  return (
    <div className="evaluation-step">
      <h3>🏆 Step 8: Final Assessment</h3>
      <p>Consolidate all evaluation results and perform final compliance checks.</p>
      
      <div className="step-content">
        <p className="placeholder-text">Final assessment interface will be implemented here.</p>
        
        <div className="step-actions">
          <button 
            className="btn btn-primary"
            onClick={() => onComplete({})}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Complete Step 8'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ReportGenerationStep = ({ data, evaluationData, stepResults, submissions, onComplete, saving }) => {
  return (
    <div className="evaluation-step">
      <h3>📄 Step 9: Report Generation</h3>
      <p>Generate comprehensive evaluation report and recommendations.</p>
      
      <div className="step-content">
        <div className="report-summary">
          <h4>Evaluation Summary</h4>
          <div className="summary-stats">
            <div className="stat-card">
              <div className="stat-value">{submissions.length}</div>
              <div className="stat-label">Submissions Evaluated</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{Object.keys(stepResults).length}</div>
              <div className="stat-label">Steps Completed</div>
            </div>
          </div>
        </div>

        <div className="report-actions">
          <button className="btn btn-secondary">Preview Report</button>
          <button className="btn btn-secondary">Download PDF</button>
        </div>

        <div className="step-actions">
          <button 
            className="btn btn-primary"
            onClick={() => onComplete({})}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Finalize Evaluation'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NineStepEvaluationPage;
