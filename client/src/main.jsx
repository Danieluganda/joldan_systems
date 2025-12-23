import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import './index.css';

/**
 * Application Entry Point
 * 
 * Initializes the React application with:
 * - Router for client-side navigation
 * - Global CSS styling
 * - React root rendering
 */

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>,
);
