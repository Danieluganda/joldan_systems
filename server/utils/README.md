# Enterprise Utilities Documentation

This directory contains comprehensive enterprise-grade utility modules for the Procurement Discipline Application, providing advanced analytics, security, performance monitoring, and business intelligence capabilities.

## Files Overview

### 1. **dateUtils.js** - Enterprise Date Management System
Advanced date and time management with timezone support, international business calendars, and procurement-specific operations.

**Enterprise Features:**
- **Timezone-Aware Operations** with moment-timezone integration
- **International Business Calendars** with holiday awareness
- **Procurement Timeline Management** with phase-specific calculations
- **Business Day Calculations** with regional awareness
- **SLA Tracking** with deadline risk assessment
- **Audit Timestamp Generation** with precision control
- **Performance Optimization** with intelligent caching

**Key Functions:**
- `formatDate(date, format, timezone)` - Advanced formatting with timezone and locale support
- `calculateTimeRemaining(deadline, options)` - Enhanced deadline tracking with risk assessment
- `getBusinessDaysBetween(start, end, region)` - Regional business day calculations
- `calculateSLAMetrics(startDate, targetDate, region)` - SLA compliance tracking
- `generateProcurementTimeline(phases, constraints)` - Timeline optimization
- `getHolidayCalendar(region, year)` - International holiday support
- `validateBusinessSchedule(datetime, region)` - Business hour validation
- `calculateWorkingHours(start, end, region)` - Precise working time calculations

**Usage:**
```javascript
const { calculateSLAMetrics, generateProcurementTimeline } = require('./dateUtils');

// Advanced SLA tracking
const sla = calculateSLAMetrics('2024-01-01', '2024-01-15', 'US');
console.log(sla.riskLevel); // 'low', 'medium', 'high', 'critical'
console.log(sla.businessDaysRemaining); // Excluding holidays

// Procurement timeline optimization
const timeline = generateProcurementTimeline(phases, { region: 'US', riskTolerance: 'medium' });
```

### 2. **formatUtils.js** - International Formatting System
Enterprise formatting system with multi-locale support, procurement-specific formats, and template processing.

**Enterprise Features:**
- **Multi-Locale Support** with regional configurations
- **Procurement-Specific ID Generation** for RFQs, contracts, suppliers
- **Template Engine** with conditional logic and loops
- **Enhanced Text Processing** with validation and sanitization
- **International Currency** and number formatting
- **Address Formatting** by locale

**Key Functions:**
- `formatCurrency(amount, currency, locale, options)` - Advanced currency formatting
- `generateProcurementId(type, region, sequence)` - Standardized ID generation
- `formatAddressByLocale(address, locale)` - International address formatting
- `processTemplate(template, data, options)` - Dynamic template processing
- `formatComplianceReport(data, standard)` - Compliance-specific formatting
- `sanitizeAndFormat(input, type, locale)` - Secure text processing
- `formatMultiLanguage(text, locales)` - Multi-language text formatting

**Usage:**
```javascript
const { generateProcurementId, formatComplianceReport } = require('./formatUtils');

// Generate standardized procurement IDs
const rfqId = generateProcurementId('RFQ', 'US', 2024001);
// Returns: 'RFQ-US-2024-001'

// Format compliance reports
const report = formatComplianceReport(complianceData, 'SOX');
```

### 3. **fileHash.js** - Enterprise File Integrity System
Comprehensive file hashing and integrity management with multiple algorithms and security features.

**Enterprise Features:**
- **Multiple Hash Algorithms** (SHA-256, SHA-512, MD5, BLAKE2, SHA-3)
- **Stream-Based Processing** for memory efficiency
- **Integrity Verification** against expected hashes
- **Batch Processing** with concurrency control
- **File Fingerprinting** for change detection
- **Performance Caching** with statistics

**Key Functions:**
- `calculateFileHash(filePath, algorithm, options)` - Multi-algorithm hashing
- `verifyFileIntegrity(filePath, expectedHash, algorithm)` - Integrity verification
- `batchHashFiles(filePaths, options)` - Concurrent batch processing
- `generateFileFingerprint(filePath)` - Change detection fingerprinting
- `streamHashCalculation(stream, algorithm)` - Stream-based hashing

### 4. **logger.js** - Enterprise Logging and Monitoring System
Comprehensive logging infrastructure with structured logging, multiple transports, and real-time monitoring.

**Enterprise Features:**
- **Structured JSON Logging** with correlation tracking
- **Multiple Transport Options** (file, console, remote, database)
- **Automatic Log Rotation** with compression and retention
- **Performance Monitoring** with real-time metrics
- **Security Log Sanitization** removes sensitive data
- **Real-time Log Streaming** and aggregation
- **Context-Aware Logging** with request correlation
- **Audit Logging** for compliance requirements

**Key Functions:**
- `logger.error(message, data, options)` - Enhanced error logging
- `logger.audit(message, data)` - Compliance audit logging
- `logger.security(message, data)` - Security event logging
- `logger.performance(message, duration, data)` - Performance tracking
- `logger.setCorrelationId(id)` - Request correlation
- `logger.child(context)` - Context-specific logging
- `logger.getMetrics()` - Performance metrics
- `logger.getHealthStatus()` - System health monitoring

### 5. **policyHelpers.js** - Enterprise Policy and Access Control System
Advanced policy evaluation engine with context-aware permissions, role inheritance, and compliance features.

**Enterprise Features:**
- **Context-Aware Policy Evaluation** with dynamic conditions
- **Role-Based & Attribute-Based Access Control** (RBAC/ABAC)
- **Policy Inheritance Hierarchy** with role-based cascading
- **Dynamic Policy Loading** with hot-reload capabilities
- **Advanced Caching System** with TTL and invalidation
- **Comprehensive Audit Logging** for compliance
- **Conditional Access Controls** based on context
- **Multi-Factor Authentication** requirements

**Key Functions:**
- `evaluatePolicy(user, resource, action, context)` - Advanced policy evaluation
- `checkPermissionWithContext(user, permission, resource, context)` - Context-aware permissions
- `checkMultiplePermissions(user, permissions, context)` - Bulk permission checking
- `getUserCapabilities(user, context)` - Dynamic capability assessment
- `addPolicy(policy)` - Runtime policy management
- `getStatistics()` - Policy engine statistics
- `getAuditTrail(filters)` - Compliance audit trail

**Usage:**
```javascript
const { evaluatePolicy, checkPermissionWithContext } = require('./policyHelpers');

// Advanced policy evaluation
const result = await evaluatePolicy(user, procurement, 'approve', {
  request: req,
  procurementValue: 500000,
  timeOfDay: new Date().getHours()
});

console.log(result.allowed); // true/false
console.log(result.requiresMFA); // MFA requirement
console.log(result.requiresApproval); // Escalation needed
```

### 6. **procurementHelpers.js** - Enterprise Procurement Business Logic System
Comprehensive business logic with advanced analytics, predictive modeling, and risk assessment.

**Enterprise Features:**
- **Multiple Scoring Methodologies** (AHP, TOPSIS, PROMETHEE)
- **Predictive Analytics** for timeline and budget forecasting
- **Risk Assessment Framework** with machine learning insights
- **Compliance Framework Support** (ISO, SOX, GDPR)
- **Workflow Optimization** with critical path analysis
- **Real-time Performance Monitoring** and metrics
- **Supplier Evaluation** and ranking algorithms
- **Multi-criteria Decision Analysis** (MCDA) support

**Key Functions:**
- `calculateWeightedScore(scores, weights, options)` - Advanced scoring with multiple methods
- `analyzeTimeline(timeline, options)` - Comprehensive timeline analysis with predictions
- `validateApprovalDependencies(approvals, options)` - Workflow optimization
- `calculateComplianceScore(data, options)` - Framework-specific compliance
- `assessSupplierRisk(supplierData, historical)` - AI-powered risk assessment
- `optimizeWorkflow(workflow, constraints)` - Process optimization
- `predictTimelines(historical, current)` - Timeline forecasting
- `benchmarkPerformance(metrics, industry)` - Industry benchmarking

**Usage:**
```javascript
const { calculateWeightedScore, analyzeTimeline, assessSupplierRisk } = require('./procurementHelpers');

// Advanced scoring with AHP method
const result = calculateWeightedScore(scores, weights, { method: 'ahp' });
console.log(result.confidence); // Confidence level
console.log(result.riskAssessment); // Risk analysis

// Predictive timeline analysis
const analysis = analyzeTimeline(events, { 
  includeProjections: true, 
  includeCriticalPath: true 
});
console.log(analysis.projections.estimatedCompletion);
console.log(analysis.riskAssessment.bottleneckRisk);
```

### 7. **index.js** - Enterprise Utility Management System
Intelligent utility orchestration with health monitoring, lazy loading, and performance optimization.

**Enterprise Features:**
- **Intelligent Module Management** with dependency injection
- **Health Monitoring** with periodic system checks
- **Lazy Loading** with proxy-based access
- **Performance Tracking** with memory management
- **Hot Reloading** for development environments
- **Graceful Shutdown** handling
- **Configuration-Driven** module loading

**Key Functions:**
- `getUtilityHealth()` - System health status
- `reloadUtilities()` - Hot reload capabilities
- `getPerformanceMetrics()` - Performance statistics
- `configureUtilities(config)` - Dynamic configuration
- `registerUtility(name, module)` - Runtime utility registration

### 8. **validationUtils.js** - Enhanced Validation System
Comprehensive validation with international support and advanced business rule validation.

### 9. **statusConfig.js** - Enhanced Status Management
Advanced status configuration with workflow states and transition rules.

### 10. **apiService.js** - Enterprise API Service Layer
Enhanced API layer with authentication, caching, retry logic, and comprehensive error handling.

**Enterprise Features:**
- **Intelligent Caching** with TTL and invalidation strategies
- **Retry Logic** with exponential backoff
- **Request/Response Interceptors** for logging and transformation
- **Authentication Integration** with token management
- **Performance Monitoring** with detailed metrics
- **Error Recovery** with circuit breaker patterns

## Advanced Integration Patterns

### Enterprise Security Integration

```javascript
const { evaluatePolicy } = require('./policyHelpers');
const { logger } = require('./logger');
const { calculateWeightedScore } = require('./procurementHelpers');

async function secureEvaluationWorkflow(user, procurement, evaluationData) {
  // Set correlation for request tracking
  logger.setCorrelationId(procurement.id);
  
  // Evaluate user permissions with context
  const policyResult = await evaluatePolicy(user, procurement, 'evaluate', {
    procurementValue: procurement.value,
    request: req
  });
  
  if (!policyResult.allowed) {
    logger.security('Unauthorized evaluation attempt', { 
      userId: user.id, 
      procurementId: procurement.id 
    });
    throw new Error('Access denied');
  }
  
  // Enhanced scoring with audit trail
  const scoring = calculateWeightedScore(
    evaluationData.scores, 
    evaluationData.weights,
    { method: 'ahp', includeAuditTrail: true }
  );
  
  // Log evaluation for compliance
  logger.audit('Procurement evaluation completed', {
    procurementId: procurement.id,
    userId: user.id,
    score: scoring.totalScore,
    method: scoring.metadata.method
  });
  
  return scoring;
}
```

### Advanced Analytics Pipeline

```javascript
const { analyzeTimeline, analyzeApprovals } = require('./procurementHelpers');
const { formatComplianceReport } = require('./formatUtils');
const { calculateSLAMetrics } = require('./dateUtils');

async function generateExecutiveDashboard(procurementData) {
  // Parallel analysis execution
  const [timelineAnalysis, approvalAnalysis, slaMetrics] = await Promise.all([
    analyzeTimeline(procurementData.timeline, { 
      includeProjections: true, 
      includeCriticalPath: true 
    }),
    analyzeApprovals(procurementData.approvals, { 
      includePatterns: true, 
      includeForecasting: true 
    }),
    calculateSLAMetrics(procurementData.startDate, procurementData.targetDate)
  ]);
  
  // Generate executive summary
  return {
    performance: {
      timeline: timelineAnalysis.performance,
      approvals: approvalAnalysis.performance,
      sla: slaMetrics
    },
    risks: {
      timeline: timelineAnalysis.riskAssessment,
      approval: approvalAnalysis.riskAssessment,
      overall: calculateOverallRisk([timelineAnalysis, approvalAnalysis])
    },
    projections: {
      completion: timelineAnalysis.projections,
      approvalTimes: approvalAnalysis.forecast
    },
    recommendations: generateExecutiveRecommendations(timelineAnalysis, approvalAnalysis)
  };
}
```

### Real-time Monitoring Integration

```javascript
const { logger } = require('./logger');
const { engine: policyEngine } = require('./policyHelpers');
const { engine: analyticsEngine } = require('./procurementHelpers');

// Setup real-time monitoring
policyEngine.on('policyEvaluated', (event) => {
  logger.performance('Policy evaluation', event.evaluationTime, {
    decision: event.decision,
    userId: event.user
  });
});

analyticsEngine.on('performanceMetrics', (metrics) => {
  if (metrics.errorRate > 5) {
    logger.security('High error rate detected', metrics);
  }
});

// Health check endpoint integration
app.get('/api/health/utilities', (req, res) => {
  const health = {
    logger: logger.getHealthStatus(),
    policy: policyEngine.getStatistics(),
    analytics: analyticsEngine.getStatistics(),
    timestamp: new Date()
  };
  
  const isHealthy = Object.values(health).every(h => 
    h.status !== 'unhealthy' && h.errorRate < 10
  );
  
  res.status(isHealthy ? 200 : 503).json(health);
});
```

## Performance Optimization

### Caching Strategies
- **Policy Cache**: 5-minute TTL with invalidation on policy changes
- **Analytics Cache**: 10-minute TTL for expensive calculations
- **Formatting Cache**: 1-hour TTL for locale-specific formatting
- **Logger Buffer**: 100-entry buffer with 5-second flush interval

### Memory Management
- **Lazy Loading**: Utilities loaded on-demand with proxy pattern
- **Garbage Collection**: Automatic cleanup of expired cache entries
- **Memory Monitoring**: Real-time memory usage tracking
- **Resource Pooling**: Shared resources for file operations

## Security Features

### Data Protection
- **Automatic Sanitization**: PII and sensitive data removal from logs
- **Encryption**: File hash validation with integrity checking
- **Access Control**: Context-aware policy evaluation
- **Audit Logging**: Comprehensive compliance trail

### Compliance Support
- **SOX Compliance**: Financial audit trail and controls
- **GDPR Compliance**: Data protection and privacy controls  
- **ISO Standards**: Quality management system integration
- **Industry Standards**: Procurement-specific compliance frameworks

## Monitoring & Observability

### Metrics Collection
- **Performance Metrics**: Response times, throughput, error rates
- **Business Metrics**: Approval times, compliance scores, risk levels
- **System Metrics**: Memory usage, cache hit rates, error patterns
- **User Metrics**: Access patterns, policy decisions, audit events

### Alerting & Notifications
- **Threshold Alerts**: Automatic alerts on performance degradation
- **Security Alerts**: Suspicious activity and access violations
- **Business Alerts**: SLA breaches and compliance violations
- **System Alerts**: Health checks and resource exhaustion

## Testing & Quality Assurance

### Automated Testing
```bash
# Run comprehensive utility tests
npm test utils

# Performance benchmarking
npm run benchmark:utils

# Security scanning
npm run security:utils

# Load testing
npm run load-test:utilities
```

### Quality Metrics
- **Code Coverage**: >95% for all utility functions
- **Performance**: <100ms for 95th percentile operations
- **Reliability**: >99.9% uptime for critical utilities
- **Security**: Zero critical vulnerabilities

## Future Roadmap

### Phase 1: Enhanced Intelligence
- **Machine Learning**: Predictive models for risk assessment
- **Natural Language Processing**: Document analysis and classification
- **Computer Vision**: Invoice and document OCR integration
- **Graph Analytics**: Supplier relationship network analysis

### Phase 2: Advanced Integration
- **Blockchain**: Immutable audit trails and smart contracts
- **IoT Integration**: Supply chain monitoring and tracking
- **API Ecosystem**: Third-party service integrations
- **Mobile SDKs**: Native mobile application support

### Phase 3: Enterprise Scale
- **Multi-tenant Architecture**: Organization isolation and scaling
- **Global Deployment**: Multi-region support with data residency
- **Enterprise SSO**: Advanced authentication and authorization
- **Regulatory Compliance**: Industry-specific compliance modules

## Dependencies

### Core Dependencies
- **moment-timezone**: Advanced timezone and date handling
- **crypto**: Enterprise-grade cryptographic operations
- **stream**: High-performance file processing
- **events**: Event-driven architecture support

### Optional Dependencies
- **chokidar**: File system monitoring for hot reload
- **validator**: Enhanced input validation
- **date-fns**: Additional date utility functions

## Configuration

### Environment Variables
```bash
# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=json
LOG_ENABLE_CONSOLE=true
LOG_ENABLE_FILE=true
LOG_ENABLE_AUDIT=true
LOG_MAX_FILE_SIZE=52428800
LOG_COMPRESS_ROTATED=true

# Policy Configuration
POLICY_CACHE_ENABLED=true
POLICY_CACHE_TIMEOUT=300000
POLICY_AUDIT_ENABLED=true
POLICY_DYNAMIC_LOADING=true

# Performance Configuration
PERFORMANCE_CACHE_ENABLED=true
PERFORMANCE_CACHE_TIMEOUT=600000
PERFORMANCE_METRICS_ENABLED=true
PERFORMANCE_BENCHMARKING=true
```

This enterprise utility suite provides comprehensive, production-ready functionality for sophisticated procurement operations with advanced security, monitoring, and business intelligence capabilities.
