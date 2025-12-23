/**
 * API Service Layer
 * Handles all API calls and data retrieval
 * Mock data for development; replace with real endpoints for production
 */

// Mock data
const mockTimeline = [
  {
    id: 1,
    timestamp: '2025-01-15T10:30:00Z',
    category: 'planning',
    title: 'Procurement Initiated',
    description: 'Procurement request submitted for approval',
    actor: 'John Smith',
    details: {
      amount: 150000,
      department: 'Operations',
      justification: 'Equipment maintenance',
    },
  },
  {
    id: 2,
    timestamp: '2025-01-16T14:15:00Z',
    category: 'template',
    title: 'Template Created',
    description: 'RFQ template created for review',
    actor: 'Sarah Johnson',
    details: {
      templateName: 'Standard Procurement',
      questions: 25,
    },
  },
  {
    id: 3,
    timestamp: '2025-01-18T09:45:00Z',
    category: 'rfq',
    title: 'RFQ Released',
    description: 'Request for Quotation sent to suppliers',
    actor: 'Mike Chen',
    details: {
      recipients: 5,
      deadline: '2025-02-01',
    },
  },
  {
    id: 4,
    timestamp: '2025-01-20T11:20:00Z',
    category: 'clarification',
    title: 'Clarification Requested',
    description: 'Supplier requested clarification on specs',
    actor: 'Lisa Anderson',
    details: {
      supplier: 'TechCorp Ltd',
      question: 'Technical specifications',
    },
  },
  {
    id: 5,
    timestamp: '2025-01-22T16:30:00Z',
    category: 'submission',
    title: 'Submission Received',
    description: 'Supplier submission received and logged',
    actor: 'Robert Davis',
    details: {
      supplier: 'TechCorp Ltd',
      submissionId: 'SUB-001',
      amount: 148500,
    },
  },
  {
    id: 6,
    timestamp: '2025-01-24T13:00:00Z',
    category: 'submission',
    title: 'Submission Received',
    description: 'Supplier submission received and logged',
    actor: 'Robert Davis',
    details: {
      supplier: 'Global Solutions Inc',
      submissionId: 'SUB-002',
      amount: 152000,
    },
  },
  {
    id: 7,
    timestamp: '2025-01-27T10:15:00Z',
    category: 'evaluation',
    title: 'Evaluation Started',
    description: 'Bid evaluation process initiated',
    actor: 'Emma Wilson',
    details: {
      evaluators: 3,
      criteria: 4,
      startDate: '2025-01-27',
    },
  },
  {
    id: 8,
    timestamp: '2025-01-30T15:45:00Z',
    category: 'evaluation',
    title: 'Evaluation Complete',
    description: 'All evaluations completed and compiled',
    actor: 'Emma Wilson',
    details: {
      winner: 'TechCorp Ltd',
      score: 8.7,
    },
  },
  {
    id: 9,
    timestamp: '2025-02-01T09:30:00Z',
    category: 'approval',
    title: 'Approval Requested',
    description: 'Evaluation results awaiting approval',
    actor: 'Tom Harris',
    details: {
      approvalLevel: 'Manager',
      priority: 'High',
    },
  },
  {
    id: 10,
    timestamp: '2025-02-03T11:00:00Z',
    category: 'award',
    title: 'Award Issued',
    description: 'Contract awarded to TechCorp Ltd',
    actor: 'Patricia Brown',
    details: {
      awardAmount: 148500,
      contractId: 'CNT-001',
      startDate: '2025-02-10',
    },
  },
];

const mockDocuments = [
  {
    id: 1,
    name: 'RFQ-001-v1',
    type: 'rfq',
    category: 'Procurement',
    uploadedBy: 'Mike Chen',
    uploadedAt: '2025-01-18T09:45:00Z',
    lastModified: '2025-01-20T14:30:00Z',
    version: 1,
    status: 'published',
    hash: 'sha256_abc123def456',
    approvals: [
      { approver: 'Sarah Johnson', date: '2025-01-18T10:00:00Z', status: 'approved' },
    ],
    changes: [
      'Added technical specifications',
      'Updated evaluation criteria',
    ],
  },
  {
    id: 2,
    name: 'SUBMISSION-SUB-001',
    type: 'submission',
    category: 'Supplier',
    uploadedBy: 'John Supplier (TechCorp)',
    uploadedAt: '2025-01-22T15:20:00Z',
    lastModified: '2025-01-22T15:20:00Z',
    version: 1,
    status: 'submitted',
    hash: 'sha256_ghi789jkl012',
    approvals: [
      { approver: 'Robert Davis', date: '2025-01-22T16:00:00Z', status: 'approved' },
    ],
    changes: ['Initial submission'],
  },
  {
    id: 3,
    name: 'EVALUATION-REPORT-001',
    type: 'evaluation',
    category: 'Assessment',
    uploadedBy: 'Emma Wilson',
    uploadedAt: '2025-01-27T14:30:00Z',
    lastModified: '2025-01-30T15:45:00Z',
    version: 2,
    status: 'final',
    hash: 'sha256_mno345pqr678',
    approvals: [
      { approver: 'Tom Harris', date: '2025-02-01T10:00:00Z', status: 'approved' },
    ],
    changes: [
      'Updated scoring methodology',
      'Added supplier feedback',
      'Final recommendations',
    ],
  },
  {
    id: 4,
    name: 'CONTRACT-001',
    type: 'contract',
    category: 'Legal',
    uploadedBy: 'Patricia Brown',
    uploadedAt: '2025-02-01T11:30:00Z',
    lastModified: '2025-02-02T13:00:00Z',
    version: 1,
    status: 'draft',
    hash: 'sha256_stu901vwx234',
    approvals: [],
    changes: ['Contract terms', 'Payment schedules'],
  },
  {
    id: 5,
    name: 'COMPLIANCE-CHECK-001',
    type: 'compliance',
    category: 'Regulatory',
    uploadedBy: 'Lisa Anderson',
    uploadedAt: '2025-01-20T09:00:00Z',
    lastModified: '2025-01-20T09:00:00Z',
    version: 1,
    status: 'approved',
    hash: 'sha256_yza567bcd890',
    approvals: [
      { approver: 'Legal Dept', date: '2025-01-20T14:30:00Z', status: 'approved' },
    ],
    changes: ['Initial compliance review'],
  },
  {
    id: 6,
    name: 'PO-DRAFT-001',
    type: 'po',
    category: 'Order',
    uploadedBy: 'Robert Davis',
    uploadedAt: '2025-02-02T10:15:00Z',
    lastModified: '2025-02-02T10:15:00Z',
    version: 1,
    status: 'draft',
    hash: 'sha256_efg123hij456',
    approvals: [],
    changes: ['Purchase order details', 'Delivery terms'],
  },
];

const mockComplianceData = {
  summary: {
    totalChecks: 25,
    passed: 21,
    failed: 4,
    complianceScore: 84,
    riskLevel: 'medium',
    lastReviewDate: '2025-02-02T10:00:00Z',
  },
  checks: [
    { id: 1, name: 'Supplier Certification', passed: true, category: 'Qualification' },
    { id: 2, name: 'Financial Stability', passed: true, category: 'Financial' },
    { id: 3, name: 'Insurance Coverage', passed: true, category: 'Insurance' },
    { id: 4, name: 'Environmental Compliance', passed: false, category: 'Environmental' },
    { id: 5, name: 'Labor Practice Compliance', passed: true, category: 'Labor' },
    { id: 6, name: 'Data Protection', passed: true, category: 'Data Security' },
    { id: 7, name: 'Quality Management', passed: true, category: 'Quality' },
    { id: 8, name: 'Safety Standards', passed: true, category: 'Safety' },
    { id: 9, name: 'Regulatory Licensing', passed: true, category: 'Regulatory' },
    { id: 10, name: 'Tax Compliance', passed: true, category: 'Tax' },
    { id: 11, name: 'Conflict of Interest', passed: true, category: 'Ethical' },
    { id: 12, name: 'Anti-bribery Policy', passed: true, category: 'Ethical' },
    { id: 13, name: 'Sanctions Check', passed: true, category: 'Legal' },
    { id: 14, name: 'Document Verification', passed: false, category: 'Documentation' },
    { id: 15, name: 'Audit Trail', passed: true, category: 'Audit' },
    { id: 16, name: 'Contract Terms', passed: true, category: 'Contract' },
    { id: 17, name: 'Payment Terms', passed: true, category: 'Financial' },
    { id: 18, name: 'Delivery Schedule', passed: true, category: 'Delivery' },
    { id: 19, name: 'Performance Metrics', passed: true, category: 'Performance' },
    { id: 20, name: 'Warranty Coverage', passed: true, category: 'Warranty' },
    { id: 21, name: 'Liability Limits', passed: false, category: 'Legal' },
    { id: 22, name: 'Insurance Limits', passed: true, category: 'Insurance' },
    { id: 23, name: 'Background Check', passed: true, category: 'Personnel' },
    { id: 24, name: 'Reference Verification', passed: false, category: 'References' },
    { id: 25, name: 'Capacity Assessment', passed: true, category: 'Capability' },
  ],
  issues: [
    {
      id: 1,
      title: 'Missing Environmental Certificate',
      description: 'Supplier does not have ISO 14001 certification',
      severity: 'major',
      status: 'open',
      affectedArea: 'Environmental Compliance',
      discoveredDate: '2025-01-28T10:00:00Z',
      foundBy: 'Compliance Team',
      relatedChecks: [4],
      recommendedAction: 'Request ISO 14001 certification within 30 days',
    },
    {
      id: 2,
      title: 'Document Discrepancy',
      description: 'Submitted documents do not match original RFQ requirements',
      severity: 'warning',
      status: 'under-review',
      affectedArea: 'Documentation',
      discoveredDate: '2025-01-30T14:30:00Z',
      foundBy: 'Document Auditor',
      relatedChecks: [14],
      recommendedAction: 'Request resubmission of corrected documents',
    },
    {
      id: 3,
      title: 'Liability Limits Below Threshold',
      description: 'Proposed liability limits are lower than procurement requirements',
      severity: 'critical',
      status: 'escalated',
      affectedArea: 'Legal Terms',
      discoveredDate: '2025-02-01T09:15:00Z',
      foundBy: 'Legal Team',
      relatedChecks: [21],
      recommendedAction: 'Escalate to procurement manager for negotiation',
    },
    {
      id: 4,
      title: 'Reference Not Verified',
      description: 'One of three provided references did not respond to verification',
      severity: 'info',
      status: 'monitoring',
      affectedArea: 'References',
      discoveredDate: '2025-02-02T11:00:00Z',
      foundBy: 'HR Department',
      relatedChecks: [24],
      recommendedAction: 'Request additional reference from supplier',
    },
    {
      id: 5,
      title: 'Insurance Expiration Date',
      description: 'General liability insurance expires within 60 days',
      severity: 'warning',
      status: 'open',
      affectedArea: 'Insurance Coverage',
      discoveredDate: '2025-01-25T08:30:00Z',
      foundBy: 'Insurance Reviewer',
      relatedChecks: [3],
      recommendedAction: 'Track renewal; request proof of renewal before contract start',
    },
    {
      id: 6,
      title: 'Financial Health Concern',
      description: 'Recent audit shows declining profit margins',
      severity: 'warning',
      status: 'under-review',
      affectedArea: 'Financial Stability',
      discoveredDate: '2025-01-29T13:45:00Z',
      foundBy: 'Finance Team',
      relatedChecks: [2],
      recommendedAction: 'Request latest financial statements and business plan',
    },
    {
      id: 7,
      title: 'Quality Management Pending',
      description: 'Supplier is in process of implementing ISO 9001 standard',
      severity: 'info',
      status: 'monitoring',
      affectedArea: 'Quality Assurance',
      discoveredDate: '2025-01-27T10:20:00Z',
      foundBy: 'Quality Assurance',
      relatedChecks: [7],
      recommendedAction: 'Track implementation progress; may require regular audits',
    },
  ],
};

const mockApprovals = [
  {
    id: 1,
    procurementId: 'PROC-001',
    documentType: 'evaluation',
    documentName: 'Evaluation Report - Bid Analysis',
    submittedBy: 'Emma Wilson',
    submittedAt: '2025-02-01T14:30:00Z',
    status: 'pending',
    priority: 'critical',
    dueDate: '2025-02-04T17:00:00Z',
    dependencies: [],
    summary: 'Evaluation results for 3 supplier bids require approval before award',
  },
  {
    id: 2,
    procurementId: 'PROC-001',
    documentType: 'contract',
    documentName: 'Contract Terms - TechCorp Ltd',
    submittedBy: 'Patricia Brown',
    submittedAt: '2025-02-02T10:00:00Z',
    status: 'pending',
    priority: 'high',
    dueDate: '2025-02-05T17:00:00Z',
    dependencies: [1],
    summary: 'Contract terms negotiated with selected supplier requiring legal review',
  },
  {
    id: 3,
    procurementId: 'PROC-002',
    documentType: 'approval',
    documentName: 'Purchase Requisition Approval',
    submittedBy: 'John Smith',
    submittedAt: '2025-02-02T11:30:00Z',
    status: 'pending',
    priority: 'high',
    dueDate: '2025-02-03T17:00:00Z',
    dependencies: [],
    summary: 'Budget approval required for equipment procurement ($75,000)',
  },
  {
    id: 4,
    procurementId: 'PROC-003',
    documentType: 'rfq',
    documentName: 'RFQ Template - Standard Services',
    submittedBy: 'Mike Chen',
    submittedAt: '2025-01-31T09:00:00Z',
    status: 'approved',
    priority: 'medium',
    dueDate: '2025-02-02T17:00:00Z',
    dependencies: [],
    summary: 'RFQ template already approved (processed)',
  },
  {
    id: 5,
    procurementId: 'PROC-001',
    documentType: 'po',
    documentName: 'Purchase Order - Equipment',
    submittedBy: 'Robert Davis',
    submittedAt: '2025-02-02T15:45:00Z',
    status: 'pending',
    priority: 'medium',
    dueDate: '2025-02-07T17:00:00Z',
    dependencies: [2],
    summary: 'Purchase order requires finance approval before issuance',
  },
  {
    id: 6,
    procurementId: 'PROC-004',
    documentType: 'compliance',
    documentName: 'Compliance Review - All Checks',
    submittedBy: 'Lisa Anderson',
    submittedAt: '2025-02-02T12:00:00Z',
    status: 'pending',
    priority: 'critical',
    dueDate: '2025-02-04T12:00:00Z',
    dependencies: [],
    summary: 'Compliance issues require management review and sign-off',
  },
];

const mockApprovalHistory = [
  {
    id: 1,
    procurementId: 'PROC-001',
    documentType: 'template',
    documentName: 'RFQ Template - v1',
    submittedBy: 'Sarah Johnson',
    submittedAt: '2025-01-18T10:00:00Z',
    approvedBy: 'Mike Chen',
    actionDate: '2025-01-18T11:30:00Z',
    action: 'approved',
    decision: 'Approved',
    comments: 'Template looks good. All sections properly formatted.',
    conditions: null,
  },
  {
    id: 2,
    procurementId: 'PROC-001',
    documentType: 'rfq',
    documentName: 'RFQ - Equipment Procurement',
    submittedBy: 'Mike Chen',
    submittedAt: '2025-01-18T14:00:00Z',
    approvedBy: 'Sarah Johnson',
    actionDate: '2025-01-19T09:00:00Z',
    action: 'approved',
    decision: 'Approved',
    comments: 'Ready for release. All specifications verified.',
    conditions: null,
  },
  {
    id: 3,
    procurementId: 'PROC-001',
    documentType: 'submission',
    documentName: 'Submission - TechCorp Ltd',
    submittedBy: 'Robert Davis',
    submittedAt: '2025-01-22T16:00:00Z',
    approvedBy: 'Lisa Anderson',
    actionDate: '2025-01-22T17:30:00Z',
    action: 'approved',
    decision: 'Approved',
    comments: 'Submission verified and logged in system.',
    conditions: null,
  },
  {
    id: 4,
    procurementId: 'PROC-001',
    documentType: 'evaluation',
    documentName: 'Evaluation Results - Round 1',
    submittedBy: 'Emma Wilson',
    submittedAt: '2025-01-30T15:45:00Z',
    approvedBy: 'Tom Harris',
    actionDate: '2025-02-01T10:15:00Z',
    action: 'approved',
    decision: 'Approved with Conditions',
    comments: 'Results look acceptable. Please verify final scoring with TechCorp.',
    conditions:
      'Confirm technical specifications met. Schedule final review meeting.',
  },
  {
    id: 5,
    procurementId: 'PROC-001',
    documentType: 'evaluation',
    documentName: 'Evaluation Results - Round 2',
    submittedBy: 'Emma Wilson',
    submittedAt: '2025-02-01T14:30:00Z',
    approvedBy: 'Patricia Brown',
    actionDate: '2025-02-02T11:00:00Z',
    action: 'changes-requested',
    decision: 'Changes Requested',
    comments: 'Need clarification on scoring methodology for price evaluation.',
    conditions: null,
  },
  {
    id: 6,
    procurementId: 'PROC-001',
    documentType: 'evaluation',
    documentName: 'Evaluation Results - Final',
    submittedBy: 'Emma Wilson',
    submittedAt: '2025-02-02T14:45:00Z',
    approvedBy: 'Tom Harris',
    actionDate: '2025-02-03T09:30:00Z',
    action: 'approved',
    decision: 'Approved',
    comments: 'Final evaluation results approved. TechCorp Ltd selected as winner.',
    conditions: null,
  },
  {
    id: 7,
    procurementId: 'PROC-001',
    documentType: 'contract',
    documentName: 'Contract Draft - TechCorp Ltd',
    submittedBy: 'Patricia Brown',
    submittedAt: '2025-02-03T10:00:00Z',
    approvedBy: 'Legal Dept',
    actionDate: null,
    action: 'pending',
    decision: 'Pending Review',
    comments: null,
    conditions: null,
  },
];

// API Service Methods

/**
 * Get timeline events
 * @param {string} procurementId - Procurement ID
 * @returns {Promise} Timeline events
 */
const getTimeline = async (procurementId) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockTimeline), 500);
  });
};

/**
 * Get document audit trail
 * @param {string} procurementId - Procurement ID
 * @returns {Promise} Documents
 */
const getDocuments = async (procurementId) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockDocuments), 500);
  });
};

/**
 * Get compliance data
 * @param {string} procurementId - Procurement ID
 * @returns {Promise} Compliance data
 */
const getComplianceData = async (procurementId) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockComplianceData), 500);
  });
};

/**
 * Get approvals
 * @param {object} filters - Filter criteria
 * @returns {Promise} Approvals
 */
const getApprovals = async (filters = {}) => {
  return new Promise((resolve) => {
    let results = mockApprovals;

    if (filters.status) {
      results = results.filter((a) => a.status === filters.status);
    }

    if (filters.priority) {
      results = results.filter((a) => a.priority === filters.priority);
    }

    setTimeout(() => resolve(results), 500);
  });
};

/**
 * Get approval history
 * @param {string} procurementId - Procurement ID
 * @returns {Promise} Approval history
 */
const getApprovalHistory = async (procurementId) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockApprovalHistory), 500);
  });
};

/**
 * Create approval
 * @param {object} approval - Approval data
 * @returns {Promise} Created approval
 */
const createApproval = async (approval) => {
  return new Promise((resolve) => {
    setTimeout(
      () =>
        resolve({
          ...approval,
          id: mockApprovals.length + 1,
          createdAt: new Date().toISOString(),
        }),
      500
    );
  });
};

/**
 * Update approval
 * @param {number} id - Approval ID
 * @param {object} updates - Updates to apply
 * @returns {Promise} Updated approval
 */
const updateApproval = async (id, updates) => {
  return new Promise((resolve) => {
    const approval = mockApprovals.find((a) => a.id === id);
    setTimeout(
      () =>
        resolve({
          ...approval,
          ...updates,
          updatedAt: new Date().toISOString(),
        }),
      500
    );
  });
};

module.exports = {
  getTimeline,
  getDocuments,
  getComplianceData,
  getApprovals,
  getApprovalHistory,
  createApproval,
  updateApproval,
};
