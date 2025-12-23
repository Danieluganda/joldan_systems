import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import ROUTES from '../routes';
import '../styles/RouteTestingPage.css';

/**
 * Route Testing Page
 * 
 * Visual dashboard for testing all routes and identifying broken pages
 * Shows which routes are accessible, which have permission issues, and which fail to load
 */
const RouteTestingPage = () => {
  const navigate = useNavigate();
  const { permissions } = usePermissions();
  const [testResults, setTestResults] = useState([]);
  const [testingInProgress, setTestingInProgress] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [routeStats, setRouteStats] = useState({
    total: 0,
    accessible: 0,
    permissionDenied: 0,
    notFound: 0,
    public: 0
  });

  /**
   * Test a single route by attempting to navigate to it
   */
  const testRoute = (route) => {
    return new Promise((resolve) => {
      try {
        // Check if route is public
        if (route.isPublic) {
          return resolve({
            path: route.path,
            name: route.name,
            status: 'public',
            message: 'Public route - accessible',
            accessible: true,
            hasComponent: !!route.component
          });
        }

        // Check permissions
        if (route.requiredPermission && !permissions.includes(route.requiredPermission)) {
          return resolve({
            path: route.path,
            name: route.name,
            status: 'permission-denied',
            requiredPermission: route.requiredPermission,
            message: `Missing permission: ${route.requiredPermission}`,
            accessible: false,
            hasComponent: !!route.component,
            userPermissions: permissions
          });
        }

        // Check if component exists
        if (!route.component) {
          return resolve({
            path: route.path,
            name: route.name,
            status: 'not-found',
            message: 'Component not imported/found',
            accessible: false,
            hasComponent: false
          });
        }

        // Route is accessible
        resolve({
          path: route.path,
          name: route.name,
          status: 'accessible',
          message: 'Route accessible',
          accessible: true,
          hasComponent: true,
          requiredPermission: route.requiredPermission
        });
      } catch (error) {
        resolve({
          path: route.path,
          name: route.name,
          status: 'error',
          message: `Error: ${error.message}`,
          accessible: false,
          error: error.message
        });
      }
    });
  };

  /**
   * Run all route tests
   */
  const runAllTests = async () => {
    setTestingInProgress(true);
    setTestResults([]);

    console.log('🧪 Starting Route Validation Tests...');
    const results = [];
    let stats = {
      total: ROUTES.length,
      accessible: 0,
      permissionDenied: 0,
      notFound: 0,
      public: 0,
      error: 0
    };

    for (const route of ROUTES) {
      const result = await testRoute(route);
      results.push(result);

      // Update stats
      if (result.status === 'accessible') stats.accessible++;
      else if (result.status === 'public') stats.public++;
      else if (result.status === 'permission-denied') stats.permissionDenied++;
      else if (result.status === 'not-found') stats.notFound++;
      else if (result.status === 'error') stats.error++;

      // Log result
      const icon = result.accessible ? '✅' : result.status === 'public' ? '🔓' : '❌';
      console.log(`${icon} ${result.name} (${result.path}) - ${result.status}`);

      // Add small delay to prevent overwhelming the console
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    setTestResults(results);
    setRouteStats(stats);
    setTestingInProgress(false);

    console.log('✅ Route Validation Complete', stats);
  };

  /**
   * Get status badge
   */
  const getStatusBadge = (status) => {
    const badges = {
      'accessible': { icon: '✅', label: 'Accessible', class: 'badge-success' },
      'public': { icon: '🔓', label: 'Public', class: 'badge-public' },
      'permission-denied': { icon: '🚫', label: 'Permission Denied', class: 'badge-danger' },
      'not-found': { icon: '❌', label: 'Not Found', class: 'badge-error' },
      'error': { icon: '⚠️', label: 'Error', class: 'badge-warning' }
    };
    return badges[status] || { icon: '❓', label: 'Unknown', class: 'badge-unknown' };
  };

  /**
   * Navigate to tested route
   */
  const navigateToRoute = (route) => {
    if (!route.isPublic && route.requiredPermission && !permissions.includes(route.requiredPermission)) {
      alert(`Cannot navigate - Missing permission: ${route.requiredPermission}`);
      return;
    }

    if (!route.component) {
      alert('Cannot navigate - Component not found');
      return;
    }

    console.log(`🔀 Testing navigation to: ${route.path}`);
    navigate(route.path);
  };

  /**
   * Export test results as JSON
   */
  const exportResults = () => {
    const data = {
      timestamp: new Date().toISOString(),
      stats: routeStats,
      results: testResults,
      userPermissions: permissions
    };
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `route-test-results-${new Date().getTime()}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="route-testing-page">
      <div className="test-header">
        <h1>🧪 Route Testing Dashboard</h1>
        <p>Test all application routes for accessibility, permissions, and component validity</p>
      </div>

      <div className="test-controls">
        <button 
          onClick={runAllTests} 
          disabled={testingInProgress}
          className="btn-primary"
        >
          {testingInProgress ? '⏳ Testing Routes...' : '▶️ Run All Tests'}
        </button>
        {testResults.length > 0 && (
          <>
            <button onClick={exportResults} className="btn-secondary">
              📥 Export Results
            </button>
            <button 
              onClick={() => {
                setTestResults([]);
                setRouteStats({
                  total: 0,
                  accessible: 0,
                  permissionDenied: 0,
                  notFound: 0,
                  public: 0
                });
              }} 
              className="btn-secondary"
            >
              🔄 Clear Results
            </button>
          </>
        )}
      </div>

      {testResults.length > 0 && (
        <div className="test-stats">
          <div className="stat-card">
            <div className="stat-value">{routeStats.total}</div>
            <div className="stat-label">Total Routes</div>
          </div>
          <div className="stat-card success">
            <div className="stat-value">{routeStats.accessible}</div>
            <div className="stat-label">Accessible</div>
          </div>
          <div className="stat-card info">
            <div className="stat-value">{routeStats.public}</div>
            <div className="stat-label">Public</div>
          </div>
          <div className="stat-card warning">
            <div className="stat-value">{routeStats.permissionDenied}</div>
            <div className="stat-label">Permission Denied</div>
          </div>
          <div className="stat-card danger">
            <div className="stat-value">{routeStats.notFound + routeStats.error}</div>
            <div className="stat-label">Broken Routes</div>
          </div>
        </div>
      )}

      {testResults.length > 0 && (
        <div className="test-results">
          <h2>Test Results</h2>
          <div className="results-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Route Name</th>
                <th>Path</th>
                <th>Permission</th>
                <th>Message</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {testResults.map((result, index) => {
                const badge = getStatusBadge(result.status);
                const route = ROUTES.find(r => r.path === result.path);
                return (
                  <tr key={index} className={`row-${result.status}`}>
                    <td className="status-cell">
                      <span className={`badge ${badge.class}`}>
                        {badge.icon} {badge.label}
                      </span>
                    </td>
                    <td className="name-cell">{result.name}</td>
                    <td className="path-cell">
                      <code>{result.path}</code>
                    </td>
                    <td className="permission-cell">
                      {result.requiredPermission ? (
                        <code>{result.requiredPermission}</code>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td className="message-cell">{result.message}</td>
                    <td className="actions-cell">
                      {result.accessible && route && (
                        <button 
                          onClick={() => navigateToRoute(route)}
                          className="btn-nav"
                          title={`Navigate to ${result.path}`}
                        >
                          🔗 Go
                        </button>
                      )}
                      <button 
                        onClick={() => setSelectedTest(result)}
                        className="btn-details"
                        title="View details"
                      >
                        📋
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </div>
        </div>
      )}

      {selectedTest && (
        <div className="test-modal" onClick={() => setSelectedTest(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Route Details: {selectedTest.name}</h3>
              <button 
                onClick={() => setSelectedTest(null)} 
                className="btn-close"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-group">
                <label>Path:</label>
                <code>{selectedTest.path}</code>
              </div>
              <div className="detail-group">
                <label>Status:</label>
                <span className={`badge ${getStatusBadge(selectedTest.status).class}`}>
                  {getStatusBadge(selectedTest.status).label}
                </span>
              </div>
              <div className="detail-group">
                <label>Has Component:</label>
                <span>{selectedTest.hasComponent ? '✅ Yes' : '❌ No'}</span>
              </div>
              {selectedTest.requiredPermission && (
                <div className="detail-group">
                  <label>Required Permission:</label>
                  <code>{selectedTest.requiredPermission}</code>
                </div>
              )}
              <div className="detail-group">
                <label>Message:</label>
                <p>{selectedTest.message}</p>
              </div>
              {selectedTest.error && (
                <div className="detail-group error">
                  <label>Error Details:</label>
                  <pre>{selectedTest.error}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteTestingPage;
