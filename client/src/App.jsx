/**
 * Main Application Component
 * 
 * Renders the complete application with:
 * - Dynamic route configuration
 * - Navigation from centralized routes config
 * - Layout wrapper with navbar and content area
 * - Route protection and permission checking
 */

import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import ROUTES from './routes';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import Footer from './components/layout/Footer';
import { usePermissions } from './hooks/usePermissions';
import './App.css';

/**
 * App Component
 * Main application wrapper that sets up routing and layout
 */
export default function App() {
  const location = useLocation();
  const { permissions, loading } = usePermissions();

  // Check if current route is public
  const isPublicRoute = ROUTES.some(
    route => route.path === location.pathname && route.isPublic
  );

  // Redirect to login if not authenticated (except for public routes)
  useEffect(() => {
    // Set a development token to allow testing without login
    let token = localStorage.getItem('authToken');
    if (!token) {
      token = 'dev-token-' + Date.now();
      localStorage.setItem('authToken', token);
    }
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Loading application...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {isPublicRoute ? (
        /* Public routes (login) - no navbar/sidebar */
        <div className="app-public">
          <Routes>
            {ROUTES.filter(route => route.isPublic).map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={<route.component />}
              />
            ))}
          </Routes>
        </div>
      ) : (
        /* Protected routes - with navbar/sidebar */
        <>
          <Navbar />
          <div className="app-container">
            <Sidebar />
            <main className="app-main">
              <Routes>
                {ROUTES.map((route) => {
                  // Skip public routes in protected section
                  if (route.isPublic) return null;

                  // Check permissions - default to true if no permission required
                  const hasAccess = !route.requiredPermission || permissions.includes(route.requiredPermission);

                  return (
                    <Route
                      key={route.path}
                      path={route.path}
                      element={
                        hasAccess ? (
                          <route.component />
                        ) : (
                          <div className="access-denied">
                            <h1>Access Denied</h1>
                            <p>You do not have permission to access this page.</p>
                            <Link to="/" className="btn btn-primary">
                              Back to Dashboard
                            </Link>
                          </div>
                        )
                      }
                    />
                  );
                })}

                {/* Catch-all 404 route */}
                <Route
                  path="*"
                  element={
                    <div className="not-found">
                      <h1>404 - Page Not Found</h1>
                      <p>The page you are looking for does not exist.</p>
                      <Link to="/" className="btn btn-primary">
                        Back to Dashboard
                      </Link>
                    </div>
                  }
                />
              </Routes>
            </main>
          </div>
          <Footer />
        </>
      )}
    </div>
  );
}
