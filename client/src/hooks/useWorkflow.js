import { useState, useCallback, useEffect } from 'react';

export const useWorkflow = (procurementId = null) => {
  const [currentStep, setCurrentStep] = useState('planning');
  const [steps, setSteps] = useState([]);
  const [transitions, setTransitions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [blockingIssues, setBlockingIssues] = useState([]);

  // Define workflow steps
  const WORKFLOW_STEPS = [
    { id: 'planning', label: 'Planning', description: 'Define procurement scope', order: 1 },
    { id: 'templates', label: 'Templates', description: 'Prepare RFQ/TOR templates', order: 2 },
    { id: 'rfq', label: 'RFQ', description: 'Create and publish RFQ', order: 3 },
    { id: 'submission', label: 'Submission', description: 'Receive supplier bids', order: 4 },
    { id: 'evaluation', label: 'Evaluation', description: 'Evaluate submissions', order: 5 },
    { id: 'clarification', label: 'Clarification', description: 'Q&A with suppliers', order: 6 },
    { id: 'award', label: 'Award', description: 'Make award decision', order: 7 },
    { id: 'contract', label: 'Contract', description: 'Execute contract', order: 8 },
    { id: 'completed', label: 'Completed', description: 'Procurement complete', order: 9 }
  ];

  // Fetch workflow
  const fetchWorkflow = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/procurements/${id}/workflow`);
      if (!response.ok) throw new Error('Failed to fetch workflow');
      const data = await response.json();
      setCurrentStep(data.currentStep || 'planning');
      setSteps(WORKFLOW_STEPS);
      setTransitions(data.transitions || []);
      setBlockingIssues(data.blockingIssues || []);
    } catch (err) {
      setError(err.message);
      setSteps(WORKFLOW_STEPS);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get allowed next steps
  const getAllowedNextSteps = useCallback((fromStep) => {
    const stepIndex = WORKFLOW_STEPS.findIndex(s => s.id === fromStep);
    if (stepIndex === -1 || stepIndex === WORKFLOW_STEPS.length - 1) return [];
    return [WORKFLOW_STEPS[stepIndex + 1]];
  }, []);

  // Check if step can be transitioned to
  const canTransitionToStep = useCallback((toStepId) => {
    const allowed = getAllowedNextSteps(currentStep);
    return blockingIssues.length === 0 && allowed.some(s => s.id === toStepId);
  }, [currentStep, blockingIssues, getAllowedNextSteps]);

  // Transition to next step
  const transitionToStep = useCallback(async (toStepId, procId) => {
    if (!canTransitionToStep(toStepId)) {
      setError(`Cannot transition to ${toStepId}. Blocking issues exist.`);
      return false;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/procurements/${procId}/workflow/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStep: toStepId })
      });
      if (!response.ok) throw new Error('Failed to transition step');
      const data = await response.json();
      setCurrentStep(data.currentStep);
      setTransitions(data.transitions || []);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [canTransitionToStep]);

  // Validate step completion
  const validateStepCompletion = useCallback(async (stepId, procId) => {
    try {
      const response = await fetch(`/api/procurements/${procId}/workflow/validate/${stepId}`);
      if (!response.ok) throw new Error('Validation failed');
      const data = await response.json();
      setBlockingIssues(data.issues || []);
      return data.isValid;
    } catch (err) {
      console.error('Validation error:', err);
      return false;
    }
  }, []);

  // Get step progress
  const getStepProgress = useCallback(() => {
    const currentIndex = WORKFLOW_STEPS.findIndex(s => s.id === currentStep);
    return {
      current: currentIndex + 1,
      total: WORKFLOW_STEPS.length,
      percentage: Math.round(((currentIndex + 1) / WORKFLOW_STEPS.length) * 100)
    };
  }, [currentStep]);

  // Get step details
  const getStepDetails = useCallback((stepId) => {
    return WORKFLOW_STEPS.find(s => s.id === stepId) || null;
  }, []);

  // Check if step is completed
  const isStepCompleted = useCallback((stepId) => {
    const stepIndex = WORKFLOW_STEPS.findIndex(s => s.id === stepId);
    const currentIndex = WORKFLOW_STEPS.findIndex(s => s.id === currentStep);
    return stepIndex < currentIndex;
  }, [currentStep]);

  // Auto-fetch on mount
  useEffect(() => {
    if (procurementId) {
      fetchWorkflow(procurementId);
    } else {
      setSteps(WORKFLOW_STEPS);
    }
  }, [procurementId, fetchWorkflow]);

  return {
    currentStep,
    steps: steps.length ? steps : WORKFLOW_STEPS,
    transitions,
    blockingIssues,
    loading,
    error,
    fetchWorkflow,
    getAllowedNextSteps,
    canTransitionToStep,
    transitionToStep,
    validateStepCompletion,
    getStepProgress,
    getStepDetails,
    isStepCompleted
  };
};

export default useWorkflow;
