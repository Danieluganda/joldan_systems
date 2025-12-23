# 🧪 Route Testing System - Complete Guide

## Overview

A comprehensive automated testing framework has been created to test all application routes, identify broken pages, and validate permission access. The system includes:

1. **Visual Route Testing Dashboard** - Interactive GUI for testing all routes
2. **Console-Based Route Validator** - Automated testing utility accessible from browser console
3. **Comprehensive Logging System** - Track all navigation, route changes, and errors

---

## 📊 Route Testing Dashboard

### Access the Dashboard
```
URL: http://localhost:5173/admin/route-testing
Permission: admin_view (automatically granted to admin role)
```

### Features

**Visual Test Control**
- Click **"▶️ Run All Tests"** button to start comprehensive route validation
- Tests check all routes for:
  - ✅ Accessibility (component exists, permissions granted)
  - 🔓 Public access (no authentication required)
  - 🚫 Permission denial (missing required permissions)
  - ❌ Broken routes (missing components or errors)

**Statistics Dashboard**
- **Total Routes** - Count of all routes in ROUTES configuration
- **Accessible** - Routes you can navigate to
- **Public** - Routes without permission requirements
- **Permission Denied** - Routes requiring permissions you don't have
- **Broken Routes** - Routes with missing components or errors

**Interactive Results Table**
- Shows every route with test status
- Displays required permissions
- Provides detailed error messages
- **🔗 Go button** - Navigate directly to accessible routes
- **📋 Details button** - View detailed information about each route

**Export & Clear**
- **📥 Export Results** - Download test results as JSON file
- **🔄 Clear Results** - Reset dashboard to run tests again

### Test Result Status Indicators

| Badge | Meaning | Description |
|-------|---------|-------------|
| ✅ Accessible | Route is accessible | Component exists and you have required permissions |
| 🔓 Public | Public route | No authentication required |
| 🚫 Permission Denied | Insufficient access | You lack the required permission |
| ❌ Not Found | Missing component | Route component not imported/found |
| ⚠️ Error | Runtime error | Error occurred when testing route |

---

## 🖥️ Console-Based Route Validator

### Access from Browser Console

1. **Open Browser DevTools**
   - Press `F12` on Windows/Linux
   - Or right-click → "Inspect" → "Console" tab

2. **Run Route Validation**
   ```javascript
   routeValidator.validateAllRoutes()
   ```

### Available Console Commands

**Core Validation Methods**

```javascript
// Test all routes
routeValidator.validateAllRoutes()
// Output: Returns object with counts and detailed results for each route
// Logs: ✅ accessible, 🔓 public, 🚫 permission-denied, ❌ not-found, ⚠️ error

// Test single route
routeValidator.validateRoute(routeObject)
// Input: Route object from ROUTES array
// Output: Single route test result

// Validate menu structure
routeValidator.validateMenuStructure()
// Output: Checks if all sidebar menu paths exist in ROUTES configuration
// Logs: Paths that exist vs paths missing from ROUTES

// Check component imports
routeValidator.checkImports()
// Output: Verifies all route components are valid React functions
// Logs: Any undefined or incorrectly imported components

// Check permission requirements
routeValidator.checkPermissions()
// Output: Analyzes permission requirements across all routes
// Logs: Routes organized by permission type
```

**Utility Methods**

```javascript
// Print summary to console
routeValidator.printSummary()
// Output: Formatted summary with statistics

// Get results as JSON
routeValidator.exportResults()
// Output: Complete validation results as JavaScript object

// Download results to file
routeValidator.downloadResults()
// Output: Downloads file named: route-validation-{timestamp}.json
```

### Console Output Examples

**Successful Route Test**
```
✅ Dashboard | / - accessible
🔓 Login | /login - public
🚫 Planning | /planning - permission-denied (requires: view_planning)
❌ Broken Route | /some-path - not-found
```

**Permission Analysis**
```
📊 Permission Analysis:
  Public Routes: 1
  Protected Routes: 18
  Routes with Missing Components: 0
```

---

## 📝 Logging System

### Automatic Console Logging

The app automatically logs all navigation events:

```
🚀 Application starting - Logging initialized
🔀 ROUTE CHANGED: /dashboard → pathname: "/" search: "" hash: ""
✅ ROUTE ACCESSIBLE: Dashboard (view_dashboard) - 2024-01-15T10:30:45Z
🔗 SIDEBAR LINK CLICKED: Planning (path: /planning) - 2024-01-15T10:30:46Z
📄 PAGE MOUNTED: Dashboard - render cycle complete
```

### Manual Logging Commands

```javascript
// Send pending logs to backend
logService.sendLogs()

// Download logs as JSON file
logService.downloadLogs()

// Clear memory logs
logService.clearLogs()

// Get current log count
logService.getLogCount()
// Output: Number like "42 logs pending"

// Display all logs
logService.getLogs()
// Output: Array of all logged entries

// Export logs as JSON string
logService.exportAsJSON()
// Output: Stringified JSON of all logs
```

### Log Storage

All logs are:
- **Collected** in browser memory with console.log interception
- **Batched** and sent to backend every 30 seconds or after 50 entries
- **Saved** to backend with session tracking: `server/logs/session_{sessionId}_YYYY-MM-DD.log`
- **Consolidated** in `server/logs/consolidated.log` (all sessions combined)

---

## 🛠️ Use Cases & Troubleshooting

### Finding Broken Routes

**Method 1: Using Dashboard**
1. Navigate to http://localhost:5173/admin/route-testing
2. Click **"▶️ Run All Tests"**
3. Look for rows with ❌ or ⚠️ badges
4. Click **📋** for detailed error information

**Method 2: Using Console**
1. Open DevTools console (F12)
2. Run: `routeValidator.validateAllRoutes()`
3. Search console output for ❌ or ⚠️ symbols
4. Read error messages for details

**Method 3: Checking Logs**
1. Open browser console (F12)
2. Run: `logService.getLogs()`
3. Filter for "🚫 ACCESS DENIED" or error messages
4. Check timestamp and route path

### Debugging Permission Issues

```javascript
// Check your current permissions
routeValidator.checkPermissions()

// Check a specific route's requirements
const route = ROUTES.find(r => r.path === '/path-to-check');
routeValidator.validateRoute(route)

// See what permissions you have
console.log(window.routeValidator.permissions)
```

### Validating Menu Structure

```javascript
// Check if sidebar menu items match ROUTES
routeValidator.validateMenuStructure()

// Returns details on:
// ✅ Paths that exist in ROUTES
// ❌ Menu paths missing from ROUTES configuration
// This identifies menu items that point to non-existent routes
```

### Exporting Test Results

**From Dashboard:**
1. Run tests
2. Click **"📥 Export Results"**
3. File downloads as: `route-test-results-{timestamp}.json`

**From Console:**
```javascript
// Get results object
const results = routeValidator.exportResults()
console.log(results)

// Or download directly
routeValidator.downloadResults()
```

---

## 📊 Test Results JSON Format

```json
{
  "timestamp": "2024-01-15T10:35:20.123Z",
  "stats": {
    "total": 20,
    "accessible": 18,
    "public": 1,
    "permissionDenied": 0,
    "notFound": 1
  },
  "results": [
    {
      "path": "/",
      "name": "Dashboard",
      "status": "accessible",
      "message": "Route accessible",
      "accessible": true,
      "hasComponent": true,
      "requiredPermission": "view_dashboard"
    },
    {
      "path": "/broken",
      "name": "Broken Page",
      "status": "not-found",
      "message": "Component not imported/found",
      "accessible": false,
      "hasComponent": false
    }
  ],
  "userPermissions": [
    "view_dashboard",
    "view_planning",
    ...
  ]
}
```

---

## 🔍 Checking Specific Routes

### Check if a Route is Accessible

```javascript
// Find the route
const route = ROUTES.find(r => r.path === '/planning');

// Test it
routeValidator.validateRoute(route)
// Output: {
//   path: '/planning',
//   name: 'Planning',
//   status: 'accessible|permission-denied|not-found',
//   message: 'descriptive message',
//   accessible: true|false,
//   ...
// }
```

### Check Route Permissions

```javascript
// Check what permission is required for a route
const route = ROUTES.find(r => r.path === '/planning');
console.log(`Required permission: ${route.requiredPermission}`);

// Check if you have permission
const { permissions } = usePermissions(); // From hook
const hasAccess = permissions.includes(route.requiredPermission);
console.log(`You ${hasAccess ? 'have' : 'do not have'} access`);
```

---

## 📋 Route Configuration Reference

Routes are defined in [client/src/routes.js](client/src/routes.js) with structure:

```javascript
{
  path: '/route-path',           // URL path
  name: 'Route Name',             // Display name
  component: ComponentName,        // React component to render
  icon: '🔧',                     // Icon for sidebar
  requiredPermission: 'view_xyz', // Permission needed (optional)
  isPublic: false,                // Public route? (true for /login)
  showInNav: true                 // Show in sidebar? (optional)
}
```

### All Routes Currently Configured

| Path | Name | Required Permission | Public |
|------|------|-------------------|--------|
| / | Dashboard | view_dashboard | No |
| /login | Login | - | Yes |
| /procurement-setup | New Procurement | create_procurement | No |
| /planning | Planning | view_planning | No |
| /templates | Templates | view_templates | No |
| /rfqs | RFQs | view_rfq | No |
| /rfq/new | Create RFQ | create_rfq | No |
| /rfq/:id | Edit RFQ | edit_rfq | No |
| /clarifications | Clarifications | view_clarifications | No |
| /submissions | Submissions | view_submissions | No |
| /evaluation | Evaluation | view_evaluations | No |
| /approvals | Approvals | view_approvals | No |
| /awards | Awards | view_awards | No |
| /contracts | Contracts | view_contracts | No |
| /audit | Audit Trail | view_audit | No |
| /admin/route-testing | Route Testing | admin_view | No |

---

## ⚡ Quick Start

**1. Open Route Testing Dashboard**
```
Visit: http://localhost:5173/admin/route-testing
```

**2. Run Tests**
```
Click: "▶️ Run All Tests" button
Wait: Tests complete in ~1-2 seconds
View: Results appear in table below
```

**3. Identify Issues**
```
Look for: ❌ or ⚠️ badges in status column
Click: 📋 button for details
Note: Required permission and error message
```

**4. Export Results (Optional)**
```
Click: "📥 Export Results"
File: route-test-results-{timestamp}.json
Use: For documentation or debugging
```

**5. Console Validation (Optional)**
```
Press: F12 to open DevTools
Run: routeValidator.validateAllRoutes()
View: Detailed console output with ✅/❌ symbols
```

---

## 🎯 What Gets Tested

Each route test checks:

✅ **Accessibility**
- Does the component import exist?
- Is it a valid React function/component?
- Does the user have required permissions?

✅ **Component Validity**
- Can the component be rendered?
- Are all dependencies available?
- Is the component properly exported?

✅ **Permission Matching**
- Does the route require a permission?
- Does the user have that permission?
- Is the permission correctly assigned to the role?

✅ **Route Configuration**
- Is the path defined in ROUTES?
- Is the component assigned?
- Is the name/icon configured?

---

## 📞 Support

**If routes are broken:**
1. Run `routeValidator.validateAllRoutes()` in console
2. Look for ❌ status in results
3. Check the "Message" field for details
4. Verify component imports in [routes.js](client/src/routes.js)
5. Check permissions in [usePermissions.js](client/src/hooks/usePermissions.js)

**If you see "Permission Denied":**
1. Check your user role (should be "admin" for full access)
2. Verify the route's `requiredPermission` value
3. Ensure that permission is in your role's permissions array
4. Restart the frontend dev server to reload permissions

**If tests hang or error:**
1. Check browser console for JavaScript errors
2. Verify backend is running (`npm run dev --prefix server`)
3. Check network tab (DevTools → Network) for failed requests
4. Refresh page and try again

---

## 🚀 Next Steps

- **Monitor regularly** - Run tests after adding new routes
- **Export results** - Keep historical test results for regression testing
- **Check console logs** - Review automatic navigation logs for user behavior
- **Review permissions** - Ensure all routes have correct permission assignments
- **Update routes** - Add/modify routes in [routes.js](client/src/routes.js) with complete configuration

---

**Generated:** January 2024
**Last Updated:** Route Testing v1.0
**Status:** ✅ Production Ready
