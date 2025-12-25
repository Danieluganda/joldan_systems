import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProcurement } from '../hooks/useProcurement';
import { usePermissions } from '../hooks/usePermissions';
import StandardLayout from '../components/layout/StandardLayout';
import './pages.css';

/**
 * Procurement Setup Page
 * 
 * Enhanced procurement creation wizard following World Bank STEP methodology
 * with comprehensive validation, multi-step form, and professional UI
 */
export default function ProcurementSetup() {
  const navigate = useNavigate();
  const { permissions } = usePermissions();
  const { createProcurement, loading } = useProcurement();
  
  // Form state
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Basic Information
    name: '',
    reference: '',
    description: '',
    type: 'goods',
    method: 'RFQ',
    priority: 'medium',
    
    // Financial Information
    estimatedBudget: '',
    currency: 'USD',
    budgetSource: '',
    
    // Timeline
    startDate: '',
    endDate: '',
    plannedAwardDate: '',
    plannedContractDate: '',
    
    // Organization
    department: '',
    procurementOfficer: '',
    requestingUnit: '',
    
    // Requirements
    technicalSpecs: '',
    evaluationCriteria: '',
    deliveryLocation: '',
    paymentTerms: '30',
    
    // Compliance
    reviewType: 'post',
    environmentalCategory: 'C',
    socialCategory: 'C'
  });
  
  // UI state
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);
  const [savedDraft, setSavedDraft] = useState(false);

  // Configuration data
  const procurementTypes = [
    { value: 'goods', label: '📦 Goods/Products', description: 'Physical items, equipment, supplies' },
    { value: 'services', label: '🔧 Services', description: 'Professional, maintenance, support services' },
    { value: 'works', label: '🏗️ Works/Construction', description: 'Construction, renovation, infrastructure' },
    { value: 'consulting', label: '👥 Consulting Services', description: 'Advisory, technical assistance, studies' }
  ];

  const procurementMethods = [
    { value: 'RFB', label: 'RFB - Request for Bids', description: 'Competitive bidding for goods/works', threshold: '100,000+' },
    { value: 'RFQ', label: 'RFQ - Request for Quotations', description: 'Simple procurement for standard items', threshold: '10,000-100,000' },
    { value: 'QCBS', label: 'QCBS - Quality & Cost Based Selection', description: 'Consulting services evaluation', threshold: '200,000+' },
    { value: 'CQS', label: 'CQS - Consultant Qualification Selection', description: 'Simple consulting assignments', threshold: '50,000-200,000' },
    { value: 'INDV', label: 'INDV - Individual Consultant', description: 'Single consultant selection', threshold: 'Under 50,000' },
    { value: 'SBD', label: 'SBD - Shopping (Bidding Documents)', description: 'Limited competitive process', threshold: '10,000-50,000' },
    { value: 'DCB', label: 'DCB - Direct Contracting', description: 'Single source procurement', threshold: 'Any (justified)' }
  ];

  const priorityLevels = [
    { value: 'low', label: 'Low', color: '#28a745', description: 'Standard timeline' },
    { value: 'medium', label: 'Medium', color: '#ffc107', description: 'Moderate urgency' },
    { value: 'high', label: 'High', color: '#fd7e14', description: 'High priority' },
    { value: 'urgent', label: 'Urgent', color: '#dc3545', description: 'Immediate attention required' }
  ];

  const currencies = [
    { value: 'USD', label: 'USD - US Dollar', symbol: '$' },
    { value: 'EUR', label: 'EUR - Euro', symbol: '€' },
    { value: 'GBP', label: 'GBP - British Pound', symbol: '£' },
    { value: 'JPY', label: 'JPY - Japanese Yen', symbol: '¥' }
  ];

  const steps = [
    { id: 1, title: 'Basic Information', icon: '📋', description: 'Name, type, and description' },
    { id: 2, title: 'Method & Timeline', icon: '⏱️', description: 'Procurement method and dates' },
    { id: 3, title: 'Budget & Finance', icon: '💰', description: 'Budget and financial details' },
    { id: 4, title: 'Requirements', icon: '📝', description: 'Technical specifications' },
    { id: 5, title: 'Review & Submit', icon: '✅', description: 'Final review and submission' }
  ];

  // Clear message after 5 seconds
  const showMessage = useCallback((type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }, []);

  // Auto-save draft
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.name && !savedDraft) {
        localStorage.setItem('procurementDraft', JSON.stringify(formData));
        setSavedDraft(true);
        showMessage('info', 'Draft saved automatically');
      }
    }, 30000); // Save after 30 seconds of inactivity

    return () => clearTimeout(timer);
  }, [formData, savedDraft, showMessage]);

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('procurementDraft');
    if (draft) {
      try {
        const parsedDraft = JSON.parse(draft);
        if (window.confirm('A draft procurement was found. Would you like to continue where you left off?')) {
          setFormData(parsedDraft);
          showMessage('info', 'Draft loaded successfully');
        } else {
          localStorage.removeItem('procurementDraft');
        }
      } catch (error) {
        localStorage.removeItem('procurementDraft');
      }
    }
  }, [showMessage]);

  // Form validation
  const validateStep = (step) => {
    const newErrors = {};
    
    switch (step) {
      case 1:
        if (!formData.name.trim()) newErrors.name = 'Procurement name is required';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        if (!formData.department.trim()) newErrors.department = 'Department is required';
        break;
      case 2:
        if (!formData.startDate) newErrors.startDate = 'Start date is required';
        if (!formData.endDate) newErrors.endDate = 'End date is required';
        if (formData.startDate && formData.endDate && new Date(formData.startDate) >= new Date(formData.endDate)) {
          newErrors.endDate = 'End date must be after start date';
        }
        break;
      case 3:
        if (!formData.estimatedBudget || parseFloat(formData.estimatedBudget) <= 0) {
          newErrors.estimatedBudget = 'Valid budget amount is required';
        }
        break;
      case 4:
        if (!formData.technicalSpecs.trim()) newErrors.technicalSpecs = 'Technical specifications are required';
        if (!formData.deliveryLocation.trim()) newErrors.deliveryLocation = 'Delivery location is required';
        break;
      default:
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form updates
  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSavedDraft(false);
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Auto-generate reference
  const generateReference = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const type = formData.type.toUpperCase().slice(0, 2);
    const method = formData.method;
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `${year}-${month}-${type}-${method}-${random}`;
  };

  // Step navigation
  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const goToStep = (step) => {
    if (step <= currentStep || validateStep(currentStep)) {
      setCurrentStep(step);
    }
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep(5)) return;

    setSubmitting(true);
    try {
      // Generate reference if not provided
      if (!formData.reference) {
        formData.reference = generateReference();
      }

      const procurementData = {
        ...formData,
        estimatedBudget: parseFloat(formData.estimatedBudget),
        paymentTerms: parseInt(formData.paymentTerms),
        status: 'planning',
        currentStage: 'planning',
        createdBy: 'current-user' // This should come from auth context
      };

      const result = await createProcurement(procurementData);
      
      // Clear draft
      localStorage.removeItem('procurementDraft');
      
      showMessage('success', 'Procurement created successfully!');
      
      // Navigate to the created procurement
      setTimeout(() => {
        navigate(`/procurements/${result.id}`);
      }, 1500);
      
    } catch (error) {
      showMessage('error', 'Error creating procurement: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Save as draft
  const saveDraft = () => {
    localStorage.setItem('procurementDraft', JSON.stringify(formData));
    setSavedDraft(true);
    showMessage('success', 'Draft saved successfully');
  };

  const headerActions = [
    {
      label: '💾 Save Draft',
      variant: 'secondary',
      onClick: saveDraft
    },
    {
      label: '📋 Template',
      variant: 'info',
      onClick: () => showMessage('info', 'Template feature coming soon!')
    }
  ];

  // Check permissions
  if (!permissions.includes('create_procurement')) {
    return (
      <StandardLayout title="❌ Access Denied">
        <div className="empty-state">
          <div className="empty-icon">🔒</div>
          <h4>Access Denied</h4>
          <p>You don't have permission to create procurements.</p>
          <button onClick={() => navigate('/procurements')} className="btn btn-primary">
            ← Back to Procurements
          </button>
        </div>
      </StandardLayout>
    );
  }

  return (
    <StandardLayout
      title="➕ New Procurement"
      description="Create a new procurement following World Bank STEP methodology"
      headerActions={headerActions}
    >
      {/* Message Display */}
      {message.text && (
        <div className={`alert alert-${message.type === 'success' ? 'info' : message.type === 'error' ? 'urgent' : 'warning'}`} style={{ marginBottom: '24px' }}>
          <span className="alert-icon">
            {message.type === 'success' ? '✅' : message.type === 'error' ? '❌' : 'ℹ️'}
          </span>
          <span className="alert-message">{message.text}</span>
        </div>
      )}

      {/* Progress Steps */}
      <div className="wizard-steps">
        {steps.map((step) => (
          <div 
            key={step.id} 
            className={`wizard-step ${currentStep === step.id ? 'active' : currentStep > step.id ? 'completed' : 'pending'}`}
            onClick={() => goToStep(step.id)}
          >
            <div className="step-icon">{step.icon}</div>
            <div className="step-content">
              <div className="step-title">{step.title}</div>
              <div className="step-description">{step.description}</div>
            </div>
            {currentStep > step.id && (
              <div className="step-check">✓</div>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="wizard-content">
            <div className="card">
              <div className="card-header">
                <h3>📋 Basic Information</h3>
              </div>
              <div className="card-body">
                <div className="form-grid">
                  <div className="input-group span-2">
                    <label htmlFor="name">Procurement Name *</label>
                    <input
                      id="name"
                      type="text"
                      placeholder="e.g., Office Equipment Q1 2025"
                      value={formData.name}
                      onChange={(e) => updateFormData('name', e.target.value)}
                      className={`form-input ${errors.name ? 'error' : ''}`}
                    />
                    {errors.name && <span className="error-text">{errors.name}</span>}
                  </div>

                  <div className="input-group">
                    <label htmlFor="reference">Reference Number</label>
                    <input
                      id="reference"
                      type="text"
                      placeholder="Auto-generated if empty"
                      value={formData.reference}
                      onChange={(e) => updateFormData('reference', e.target.value)}
                      className="form-input"
                    />
                    <small className="input-help">Leave empty to auto-generate</small>
                  </div>

                  <div className="input-group">
                    <label htmlFor="type">Procurement Type *</label>
                    <select
                      id="type"
                      value={formData.type}
                      onChange={(e) => updateFormData('type', e.target.value)}
                      className="form-select"
                    >
                      {procurementTypes.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                    <small className="input-help">
                      {procurementTypes.find(t => t.value === formData.type)?.description}
                    </small>
                  </div>

                  <div className="input-group span-2">
                    <label htmlFor="description">Description *</label>
                    <textarea
                      id="description"
                      placeholder="Detailed description of what is being procured..."
                      value={formData.description}
                      onChange={(e) => updateFormData('description', e.target.value)}
                      className={`form-textarea ${errors.description ? 'error' : ''}`}
                      rows="4"
                    />
                    {errors.description && <span className="error-text">{errors.description}</span>}
                  </div>

                  <div className="input-group">
                    <label htmlFor="department">Department *</label>
                    <input
                      id="department"
                      type="text"
                      placeholder="e.g., IT, Operations, Finance"
                      value={formData.department}
                      onChange={(e) => updateFormData('department', e.target.value)}
                      className={`form-input ${errors.department ? 'error' : ''}`}
                    />
                    {errors.department && <span className="error-text">{errors.department}</span>}
                  </div>

                  <div className="input-group">
                    <label htmlFor="priority">Priority Level</label>
                    <select
                      id="priority"
                      value={formData.priority}
                      onChange={(e) => updateFormData('priority', e.target.value)}
                      className="form-select"
                    >
                      {priorityLevels.map((priority) => (
                        <option key={priority.value} value={priority.value}>{priority.label}</option>
                      ))}
                    </select>
                    <small className="input-help" style={{ color: priorityLevels.find(p => p.value === formData.priority)?.color }}>
                      {priorityLevels.find(p => p.value === formData.priority)?.description}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Method & Timeline */}
        {currentStep === 2 && (
          <div className="wizard-content">
            <div className="card">
              <div className="card-header">
                <h3>⏱️ Method & Timeline</h3>
              </div>
              <div className="card-body">
                <div className="form-grid">
                  <div className="input-group span-2">
                    <label htmlFor="method">Procurement Method *</label>
                    <select
                      id="method"
                      value={formData.method}
                      onChange={(e) => updateFormData('method', e.target.value)}
                      className="form-select"
                    >
                      {procurementMethods.map((method) => (
                        <option key={method.value} value={method.value}>{method.label}</option>
                      ))}
                    </select>
                    <div className="method-info">
                      <small className="input-help">
                        <strong>{procurementMethods.find(m => m.value === formData.method)?.description}</strong><br/>
                        Threshold: {procurementMethods.find(m => m.value === formData.method)?.threshold}
                      </small>
                    </div>
                  </div>

                  <div className="input-group">
                    <label htmlFor="startDate">Start Date *</label>
                    <input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => updateFormData('startDate', e.target.value)}
                      className={`form-input ${errors.startDate ? 'error' : ''}`}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    {errors.startDate && <span className="error-text">{errors.startDate}</span>}
                  </div>

                  <div className="input-group">
                    <label htmlFor="endDate">End Date *</label>
                    <input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => updateFormData('endDate', e.target.value)}
                      className={`form-input ${errors.endDate ? 'error' : ''}`}
                      min={formData.startDate || new Date().toISOString().split('T')[0]}
                    />
                    {errors.endDate && <span className="error-text">{errors.endDate}</span>}
                  </div>

                  <div className="input-group">
                    <label htmlFor="plannedAwardDate">Planned Award Date</label>
                    <input
                      id="plannedAwardDate"
                      type="date"
                      value={formData.plannedAwardDate}
                      onChange={(e) => updateFormData('plannedAwardDate', e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="plannedContractDate">Planned Contract Date</label>
                    <input
                      id="plannedContractDate"
                      type="date"
                      value={formData.plannedContractDate}
                      onChange={(e) => updateFormData('plannedContractDate', e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="reviewType">Review Type</label>
                    <select
                      id="reviewType"
                      value={formData.reviewType}
                      onChange={(e) => updateFormData('reviewType', e.target.value)}
                      className="form-select"
                    >
                      <option value="post">Post Review</option>
                      <option value="prior">Prior Review</option>
                    </select>
                    <small className="input-help">
                      {formData.reviewType === 'prior' ? 'Requires Bank approval before proceeding' : 'Bank review after completion'}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Budget & Finance */}
        {currentStep === 3 && (
          <div className="wizard-content">
            <div className="card">
              <div className="card-header">
                <h3>💰 Budget & Finance</h3>
              </div>
              <div className="card-body">
                <div className="form-grid">
                  <div className="input-group">
                    <label htmlFor="estimatedBudget">Estimated Budget *</label>
                    <input
                      id="estimatedBudget"
                      type="number"
                      placeholder="100000"
                      value={formData.estimatedBudget}
                      onChange={(e) => updateFormData('estimatedBudget', e.target.value)}
                      className={`form-input ${errors.estimatedBudget ? 'error' : ''}`}
                      min="0"
                      step="0.01"
                    />
                    {errors.estimatedBudget && <span className="error-text">{errors.estimatedBudget}</span>}
                  </div>

                  <div className="input-group">
                    <label htmlFor="currency">Currency</label>
                    <select
                      id="currency"
                      value={formData.currency}
                      onChange={(e) => updateFormData('currency', e.target.value)}
                      className="form-select"
                    >
                      {currencies.map((currency) => (
                        <option key={currency.value} value={currency.value}>{currency.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group span-2">
                    <label htmlFor="budgetSource">Budget Source</label>
                    <input
                      id="budgetSource"
                      type="text"
                      placeholder="e.g., Project Fund, Annual Budget, Grant"
                      value={formData.budgetSource}
                      onChange={(e) => updateFormData('budgetSource', e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="paymentTerms">Payment Terms (days)</label>
                    <select
                      id="paymentTerms"
                      value={formData.paymentTerms}
                      onChange={(e) => updateFormData('paymentTerms', e.target.value)}
                      className="form-select"
                    >
                      <option value="15">15 days</option>
                      <option value="30">30 days</option>
                      <option value="45">45 days</option>
                      <option value="60">60 days</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label htmlFor="requestingUnit">Requesting Unit</label>
                    <input
                      id="requestingUnit"
                      type="text"
                      placeholder="Department/Unit requesting the procurement"
                      value={formData.requestingUnit}
                      onChange={(e) => updateFormData('requestingUnit', e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Requirements */}
        {currentStep === 4 && (
          <div className="wizard-content">
            <div className="card">
              <div className="card-header">
                <h3>📝 Requirements & Specifications</h3>
              </div>
              <div className="card-body">
                <div className="form-grid">
                  <div className="input-group span-2">
                    <label htmlFor="technicalSpecs">Technical Specifications *</label>
                    <textarea
                      id="technicalSpecs"
                      placeholder="Detailed technical requirements, specifications, and standards..."
                      value={formData.technicalSpecs}
                      onChange={(e) => updateFormData('technicalSpecs', e.target.value)}
                      className={`form-textarea ${errors.technicalSpecs ? 'error' : ''}`}
                      rows="5"
                    />
                    {errors.technicalSpecs && <span className="error-text">{errors.technicalSpecs}</span>}
                  </div>

                  <div className="input-group span-2">
                    <label htmlFor="evaluationCriteria">Evaluation Criteria</label>
                    <textarea
                      id="evaluationCriteria"
                      placeholder="Criteria for evaluating bids/proposals..."
                      value={formData.evaluationCriteria}
                      onChange={(e) => updateFormData('evaluationCriteria', e.target.value)}
                      className="form-textarea"
                      rows="3"
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="deliveryLocation">Delivery Location *</label>
                    <input
                      id="deliveryLocation"
                      type="text"
                      placeholder="Where should items be delivered?"
                      value={formData.deliveryLocation}
                      onChange={(e) => updateFormData('deliveryLocation', e.target.value)}
                      className={`form-input ${errors.deliveryLocation ? 'error' : ''}`}
                    />
                    {errors.deliveryLocation && <span className="error-text">{errors.deliveryLocation}</span>}
                  </div>

                  <div className="input-group">
                    <label htmlFor="procurementOfficer">Procurement Officer</label>
                    <input
                      id="procurementOfficer"
                      type="text"
                      placeholder="Officer responsible for this procurement"
                      value={formData.procurementOfficer}
                      onChange={(e) => updateFormData('procurementOfficer', e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="environmentalCategory">Environmental Category</label>
                    <select
                      id="environmentalCategory"
                      value={formData.environmentalCategory}
                      onChange={(e) => updateFormData('environmentalCategory', e.target.value)}
                      className="form-select"
                    >
                      <option value="A">Category A - High Risk</option>
                      <option value="B">Category B - Medium Risk</option>
                      <option value="C">Category C - Low Risk</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label htmlFor="socialCategory">Social Category</label>
                    <select
                      id="socialCategory"
                      value={formData.socialCategory}
                      onChange={(e) => updateFormData('socialCategory', e.target.value)}
                      className="form-select"
                    >
                      <option value="A">Category A - High Risk</option>
                      <option value="B">Category B - Medium Risk</option>
                      <option value="C">Category C - Low Risk</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Review & Submit */}
        {currentStep === 5 && (
          <div className="wizard-content">
            <div className="card">
              <div className="card-header">
                <h3>✅ Review & Submit</h3>
              </div>
              <div className="card-body">
                <div className="review-section">
                  <div className="review-grid">
                    <div className="review-item">
                      <strong>Procurement Name:</strong>
                      <span>{formData.name}</span>
                    </div>
                    <div className="review-item">
                      <strong>Reference:</strong>
                      <span>{formData.reference || 'Auto-generated'}</span>
                    </div>
                    <div className="review-item">
                      <strong>Type:</strong>
                      <span>{procurementTypes.find(t => t.value === formData.type)?.label}</span>
                    </div>
                    <div className="review-item">
                      <strong>Method:</strong>
                      <span>{procurementMethods.find(m => m.value === formData.method)?.label}</span>
                    </div>
                    <div className="review-item">
                      <strong>Budget:</strong>
                      <span>{currencies.find(c => c.value === formData.currency)?.symbol}{parseFloat(formData.estimatedBudget || 0).toLocaleString()}</span>
                    </div>
                    <div className="review-item">
                      <strong>Timeline:</strong>
                      <span>{formData.startDate} to {formData.endDate}</span>
                    </div>
                    <div className="review-item">
                      <strong>Department:</strong>
                      <span>{formData.department}</span>
                    </div>
                    <div className="review-item">
                      <strong>Priority:</strong>
                      <span className={`priority-badge priority-${formData.priority}`}>
                        {priorityLevels.find(p => p.value === formData.priority)?.label}
                      </span>
                    </div>
                  </div>

                  <div className="review-description">
                    <strong>Description:</strong>
                    <p>{formData.description}</p>
                  </div>

                  <div className="next-steps">
                    <h4>📋 Next Steps After Creation:</h4>
                    <ol>
                      <li>Upload supporting documents and specifications</li>
                      <li>Configure RFQ/TOR templates</li>
                      <li>Set workflow approval steps</li>
                      <li>Assign roles to team members</li>
                      <li>Publish RFQ to suppliers</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="wizard-navigation">
          <div className="nav-left">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="btn btn-secondary"
                disabled={submitting}
              >
                ← Previous
              </button>
            )}
          </div>
          
          <div className="nav-center">
            <span className="step-indicator">
              Step {currentStep} of {steps.length}
            </span>
          </div>
          
          <div className="nav-right">
            {currentStep < steps.length ? (
              <button
                type="button"
                onClick={nextStep}
                className="btn btn-primary"
                disabled={submitting}
              >
                Next →
              </button>
            ) : (
              <button
                type="submit"
                className={`btn btn-success ${submitting ? 'loading' : ''}`}
                disabled={submitting}
              >
                {submitting ? '⏳ Creating...' : '🚀 Create Procurement'}
              </button>
            )}
          </div>
        </div>
      </form>
    </StandardLayout>
  );
}

