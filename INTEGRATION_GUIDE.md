# Integration Guide for Utility Files

This guide explains how to integrate the newly created utility files with the React components and backend services.

## Quick Start

### Basic Import Pattern

```javascript
// Import everything from utils
const utils = require('../server/utils');

// Or import specific modules
const { dateUtils, formatUtils, statusConfig } = require('../server/utils');

// Or import individual functions
const { formatDate, formatCurrency } = require('../server/utils');
```

## Component Integration

### 1. ApprovalQueue.jsx Integration

**Current State:** Component uses inline mock data and formatting

**Changes Needed:**
```javascript
// Add imports at top
import { getApprovals } from '../../utils/apiService';
import { calculateTimeRemaining, getRelativeTime } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/formatUtils';
import { getStatusConfig, getPriorityConfig } from '../../utils/statusConfig';

// Replace mock data loading
useEffect(() => {
  const loadApprovals = async () => {
    setLoading(true);
    try {
      const data = await getApprovals({ status: filterStatus });
      setApprovals(data);
    } catch (error) {
      console.error('Failed to load approvals:', error);
    }
    setLoading(false);
  };
  loadApprovals();
}, [filterStatus]);

// Use utilities in render
const timeLeft = calculateTimeRemaining(approval.dueDate);
const statusCfg = getStatusConfig(approval.status);
const priorityCfg = getPriorityConfig(approval.priority);

// In JSX
<span style={{ color: statusCfg.color }}>{statusCfg.label}</span>
<span style={{ color: priorityCfg.color }}>{priorityCfg.label}</span>
<span>{timeLeft.formatted}</span>
<span>{formatCurrency(approval.estimatedAmount)}</span>
```

### 2. ApprovalForm.jsx Integration

**Current State:** Component uses inline validation

**Changes Needed:**
```javascript
// Add imports
import { validateForm, validateScore } = from '../../utils/validationUtils';
import { getStatusConfig } = from '../../utils/statusConfig';

// Create validation schema
const validationSchema = {
  approvalComments: {
    required: action === 'rejected',
    minLength: 10,
    maxLength: 500,
    label: 'Approval Comments',
  },
  score: {
    type: 'score',
    required: action === 'approved',
    label: 'Quality Score',
  },
};

// Validate on submit
const handleSubmit = () => {
  const validation = validateForm(formData, validationSchema);
  if (!validation.isValid) {
    setErrors(validation.errors);
    return;
  }
  // Submit form
};
```

### 3. TimelineView.jsx Integration

**Current State:** Component has inline event data

**Changes Needed:**
```javascript
// Add imports
import { getTimeline } = from '../../utils/apiService';
import { getRelativeTime } = from '../../utils/dateUtils';
import { getCategoryConfig } = from '../../utils/statusConfig';
import { analyzeTimeline } = from '../../utils/procurementHelpers';

// Load data
useEffect(() => {
  const loadData = async () => {
    setLoading(true);
    try {
      const timeline = await getTimeline(procurementId);
      setEvents(timeline);
      
      // Use business logic utilities
      const metrics = analyzeTimeline(timeline);
      setMetrics(metrics);
    } catch (error) {
      console.error('Failed to load timeline:', error);
    }
    setLoading(false);
  };
  loadData();
}, [procurementId]);

// Use utilities in render
const categoryCfg = getCategoryConfig(event.category);
<span style={{ color: categoryCfg.color }}>{categoryCfg.label}</span>
<span>{getRelativeTime(event.timestamp)}</span>
```

### 4. DocumentAuditView.jsx Integration

**Current State:** Component has inline mock data

**Changes Needed:**
```javascript
// Add imports
import { getDocuments } = from '../../utils/apiService';
import { formatDate, getRelativeTime } = from '../../utils/dateUtils';
import { formatFileSize } = from '../../utils/formatUtils';
import { getStatusConfig, getDocumentTypeConfig } = from '../../utils/statusConfig';

// Load data
useEffect(() => {
  const loadDocuments = async () => {
    const docs = await getDocuments(procurementId);
    setDocuments(docs);
  };
  loadDocuments();
}, [procurementId]);

// Use utilities
const typeCfg = getDocumentTypeConfig(doc.type);
const statusCfg = getStatusConfig(doc.status);
<span style={{ color: statusCfg.color }}>{statusCfg.label}</span>
<span>{formatFileSize(doc.size)}</span>
<span>{formatDate(doc.lastModified)}</span>
```

### 5. ComplianceAuditView.jsx Integration

**Current State:** Component has inline mock data

**Changes Needed:**
```javascript
// Add imports
import { getComplianceData } = from '../../utils/apiService';
import { calculateComplianceScore } = from '../../utils/procurementHelpers';
import { getSeverityConfig } = from '../../utils/statusConfig';
import { formatPercentage } = from '../../utils/formatUtils';

// Load and analyze data
useEffect(() => {
  const loadCompliance = async () => {
    const data = await getComplianceData(procurementId);
    setComplianceData(data);
    
    // Calculate score
    const scoreData = calculateComplianceScore(data);
    setComplianceScore(scoreData);
  };
  loadCompliance();
}, [procurementId]);

// Use utilities
const severityCfg = getSeverityConfig(issue.severity);
<span style={{ color: severityCfg.color }}>{severityCfg.label}</span>
<span>{formatPercentage(complianceData.summary.passed / complianceData.summary.totalChecks)}</span>
```

### 6. ScoringForm.jsx Integration

**Current State:** Component uses inline scoring logic

**Changes Needed:**
```javascript
// Add imports
import { calculateWeightedScore } = from '../../utils/procurementHelpers';
import { validateScore } = from '../../utils/validationUtils';
import { getScoreRating } = from '../../utils/statusConfig';
import { formatScore } = from '../../utils/formatUtils';

// Validate scores
const handleScoreChange = (criteriaId, value) => {
  const validation = validateScore(value);
  if (!validation.isValid) {
    setErrors({ ...errors, [criteriaId]: validation.error });
  } else {
    setScores({ ...scores, [criteriaId]: value });
    
    // Calculate weighted score
    const result = calculateWeightedScore(scores, scoringCriteria);
    setWeightedScore(result.totalScore);
    
    // Get rating
    const rating = getScoreRating(result.totalScore * 10);
    setRating(rating);
  }
};

// Display formatted score
<span>{formatScore(weightedScore)}</span>
<span style={{ color: rating.color }}>{rating.label}</span>
```

### 7. ApprovalHistory.jsx Integration

**Current State:** Component has inline mock data

**Changes Needed:**
```javascript
// Add imports
import { getApprovalHistory } = from '../../utils/apiService';
import { analyzeApprovals } = from '../../utils/procurementHelpers';
import { formatDuration, formatDate } = from '../../utils/dateUtils';
import { getStatusConfig } = from '../../utils/statusConfig';

// Load data
useEffect(() => {
  const loadHistory = async () => {
    const history = await getApprovalHistory(procurementId);
    setHistory(history);
    
    // Analyze metrics
    const metrics = analyzeApprovals(history);
    setMetrics(metrics);
  };
  loadHistory();
}, [procurementId]);

// Use utilities
const statusCfg = getStatusConfig(record.action);
const duration = formatDuration(record.submittedAt, record.actionDate);
<span>{formatDate(record.submittedAt)}</span>
<span>{duration}</span>
```

## Backend Service Integration

### 1. Replace Mock Data with Real APIs

**Current:** `apiService.js` returns mock data

**Update to:**
```javascript
// dateUtils.js - Using real endpoints
const getTimeline = async (procurementId) => {
  try {
    const response = await fetch(`/api/procurement/${procurementId}/timeline`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch timeline:', error);
    throw error;
  }
};

// Add error handling and retries
const withRetry = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

### 2. Add Request Interceptors

```javascript
// Add auth headers to all requests
const makeRequest = async (url, options = {}) => {
  const token = localStorage.getItem('authToken');
  
  const defaultOptions = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  
  const response = await fetch(url, {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...(options.headers || {}),
    },
  });
  
  if (response.status === 401) {
    // Handle token expiry
    window.location.href = '/login';
  }
  
  return response.json();
};
```

### 3. Add Error Handling

```javascript
// Create error wrapper
const apiCall = async (fn, context = 'API Call') => {
  try {
    return await fn();
  } catch (error) {
    console.error(`${context} failed:`, error);
    // Send to error logging service
    logError({
      message: error.message,
      context,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};
```

## Usage Patterns

### Pattern 1: Loading Data with Utilities

```javascript
// In component
useEffect(() => {
  const loadData = async () => {
    try {
      const approvals = await getApprovals({ status: 'pending' });
      
      // Transform using utilities
      const transformed = approvals.map(approval => ({
        ...approval,
        formattedAmount: formatCurrency(approval.amount),
        timeRemaining: calculateTimeRemaining(approval.dueDate),
        statusConfig: getStatusConfig(approval.status),
      }));
      
      setData(transformed);
    } catch (error) {
      setError(error);
    }
  };
  
  loadData();
}, []);
```

### Pattern 2: Form Validation with Utilities

```javascript
// In form component
const handleSubmit = async (formData) => {
  // Validate
  const validation = validateForm(formData, validationSchema);
  if (!validation.isValid) {
    setErrors(validation.errors);
    return;
  }
  
  // Submit
  try {
    const result = await apiService.createApproval(formData);
    // Success handling
  } catch (error) {
    setError(error.message);
  }
};
```

### Pattern 3: Displaying Formatted Data

```javascript
// In render
<div>
  <span style={{ 
    color: getStatusConfig(item.status).color 
  }}>
    {getStatusConfig(item.status).label}
  </span>
  
  <span>
    {formatCurrency(item.amount)}
  </span>
  
  <span>
    {calculateTimeRemaining(item.dueDate).formatted}
  </span>
</div>
```

## Testing Utilities

### Test Date Utils

```javascript
// test/dateUtils.test.js
const { formatDate, calculateTimeRemaining } = require('../utils');

test('formatDate should format correctly', () => {
  const result = formatDate('2025-12-21T14:30:00Z', 'YYYY-MM-DD HH:mm:ss');
  expect(result).toBe('2025-12-21 14:30:00');
});

test('calculateTimeRemaining should detect overdue', () => {
  const pastDate = new Date(Date.now() - 86400000); // 1 day ago
  const result = calculateTimeRemaining(pastDate);
  expect(result.isOverdue).toBe(true);
});
```

### Test Validation

```javascript
// test/validationUtils.test.js
const { validateEmail, validateScore, validateForm } = require('../utils');

test('validateEmail should accept valid emails', () => {
  const result = validateEmail('test@example.com');
  expect(result.isValid).toBe(true);
});

test('validateScore should reject scores > 10', () => {
  const result = validateScore(11);
  expect(result.isValid).toBe(false);
});
```

## Migration Checklist

- [ ] Import all utility modules in components
- [ ] Replace inline mock data with `apiService` calls
- [ ] Replace inline formatting with `formatUtils` functions
- [ ] Replace inline validation with `validationUtils` functions
- [ ] Replace inline color/status logic with `statusConfig` functions
- [ ] Remove duplicate code from components
- [ ] Update API endpoints when backend is ready
- [ ] Add error handling for API calls
- [ ] Add loading states for async operations
- [ ] Test all component integrations
- [ ] Add unit tests for utility functions
- [ ] Document any custom modifications
- [ ] Deploy to production

## Performance Considerations

1. **Memoization:** Wrap expensive calculations
```javascript
const memoizedScore = useMemo(() => 
  calculateWeightedScore(scores, criteria), 
  [scores, criteria]
);
```

2. **Debouncing:** For frequent calls
```javascript
const debouncedValidation = useMemo(() => 
  debounce((value) => validateScore(value), 300),
  []
);
```

3. **Caching:** For repeated API calls
```javascript
const cache = new Map();
const getCachedApprovals = async (status) => {
  if (cache.has(status)) return cache.get(status);
  const data = await getApprovals({ status });
  cache.set(status, data);
  return data;
};
```

## Troubleshooting

### Issue: "Module not found"
**Solution:** Ensure correct import path relative to file location

### Issue: "undefined is not a function"
**Solution:** Check if function is exported in index.js

### Issue: Mock data not loading
**Solution:** Use `apiService` instead of inline data arrays

### Issue: Formatting inconsistencies
**Solution:** Always use `formatUtils` instead of manual formatting

## Support

For questions about utility integration, refer to:
1. `server/utils/README.md` - Function documentation
2. `UTILITIES_SUMMARY.md` - Overview of all files
3. Component examples showing integration patterns
4. Test files for usage examples
