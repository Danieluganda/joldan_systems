import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './pages.css';

/**
 * LoginPage Component
 * 
 * Professional user authentication page with modern design.
 * Handles secure login with email/username and password.
 * 
 * Features:
 * - Modern card-based design
 * - Email/username input with validation
 * - Password input with secure toggle
 * - Remember me functionality
 * - Forgot password recovery
 * - Demo account quick access
 * - Form validation with clear error messages
 * - Loading states and animations
 * - Responsive design
 */

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!email.trim()) {
      setError('Please enter your email or username');
      return;
    }

    if (!password) {
      setError('Please enter your password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Demo credentials validation
      if ((email === 'demo@example.com' || email === 'admin') && password === 'password123') {
        // Store auth token
        localStorage.setItem('authToken', 'demo_token_' + Date.now());
        localStorage.setItem('user', JSON.stringify({
          id: '1',
          name: 'Demo User',
          email: 'demo@example.com',
          role: 'Procurement Officer'
        }));

        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
          localStorage.setItem('savedEmail', email);
        }

        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        setError('Invalid email or password. Try demo@example.com / password123');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Use demo credentials
  const useDemoCredentials = () => {
    setEmail('demo@example.com');
    setPassword('password123');
  };

  return (
    <div className="login-wrapper">
      <div className="login-container-new">
        {/* Left Panel - Branding */}
        <div className="login-left">
          <div className="login-branding">
            <div className="logo-large">📋</div>
            <h1 className="system-title">Procurement Discipline</h1>
            <p className="system-tagline">PPDA Compliant Procurement Management System</p>
            
            <div className="features-list">
              <div className="feature-item">
                <span className="feature-icon">✓</span>
                <span>Transparent procurement process</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">✓</span>
                <span>Audit trail and compliance tracking</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">✓</span>
                <span>Secure document management</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">✓</span>
                <span>Real-time notifications</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="login-right">
          <div className="login-card">
            <div className="login-header-new">
              <h2>Welcome Back</h2>
              <p>Sign in to your account to continue</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="alert alert-error">
                <span className="alert-icon">⚠️</span>
                <span className="alert-text">{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="login-form-new">
              {/* Email Input */}
              <div className={`form-field ${emailFocused ? 'focused' : ''}`}>
                <label htmlFor="email" className="form-label">Email or Username</label>
                <div className="input-wrapper">
                  <span className="input-icon">👤</span>
                  <input
                    id="email"
                    type="text"
                    placeholder="demo@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    className="form-input-new"
                    disabled={loading}
                    autoFocus
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className={`form-field ${passwordFocused ? 'focused' : ''}`}>
                <div className="field-header">
                  <label htmlFor="password" className="form-label">Password</label>
                  <a href="/forgot-password" className="forgot-link">Forgot?</a>
                </div>
                <div className="input-wrapper">
                  <span className="input-icon">🔒</span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    className="form-input-new"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="password-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '👁️‍🗨️' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                />
                <span>Remember me on this device</span>
              </label>

              {/* Sign In Button */}
              <button
                type="submit"
                className="btn-primary-large"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="btn-spinner"></span>
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>

              {/* Demo Quick Access */}
              <div className="demo-section">
                <p className="demo-text">Need to explore the system?</p>
                <button
                  type="button"
                  className="btn-demo-access"
                  onClick={useDemoCredentials}
                  disabled={loading}
                >
                  🎯 Use Demo Account
                </button>
              </div>
            </form>

            {/* Divider */}
            <div className="form-divider-new">
              <span>New user?</span>
            </div>

            {/* Sign Up */}
            <div className="signup-cta">
              <p>Create an account to get started</p>
              <a href="/signup" className="btn-secondary-large">
                Create Account
              </a>
            </div>

            {/* Footer */}
            <div className="login-footer-new">
              <a href="/help">Help</a>
              <a href="/privacy">Privacy</a>
              <a href="/terms">Terms</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
