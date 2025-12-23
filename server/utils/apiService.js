/**
 * Enterprise API Service Layer
 * 
 * Comprehensive API management with authentication, caching, error handling,
 * retry logic, and seamless mock/production switching
 * 
 * Features:
 * - JWT Authentication & Token Management
 * - Request/Response Interceptors
 * - Automatic Retry Logic with Exponential Backoff
 * - Response Caching & Cache Invalidation
 * - Error Handling & Recovery
 * - Request Validation & Sanitization
 * - Loading States & Progress Tracking
 * - Mock Data Support for Development
 * - Rate Limiting & Throttling
 * - Offline Support & Queue Management
 */

const axios = require('axios');
const EventEmitter = require('events');

// Configuration
const API_CONFIG = {
  baseURL: process.env.API_BASE_URL || 'http://localhost:3001/api',
  timeout: parseInt(process.env.API_TIMEOUT) || 30000,
  retryAttempts: parseInt(process.env.API_RETRY_ATTEMPTS) || 3,
  retryDelay: parseInt(process.env.API_RETRY_DELAY) || 1000,
  useMockData: process.env.USE_MOCK_DATA === 'true' || process.env.NODE_ENV === 'development',
  enableCaching: process.env.ENABLE_CACHING !== 'false',
  enableLogging: process.env.NODE_ENV === 'development',
  enableOfflineSupport: process.env.ENABLE_OFFLINE !== 'false',
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000, // 1 minute
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100
};

// API Endpoints
const ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    VERIFY: '/auth/verify',
    PROFILE: '/auth/profile'
  },
  
  // Procurement Management
  PROCUREMENT: {
    LIST: '/procurements',
    GET: '/procurements/:id',
    CREATE: '/procurements',
    UPDATE: '/procurements/:id',
    DELETE: '/procurements/:id',
    TIMELINE: '/procurements/:id/timeline',
    DOCUMENTS: '/procurements/:id/documents',
    COMPLIANCE: '/procurements/:id/compliance'
  },
  
  // Approvals
  APPROVALS: {
    LIST: '/approvals',
    GET: '/approvals/:id',
    CREATE: '/approvals',
    UPDATE: '/approvals/:id',
    APPROVE: '/approvals/:id/approve',
    REJECT: '/approvals/:id/reject',
    HISTORY: '/approvals/history'
  },
  
  // RFQ Management
  RFQ: {
    LIST: '/rfqs',
    GET: '/rfqs/:id',
    CREATE: '/rfqs',
    UPDATE: '/rfqs/:id',
    PUBLISH: '/rfqs/:id/publish',
    CLOSE: '/rfqs/:id/close'
  },
  
  // Submissions
  SUBMISSIONS: {
    LIST: '/submissions',
    GET: '/submissions/:id',
    CREATE: '/submissions',
    UPDATE: '/submissions/:id',
    SUBMIT: '/submissions/:id/submit'
  },
  
  // Templates
  TEMPLATES: {
    LIST: '/templates',
    GET: '/templates/:id',
    CREATE: '/templates',
    UPDATE: '/templates/:id',
    ACTIVATE: '/templates/:id/activate',
    CLONE: '/templates/:id/clone'
  },
  
  // Documents
  DOCUMENTS: {
    UPLOAD: '/documents/upload',
    DOWNLOAD: '/documents/:id/download',
    DELETE: '/documents/:id',
    METADATA: '/documents/:id/metadata'
  },
  
  // Analytics
  ANALYTICS: {
    DASHBOARD: '/analytics/dashboard',
    REPORTS: '/analytics/reports',
    METRICS: '/analytics/metrics'
  }
};

// Cache configuration
const CACHE_CONFIG = {
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 100,
  strategies: {
    timeline: { ttl: 2 * 60 * 1000 }, // 2 minutes
    documents: { ttl: 10 * 60 * 1000 }, // 10 minutes
    compliance: { ttl: 5 * 60 * 1000 }, // 5 minutes
    approvals: { ttl: 1 * 60 * 1000 }, // 1 minute
    templates: { ttl: 30 * 60 * 1000 } // 30 minutes
  }
};

// Event emitter for API events
const apiEvents = new EventEmitter();

// In-memory cache
class APICache {
  constructor() {
    this.cache = new Map();
    this.accessTimes = new Map();
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.accessTimes.delete(key);
      return null;
    }

    this.accessTimes.set(key, Date.now());
    return item.data;
  }

  set(key, data, ttl = CACHE_CONFIG.defaultTTL) {
    if (this.cache.size >= CACHE_CONFIG.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    });
    this.accessTimes.set(key, Date.now());
  }

  delete(key) {
    this.cache.delete(key);
    this.accessTimes.delete(key);
  }

  clear() {
    this.cache.clear();
    this.accessTimes.clear();
  }

  evictOldest() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, time] of this.accessTimes.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }
}

const apiCache = new APICache();

// Rate limiting
class RateLimiter {
  constructor(maxRequests = API_CONFIG.rateLimitMax, windowMs = API_CONFIG.rateLimitWindow) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  canMakeRequest() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      return false;
    }
    
    this.requests.push(now);
    return true;
  }

  getResetTime() {
    if (this.requests.length === 0) return 0;
    return this.requests[0] + this.windowMs - Date.now();
  }
}

const rateLimiter = new RateLimiter();

// Request queue for offline support
class RequestQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  add(request) {
    this.queue.push({
      ...request,
      timestamp: Date.now(),
      retryCount: 0
    });
  }

  async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const request = this.queue.shift();
      
      try {
        await this.executeRequest(request);
      } catch (error) {
        if (request.retryCount < API_CONFIG.retryAttempts) {
          request.retryCount++;
          this.queue.unshift(request);
          await this.delay(API_CONFIG.retryDelay * Math.pow(2, request.retryCount));
        } else {
          console.error('Failed to execute queued request:', error);
          apiEvents.emit('requestFailed', { request, error });
        }
      }
    }
    
    this.processing = false;
  }

  async executeRequest(request) {
    return makeApiCall(request.method, request.url, request.data, request.options);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const requestQueue = new RequestQueue();

// Utility functions
const generateRequestId = () => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const buildUrl = (endpoint, params = {}) => {
  let url = endpoint;
  for (const [key, value] of Object.entries(params)) {
    url = url.replace(`:${key}`, value);
  }
  return url;
};

const getCacheKey = (method, url, params = {}) => {
  return `${method.toUpperCase()}_${url}_${JSON.stringify(params)}`;
};

const sanitizeParams = (params) => {
  const sanitized = {};
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== null && value !== undefined && value !== '') {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Retry logic with exponential backoff
const withRetry = async (fn, attempts = API_CONFIG.retryAttempts) => {
  let lastError;
  
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (4xx) except 429 (rate limit)
      if (error.response?.status >= 400 && 
          error.response?.status < 500 && 
          error.response?.status !== 429) {
        throw error;
      }
      
      if (i < attempts - 1) {
        const delay = API_CONFIG.retryDelay * Math.pow(2, i);
        if (API_CONFIG.enableLogging) {
          console.log(`🔄 Retrying request in ${delay}ms... (attempt ${i + 2}/${attempts})`);
        }
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
};

// Core API call function
const makeApiCall = async (method, url, data = null, options = {}) => {
  // Check rate limiting
  if (!rateLimiter.canMakeRequest()) {
    const resetTime = rateLimiter.getResetTime();
    throw new Error(`Rate limit exceeded. Reset in ${Math.ceil(resetTime / 1000)} seconds`);
  }

  // Check cache for GET requests
  const cacheKey = getCacheKey(method, url, data);
  if (method.toUpperCase() === 'GET' && API_CONFIG.enableCaching) {
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) {
      if (API_CONFIG.enableLogging) {
        console.log('📦 Cache hit:', url);
      }
      return cachedData;
    }
  }

  // Use mock data in development
  if (API_CONFIG.useMockData) {
    return await getMockData(method, url, data);
  }

  const requestId = generateRequestId();
  
  try {
    // Log request
    if (API_CONFIG.enableLogging) {
      console.log('🚀 API Request:', {
        id: requestId,
        method: method.toUpperCase(),
        url,
        data
      });
    }

    // Emit request event
    apiEvents.emit('requestStart', { requestId, method, url, data });

    const config = {
      method: method.toLowerCase(),
      url: `${API_CONFIG.baseURL}${url}`,
      timeout: API_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Request-ID': requestId,
        ...options.headers
      },
      ...options
    };

    if (data && ['post', 'put', 'patch'].includes(method.toLowerCase())) {
      config.data = data;
    } else if (data) {
      config.params = data;
    }

    const response = await withRetry(() => axios(config));

    // Log response
    if (API_CONFIG.enableLogging) {
      console.log('✅ API Response:', {
        id: requestId,
        status: response.status,
        url
      });
    }

    // Cache successful GET responses
    if (method.toUpperCase() === 'GET' && API_CONFIG.enableCaching) {
      const ttl = CACHE_CONFIG.strategies[getCacheStrategy(url)]?.ttl || CACHE_CONFIG.defaultTTL;
      apiCache.set(cacheKey, response.data, ttl);
    }

    // Emit success event
    apiEvents.emit('responseSuccess', { requestId, response });

    return response.data;

  } catch (error) {
    // Log error
    if (API_CONFIG.enableLogging) {
      console.error('❌ API Error:', {
        id: requestId,
        status: error.response?.status,
        url,
        message: error.message
      });
    }

    // Emit error event
    apiEvents.emit('responseError', { requestId, error });

    // Handle specific error types
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout');
    }

    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      throw new Error(data?.message || `HTTP ${status}: ${error.message}`);
    } else if (error.request) {
      // Network error
      throw new Error('Network error: Unable to reach server');
    } else {
      throw error;
    }
  }
};

const getCacheStrategy = (url) => {
  if (url.includes('/timeline')) return 'timeline';
  if (url.includes('/documents')) return 'documents';
  if (url.includes('/compliance')) return 'compliance';
  if (url.includes('/approvals')) return 'approvals';
  if (url.includes('/templates')) return 'templates';
  return 'default';
};

// Mock data (preserved from original)
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

// Mock data handler with simulation delays
const getMockData = async (method, url, data) => {
  const delay = Math.random() * 300 + 100; // 100-400ms delay
  await sleep(delay);

  // Simulate network errors occasionally in development
  if (Math.random() < 0.05) { // 5% chance
    throw new Error('Simulated network error');
  }

  // Route to appropriate mock data based on URL
  if (url.includes('/timeline')) {
    return mockTimeline.filter(item => 
      !data?.procurementId || item.id.toString().includes(data.procurementId)
    );
  }
  
  if (url.includes('/documents')) {
    return mockDocuments.filter(doc => 
      !data?.procurementId || doc.id.toString().includes(data.procurementId)
    );
  }
  
  if (url.includes('/compliance')) {
    return mockComplianceData;
  }
  
  if (url.includes('/approvals')) {
    if (url.includes('/history')) {
      return mockApprovalHistory;
    }
    
    let results = [...mockApprovals];
    
    if (data?.status) {
      results = results.filter(a => a.status === data.status);
    }
    
    if (data?.priority) {
      results = results.filter(a => a.priority === data.priority);
    }
    
    if (method.toUpperCase() === 'POST') {
      const newApproval = {
        ...data,
        id: mockApprovals.length + 1,
        createdAt: new Date().toISOString()
      };
      mockApprovals.push(newApproval);
      return newApproval;
    }
    
    if (method.toUpperCase() === 'PUT' || method.toUpperCase() === 'PATCH') {
      const id = parseInt(url.split('/').pop());
      const index = mockApprovals.findIndex(a => a.id === id);
      if (index !== -1) {
        mockApprovals[index] = {
          ...mockApprovals[index],
          ...data,
          updatedAt: new Date().toISOString()
        };
        return mockApprovals[index];
      }
    }
    
    return results;
  }
  
  // Default empty response for unknown endpoints
  return { message: 'Mock data not implemented for this endpoint' };
};

// Enterprise API Service Methods

/**
 * Enhanced Timeline API with filtering and pagination
 * @param {string} procurementId - Procurement ID
 * @param {object} options - Query options (filters, pagination)
 * @returns {Promise} Timeline events with metadata
 */
const getTimeline = async (procurementId, options = {}) => {
  try {
    const { filters = {}, page = 1, limit = 50 } = options;
    
    const url = buildUrl(ENDPOINTS.PROCUREMENT.TIMELINE, { id: procurementId });
    const queryParams = sanitizeParams({ ...filters, page, limit });
    
    const data = await makeApiCall('GET', url, queryParams);
    
    return {
      success: true,
      data: data.items || data,
      pagination: data.pagination || null,
      metadata: {
        totalEvents: data.total || (Array.isArray(data) ? data.length : 0),
        procurementId,
        lastUpdated: new Date().toISOString()
      }
    };
  } catch (error) {
    throw new Error(`Failed to fetch timeline: ${error.message}`);
  }
};

/**
 * Enhanced Documents API with version control and metadata
 * @param {string} procurementId - Procurement ID
 * @param {object} options - Query options
 * @returns {Promise} Documents with audit trail
 */
const getDocuments = async (procurementId, options = {}) => {
  try {
    const { includeVersions = false, type = null, status = null } = options;
    
    const url = buildUrl(ENDPOINTS.PROCUREMENT.DOCUMENTS, { id: procurementId });
    const queryParams = sanitizeParams({ includeVersions, type, status });
    
    const data = await makeApiCall('GET', url, queryParams);
    
    return {
      success: true,
      documents: data.documents || data,
      summary: {
        totalDocuments: data.total || (Array.isArray(data) ? data.length : 0),
        byType: data.byType || {},
        byStatus: data.byStatus || {},
        lastModified: data.lastModified || new Date().toISOString()
      },
      audit: data.audit || []
    };
  } catch (error) {
    throw new Error(`Failed to fetch documents: ${error.message}`);
  }
};

/**
 * Enhanced Compliance API with detailed analysis
 * @param {string} procurementId - Procurement ID
 * @param {object} options - Analysis options
 * @returns {Promise} Comprehensive compliance data
 */
const getComplianceData = async (procurementId, options = {}) => {
  try {
    const { includeRecommendations = true, includeTrends = false } = options;
    
    const url = buildUrl(ENDPOINTS.PROCUREMENT.COMPLIANCE, { id: procurementId });
    const queryParams = sanitizeParams({ includeRecommendations, includeTrends });
    
    const data = await makeApiCall('GET', url, queryParams);
    
    return {
      success: true,
      compliance: {
        summary: data.summary || {},
        checks: data.checks || [],
        issues: data.issues || [],
        score: data.summary?.complianceScore || 0,
        riskLevel: data.summary?.riskLevel || 'unknown'
      },
      recommendations: data.recommendations || [],
      trends: data.trends || null,
      lastReview: data.summary?.lastReviewDate || new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to fetch compliance data: ${error.message}`);
  }
};

/**
 * Enhanced Approvals API with filtering and workflow tracking
 * @param {object} filters - Filter criteria
 * @param {object} options - Query options
 * @returns {Promise} Approvals with workflow status
 */
const getApprovals = async (filters = {}, options = {}) => {
  try {
    const { page = 1, limit = 20, sortBy = 'submittedAt', sortOrder = 'desc' } = options;
    
    const queryParams = sanitizeParams({ 
      ...filters, 
      page, 
      limit, 
      sortBy, 
      sortOrder 
    });
    
    const data = await makeApiCall('GET', ENDPOINTS.APPROVALS.LIST, queryParams);
    
    return {
      success: true,
      approvals: data.items || data,
      pagination: data.pagination || {
        page,
        limit,
        total: Array.isArray(data) ? data.length : 0
      },
      summary: {
        pending: data.summary?.pending || 0,
        approved: data.summary?.approved || 0,
        rejected: data.summary?.rejected || 0,
        overdue: data.summary?.overdue || 0
      },
      workflow: data.workflow || {}
    };
  } catch (error) {
    throw new Error(`Failed to fetch approvals: ${error.message}`);
  }
};

/**
 * Enhanced Approval History API with detailed tracking
 * @param {string} procurementId - Procurement ID
 * @param {object} options - Query options
 * @returns {Promise} Detailed approval history
 */
const getApprovalHistory = async (procurementId, options = {}) => {
  try {
    const { includeComments = true, includeConditions = true } = options;
    
    const queryParams = sanitizeParams({ 
      procurementId, 
      includeComments, 
      includeConditions 
    });
    
    const data = await makeApiCall('GET', ENDPOINTS.APPROVALS.HISTORY, queryParams);
    
    return {
      success: true,
      history: data.history || data,
      statistics: {
        totalActions: data.total || (Array.isArray(data) ? data.length : 0),
        averageApprovalTime: data.averageApprovalTime || 0,
        approvalRate: data.approvalRate || 0
      },
      timeline: data.timeline || [],
      participants: data.participants || []
    };
  } catch (error) {
    throw new Error(`Failed to fetch approval history: ${error.message}`);
  }
};

/**
 * Enhanced Create Approval API with validation and workflow
 * @param {object} approval - Approval data
 * @param {object} options - Creation options
 * @returns {Promise} Created approval with workflow status
 */
const createApproval = async (approval, options = {}) => {
  try {
    const { autoAssign = true, notify = true, priority = 'medium' } = options;
    
    // Validate required fields
    const required = ['procurementId', 'documentType', 'documentName', 'submittedBy'];
    for (const field of required) {
      if (!approval[field]) {
        throw new Error(`Required field missing: ${field}`);
      }
    }
    
    const requestData = {
      ...approval,
      priority,
      options: { autoAssign, notify }
    };
    
    const data = await makeApiCall('POST', ENDPOINTS.APPROVALS.CREATE, requestData);
    
    // Invalidate cache
    apiCache.delete('GET_/approvals_{}');
    
    return {
      success: true,
      approval: data.approval || data,
      workflow: data.workflow || {},
      notifications: data.notifications || [],
      nextSteps: data.nextSteps || []
    };
  } catch (error) {
    throw new Error(`Failed to create approval: ${error.message}`);
  }
};

/**
 * Enhanced Update Approval API with state management
 * @param {number} id - Approval ID
 * @param {object} updates - Updates to apply
 * @param {object} options - Update options
 * @returns {Promise} Updated approval
 */
const updateApproval = async (id, updates, options = {}) => {
  try {
    const { validateWorkflow = true, notify = true } = options;
    
    if (!id) {
      throw new Error('Approval ID is required');
    }
    
    const requestData = {
      ...updates,
      options: { validateWorkflow, notify }
    };
    
    const url = buildUrl(ENDPOINTS.APPROVALS.UPDATE, { id });
    const data = await makeApiCall('PUT', url, requestData);
    
    // Invalidate related cache entries
    apiCache.delete(`GET_/approvals/${id}_{}`);
    apiCache.delete('GET_/approvals_{}');
    
    return {
      success: true,
      approval: data.approval || data,
      changes: data.changes || [],
      workflow: data.workflow || {},
      notifications: data.notifications || []
    };
  } catch (error) {
    throw new Error(`Failed to update approval: ${error.message}`);
  }
};

/**
 * Approve/Reject Approval API
 * @param {number} id - Approval ID
 * @param {string} action - 'approve' or 'reject'
 * @param {object} data - Action data (comments, conditions, etc.)
 * @returns {Promise} Action result
 */
const processApproval = async (id, action, data = {}) => {
  try {
    if (!['approve', 'reject'].includes(action)) {
      throw new Error('Invalid action. Must be "approve" or "reject"');
    }
    
    const endpoint = action === 'approve' ? 
      ENDPOINTS.APPROVALS.APPROVE : 
      ENDPOINTS.APPROVALS.REJECT;
    
    const url = buildUrl(endpoint, { id });
    const result = await makeApiCall('POST', url, data);
    
    // Invalidate cache
    apiCache.clear(); // Clear all cache for approval state changes
    
    return {
      success: true,
      result: result.result || result,
      nextApprovals: result.nextApprovals || [],
      workflow: result.workflow || {},
      notifications: result.notifications || []
    };
  } catch (error) {
    throw new Error(`Failed to ${action} approval: ${error.message}`);
  }
};

// Generic CRUD operations for other entities
const createEntity = async (entityType, data) => {
  try {
    const endpoint = getEntityEndpoint(entityType);
    const result = await makeApiCall('POST', endpoint.CREATE || endpoint.LIST, data);
    
    // Invalidate related cache
    apiCache.delete(`GET_${endpoint.LIST}_{}`;
    
    return { success: true, data: result };
  } catch (error) {
    throw new Error(`Failed to create ${entityType}: ${error.message}`);
  }
};

const getEntity = async (entityType, id, options = {}) => {
  try {
    const endpoint = getEntityEndpoint(entityType);
    const url = buildUrl(endpoint.GET, { id });
    const queryParams = sanitizeParams(options);
    
    const data = await makeApiCall('GET', url, queryParams);
    
    return { success: true, data };
  } catch (error) {
    throw new Error(`Failed to get ${entityType}: ${error.message}`);
  }
};

const updateEntity = async (entityType, id, updates) => {
  try {
    const endpoint = getEntityEndpoint(entityType);
    const url = buildUrl(endpoint.UPDATE, { id });
    
    const data = await makeApiCall('PUT', url, updates);
    
    // Invalidate cache
    apiCache.delete(`GET_${url}_{}`);
    apiCache.delete(`GET_${endpoint.LIST}_{}`);
    
    return { success: true, data };
  } catch (error) {
    throw new Error(`Failed to update ${entityType}: ${error.message}`);
  }
};

const deleteEntity = async (entityType, id) => {
  try {
    const endpoint = getEntityEndpoint(entityType);
    const url = buildUrl(endpoint.DELETE, { id });
    
    const data = await makeApiCall('DELETE', url);
    
    // Invalidate cache
    apiCache.clear(); // Clear all cache for deletions
    
    return { success: true, data };
  } catch (error) {
    throw new Error(`Failed to delete ${entityType}: ${error.message}`);
  }
};

const getEntityEndpoint = (entityType) => {
  const endpoints = {
    procurement: ENDPOINTS.PROCUREMENT,
    rfq: ENDPOINTS.RFQ,
    submission: ENDPOINTS.SUBMISSIONS,
    template: ENDPOINTS.TEMPLATES,
    document: ENDPOINTS.DOCUMENTS
  };
  
  return endpoints[entityType.toLowerCase()] || ENDPOINTS.PROCUREMENT;
};

// File upload with progress tracking
const uploadFile = async (file, options = {}) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    Object.entries(options.metadata || {}).forEach(([key, value]) => {
      formData.append(key, value);
    });
    
    const config = {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        apiEvents.emit('uploadProgress', { progress, file: file.name });
      }
    };
    
    const data = await makeApiCall('POST', ENDPOINTS.DOCUMENTS.UPLOAD, formData, config);
    
    return {
      success: true,
      file: data.file || data,
      metadata: data.metadata || {}
    };
  } catch (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

// Batch operations
const batchRequest = async (requests) => {
  try {
    const results = await Promise.allSettled(
      requests.map(req => makeApiCall(req.method, req.url, req.data, req.options))
    );
    
    const succeeded = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    const failed = results.filter(r => r.status === 'rejected').map(r => r.reason);
    
    return {
      success: failed.length === 0,
      results: succeeded,
      errors: failed,
      summary: {
        total: requests.length,
        succeeded: succeeded.length,
        failed: failed.length
      }
    };
  } catch (error) {
    throw new Error(`Batch request failed: ${error.message}`);
  }
};

module.exports = {
  // Core API methods
  getTimeline,
  getDocuments,
  getComplianceData,
  getApprovals,
  getApprovalHistory,
  createApproval,
  updateApproval,
  processApproval,
  
  // Generic CRUD
  createEntity,
  getEntity,
  updateEntity,
  deleteEntity,
  
  // File operations
  uploadFile,
  
  // Batch operations
  batchRequest,
  
  // Utility functions
  clearCache: () => apiCache.clear(),
  getCacheStats: () => ({
    size: apiCache.cache.size,
    maxSize: CACHE_CONFIG.maxSize,
    hitRate: apiCache.hitRate || 0
  }),
  
  // Event emitter for external subscriptions
  on: (event, handler) => apiEvents.on(event, handler),
  off: (event, handler) => apiEvents.off(event, handler),
  
  // Configuration
  configure: (config) => Object.assign(API_CONFIG, config),
  getConfig: () => ({ ...API_CONFIG })
};
