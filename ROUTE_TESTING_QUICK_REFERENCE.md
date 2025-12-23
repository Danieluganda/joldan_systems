# 🚀 Route Testing - Quick Reference

## Fastest Way to Test Routes (10 seconds)

### Option 1: Visual Dashboard
```
URL: http://localhost:5173/admin/route-testing
Click: "▶️ Run All Tests"
Result: See color-coded ✅/❌ status for all routes
```

### Option 2: Browser Console (F12)
```javascript
routeValidator.validateAllRoutes()
```

---

## Essential Console Commands

### Test All Routes
```javascript
routeValidator.validateAllRoutes()
```
Shows: Total routes, accessible count, broken routes, permission issues

### Test Single Route
```javascript
const route = ROUTES.find(r => r.path === '/planning')
routeValidator.validateRoute(route)
```

### Validate Menu Structure
```javascript
menuValidator.printSummary()
```
Shows: Menu items that exist/missing in ROUTES

### Check Your Permissions
```javascript
window.routeValidator.permissions
```
Shows: Array of permissions you have

### Export Test Results
```javascript
routeValidator.downloadResults()
```
Downloads: `route-validation-{timestamp}.json`

### Export Menu Results
```javascript
menuValidator.downloadResults()
```
Downloads: `menu-validation-{timestamp}.json`

---

## Status Indicators

| Symbol | Meaning | Action |
|--------|---------|--------|
| ✅ | Route accessible | ✓ Everything OK |
| 🔓 | Public route | ✓ No login needed |
| 🚫 | Permission denied | ℹ️ Need admin role |
| ❌ | Broken route | ⚠️ Missing component |
| ⚠️ | Runtime error | 🔧 Check component code |

---

## Quick Troubleshooting

**Dashboard won't load?**
```javascript
// Check if route exists:
routeValidator.validateRoute(
  ROUTES.find(r => r.path === '/admin/route-testing')
)
```

**Route shows "Not Found"?**
```javascript
// Check component import:
const route = ROUTES.find(r => r.name === 'Route Name')
console.log(`Has component: ${!!route.component}`)
```

**"Permission Denied" for all routes?**
```javascript
// Check your role:
console.log('Permissions:', window.routeValidator.permissions)
// Should show array of permissions
```

---

## File Locations

```
client/
  src/
    pages/
      └── RouteTestingPage.jsx       (Dashboard)
    utils/
      ├── routeValidator.js          (Test utility)
      └── menuValidator.js           (Menu validator)
    routes.js                         (Route configuration)
    hooks/
      └── usePermissions.js           (Permissions)
    
server/
  logs/                               (Log files)
    ├── session_{id}_YYYY-MM-DD.log
    └── consolidated.log
```

---

## Server Ports

- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3000
- **Route Testing:** http://localhost:5173/admin/route-testing

---

## Automatic Logging Examples

```
🚀 Application starting - Logging initialized
🔀 ROUTE CHANGED: / → /planning
✅ ROUTE ACCESSIBLE: Planning (view_planning)
🔗 SIDEBAR LINK CLICKED: Planning
📄 PAGE MOUNTED: Planning
🚫 ACCESS DENIED: /audit (requires: view_audit)
```

---

## Key Routes (All Tested)

| Route | Permission | Status |
|-------|-----------|--------|
| / | view_dashboard | ✅ |
| /login | - | 🔓 |
| /planning | view_planning | ✅ |
| /templates | view_templates | ✅ |
| /rfqs | view_rfq | ✅ |
| /clarifications | view_clarifications | ✅ |
| /submissions | view_submissions | ✅ |
| /evaluation | view_evaluations | ✅ |
| /approvals | view_approvals | ✅ |
| /awards | view_awards | ✅ |
| /contracts | view_contracts | ✅ |
| /audit | view_audit | ✅ |
| /admin/route-testing | admin_view | ✅ |

---

## Admin Permissions (Full Access)

```javascript
[
  'view_dashboard',
  'create_procurement', 'edit_procurement', 'delete_procurement',
  'view_planning',
  'create_template', 'edit_template', 'lock_template', 'view_templates',
  'create_rfq', 'publish_rfq', 'edit_rfq', 'view_rfq',
  'view_clarifications', 'respond_clarifications',
  'view_submissions', 'evaluate_submission', 'make_award_decision',
  'view_evaluations', 'view_approvals',
  'approve_contract', 'sign_contract', 'view_contracts', 'view_awards',
  'generate_audit_pack', 'view_audit_logs', 'view_audit',
  'manage_users', 'view_reports',
  'admin_view'
]
```

---

## One-Liner Commands

```javascript
// Quick status check
routeValidator.validateAllRoutes() && menuValidator.validateMenuItems()

// Get broken routes only
const r = routeValidator.validateAllRoutes(); r.filter(x => !x.accessible)

// Check menu problems
const m = menuValidator.validateMenuItems(); [m.missing, m.orphaned]

// Export all data
[routeValidator.exportResults(), menuValidator.exportResults()]

// Log all navigation history
logService.getLogs()

// Send logs to server NOW
logService.sendLogs()
```

---

## Before Asking for Help

1. Run: `routeValidator.validateAllRoutes()`
2. Check console for errors (F12 → Console)
3. Check: Are both servers running? (5173, 3000)
4. Run: `menuValidator.printSummary()`
5. Download results: `routeValidator.downloadResults()`

---

**Version:** 1.0
**Status:** ✅ Production Ready
**Last Updated:** January 2024
