# Server Utilities Documentation

This directory contains reusable utility modules for the Procurement Discipline Application.

## Files Overview

### 1. **dateUtils.js**
Date and time utility functions for common procurement operations.

**Key Functions:**
- `formatDate(date, format)` - Format date to readable string
- `calculateTimeRemaining(deadline)` - Calculate time until deadline with overdue detection
- `getRelativeTime(date)` - Get relative time string ("2 hours ago")
- `isBusinessHours(date)` - Check if date is within business hours (9-17, weekdays)
- `addBusinessDays(date, days)` - Add business days to a date
- `getNextBusinessDay(date)` - Get next business day
- `getBusinessDaysBetween(startDate, endDate)` - Count business days between dates
- `parseDate(dateString)` - Parse date strings in multiple formats
- `getStartOfDay(date)` - Get start of day (00:00:00)
- `getEndOfDay(date)` - Get end of day (23:59:59)
- `isSameDay(date1, date2)` - Check if two dates are same day

**Usage:**
```javascript
const { formatDate, calculateTimeRemaining } = require('./dateUtils');

const formatted = formatDate('2025-12-21T14:30:00Z', 'YYYY-MM-DD HH:mm:ss');
const remaining = calculateTimeRemaining('2025-12-25T17:00:00Z');
console.log(remaining.formatted); // "3d 5h remaining" or "Overdue by 2d"
```

### 2. **validationUtils.js**
Validation functions for forms, fields, and data integrity.

**Key Functions:**
- `validateEmail(email)` - Validate email addresses
- `validatePhone(phone)` - Validate phone numbers
- `validateUrl(url)` - Validate URLs
- `validateRequired(value, fieldName)` - Check required fields
- `validateMinLength(value, minLength, fieldName)` - Validate minimum length
- `validateMaxLength(value, maxLength, fieldName)` - Validate maximum length
- `validateNumber(value, options, fieldName)` - Validate numeric values with min/max
- `validateScore(score)` - Validate scores (0-10 range)
- `validateDate(date, options)` - Validate dates with options
- `validateCurrency(amount, currency)` - Validate and format currency
- `validateForm(data, schema)` - Validate entire form using schema

**Usage:**
```javascript
const { validateForm } = require('./validationUtils');

const schema = {
  email: { required: true, type: 'email', label: 'Email' },
  score: { type: 'score', label: 'Evaluation Score' },
  amount: { type: 'number', options: { min: 0, max: 1000000 }, label: 'Amount' },
};

const result = validateForm({ email: 'user@example.com', score: 8.5, amount: 50000 }, schema);
if (!result.isValid) console.log(result.errors);
```

### 3. **statusConfig.js**
Centralized configuration for all status, priority, severity, and category types.

**Key Exports:**
- `statusConfig` - Status definitions (pending, approved, rejected, changes-requested, etc.)
- `priorityConfig` - Priority levels (critical, high, medium, low)
- `severityConfig` - Severity levels (critical, major, warning, info, minor)
- `categoryConfig` - Timeline event categories
- `documentTypeConfig` - Document type configurations
- `scoringCriteriaConfig` - Procurement scoring criteria
- `scoreRatingConfig` - Score to rating mappings

**Getter Functions:**
- `getStatusConfig(status)` - Get status configuration
- `getPriorityConfig(priority)` - Get priority configuration
- `getSeverityConfig(severity)` - Get severity configuration
- `getCategoryConfig(category)` - Get category configuration
- `getScoreRating(score)` - Get score rating (0-100)
- `getAllStatusOptions()` - Get all status options as array
- `getAllPriorityOptions()` - Get all priority options
- `getAllSeverityOptions()` - Get all severity options
- `getAllCategoryOptions()` - Get all category options

**Usage:**
```javascript
const { getStatusConfig, getCategoryConfig, getScoreRating } = require('./statusConfig');

const statusConfig = getStatusConfig('approved');
console.log(statusConfig.color); // '#28a745'
console.log(statusConfig.label); // 'Approved'

const rating = getScoreRating(85);
console.log(rating.label); // 'Very Good'
console.log(rating.color); // '#20c997'
```

### 4. **formatUtils.js**
Utility functions for formatting data for display.

**Key Functions:**
- `formatCurrency(amount, currency, decimals)` - Format currency amounts
- `formatNumber(num, decimals)` - Format numbers with thousand separators
- `formatPercentage(value, decimals)` - Format as percentage
- `formatFileSize(bytes)` - Format file sizes (B, KB, MB, GB)
- `formatPhone(phone)` - Format phone numbers
- `formatUrl(url, maxLength)` - Format URLs (truncate if long)
- `formatEmail(email, maxLength)` - Format email addresses
- `formatDuration(startDate, endDate)` - Format duration between dates
- `capitalize(text)` - Capitalize first letter
- `toTitleCase(text)` - Convert to title case
- `formatCamelCase(text)` - Convert camelCase to readable text
- `truncateText(text, maxLength, ellipsis)` - Truncate with ellipsis
- `formatList(arr, lastSeparator)` - Format array to comma-separated string
- `formatScore(score, maxScore)` - Format score range (e.g., "75/100")
- `formatGrade(score)` - Convert score to letter grade

**Usage:**
```javascript
const { formatCurrency, formatDuration, formatList } = require('./formatUtils');

console.log(formatCurrency(150000, 'USD')); // "$150,000.00"
console.log(formatDuration('2025-01-01', '2025-01-05')); // "4d"
console.log(formatList(['Alice', 'Bob', 'Charlie'])); // "Alice, Bob and Charlie"
```

### 5. **apiService.js**
API service layer providing mock data and methods for all procurement operations.

**Mock Data:**
- `mockTimeline` - 10 timeline events covering full procurement lifecycle
- `mockDocuments` - 6 documents with versions, approvals, and changes
- `mockComplianceData` - Compliance checks and issues with severity levels
- `mockApprovals` - 6 approval items with dependencies and priorities
- `mockApprovalHistory` - 7 approval decision records with comments

**API Methods:**
- `getTimeline(procurementId)` - Get timeline events
- `getDocuments(procurementId)` - Get document audit trail
- `getComplianceData(procurementId)` - Get compliance data
- `getApprovals(filters)` - Get approval queue (supports filtering)
- `getApprovalHistory(procurementId)` - Get approval decision history
- `createApproval(approval)` - Create new approval
- `updateApproval(id, updates)` - Update existing approval

**Usage:**
```javascript
const { getApprovals, updateApproval } = require('./apiService');

// Get pending approvals
const approvals = await getApprovals({ status: 'pending', priority: 'critical' });

// Update approval
const updated = await updateApproval(1, { status: 'approved' });
```

**Migration to Real API:**
Replace all async methods with actual HTTP calls to backend endpoints:
```javascript
const getTimeline = async (procurementId) => {
  const response = await fetch(`/api/procurement/${procurementId}/timeline`);
  return response.json();
};
```

## Common Patterns

### Using Multiple Utils Together

```javascript
const { formatDate, calculateTimeRemaining } = require('./dateUtils');
const { getStatusConfig } = require('./statusConfig');
const { formatCurrency, formatList } = require('./formatUtils');

// Format approval display
function displayApproval(approval) {
  const timeLeft = calculateTimeRemaining(approval.dueDate);
  const statusConfig = getStatusConfig(approval.status);
  
  return {
    name: approval.documentName,
    status: statusConfig.label,
    statusColor: statusConfig.color,
    timeRemaining: timeLeft.formatted,
    isOverdue: timeLeft.isOverdue,
    amount: formatCurrency(approval.amount),
    approversNeeded: formatList(approval.approversNeeded),
  };
}
```

### Form Validation with Error Handling

```javascript
const { validateForm } = require('./validationUtils');

const validationSchema = {
  procurementName: {
    required: true,
    minLength: 5,
    maxLength: 100,
    label: 'Procurement Name',
  },
  budgetAmount: {
    type: 'currency',
    required: true,
    options: { min: 1000, max: 10000000 },
    label: 'Budget Amount',
  },
  deadline: {
    type: 'date',
    required: true,
    options: { canBePast: false },
    label: 'Deadline',
  },
};

function submitForm(formData) {
  const validation = validateForm(formData, validationSchema);
  
  if (!validation.isValid) {
    return { success: false, errors: validation.errors };
  }
  
  // Proceed with form submission
  return { success: true };
}
```

## Color Code Reference

### Status Colors
- **Approved**: #28a745 (Green)
- **Rejected**: #dc3545 (Red)
- **Pending**: #6c757d (Gray)
- **Changes-Requested**: #ffc107 (Amber)
- **Draft**: #0d6efd (Blue)

### Priority Colors
- **Critical**: #dc3545 (Red)
- **High**: #fd7e14 (Orange)
- **Medium**: #ffc107 (Amber)
- **Low**: #28a745 (Green)

### Severity Colors
- **Critical**: #dc3545 (Red)
- **Major**: #fd7e14 (Orange)
- **Warning**: #ffc107 (Amber)
- **Info**: #0dcaf0 (Cyan)
- **Minor**: #6c757d (Gray)

## Integration with Components

All React components in `client/src/components/` import from these utilities:

```javascript
// In React components
import { formatDate, calculateTimeRemaining } from '../../utils/dateUtils';
import { getStatusConfig } from '../../utils/statusConfig';
import { formatCurrency } from '../../utils/formatUtils';
```

## Error Handling

All validation functions return consistent error objects:

```javascript
{
  isValid: boolean,
  error: string | null,
  formatted?: string,  // For currency formatting
  errors?: object,     // For form validation
}
```

## Future Enhancements

1. **Localization**: Add support for multiple languages and locales
2. **Caching**: Implement caching layer for frequently accessed data
3. **Analytics**: Add tracking for approval workflows and timelines
4. **Audit Trail**: Enhanced audit logging for compliance
5. **Performance**: Pagination support for large datasets
6. **Notifications**: Deadline reminders and approval notifications

## Dependencies

- None required (pure JavaScript)
- Optional: Node.js built-in modules only

## Testing

Each utility function includes JSDoc comments and examples. Test utilities:

```bash
# Run validation tests
node -e "const v = require('./validationUtils'); console.log(v.validateEmail('test@example.com'));"

# Run date utilities
node -e "const d = require('./dateUtils'); console.log(d.formatDate(new Date()));"
```
