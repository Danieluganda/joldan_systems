# Procurement Discipline Application - Routes Documentation

This directory contains all route handlers for the comprehensive procurement management system. Each route file provides enterprise-grade APIs with authentication, authorization, validation, audit logging, and advanced business logic.

## Architecture Overview

All routes follow consistent patterns:
- **Authentication**: JWT-based with role-based access control (RBAC)
- **Validation**: Input sanitization and security protection
- **Audit Logging**: Comprehensive trail for compliance
- **Error Handling**: Structured error responses with security awareness
- **Rate Limiting**: Protection against abuse
- **Real-time Updates**: WebSocket integration where applicable

## Route Files

### Core Authentication & Authorization
- **`auth.js`** - Authentication and user management
  - Login/logout with MFA support
  - User registration and profile management
  - Password policies and account recovery
  - Session management and security features
  - JWT token lifecycle management

### Procurement Core Entities

#### **`procurements.js`** - Procurement Management
- Main procurement entity CRUD operations
- Procurement lifecycle management
- Status tracking and workflow integration
- Supplier management integration

#### **`plans.js`** - Strategic Procurement Planning (★ **Latest Enhanced**)
- **21 Advanced Endpoints** for comprehensive planning
- Strategic planning (annual, quarterly, project-based, emergency)
- Budget management with allocations and tracking
- Multi-level approval workflows
- Compliance and risk management
- Forecasting with scenario modeling
- Analytics dashboard and reporting
- Template system and plan cloning

#### **`rfqs.js`** - Request for Quotation Management
- RFQ creation, publishing, and management
- Supplier invitation and response tracking
- Technical specifications handling
- Timeline and deadline management

### Workflow & Process Management

#### **`approvals.js`** - Approval Workflows
- **11 Comprehensive Endpoints**
- Multi-level approval chains
- Delegation and escalation systems
- Bulk approval operations
- Analytics and reporting dashboard

#### **`evaluations.js`** - Evaluation Management
- **20 Advanced Endpoints** 
- Evaluation lifecycle management
- Scoring matrices and criteria
- Consensus building workflows
- Template system and analytics
- Multi-evaluator coordination

#### **`submissions.js`** - Supplier Submissions
- Submission receipt and validation
- Technical and commercial evaluation
- Compliance checking
- Amendment and clarification handling

### Contract & Award Management

#### **`awards.js`** - Award Management
- **16 Comprehensive Endpoints**
- Award lifecycle management
- Contract generation integration
- Supplier notifications
- Performance evaluation setup

#### **`contracts.js`** - Contract Lifecycle
- **18 Advanced Endpoints**
- Complete contract lifecycle management
- Digital signing integration
- Amendment and modification tracking
- Performance monitoring
- Compliance and milestone tracking

### Communication & Collaboration

#### **`clarifications.js`** - Clarification System
- **17 Comprehensive Endpoints**
- Q&A management for transparency
- Public/private clarification handling
- Timeline tracking and notifications
- Integration with RFQ processes

#### **`notifications.js`** - Real-time Notifications
- **21 Advanced Endpoints**
- Multi-channel notification delivery
- Template management system
- User preference controls
- Real-time WebSocket integration
- Analytics and delivery tracking

### Document & Information Management

#### **`documents.js`** - Document Management
- **19 Comprehensive Endpoints**
- Multi-file upload with validation
- Version control and history
- Access control and sharing
- Format conversion and processing
- Virus scanning and security

#### **`templates.js`** - Template Management
- Document and form templates
- Dynamic content generation
- Version control for templates
- Category and tagging system

### Compliance & Auditing

#### **`audits.js`** - Audit Management
- **14 Comprehensive Endpoints**
- Complete audit lifecycle
- Findings and recommendation tracking
- Compliance dashboard
- Reporting and analytics

#### **`logs.js`** - Enterprise Log Management
- **12 Advanced Endpoints**
- Advanced log processing and search
- Analytics and trend analysis
- Export capabilities
- Retention policy management
- Real-time monitoring

## Security Features

### Authentication & Authorization
- JWT token-based authentication
- Role-based access control (RBAC)
- Multi-factor authentication (MFA)
- Session management with security controls
- Rate limiting and brute force protection

### Input Security
- Comprehensive input validation
- XSS and SQL injection protection
- File upload security with virus scanning
- Content sanitization and filtering
- Size and format restrictions

### Audit & Compliance
- Complete audit trail for all operations
- Compliance reporting and tracking
- Data retention policies
- Security event logging
- Regulatory requirement adherence

## API Standards

### Request/Response Format
```json
{
  "success": true,
  "data": { /* Response data */ },
  "message": "Operation completed successfully",
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "requestId": "uuid-here",
    "version": "1.0"
  }
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": { /* Additional error context */ }
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "requestId": "uuid-here"
  }
}
```

### Authentication Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
X-Client-Version: 1.0
```

## Middleware Integration

All routes integrate with:
- **Authentication Middleware** (`../middleware/auth.js`)
- **Validation Middleware** (`../middleware/validation.js`)
- **Audit Logger** (`../middleware/auditLogger.js`)
- **Error Handler** (`../middleware/errorHandler.js`)

## Real-time Features

### WebSocket Integration
- Live notifications for status changes
- Real-time collaboration features
- Instant messaging for clarifications
- Live auction and bidding updates

### Server-Sent Events (SSE)
- Dashboard real-time updates
- Process status monitoring
- Alert and warning systems
- Analytics data streaming

## Performance Optimizations

### Caching Strategy
- Redis integration for session management
- Query result caching for frequent operations
- Static content caching
- API response caching with TTL

### Database Optimization
- Indexed queries for performance
- Aggregation pipelines for analytics
- Efficient pagination
- Connection pooling

## Testing & Development

### Route Testing
- Comprehensive test coverage for all endpoints
- Integration tests with middleware
- Security testing for vulnerabilities
- Performance and load testing

### Documentation
- OpenAPI/Swagger integration
- Postman collection generation
- Interactive API documentation
- Code examples and tutorials

## Deployment Considerations

### Environment Configuration
- Development, staging, production configs
- Environment variable management
- Secret and credential handling
- Feature flag integration

### Monitoring & Logging
- Application Performance Monitoring (APM)
- Error tracking and alerting
- Business metrics and KPIs
- Security monitoring and alerts

## Usage Examples

### Basic Authentication
```javascript
// Login request
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "securePassword123",
  "mfaCode": "123456"
}
```

### Creating a Procurement Plan
```javascript
// Strategic plan creation
POST /api/plans
{
  "title": "Q1 2024 IT Procurement Plan",
  "type": "quarterly",
  "budgetAllocated": 500000,
  "strategicObjectives": ["Cost reduction", "Quality improvement"],
  "plannedProcurements": [...]
}
```

### Managing Approvals
```javascript
// Bulk approval operation
POST /api/approvals/bulk
{
  "approvals": [
    { "id": "approval1", "decision": "approved", "comments": "Approved with conditions" },
    { "id": "approval2", "decision": "rejected", "comments": "Budget constraints" }
  ]
}
```

## Support & Maintenance

### Version Control
- Semantic versioning for API changes
- Backward compatibility considerations
- Migration guides for breaking changes
- Deprecation notices and timelines

### Security Updates
- Regular security audits
- Vulnerability assessments
- Dependency updates
- Security patch management

---

## Recent Enhancements

**Latest Update**: Plans.js route has been comprehensively enhanced with 21 advanced endpoints covering strategic procurement planning, budget management, approval workflows, compliance checking, risk assessment, forecasting capabilities, and complete analytics dashboard.

For detailed endpoint documentation, refer to individual route files or the generated API documentation.

---

*This documentation is maintained alongside the codebase. Last updated: December 2024*