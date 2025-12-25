import React, { useState, useEffect } from 'react';
import StandardLayout from '../components/layout/StandardLayout';
import './pages.css';

export default function ClarificationsPage() {
  const [activeView, setActiveView] = useState('clarifications');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedClarification, setSelectedClarification] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newClarification, setNewClarification] = useState({
    procurementRef: '',
    tenderRef: '',
    priority: 'medium',
    category: 'technical',
    supplier: { name: '', contactPerson: '', email: '', registrationNumber: '' },
    question: { subject: '', details: '', attachments: [] }
  });
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [publicationSettings, setPublicationSettings] = useState({
    autoPublish: false,
    notifyAllBidders: true,
    publishDelay: 0
  });
  const [workflowState, setWorkflowState] = useState({
    assignedToMe: [],
    pendingApproval: [],
    requiresRouting: []
  });
  const [approvalWorkflow, setApprovalWorkflow] = useState({
    currentApprover: null,
    approvalLevel: 1,
    maxLevels: 3
  });
  const [documentLinks, setDocumentLinks] = useState({});
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    deadlineAlerts: true,
    escalationRules: true
  });

  // Comprehensive clarifications data - STEP methodology compliant with full workflow
  const [clarifications] = useState([
    {
      id: 'CLR-2025-001',
      procurementRef: 'PROC-2025-001',
      tenderRef: 'RFQ-2025-001',
      status: 'answered',
      priority: 'high',
      category: 'technical',
      submissionDate: '2025-12-20',
      responseDate: '2025-12-22',
      deadlineDate: '2025-12-23',
      workflow: {
        currentStage: 'published',
        assignedTo: 'maria_rodriguez',
        routingHistory: [
          { stage: 'received', user: 'system', date: '2025-12-20', action: 'auto_received' },
          { stage: 'routed', user: 'procurement_manager', date: '2025-12-20', action: 'routed_to_technical' },
          { stage: 'draft_response', user: 'maria_rodriguez', date: '2025-12-21', action: 'response_drafted' },
          { stage: 'approved', user: 'technical_director', date: '2025-12-22', action: 'approved_for_publication' },
          { stage: 'published', user: 'procurement_officer', date: '2025-12-22', action: 'published_to_all_bidders' }
        ],
        approvalLevel: 2,
        approvers: ['technical_director', 'procurement_manager'],
        isAnonymous: false
      },
      routing: {
        originalReceiver: 'procurement_team',
        routedTo: ['technical_team', 'legal_review'],
        escalationRules: {
          timeThreshold: 48,
          escalateTo: 'procurement_director'
        }
      },
      supplier: {
        name: 'ABC Construction Ltd.',
        contactPerson: 'John Smith',
        email: 'john.smith@abcconstruction.com',
        registrationNumber: 'REG-12345'
      },
      question: {
        subject: 'Concrete Specifications Clarification',
        details: 'Could you please clarify the required concrete strength for the foundation work? The tender document mentions both C25 and C30 in different sections. Also, what is the acceptable tolerance for concrete placement in adverse weather conditions?',
        attachments: ['concrete_specs_query.pdf'],
        wordCount: 45
      },
      answer: {
        response: 'Thank you for your inquiry. The required concrete strength is C30 for all foundation work. The C25 specification mentioned in Section 3.2 was an error and has been corrected. For concrete placement in adverse weather, please refer to BS 8500 standards with maximum temperature variance of ±5°C during curing.',
        respondedBy: 'Maria Rodriguez',
        responseDate: '2025-12-22',
        attachments: ['revised_concrete_specs.pdf', 'weather_guidelines.pdf'],
        wordCount: 58,
        isPublic: true
      },
      impact: {
        affectsAllBidders: true,
        tenderAmendmentRequired: true,
        costImplication: 'medium',
        scheduleImpact: 'none'
      },
      tracking: {
        viewedBy: ['supplier1', 'supplier2', 'supplier3'],
        downloadedBy: ['supplier1', 'supplier2'],
        acknowledgments: 3,
        totalBidders: 5
      },
      metadata: {
        createdBy: 'procurement_officer_1',
        lastModified: '2025-12-22',
        version: '1.1',
        language: 'English',
        confidential: false,
        documentUpdates: [
          { type: 'addendum', documentId: 'ADD-001', description: 'Concrete specification correction' }
        ],
        complianceFlags: {
          equalTreatment: true,
          timelyResponse: true,
          auditTrail: true
        }
      },
      notifications: {
        sent: ['email_all_bidders', 'portal_notification'],
        deliveryStatus: { email: 'delivered', portal: 'read' },
        acknowledgments: 5,
        readReceipts: ['supplier1', 'supplier2', 'supplier3']
      }
    },
    {
      id: 'CLR-2025-002',
      procurementRef: 'PROC-2025-002',
      tenderRef: 'RFQ-2025-002',
      status: 'pending_response',
      priority: 'medium',
      category: 'commercial',
      submissionDate: '2025-12-23',
      responseDate: null,
      deadlineDate: '2025-12-26',
      supplier: {
        name: 'MedTech Solutions Inc.',
        contactPerson: 'Sarah Johnson',
        email: 'sarah.j@medtechsolutions.com',
        registrationNumber: 'REG-67890'
      },
      question: {
        subject: 'Payment Terms and Warranty Clarification',
        details: 'Regarding the medical equipment procurement, could you clarify: 1) Are advance payments available for equipment manufacturing? 2) What is the warranty period for calibration services? 3) Can the delivery be phased over 6 months instead of the specified 3 months?',
        attachments: ['payment_query.pdf'],
        wordCount: 52
      },
      answer: null,
      impact: {
        affectsAllBidders: true,
        tenderAmendmentRequired: false,
        costImplication: 'low',
        scheduleImpact: 'minor'
      },
      tracking: {
        viewedBy: [],
        downloadedBy: [],
        acknowledgments: 0,
        totalBidders: 4
      },
      metadata: {
        createdBy: 'procurement_officer_2',
        lastModified: '2025-12-23',
        version: '1.0',
        language: 'English',
        confidential: false
      }
    },
    {
      id: 'CLR-2025-003',
      procurementRef: 'PROC-2024-089',
      tenderRef: 'RFQ-2024-089',
      status: 'answered',
      priority: 'low',
      category: 'administrative',
      submissionDate: '2025-12-18',
      responseDate: '2025-12-19',
      deadlineDate: '2025-12-21',
      supplier: {
        name: 'TechCore Systems',
        contactPerson: 'Mike Wilson',
        email: 'mike.w@techcoresystems.com',
        registrationNumber: 'REG-11111'
      },
      question: {
        subject: 'Bid Submission Format',
        details: 'Can we submit our technical proposal in digital format only, or do you require hard copies as well? Also, what is the file size limit for digital submissions?',
        attachments: [],
        wordCount: 32
      },
      answer: {
        response: 'Digital submissions are acceptable. Please submit in PDF format with maximum file size of 10MB per document. Hard copies are not required unless specifically requested during evaluation.',
        respondedBy: 'Carlos Martinez',
        responseDate: '2025-12-19',
        attachments: ['submission_guidelines.pdf'],
        wordCount: 34,
        isPublic: true
      },
      impact: {
        affectsAllBidders: true,
        tenderAmendmentRequired: false,
        costImplication: 'none',
        scheduleImpact: 'none'
      },
      tracking: {
        viewedBy: ['supplier1', 'supplier2', 'supplier3', 'supplier4'],
        downloadedBy: ['supplier1', 'supplier3'],
        acknowledgments: 4,
        totalBidders: 4
      },
      metadata: {
        createdBy: 'procurement_officer_1',
        lastModified: '2025-12-19',
        version: '1.0',
        language: 'English',
        confidential: false
      }
    },
    {
      id: 'CLR-2024-078',
      procurementRef: 'PROC-2024-078',
      tenderRef: 'RFQ-2024-078',
      status: 'overdue',
      priority: 'high',
      category: 'legal',
      submissionDate: '2025-12-15',
      responseDate: null,
      deadlineDate: '2025-12-18',
      supplier: {
        name: 'Global Advisory Partners',
        contactPerson: 'Amanda White',
        email: 'amanda.white@globaladvisory.com',
        registrationNumber: 'REG-33333'
      },
      question: {
        subject: 'Contract Liability and Insurance Requirements',
        details: 'We need clarification on the professional indemnity insurance requirements. The tender specifies $2M coverage, but our standard policy covers $1.5M. Is this acceptable, or must we obtain additional coverage? Also, what are the liability caps for consequential damages?',
        attachments: ['insurance_policy.pdf', 'liability_concerns.pdf'],
        wordCount: 67
      },
      answer: null,
      impact: {
        affectsAllBidders: false,
        tenderAmendmentRequired: true,
        costImplication: 'high',
        scheduleImpact: 'major'
      },
      tracking: {
        viewedBy: [],
        downloadedBy: [],
        acknowledgments: 0,
        totalBidders: 3
      },
      metadata: {
        createdBy: 'procurement_officer_2',
        lastModified: '2025-12-15',
        version: '1.0',
        language: 'English',
        confidential: true
      }
    },
    {
      id: 'CLR-2025-004',
      procurementRef: 'PROC-2025-004',
      tenderRef: 'RFQ-2025-004',
      status: 'under_review',
      priority: 'medium',
      category: 'technical',
      submissionDate: '2025-12-24',
      responseDate: null,
      deadlineDate: '2025-12-27',
      supplier: {
        name: 'Infrastructure Specialists Ltd.',
        contactPerson: 'Robert Davis',
        email: 'robert.d@infraspecialists.com',
        registrationNumber: 'REG-55555'
      },
      question: {
        subject: 'Environmental Impact Assessment Requirements',
        details: 'The tender mentions environmental compliance but doesn\'t specify which standards apply. Should we follow ISO 14001 guidelines? Are there specific local environmental regulations we need to consider for this project location?',
        attachments: ['environmental_query.pdf'],
        wordCount: 41
      },
      answer: null,
      impact: {
        affectsAllBidders: true,
        tenderAmendmentRequired: false,
        costImplication: 'medium',
        scheduleImpact: 'minor'
      },
      tracking: {
        viewedBy: [],
        downloadedBy: [],
        acknowledgments: 0,
        totalBidders: 6
      },
      metadata: {
        createdBy: 'procurement_officer_1',
        lastModified: '2025-12-24',
        version: '1.0',
        language: 'English',
        confidential: false
      }
    }
  ]);

  // Response templates for different categories
  const [responseTemplates] = useState([
    {
      id: 'TECH-001',
      category: 'technical',
      title: 'Technical Specification Clarification',
      template: 'Thank you for your technical inquiry regarding [SPECIFICATION]. The requirement is [ANSWER]. Please refer to [REFERENCE] for additional details. If you need further clarification, please contact the technical team.',
      variables: ['SPECIFICATION', 'ANSWER', 'REFERENCE'],
      usage: 15,
      lastUsed: '2025-12-20'
    },
    {
      id: 'COMM-001',
      category: 'commercial',
      title: 'Payment Terms Standard Response',
      template: 'Regarding your commercial inquiry about [TOPIC], the standard terms are [TERMS]. Payment schedule follows [SCHEDULE]. For specific arrangements, please refer to Section [SECTION] of the tender document.',
      variables: ['TOPIC', 'TERMS', 'SCHEDULE', 'SECTION'],
      usage: 12,
      lastUsed: '2025-12-22'
    },
    {
      id: 'LEGAL-001',
      category: 'legal',
      title: 'Contract and Liability Response',
      template: 'Thank you for your legal inquiry. The contract requirements for [REQUIREMENT] are as specified in [CLAUSE]. Liability provisions are covered under [LIABILITY_SECTION]. Please consult with your legal team for interpretation.',
      variables: ['REQUIREMENT', 'CLAUSE', 'LIABILITY_SECTION'],
      usage: 8,
      lastUsed: '2025-12-18'
    },
    {
      id: 'ADMIN-001',
      category: 'administrative',
      title: 'Submission Requirements',
      template: 'Your administrative query regarding [TOPIC] is addressed as follows: [ANSWER]. Please ensure compliance with [REQUIREMENT]. Submission deadline remains [DEADLINE].',
      variables: ['TOPIC', 'ANSWER', 'REQUIREMENT', 'DEADLINE'],
      usage: 20,
      lastUsed: '2025-12-23'
    },
    {
      id: 'GEN-001',
      category: 'general',
      title: 'General Information Response',
      template: 'Thank you for your inquiry. The information you requested is: [INFORMATION]. Please note that [ADDITIONAL_INFO]. Should you require further assistance, please contact us.',
      variables: ['INFORMATION', 'ADDITIONAL_INFO'],
      usage: 25,
      lastUsed: '2025-12-24'
    }
  ]);

  // Publication queue for managing clarification releases
  const [publicationQueue] = useState([
    {
      id: 'PUB-001',
      clarificationId: 'CLR-2025-001',
      scheduledDate: '2025-12-25',
      status: 'scheduled',
      notificationSent: false,
      recipients: ['all_bidders'],
      publishedBy: null
    },
    {
      id: 'PUB-002',
      clarificationId: 'CLR-2025-003',
      scheduledDate: '2025-12-24',
      status: 'published',
      notificationSent: true,
      recipients: ['all_bidders'],
      publishedBy: 'Carlos Martinez'
    }
  ]);

  // Clarifications statistics
  const stats = {
    totalClarifications: clarifications.length,
    answeredClarifications: clarifications.filter(c => c.status === 'answered').length,
    pendingClarifications: clarifications.filter(c => c.status === 'pending_response' || c.status === 'under_review').length,
    overdueClarifications: clarifications.filter(c => c.status === 'overdue').length,
    highPriority: clarifications.filter(c => c.priority === 'high').length,
    technicalQuestions: clarifications.filter(c => c.category === 'technical').length,
    commercialQuestions: clarifications.filter(c => c.category === 'commercial').length,
    avgResponseTime: 2.1, // days
    publicClarifications: clarifications.filter(c => c.answer && c.answer.isPublic).length
  };

  // Filter clarifications
  const filteredClarifications = clarifications.filter(clarification => {
    const matchesSearch = clarification.question.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         clarification.question.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         clarification.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         clarification.procurementRef.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || clarification.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || clarification.category === categoryFilter;
    const matchesPriority = priorityFilter === 'all' || clarification.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesCategory && matchesPriority;
  });

  // Status configurations
  const statusConfig = {
    answered: { label: 'Answered', color: '#10b981', bg: '#d1fae5', icon: '✅' },
    pending_response: { label: 'Pending Response', color: '#f59e0b', bg: '#fef3c7', icon: '⏳' },
    under_review: { label: 'Under Review', color: '#3b82f6', bg: '#dbeafe', icon: '🔍' },
    overdue: { label: 'Overdue', color: '#ef4444', bg: '#fee2e2', icon: '⚠️' },
    draft: { label: 'Draft', color: '#6b7280', bg: '#f9fafb', icon: '📝' }
  };

  // Priority configurations
  const priorityConfig = {
    high: { label: 'High', color: '#ef4444', bg: '#fee2e2', icon: '🔴' },
    medium: { label: 'Medium', color: '#f59e0b', bg: '#fef3c7', icon: '🟡' },
    low: { label: 'Low', color: '#10b981', bg: '#d1fae5', icon: '🟢' }
  };

  // Category configurations
  const categoryConfig = {
    technical: { label: 'Technical', icon: '⚙️', color: '#3b82f6' },
    commercial: { label: 'Commercial', icon: '💰', color: '#10b981' },
    legal: { label: 'Legal', icon: '⚖️', color: '#8b5cf6' },
    administrative: { label: 'Administrative', icon: '📋', color: '#f59e0b' }
  };

  const getStatusBadge = (status) => {
    const config = statusConfig[status];
    return (
      <span 
        className="status-badge"
        style={{
          backgroundColor: config.bg,
          color: config.color,
          padding: '0.5rem 0.75rem',
          borderRadius: '20px',
          fontSize: '0.8rem',
          fontWeight: '600',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        <span>{config.icon}</span>
        {config.label}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const config = priorityConfig[priority];
    return (
      <span 
        className="priority-badge"
        style={{
          backgroundColor: config.bg,
          color: config.color,
          padding: '0.4rem 0.6rem',
          borderRadius: '16px',
          fontSize: '0.75rem',
          fontWeight: '600',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem'
        }}
      >
        <span>{config.icon}</span>
        {config.label}
      </span>
    );
  };

  const getDaysRemaining = (deadlineDate) => {
    const today = new Date();
    const deadline = new Date(deadlineDate);
    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderClarificationsTab = () => (
    <div className="clarifications-content" style={{ width: '100%', overflow: 'visible' }}>
      {/* Statistics Section */}
      <div className="stats-section" style={{ marginBottom: '30px' }}>
        <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '20px', color: '#1f2937' }}>Clarifications Overview</h2>
        <div className="stats-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
          gap: '20px',
          marginBottom: '20px'
        }}>
          <div className="stat-card" style={{
            backgroundColor: '#f8fafc',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            border: '1px solid #e2e8f0',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            ':hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }
          }}>
            <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '5px' }}>{stats.totalClarifications}</div>
            <div className="stat-label" style={{ color: '#6b7280', fontSize: '0.875rem' }}>Total Clarifications</div>
            <div className="stat-icon" style={{ fontSize: '1.5rem', marginTop: '8px' }}>❓</div>
          </div>
          <div className="stat-card" style={{
            backgroundColor: '#f0fdf4',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            border: '1px solid #bbf7d0',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}>
            <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 'bold', color: '#16a34a', marginBottom: '5px' }}>{stats.answeredClarifications}</div>
            <div className="stat-label" style={{ color: '#15803d', fontSize: '0.875rem' }}>Answered</div>
            <div className="stat-icon" style={{ fontSize: '1.5rem', marginTop: '8px' }}>✅</div>
          </div>
          <div className="stat-card" style={{
            backgroundColor: '#fef3c7',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            border: '1px solid #fde68a',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}>
            <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 'bold', color: '#d97706', marginBottom: '5px' }}>{stats.pendingClarifications}</div>
            <div className="stat-label" style={{ color: '#92400e', fontSize: '0.875rem' }}>Pending</div>
            <div className="stat-icon" style={{ fontSize: '1.5rem', marginTop: '8px' }}>⏳</div>
          </div>
          <div className="stat-card" style={{
            backgroundColor: '#fee2e2',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            border: '1px solid #fecaca',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}>
            <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 'bold', color: '#dc2626', marginBottom: '5px' }}>{stats.overdueClarifications}</div>
            <div className="stat-label" style={{ color: '#991b1b', fontSize: '0.875rem' }}>Overdue</div>
            <div className="stat-icon" style={{ fontSize: '1.5rem', marginTop: '8px' }}>⚠️</div>
          </div>
          <div className="stat-card" style={{
            backgroundColor: '#dbeafe',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            border: '1px solid #bfdbfe',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}>
            <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb', marginBottom: '5px' }}>{stats.avgResponseTime}</div>
            <div className="stat-label" style={{ color: '#1d4ed8', fontSize: '0.875rem' }}>Avg Response (Days)</div>
            <div className="stat-icon" style={{ fontSize: '1.5rem', marginTop: '8px' }}>⏱️</div>
          </div>
          <div className="stat-card" style={{
            backgroundColor: '#ecfdf5',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            border: '1px solid #a7f3d0',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}>
            <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 'bold', color: '#059669', marginBottom: '5px' }}>{stats.publicClarifications}</div>
            <div className="stat-label" style={{ color: '#047857', fontSize: '0.875rem' }}>Public Responses</div>
            <div className="stat-icon" style={{ fontSize: '1.5rem', marginTop: '8px' }}>🌐</div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section" style={{ 
        backgroundColor: '#f9fafb', 
        padding: '25px', 
        borderRadius: '12px', 
        marginBottom: '30px',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '20px',
          alignItems: 'end'
        }}>
        <div className="search-group" style={{ gridColumn: 'span 2', minWidth: '300px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>Search Clarifications</label>
          <input
            type="text"
            placeholder="Search by subject, details, supplier, or reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              ':focus': {
                outline: 'none',
                borderColor: '#3b82f6',
                boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
              }
            }}
          />
        </div>
        <div className="filter-group">
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>Status</label>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Statuses</option>
            <option value="answered">Answered</option>
            <option value="pending_response">Pending Response</option>
            <option value="under_review">Under Review</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
        <div className="filter-group">
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>Category</label>
          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="filter-select"
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Categories</option>
            <option value="technical">Technical</option>
            <option value="commercial">Commercial</option>
            <option value="legal">Legal</option>
            <option value="administrative">Administrative</option>
          </select>
        </div>
        <div className="filter-group">
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>Priority</label>
          <select 
            value={priorityFilter} 
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="filter-select"
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        </div>
      </div>

      {/* Clarifications Table */}
      <div className="table-section" style={{ width: '100%', overflow: 'auto' }}>
        <div className="table-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1f2937' }}>Clarifications Registry ({filteredClarifications.length})</h3>
          <button 
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease'
            }}
          >
            + Add Clarification
          </button>
        </div>
        
        <div className="table-container" style={{ 
          overflow: 'auto', 
          border: '1px solid #e5e7eb', 
          borderRadius: '12px',
          backgroundColor: 'white'
        }}>
          <table className="clarifications-table" style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            fontSize: '14px'
          }}>
            <thead>
              <tr>
                <th>Question Details</th>
                <th>Category</th>
                <th>Supplier Information</th>
                <th>Workflow Status</th>
                <th>Assignment & Routing</th>
                <th>Priority & Timeline</th>
                <th>Response Status</th>
                <th>Compliance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClarifications.map((clarification) => (
                <tr key={clarification.id}>
                  <td>
                    <div className="question-info">
                      <div className="clarification-ref">{clarification.id}</div>
                      <div className="question-subject">{clarification.question.subject}</div>
                      <div className="question-details">{clarification.question.details.substring(0, 100)}...</div>
                      <div className="procurement-ref">Proc: {clarification.procurementRef}</div>
                      <div className="attachments-info">
                        {clarification.question.attachments.length > 0 && 
                          `📎 ${clarification.question.attachments.length} attachment(s)`}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div 
                      className="category-badge"
                      style={{ 
                        backgroundColor: `${categoryConfig[clarification.category]?.color}15`, 
                        color: categoryConfig[clarification.category]?.color 
                      }}
                    >
                      <span className="category-icon">{categoryConfig[clarification.category]?.icon}</span>
                      {categoryConfig[clarification.category]?.label}
                    </div>
                  </td>
                  <td>
                    <div className="supplier-info">
                      <div className="supplier-name">{clarification.supplier.name}</div>
                      <div className="supplier-contact">{clarification.supplier.contactPerson}</div>
                      <div className="supplier-email">{clarification.supplier.email}</div>
                      <div className="supplier-reg">Reg: {clarification.supplier.registrationNumber}</div>
                    </div>
                  </td>
                  <td>
                    <div className="workflow-info">
                      <div className="current-stage">
                        Stage: {clarification.workflow?.currentStage || 'received'}
                      </div>
                      <div className="approval-level">
                        Approval Level: {clarification.workflow?.approvalLevel || 0}/{clarification.workflow?.approvers?.length || 1}
                      </div>
                      <div className="workflow-progress">
                        <div className="progress-steps">
                          {clarification.workflow?.routingHistory?.slice(-3).map((step, index) => (
                            <div key={index} className="progress-step completed">
                              {step.action.replace('_', ' ')}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="assignment-info">
                      <div className="assigned-to">
                        👤 Assigned: {clarification.workflow?.assignedTo || 'Unassigned'}
                      </div>
                      <div className="routed-to">
                        🔄 Routed: {clarification.routing?.routedTo?.join(', ') || 'Not routed'}
                      </div>
                      <div className="escalation-info">
                        ⚠️ Escalates in: {clarification.routing?.escalationRules?.timeThreshold || 48}h
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="timeline-info">
                      <div className="priority-display">{getPriorityBadge(clarification.priority)}</div>
                      <div className="submission-date">Submitted: {formatDate(clarification.submissionDate)}</div>
                      <div className="deadline-date">Deadline: {formatDate(clarification.deadlineDate)}</div>
                      <div className={`days-remaining ${
                        getDaysRemaining(clarification.deadlineDate) < 0 ? 'overdue' : 
                        getDaysRemaining(clarification.deadlineDate) <= 1 ? 'urgent' : ''
                      }`}>
                        {getDaysRemaining(clarification.deadlineDate) < 0 ? 
                          `${Math.abs(getDaysRemaining(clarification.deadlineDate))} days overdue` :
                          `${getDaysRemaining(clarification.deadlineDate)} days left`}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="response-info">
                      <div className="status-display">{getStatusBadge(clarification.status)}</div>
                      {clarification.answer && (
                        <>
                          <div className="response-date">Answered: {formatDate(clarification.answer.responseDate)}</div>
                          <div className="response-by">By: {clarification.answer.respondedBy}</div>
                          <div className="response-type">
                            {clarification.answer.isPublic ? '🌐 Public' : '🔒 Private'}
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="compliance-info">
                      <div className={`compliance-item ${
                        clarification.metadata?.complianceFlags?.equalTreatment ? 'compliant' : 'non-compliant'
                      }`}>
                        ⚖️ Equal Treatment
                      </div>
                      <div className={`compliance-item ${
                        clarification.metadata?.complianceFlags?.timelyResponse ? 'compliant' : 'non-compliant'
                      }`}>
                        ⏱️ Timely Response
                      </div>
                      <div className={`compliance-item ${
                        clarification.metadata?.complianceFlags?.auditTrail ? 'compliant' : 'non-compliant'
                      }`}>
                        📋 Audit Trail
                      </div>
                      {clarification.metadata?.documentUpdates?.length > 0 && (
                        <div className="document-updates">
                          📄 {clarification.metadata.documentUpdates.length} linked doc(s)
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="actions-cell">
                    <div className="action-buttons">
                      <button className="action-btn" title="View Details">👁️</button>
                      <button className="action-btn" title="Respond">💬</button>
                      <button className="action-btn" title="Route/Assign">🔄</button>
                      <button className="action-btn" title="Approve">✅</button>
                      <button className="action-btn" title="Publish">📢</button>
                      <button className="action-btn" title="Audit Trail">📋</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderTemplatesTab = () => (
    <div className="templates-section">
      <div className="templates-header">
        <h2 className="section-title">Response Templates</h2>
        <button className="btn btn-primary">+ Create Template</button>
      </div>
      
      <div className="templates-stats">
        <div className="template-stats-grid">
          <div className="stat-card">
            <div className="stat-value">{responseTemplates.length}</div>
            <div className="stat-label">Total Templates</div>
            <div className="stat-icon">📝</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{responseTemplates.reduce((acc, t) => acc + t.usage, 0)}</div>
            <div className="stat-label">Total Usage</div>
            <div className="stat-icon">📊</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{responseTemplates.filter(t => t.category === 'technical').length}</div>
            <div className="stat-label">Technical</div>
            <div className="stat-icon">⚙️</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{responseTemplates.filter(t => t.category === 'commercial').length}</div>
            <div className="stat-label">Commercial</div>
            <div className="stat-icon">💰</div>
          </div>
        </div>
      </div>

      <div className="templates-grid">
        {responseTemplates.map((template) => (
          <div key={template.id} className="template-card">
            <div className="template-header">
              <div className="template-title">{template.title}</div>
              <div 
                className="template-category"
                style={{ 
                  backgroundColor: `${categoryConfig[template.category]?.color}15`, 
                  color: categoryConfig[template.category]?.color 
                }}
              >
                {categoryConfig[template.category]?.icon} {categoryConfig[template.category]?.label}
              </div>
            </div>
            
            <div className="template-content">
              <div className="template-text">{template.template}</div>
              
              <div className="template-variables">
                <strong>Variables:</strong>
                <div className="variables-list">
                  {template.variables.map((variable, index) => (
                    <span key={index} className="variable-tag">[{variable}]</span>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="template-footer">
              <div className="template-usage">
                <span className="usage-count">Used {template.usage} times</span>
                <span className="last-used">Last: {formatDate(template.lastUsed)}</span>
              </div>
              <div className="template-actions">
                <button className="action-btn" title="Edit Template">✏️</button>
                <button className="action-btn" title="Use Template">📋</button>
                <button className="action-btn" title="Duplicate">📄</button>
                <button className="action-btn" title="Delete">🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPublicationTab = () => (
    <div className="publication-section">
      <div className="publication-header">
        <h2 className="section-title">Publication Management</h2>
        <div className="publication-controls">
          <button className="btn btn-primary">Schedule Publication</button>
          <button className="btn btn-secondary">Bulk Notify</button>
        </div>
      </div>
      
      <div className="publication-stats">
        <div className="pub-stats-grid">
          <div className="stat-card">
            <div className="stat-value">{publicationQueue.filter(p => p.status === 'scheduled').length}</div>
            <div className="stat-label">Scheduled</div>
            <div className="stat-icon">⏰</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{publicationQueue.filter(p => p.status === 'published').length}</div>
            <div className="stat-label">Published</div>
            <div className="stat-icon">✅</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{publicationQueue.filter(p => p.notificationSent).length}</div>
            <div className="stat-label">Notifications Sent</div>
            <div className="stat-icon">📧</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.publicClarifications}</div>
            <div className="stat-label">Public Responses</div>
            <div className="stat-icon">🌐</div>
          </div>
        </div>
      </div>

      <div className="publication-settings">
        <h3>Publication Settings</h3>
        <div className="settings-grid">
          <div className="setting-item">
            <label>
              <input 
                type="checkbox" 
                checked={publicationSettings.autoPublish}
                onChange={(e) => setPublicationSettings({...publicationSettings, autoPublish: e.target.checked})}
              />
              Auto-publish responses
            </label>
          </div>
          <div className="setting-item">
            <label>
              <input 
                type="checkbox" 
                checked={publicationSettings.notifyAllBidders}
                onChange={(e) => setPublicationSettings({...publicationSettings, notifyAllBidders: e.target.checked})}
              />
              Notify all bidders automatically
            </label>
          </div>
          <div className="setting-item">
            <label>Publication delay (hours):</label>
            <input 
              type="number" 
              value={publicationSettings.publishDelay}
              onChange={(e) => setPublicationSettings({...publicationSettings, publishDelay: parseInt(e.target.value)})}
              min="0"
              max="72"
            />
          </div>
        </div>
      </div>

      <div className="publication-queue">
        <h3>Publication Queue</h3>
        <div className="queue-table">
          <table className="publication-table">
            <thead>
              <tr>
                <th>Clarification</th>
                <th>Scheduled Date</th>
                <th>Status</th>
                <th>Recipients</th>
                <th>Notifications</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {publicationQueue.map((item) => {
                const clarification = clarifications.find(c => c.id === item.clarificationId);
                return (
                  <tr key={item.id}>
                    <td>
                      <div className="clarification-ref">{item.clarificationId}</div>
                      <div className="clarification-subject">{clarification?.question.subject}</div>
                    </td>
                    <td>{formatDate(item.scheduledDate)}</td>
                    <td>
                      <span className={`status-badge status-${item.status}`}>
                        {item.status === 'published' ? '✅' : '⏰'} {item.status}
                      </span>
                    </td>
                    <td>{item.recipients.join(', ')}</td>
                    <td>
                      {item.notificationSent ? '✅ Sent' : '⏳ Pending'}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="action-btn" title="Edit">✏️</button>
                        <button className="action-btn" title="Publish Now">📢</button>
                        <button className="action-btn" title="Cancel">❌</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderWorkflowTab = () => (
    <div className="workflow-section">
      <div className="workflow-header">
        <h2 className="section-title">Workflow Management</h2>
        <div className="workflow-controls">
          <button className="btn btn-primary">Auto-Route Rules</button>
          <button className="btn btn-secondary">Approval Settings</button>
        </div>
      </div>
      
      {/* Workflow Stats */}
      <div className="workflow-stats">
        <div className="workflow-stats-grid">
          <div className="stat-card urgent">
            <div className="stat-value">3</div>
            <div className="stat-label">Pending Assignment</div>
            <div className="stat-icon">⚠️</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">2</div>
            <div className="stat-label">Awaiting Approval</div>
            <div className="stat-icon">👥</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">1</div>
            <div className="stat-label">Overdue Responses</div>
            <div className="stat-icon">⏰</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">5</div>
            <div className="stat-label">Assigned to Me</div>
            <div className="stat-icon">👤</div>
          </div>
        </div>
      </div>

      {/* Routing & Assignment */}
      <div className="routing-section">
        <h3>Routing & Assignment</h3>
        <div className="routing-rules">
          <div className="rule-card">
            <div className="rule-header">
              <span className="rule-category">⚙️ Technical Questions</span>
              <span className="rule-status active">Active</span>
            </div>
            <div className="rule-content">
              <strong>Route to:</strong> Technical Team → Engineering Director<br/>
              <strong>Approval:</strong> Technical Director → Procurement Manager<br/>
              <strong>Deadline:</strong> 48 hours
            </div>
          </div>
          
          <div className="rule-card">
            <div className="rule-header">
              <span className="rule-category">💰 Commercial Questions</span>
              <span className="rule-status active">Active</span>
            </div>
            <div className="rule-content">
              <strong>Route to:</strong> Commercial Team → Finance Director<br/>
              <strong>Approval:</strong> Commercial Director → Legal Review<br/>
              <strong>Deadline:</strong> 24 hours
            </div>
          </div>
          
          <div className="rule-card">
            <div className="rule-header">
              <span className="rule-category">⚖️ Legal Questions</span>
              <span className="rule-status active">Active</span>
            </div>
            <div className="rule-content">
              <strong>Route to:</strong> Legal Team → Senior Legal Counsel<br/>
              <strong>Approval:</strong> Legal Director → Compliance Officer<br/>
              <strong>Deadline:</strong> 72 hours
            </div>
          </div>
        </div>
      </div>

      {/* Approval Workflow */}
      <div className="approval-section">
        <h3>Multi-Level Approval Workflow</h3>
        <div className="approval-stages">
          <div className="stage-card">
            <div className="stage-number">1</div>
            <div className="stage-info">
              <div className="stage-title">Initial Review</div>
              <div className="stage-role">Subject Matter Expert</div>
              <div className="stage-action">Draft Response</div>
            </div>
          </div>
          <div className="stage-arrow">→</div>
          <div className="stage-card">
            <div className="stage-number">2</div>
            <div className="stage-info">
              <div className="stage-title">Technical Approval</div>
              <div className="stage-role">Department Director</div>
              <div className="stage-action">Approve Content</div>
            </div>
          </div>
          <div className="stage-arrow">→</div>
          <div className="stage-card">
            <div className="stage-number">3</div>
            <div className="stage-info">
              <div className="stage-title">Final Approval</div>
              <div className="stage-role">Procurement Manager</div>
              <div className="stage-action">Authorize Publication</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderComplianceTab = () => (
    <div className="compliance-section">
      <div className="compliance-header">
        <h2 className="section-title">Compliance & Equal Treatment</h2>
        <div className="compliance-controls">
          <button className="btn btn-primary">Generate Audit Report</button>
          <button className="btn btn-secondary">Export Compliance Log</button>
        </div>
      </div>
      
      {/* Compliance Metrics */}
      <div className="compliance-stats">
        <div className="compliance-stats-grid">
          <div className="stat-card success">
            <div className="stat-value">100%</div>
            <div className="stat-label">Equal Treatment</div>
            <div className="stat-icon">⚖️</div>
          </div>
          <div className="stat-card success">
            <div className="stat-value">95%</div>
            <div className="stat-label">Timely Responses</div>
            <div className="stat-icon">⏱️</div>
          </div>
          <div className="stat-card success">
            <div className="stat-value">100%</div>
            <div className="stat-label">Audit Trail</div>
            <div className="stat-icon">📋</div>
          </div>
          <div className="stat-card warning">
            <div className="stat-value">2</div>
            <div className="stat-label">Late Responses</div>
            <div className="stat-icon">⚠️</div>
          </div>
        </div>
      </div>

      {/* Audit Trail */}
      <div className="audit-section">
        <h3>Complete Audit Trail</h3>
        <div className="audit-log">
          {clarifications.map((clarification) => (
            <div key={clarification.id} className="audit-entry">
              <div className="audit-header">
                <span className="audit-id">{clarification.id}</span>
                <span className="audit-status">{clarification.status}</span>
              </div>
              <div className="audit-trail">
                {clarification.workflow?.routingHistory.map((entry, index) => (
                  <div key={index} className="trail-item">
                    <span className="trail-date">{formatDate(entry.date)}</span>
                    <span className="trail-user">{entry.user}</span>
                    <span className="trail-action">{entry.action}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Document Links & Updates */}
      <div className="document-links-section">
        <h3>Document Updates & Addenda</h3>
        <div className="document-grid">
          <div className="document-card">
            <div className="document-icon">📄</div>
            <div className="document-info">
              <div className="document-title">Addendum 001 - Technical Specifications</div>
              <div className="document-link">Linked to CLR-2025-001</div>
              <div className="document-impact">All bidders notified</div>
            </div>
          </div>
          <div className="document-card">
            <div className="document-icon">📄</div>
            <div className="document-info">
              <div className="document-title">Corrigendum 002 - Payment Terms</div>
              <div className="document-link">Linked to CLR-2025-002</div>
              <div className="document-impact">Notification pending</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="analytics-section">
      <h2 className="section-title">Clarifications Analytics</h2>
      <div className="analytics-grid">
        <div className="analytics-card">
          <h3>Category Distribution</h3>
          <div className="category-chart">
            <div className="chart-item">
              <span>⚙️ Technical</span>
              <span>{stats.technicalQuestions}</span>
            </div>
            <div className="chart-item">
              <span>💰 Commercial</span>
              <span>{stats.commercialQuestions}</span>
            </div>
            <div className="chart-item">
              <span>⚖️ Legal</span>
              <span>1</span>
            </div>
            <div className="chart-item">
              <span>📋 Administrative</span>
              <span>1</span>
            </div>
          </div>
        </div>
        
        <div className="analytics-card">
          <h3>Response Performance</h3>
          <div className="performance-metrics">
            <div className="metric">
              <span className="metric-label">Response Rate</span>
              <span className="metric-value">{Math.round((stats.answeredClarifications / stats.totalClarifications) * 100)}%</span>
            </div>
            <div className="metric">
              <span className="metric-label">Avg Response Time</span>
              <span className="metric-value">{stats.avgResponseTime} days</span>
            </div>
            <div className="metric">
              <span className="metric-label">Public Responses</span>
              <span className="metric-value">{stats.publicClarifications}/{stats.answeredClarifications}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <StandardLayout title="Clarifications Management">
      <div className="page-container" style={{ 
        width: '100%', 
        minHeight: '100vh',
        overflow: 'visible',
        padding: '20px',
        boxSizing: 'border-box',
        backgroundColor: '#f8fafc'
      }}>
        <div className="page-header" style={{ marginBottom: '30px' }}>
          <h1 className="page-title" style={{ 
            fontSize: '2rem', 
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span className="title-icon">❓</span>
            Clarifications Management
          </h1>
          <p className="page-subtitle" style={{ 
            color: '#666', 
            fontSize: '1.1rem',
            margin: 0
          }}>
            Manage supplier queries, responses, and clarifications following STEP methodology
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="nav-tabs" style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '30px',
          borderBottom: '2px solid #e5e7eb',
          paddingBottom: '15px'
        }}>
          <button 
            className={`nav-tab ${activeView === 'clarifications' ? 'active' : ''}`}
            onClick={() => setActiveView('clarifications')}
            style={{
              padding: '12px 20px',
              border: 'none',
              backgroundColor: activeView === 'clarifications' ? '#3b82f6' : '#f8fafc',
              color: activeView === 'clarifications' ? 'white' : '#374151',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              ':hover': {
                backgroundColor: activeView === 'clarifications' ? '#2563eb' : '#e2e8f0'
              }
            }}
          >
            ❓ Clarifications Registry
          </button>
          <button 
            className={`nav-tab ${activeView === 'workflow' ? 'active' : ''}`}
            onClick={() => setActiveView('workflow')}
            style={{
              padding: '12px 20px',
              border: 'none',
              backgroundColor: activeView === 'workflow' ? '#3b82f6' : '#f8fafc',
              color: activeView === 'workflow' ? 'white' : '#374151',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
          >
            🔄 Workflow Management
          </button>
          <button 
            className={`nav-tab ${activeView === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveView('analytics')}
            style={{
              padding: '12px 20px',
              border: 'none',
              backgroundColor: activeView === 'analytics' ? '#3b82f6' : '#f8fafc',
              color: activeView === 'analytics' ? 'white' : '#374151',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
          >
            📊 Analytics
          </button>
          <button 
            className={`nav-tab ${activeView === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveView('templates')}
            style={{
              padding: '12px 20px',
              border: 'none',
              backgroundColor: activeView === 'templates' ? '#3b82f6' : '#f8fafc',
              color: activeView === 'templates' ? 'white' : '#374151',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
          >
            📝 Response Templates
          </button>
          <button 
            className={`nav-tab ${activeView === 'publication' ? 'active' : ''}`}
            onClick={() => setActiveView('publication')}
            style={{
              padding: '12px 20px',
              border: 'none',
              backgroundColor: activeView === 'publication' ? '#3b82f6' : '#f8fafc',
              color: activeView === 'publication' ? 'white' : '#374151',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
          >
            📢 Publication
          </button>
          <button 
            className={`nav-tab ${activeView === 'compliance' ? 'active' : ''}`}
            onClick={() => setActiveView('compliance')}
            style={{
              padding: '12px 20px',
              border: 'none',
              backgroundColor: activeView === 'compliance' ? '#3b82f6' : '#f8fafc',
              color: activeView === 'compliance' ? 'white' : '#374151',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
          >
            ⚖️ Compliance
          </button>
        </div>

        {/* Content based on active view */}
        <div style={{ 
          width: '100%',
          overflow: 'visible',
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '25px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          minHeight: '800px'
        }}>
        {activeView === 'clarifications' && renderClarificationsTab()}
        {activeView === 'workflow' && renderWorkflowTab()}
        {activeView === 'analytics' && renderAnalyticsTab()}
        {activeView === 'templates' && renderTemplatesTab()}
        {activeView === 'publication' && renderPublicationTab()}
        {activeView === 'compliance' && renderComplianceTab()}
        </div>

        {/* Modal for new clarification */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content clarification-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Add New Clarification</h3>
                <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
              </div>
              
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Procurement Reference *</label>
                    <input
                      type="text"
                      value={newClarification.procurementRef}
                      onChange={(e) => setNewClarification({...newClarification, procurementRef: e.target.value})}
                      placeholder="PROC-2025-XXX"
                      className="form-input"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Tender Reference *</label>
                    <input
                      type="text"
                      value={newClarification.tenderRef}
                      onChange={(e) => setNewClarification({...newClarification, tenderRef: e.target.value})}
                      placeholder="RFQ-2025-XXX"
                      className="form-input"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Priority *</label>
                    <select
                      value={newClarification.priority}
                      onChange={(e) => setNewClarification({...newClarification, priority: e.target.value})}
                      className="form-select"
                    >
                      <option value="high">High Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="low">Low Priority</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Category *</label>
                    <select
                      value={newClarification.category}
                      onChange={(e) => setNewClarification({...newClarification, category: e.target.value})}
                      className="form-select"
                    >
                      <option value="technical">Technical</option>
                      <option value="commercial">Commercial</option>
                      <option value="legal">Legal</option>
                      <option value="administrative">Administrative</option>
                    </select>
                  </div>
                </div>
                
                <div className="supplier-section">
                  <h4>Supplier Information</h4>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Company Name *</label>
                      <input
                        type="text"
                        value={newClarification.supplier.name}
                        onChange={(e) => setNewClarification({...newClarification, supplier: {...newClarification.supplier, name: e.target.value}})}
                        className="form-input"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Contact Person *</label>
                      <input
                        type="text"
                        value={newClarification.supplier.contactPerson}
                        onChange={(e) => setNewClarification({...newClarification, supplier: {...newClarification.supplier, contactPerson: e.target.value}})}
                        className="form-input"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Email *</label>
                      <input
                        type="email"
                        value={newClarification.supplier.email}
                        onChange={(e) => setNewClarification({...newClarification, supplier: {...newClarification.supplier, email: e.target.value}})}
                        className="form-input"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Registration Number</label>
                      <input
                        type="text"
                        value={newClarification.supplier.registrationNumber}
                        onChange={(e) => setNewClarification({...newClarification, supplier: {...newClarification.supplier, registrationNumber: e.target.value}})}
                        className="form-input"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="question-section">
                  <h4>Question Details</h4>
                  <div className="form-group">
                    <label>Subject *</label>
                    <input
                      type="text"
                      value={newClarification.question.subject}
                      onChange={(e) => setNewClarification({...newClarification, question: {...newClarification.question, subject: e.target.value}})}
                      className="form-input"
                      placeholder="Brief description of the clarification request"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Question Details *</label>
                    <textarea
                      value={newClarification.question.details}
                      onChange={(e) => setNewClarification({...newClarification, question: {...newClarification.question, details: e.target.value}})}
                      className="form-textarea"
                      rows="4"
                      placeholder="Detailed description of the clarification request..."
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Attachments</label>
                    <div className="file-upload-area">
                      <div className="upload-placeholder">
                        📎 Drag files here or click to browse
                        <input type="file" multiple style={{display: 'none'}} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button onClick={() => {
                  // Here you would typically save the clarification
                  console.log('Saving clarification:', newClarification);
                  setShowModal(false);
                  // Reset form
                  setNewClarification({
                    procurementRef: '',
                    tenderRef: '',
                    priority: 'medium',
                    category: 'technical',
                    supplier: { name: '', contactPerson: '', email: '', registrationNumber: '' },
                    question: { subject: '', details: '', attachments: [] }
                  });
                }} className="btn btn-primary">
                  Save Clarification
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </StandardLayout>
  );
}

