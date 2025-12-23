import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import './index.css';
import logService from './services/logService';
import './utils/logUtils'; // Import for startup message
import './utils/routeValidator'; // Import for route testing
import './utils/menuValidator'; // Import for menu validation

// Initialize logging service
console.log('🚀 Application starting - Logging initialized');
window.logService = logService; // Make available in console for manual control

/**
 * Application Entry Point
 * 
 * Initializes the React application with:
 * - Router for client-side navigation
 * - Global CSS styling
 * - React root rendering
 * - Future flags to suppress React Router v7 deprecation warnings
 */

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </Router>
  </React.StrictMode>,
);
