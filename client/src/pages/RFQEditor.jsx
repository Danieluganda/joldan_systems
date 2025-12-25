import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProcurement } from '../hooks/useProcurement';
import { usePermissions } from '../hooks/usePermissions';
import StandardLayout from '../components/layout/StandardLayout';
import './pages.css';

/**
 * RFQ Editor - Advanced Request for Quotation Management
 * 
 * Comprehensive RFQ creation and editing system with:
 * - Multi-section form with validation
 * - Procurement integration
 * - Advanced timeline management
 * - Supplier invitation system
 * - Document management
 * - Professional UI/UX
 */
export default function RFQEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { permissions } = usePermissions();
  const { procurements, fetchProcurements } = useProcurement();
  
  // Form state
  const [formData, setFormData] = useState({
    // Basic Information
    title: '',
    description: '',
    reference: '',
    procurementId: '',
    rfqType: 'open_tender',
    category: '',
    priority: 'medium',
    
    // Timeline
    openingDate: '',
    closingDate: '',
    closingTime: '17:00',
    submissionDeadline: '',
    evaluationDuration: 5,
    
    // Requirements
    technicalRequirements: '',
    commercialRequirements: '',
    deliveryRequirements: '',
    qualificationCriteria: '',
    
    // Evaluation
    evaluationCriteria: '',
    technicalWeight: 70,
    financialWeight: 30,
    evaluationType: 'QCBS',
    
    // Suppliers
    inviteAllRegistered: false,
    selectedSuppliers: [],
    minimumSuppliers: 3,
    
    // Documents
    attachedDocuments: [],
    requiredDocuments: [],
    
    // Terms
    paymentTerms: '30',
    deliveryTerms: 'FOB',
    validityPeriod: 90,
    currency: 'USD',
    
    // Status
    status: 'draft',
    publishImmediately: false
  });
  
  // UI state
  const [currentSection, setCurrentSection] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });
  const [savedDraft, setSavedDraft] = useState(false);

  // Configuration data
  const rfqTypes = [
    { value: 'open_tender', label: '📢 Open Tender', description: 'Public invitation to all suppliers' },
    { value: 'restricted_tender', label: '🎯 Restricted Tender', description: 'Invitation to pre-selected suppliers' },
    { value: 'negotiated_procedure', label: '🤝 Negotiated Procedure', description: 'Direct negotiation with suppliers' },
    { value: 'competitive_dialogue', label: '💬 Competitive Dialogue', description: 'Multi-stage tender process' },
    { value: 'framework_agreement', label: '📋 Framework Agreement', description: 'Long-term supplier arrangements' }
  ];

  const evaluationTypes = [
    { value: 'QCBS', label: 'QCBS - Quality & Cost Based', description: 'Technical + Financial evaluation' },
    { value: 'LCS', label: 'LCS - Least Cost Selection', description: 'Lowest cost among qualified bids' },
    { value: 'QBS', label: 'QBS - Quality Based Selection', description: 'Best technical proposal' },
    { value: 'FBS', label: 'FBS - Fixed Budget Selection', description: 'Best quality within budget' }
  ];

  const priorityLevels = [
    { value: 'low', label: 'Low', color: '#28a745', description: 'Standard process' },
    { value: 'medium', label: 'Medium', color: '#ffc107', description: 'Normal priority' },
    { value: 'high', label: 'High', color: '#fd7e14', description: 'High priority' },
    { value: 'urgent', label: 'Urgent', color: '#dc3545', description: 'Expedited process' }
  ];

  const currencies = [
    { value: 'USD', label: 'USD - US Dollar', symbol: '$' },
    { value: 'EUR', label: 'EUR - Euro', symbol: '€' },
    { value: 'GBP', label: 'GBP - British Pound', symbol: '£' },
    { value: 'JPY', label: 'JPY - Japanese Yen', symbol: '¥' }
  ];

  const sections = [
    { id: 1, title: 'Basic Information', icon: '📋', description: 'RFQ details and procurement link' },
    { id: 2, title: 'Timeline & Schedule', icon: '📅', description: 'Dates and deadlines' },
    { id: 3, title: 'Requirements', icon: '📝', description: 'Technical and commercial specs' },
    { id: 4, title: 'Evaluation Setup', icon: '⚖️', description: 'Criteria and weights' },
    { id: 5, title: 'Suppliers & Publishing', icon: '📤', description: 'Supplier selection and launch' }
  ];

  // Load RFQ data if editing
  useEffect(() => {
    if (!id) return;
    loadRFQData();
  }, [id]);

  // Load procurements for selection
  useEffect(() => {
    fetchProcurements();
  }, [fetchProcurements]);

  // Auto-save draft functionality
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.title && !savedDraft) {
        saveDraft();
      }
    }, 30000); // Save after 30 seconds of inactivity

    return () => clearTimeout(timer);
  }, [formData, savedDraft]);

  // Load RFQ data for editing
  const loadRFQData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/rfqs/${id}`);
      if (!response.ok) throw new Error('Failed to load RFQ');
      
      const data = await response.json();
      setFormData({
        title: data.title || '',
        description: data.description || '',
        reference: data.reference || '',
        procurementId: data.procurementId || '',
        rfqType: data.rfqType || 'open_tender',
        category: data.category || '',
        priority: data.priority || 'medium',
        openingDate: data.openingDate ? data.openingDate.split('T')[0] : '',
        closingDate: data.closingDate ? data.closingDate.split('T')[0] : '',
        closingTime: data.closingTime || '17:00',
        submissionDeadline: data.submissionDeadline ? data.submissionDeadline.split('T')[0] : '',
        evaluationDuration: data.evaluationDuration || 5,
        technicalRequirements: data.technicalRequirements || '',
        commercialRequirements: data.commercialRequirements || '',
        deliveryRequirements: data.deliveryRequirements || '',
        qualificationCriteria: data.qualificationCriteria || '',
        evaluationCriteria: data.evaluationCriteria || '',
        technicalWeight: data.technicalWeight || 70,
        financialWeight: data.financialWeight || 30,
        evaluationType: data.evaluationType || 'QCBS',
        inviteAllRegistered: data.inviteAllRegistered || false,
        selectedSuppliers: data.selectedSuppliers || [],
        minimumSuppliers: data.minimumSuppliers || 3,
        attachedDocuments: data.attachedDocuments || [],
        requiredDocuments: data.requiredDocuments || [],
        paymentTerms: data.paymentTerms || '30',
        deliveryTerms: data.deliveryTerms || 'FOB',
        validityPeriod: data.validityPeriod || 90,
        currency: data.currency || 'USD',
        status: data.status || 'draft',
        publishImmediately: false
      });
      showMessage('info', 'RFQ loaded successfully');
    } catch (error) {
      showMessage('error', 'Failed to load RFQ: ' + error.message);
      console.error('Error loading RFQ:', error);
    } finally {
      setLoading(false);
    }
  };

  // Show message with timeout
  const showMessage = useCallback((type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }, []);

  // Form validation
  const validateSection = (section) => {
    const newErrors = {};
    
    switch (section) {
      case 1:
        if (!formData.title.trim()) newErrors.title = 'RFQ title is required';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        if (!formData.procurementId) newErrors.procurementId = 'Please select a procurement';
        break;
      case 2:
        if (!formData.openingDate) newErrors.openingDate = 'Opening date is required';
        if (!formData.closingDate) newErrors.closingDate = 'Closing date is required';
        if (formData.openingDate && formData.closingDate && new Date(formData.openingDate) >= new Date(formData.closingDate)) {
          newErrors.closingDate = 'Closing date must be after opening date';
        }
        break;
      case 3:
        if (!formData.technicalRequirements.trim()) newErrors.technicalRequirements = 'Technical requirements are required';
        if (!formData.qualificationCriteria.trim()) newErrors.qualificationCriteria = 'Qualification criteria are required';
        break;
      case 4:
        if (formData.technicalWeight + formData.financialWeight !== 100) {
          newErrors.weights = 'Technical and financial weights must sum to 100%';
        }
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

    // Auto-calculate weights if needed
    if (field === 'technicalWeight') {
      setFormData(prev => ({ ...prev, financialWeight: 100 - parseInt(value) }));
    } else if (field === 'financialWeight') {
      setFormData(prev => ({ ...prev, technicalWeight: 100 - parseInt(value) }));
    }
  };

  // Generate RFQ reference
  const generateReference = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const type = formData.rfqType.toUpperCase().slice(0, 2);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `RFQ-${year}-${month}-${type}-${random}`;
  };

  // Section navigation
  const nextSection = () => {
    if (validateSection(currentSection)) {
      setCurrentSection(prev => Math.min(prev + 1, sections.length));
    }
  };

  const prevSection = () => {
    setCurrentSection(prev => Math.max(prev - 1, 1));
  };

  const goToSection = (section) => {
    if (section <= currentSection || validateSection(currentSection)) {
      setCurrentSection(section);
    }
  };

  // Save draft
  const saveDraft = async () => {
    try {
      const draftData = { ...formData, status: 'draft' };
      await saveRFQ(draftData);
      setSavedDraft(true);
      showMessage('success', 'Draft saved successfully');
    } catch (error) {
      showMessage('error', 'Failed to save draft');
    }
  };

  // Save RFQ
  const saveRFQ = async (data) => {
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/rfqs/${id}` : '/api/rfqs';
    
    // Generate reference if not provided
    if (!data.reference) {
      data.reference = generateReference();
    }

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to save RFQ');
    }

    return response.json();
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all sections
    let allValid = true;
    for (let i = 1; i <= sections.length; i++) {
      if (!validateSection(i)) {
        allValid = false;
        if (currentSection > i) {
          setCurrentSection(i);
        }
        break;
      }
    }

    if (!allValid) return;

    setSaving(true);
    try {
      const finalData = {
        ...formData,
        status: formData.publishImmediately ? 'published' : 'draft'
      };

      const result = await saveRFQ(finalData);
      
      const actionText = formData.publishImmediately ? 'published' : id ? 'updated' : 'created';
      showMessage('success', `RFQ ${actionText} successfully!`);
      
      // Navigate to RFQ list or detail
      setTimeout(() => {
        navigate(formData.publishImmediately ? `/rfqs/${result.id}` : '/rfqs');
      }, 1500);
      
    } catch (error) {
      showMessage('error', 'Error saving RFQ: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Header actions
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
  if (!permissions.includes('create_rfq') && !permissions.includes('edit_rfq')) {
    return (
      <StandardLayout title="❌ Access Denied">
        <div className="empty-state">
          <div className="empty-icon">🔒</div>
          <h4>Access Denied</h4>
          <p>You don't have permission to create or edit RFQs.</p>
          <button onClick={() => navigate('/rfqs')} className="btn btn-primary">
            ← Back to RFQs
          </button>
        </div>
      </StandardLayout>
    );
  }

  return (
    <StandardLayout
      title={id ? "✏️ Edit RFQ" : "➕ New RFQ"}
      description="Create or edit Request for Quotation with comprehensive requirements and evaluation criteria"
      headerActions={headerActions}
    >
      {/* Loading overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">⏳ Loading RFQ...</div>
        </div>
      )}

      {/* Message Display */}
      {message.text && (
        <div className={`alert alert-${message.type === 'success' ? 'info' : message.type === 'error' ? 'urgent' : 'warning'}`} style={{ marginBottom: '24px' }}>
          <span className="alert-icon">
            {message.type === 'success' ? '✅' : message.type === 'error' ? '❌' : 'ℹ️'}
          </span>
          <span className="alert-message">{message.text}</span>
        </div>
      )}

      {/* Progress Sections */}
      <div className="wizard-steps">
        {sections.map((section) => (
          <div 
            key={section.id} 
            className={`wizard-step ${currentSection === section.id ? 'active' : currentSection > section.id ? 'completed' : 'pending'}`}
            onClick={() => goToSection(section.id)}
          >
            <div className="step-icon">{section.icon}</div>
            <div className="step-content">
              <div className="step-title">{section.title}</div>
              <div className="step-description">{section.description}</div>
            </div>
            {currentSection > section.id && (
              <div className="step-check">✓</div>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Section 1: Basic Information */}
        {currentSection === 1 && (
          <div className="wizard-content">
            <div className="card">
              <div className="card-header">
                <h3>📋 Basic Information</h3>
              </div>
              <div className="card-body">
                <div className="form-grid">
                  <div className="input-group span-2">
                    <label htmlFor="title">RFQ Title *</label>
                    <input
                      id="title"
                      type="text"
                      placeholder="e.g., Supply of Office Equipment Q1 2025"
                      value={formData.title}
                      onChange={(e) => updateFormData('title', e.target.value)}
                      className={`form-input ${errors.title ? 'error' : ''}`}
                    />
                    {errors.title && <span className="error-text">{errors.title}</span>}
                  </div>

                  <div className="input-group">
                    <label htmlFor="reference">RFQ Reference</label>
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
                    <label htmlFor="procurementId">Related Procurement *</label>
                    <select
                      id="procurementId"
                      value={formData.procurementId}
                      onChange={(e) => updateFormData('procurementId', e.target.value)}
                      className={`form-select ${errors.procurementId ? 'error' : ''}`}
                    >
                      <option value="">Select procurement...</option>
                      {procurements && procurements.map((procurement) => (
                        <option key={procurement.id} value={procurement.id}>
                          {procurement.name} - {procurement.department}
                        </option>
                      ))}
                    </select>
                    {errors.procurementId && <span className="error-text">{errors.procurementId}</span>}
                  </div>

                  <div className="input-group">
                    <label htmlFor="rfqType">RFQ Type</label>
                    <select
                      id="rfqType"
                      value={formData.rfqType}
                      onChange={(e) => updateFormData('rfqType', e.target.value)}
                      className="form-select"
                    >
                      {rfqTypes.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                    <small className="input-help">
                      {rfqTypes.find(t => t.value === formData.rfqType)?.description}
                    </small>
                  </div>

                  <div className="input-group">
                    <label htmlFor="category">Category</label>
                    <input
                      id="category"
                      type="text"
                      placeholder="e.g., IT Equipment, Construction"
                      value={formData.category}
                      onChange={(e) => updateFormData('category', e.target.value)}
                      className="form-input"
                    />
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

                  <div className="input-group span-2">
                    <label htmlFor="description">Description *</label>
                    <textarea
                      id="description"
                      placeholder="Detailed description of the RFQ requirements..."
                      value={formData.description}
                      onChange={(e) => updateFormData('description', e.target.value)}
                      className={`form-textarea ${errors.description ? 'error' : ''}`}
                      rows="4"
                    />
                    {errors.description && <span className="error-text">{errors.description}</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Timeline & Schedule */}
        {currentSection === 2 && (
          <div className="wizard-content">
            <div className="card">
              <div className="card-header">
                <h3>📅 Timeline & Schedule</h3>
              </div>
              <div className="card-body">
                <div className="form-grid">
                  <div className="input-group">
                    <label htmlFor="openingDate">Opening Date *</label>
                    <input
                      id="openingDate"
                      type="date"
                      value={formData.openingDate}
                      onChange={(e) => updateFormData('openingDate', e.target.value)}
                      className={`form-input ${errors.openingDate ? 'error' : ''}`}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    {errors.openingDate && <span className="error-text">{errors.openingDate}</span>}
                  </div>

                  <div className="input-group">
                    <label htmlFor="closingDate">Closing Date *</label>
                    <input
                      id="closingDate"
                      type="date"
                      value={formData.closingDate}
                      onChange={(e) => updateFormData('closingDate', e.target.value)}
                      className={`form-input ${errors.closingDate ? 'error' : ''}`}
                      min={formData.openingDate || new Date().toISOString().split('T')[0]}
                    />
                    {errors.closingDate && <span className="error-text">{errors.closingDate}</span>}
                  </div>

                  <div className="input-group">
                    <label htmlFor="closingTime">Closing Time</label>
                    <input
                      id="closingTime"
                      type="time"
                      value={formData.closingTime}
                      onChange={(e) => updateFormData('closingTime', e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="submissionDeadline">Submission Deadline</label>
                    <input
                      id="submissionDeadline"
                      type="date"
                      value={formData.submissionDeadline}
                      onChange={(e) => updateFormData('submissionDeadline', e.target.value)}
                      className="form-input"
                      min={formData.closingDate || new Date().toISOString().split('T')[0]}
                    />
                    <small className="input-help">Final date for bid submissions</small>
                  </div>

                  <div className="input-group">
                    <label htmlFor="evaluationDuration">Evaluation Duration (days)</label>
                    <input
                      id="evaluationDuration"
                      type="number"
                      min="1"
                      max="30"
                      value={formData.evaluationDuration}
                      onChange={(e) => updateFormData('evaluationDuration', e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="validityPeriod">Bid Validity (days)</label>
                    <select
                      id="validityPeriod"
                      value={formData.validityPeriod}
                      onChange={(e) => updateFormData('validityPeriod', e.target.value)}
                      className="form-select"
                    >
                      <option value="30">30 days</option>
                      <option value="60">60 days</option>
                      <option value="90">90 days</option>
                      <option value="120">120 days</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Requirements */}
        {currentSection === 3 && (
          <div className="wizard-content">
            <div className="card">
              <div className="card-header">
                <h3>📝 Requirements & Specifications</h3>
              </div>
              <div className="card-body">
                <div className="form-grid">
                  <div className="input-group span-2">
                    <label htmlFor="technicalRequirements">Technical Requirements *</label>
                    <textarea
                      id="technicalRequirements"
                      placeholder="Detailed technical specifications and requirements..."
                      value={formData.technicalRequirements}
                      onChange={(e) => updateFormData('technicalRequirements', e.target.value)}
                      className={`form-textarea ${errors.technicalRequirements ? 'error' : ''}`}
                      rows="5"
                    />
                    {errors.technicalRequirements && <span className="error-text">{errors.technicalRequirements}</span>}
                  </div>

                  <div className="input-group span-2">
                    <label htmlFor="commercialRequirements">Commercial Requirements</label>
                    <textarea
                      id="commercialRequirements"
                      placeholder="Pricing, payment terms, and commercial conditions..."
                      value={formData.commercialRequirements}
                      onChange={(e) => updateFormData('commercialRequirements', e.target.value)}
                      className="form-textarea"
                      rows="4"
                    />
                  </div>

                  <div className="input-group span-2">
                    <label htmlFor="deliveryRequirements">Delivery Requirements</label>
                    <textarea
                      id="deliveryRequirements"
                      placeholder="Delivery schedule, locations, and logistics requirements..."
                      value={formData.deliveryRequirements}
                      onChange={(e) => updateFormData('deliveryRequirements', e.target.value)}
                      className="form-textarea"
                      rows="3"
                    />
                  </div>

                  <div className="input-group span-2">
                    <label htmlFor="qualificationCriteria">Qualification Criteria *</label>
                    <textarea
                      id="qualificationCriteria"
                      placeholder="Minimum qualifications suppliers must meet..."
                      value={formData.qualificationCriteria}
                      onChange={(e) => updateFormData('qualificationCriteria', e.target.value)}
                      className={`form-textarea ${errors.qualificationCriteria ? 'error' : ''}`}
                      rows="4"
                    />
                    {errors.qualificationCriteria && <span className="error-text">{errors.qualificationCriteria}</span>}
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

                  <div className="input-group">
                    <label htmlFor="deliveryTerms">Delivery Terms</label>
                    <select
                      id="deliveryTerms"
                      value={formData.deliveryTerms}
                      onChange={(e) => updateFormData('deliveryTerms', e.target.value)}
                      className="form-select"
                    >
                      <option value="FOB">FOB - Free on Board</option>
                      <option value="CIF">CIF - Cost, Insurance & Freight</option>
                      <option value="EXW">EXW - Ex Works</option>
                      <option value="DDP">DDP - Delivered Duty Paid</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Evaluation Setup */}
        {currentSection === 4 && (
          <div className="wizard-content">
            <div className="card">
              <div className="card-header">
                <h3>⚖️ Evaluation Setup</h3>
              </div>
              <div className="card-body">
                <div className="form-grid">
                  <div className="input-group span-2">
                    <label htmlFor="evaluationType">Evaluation Type</label>
                    <select
                      id="evaluationType"
                      value={formData.evaluationType}
                      onChange={(e) => updateFormData('evaluationType', e.target.value)}
                      className="form-select"
                    >
                      {evaluationTypes.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                    <small className="input-help">
                      {evaluationTypes.find(t => t.value === formData.evaluationType)?.description}
                    </small>
                  </div>

                  <div className="input-group">
                    <label htmlFor="technicalWeight">Technical Weight (%)</label>
                    <input
                      id="technicalWeight"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.technicalWeight}
                      onChange={(e) => updateFormData('technicalWeight', e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="financialWeight">Financial Weight (%)</label>
                    <input
                      id="financialWeight"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.financialWeight}
                      onChange={(e) => updateFormData('financialWeight', e.target.value)}
                      className="form-input"
                      readOnly
                    />
                    {errors.weights && <span className="error-text">{errors.weights}</span>}
                  </div>

                  <div className="input-group span-2">
                    <label htmlFor="evaluationCriteria">Detailed Evaluation Criteria</label>
                    <textarea
                      id="evaluationCriteria"
                      placeholder="Specific criteria and scoring methodology for evaluation..."
                      value={formData.evaluationCriteria}
                      onChange={(e) => updateFormData('evaluationCriteria', e.target.value)}
                      className="form-textarea"
                      rows="5"
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="minimumSuppliers">Minimum Suppliers</label>
                    <input
                      id="minimumSuppliers"
                      type="number"
                      min="1"
                      max="10"
                      value={formData.minimumSuppliers}
                      onChange={(e) => updateFormData('minimumSuppliers', e.target.value)}
                      className="form-input"
                    />
                    <small className="input-help">Minimum number of suppliers for competitive bidding</small>
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
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 5: Suppliers & Publishing */}
        {currentSection === 5 && (
          <div className="wizard-content">
            <div className="card">
              <div className="card-header">
                <h3>📤 Suppliers & Publishing</h3>
              </div>
              <div className="card-body">
                <div className="form-grid">
                  <div className="input-group span-2">
                    <div className="checkbox-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={formData.inviteAllRegistered}
                          onChange={(e) => updateFormData('inviteAllRegistered', e.target.checked)}
                          className="form-checkbox"
                        />
                        <span className="checkbox-text">Invite All Registered Suppliers</span>
                      </label>
                      <small className="input-help">
                        {formData.inviteAllRegistered 
                          ? 'All registered suppliers will be invited to participate' 
                          : 'Only selected suppliers will be invited'}
                      </small>
                    </div>
                  </div>

                  <div className="input-group span-2">
                    <div className="checkbox-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={formData.publishImmediately}
                          onChange={(e) => updateFormData('publishImmediately', e.target.checked)}
                          className="form-checkbox"
                        />
                        <span className="checkbox-text">Publish Immediately</span>
                      </label>
                      <small className="input-help">
                        {formData.publishImmediately 
                          ? 'RFQ will be published and made available to suppliers immediately' 
                          : 'RFQ will be saved as draft for review and later publishing'}
                      </small>
                    </div>
                  </div>

                  <div className="review-section span-2" style={{ marginTop: '20px' }}>
                    <h4>📋 RFQ Summary</h4>
                    <div className="review-grid">
                      <div className="review-item">
                        <strong>Title:</strong>
                        <span>{formData.title || 'Not specified'}</span>
                      </div>
                      <div className="review-item">
                        <strong>Type:</strong>
                        <span>{rfqTypes.find(t => t.value === formData.rfqType)?.label}</span>
                      </div>
                      <div className="review-item">
                        <strong>Timeline:</strong>
                        <span>{formData.openingDate} to {formData.closingDate}</span>
                      </div>
                      <div className="review-item">
                        <strong>Evaluation:</strong>
                        <span>{formData.evaluationType} ({formData.technicalWeight}% Tech, {formData.financialWeight}% Financial)</span>
                      </div>
                      <div className="review-item">
                        <strong>Validity:</strong>
                        <span>{formData.validityPeriod} days</span>
                      </div>
                      <div className="review-item">
                        <strong>Currency:</strong>
                        <span>{currencies.find(c => c.value === formData.currency)?.label}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="wizard-navigation">
          <div className="nav-left">
            {currentSection > 1 && (
              <button
                type="button"
                onClick={prevSection}
                className="btn btn-secondary"
                disabled={saving}
              >
                ← Previous
              </button>
            )}
          </div>
          
          <div className="nav-center">
            <span className="step-indicator">
              Section {currentSection} of {sections.length}
            </span>
          </div>
          
          <div className="nav-right">
            {currentSection < sections.length ? (
              <button
                type="button"
                onClick={nextSection}
                className="btn btn-primary"
                disabled={saving}
              >
                Next →
              </button>
            ) : (
              <button
                type="submit"
                className={`btn ${formData.publishImmediately ? 'btn-success' : 'btn-primary'} ${saving ? 'loading' : ''}`}
                disabled={saving}
              >
                {saving 
                  ? '⏳ Saving...' 
                  : formData.publishImmediately 
                    ? '🚀 Create & Publish RFQ' 
                    : id 
                      ? '💾 Update RFQ' 
                      : '💾 Save RFQ'}
              </button>
            )}
          </div>
        </div>
      </form>
    </StandardLayout>
  );
}
