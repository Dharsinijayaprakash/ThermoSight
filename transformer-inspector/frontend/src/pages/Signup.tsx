// src/pages/Signup.tsx
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function Signup() {
  const navigate = useNavigate();
  const { signup, loginWithGoogle } = useAuth();
  const toast = useToast();
  const googleButtonRef = useRef<HTMLDivElement>(null);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Load Google Sign-In script and render button
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const initializeGoogle = () => {
      const google = (window as any).google;
      if (google && googleButtonRef.current) {
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCallback,
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        
        // Render the Google button
        google.accounts.id.renderButton(googleButtonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signup_with',
          shape: 'rectangular',
          width: '100%',
        });
      }
    };

    // Check if script already loaded
    if ((window as any).google) {
      initializeGoogle();
      return;
    }

    // Load script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setTimeout(initializeGoogle, 100);
    document.body.appendChild(script);
  }, []);

  const handleGoogleCallback = async (response: { credential: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      await loginWithGoogle(response.credential);
      toast.success('Welcome to TransX!', 'Your account has been created successfully');
      navigate('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google signup failed';
      setError(msg);
      toast.error('Signup Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Password strength calculation
  const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;

    if (score <= 1) return { score, label: 'Weak', color: '#ef4444' };
    if (score <= 2) return { score, label: 'Fair', color: '#f59e0b' };
    if (score <= 3) return { score, label: 'Good', color: '#3b82f6' };
    return { score, label: 'Strong', color: '#22c55e' };
  };

  const passwordStrength = getPasswordStrength(password);

  const validateForm = (): string | null => {
    if (!name.trim()) return 'Name is required';
    if (name.trim().length < 2) return 'Name must be at least 2 characters';
    if (!email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Invalid email format';
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (password !== confirmPassword) return 'Passwords do not match';
    if (!agreeTerms) return 'You must agree to the terms and conditions';
    return null;
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      toast.warning('Validation Error', validationError);
      return;
    }

    setIsLoading(true);

    try {
      await signup(name.trim(), email.trim(), password);
      toast.success('Welcome to TransX!', 'Your account has been created successfully');
      navigate('/');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Signup failed. Please try again.';
      setError(errorMessage);
      toast.error('Signup Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card signup-card">
        {/* Logo and Header */}
        <div className="auth-header">
          <div className="auth-logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">TransX</span>
          </div>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join TransX Platform for transformer management</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="auth-error">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleEmailSignup} className="auth-form">
          <div className="form-group">
            <label htmlFor="name" className="form-label">Full Name</label>
            <div className="input-wrapper">
              <span className="input-icon">👤</span>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="form-input"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">Email Address</label>
            <div className="input-wrapper">
              <span className="input-icon">📧</span>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="form-input"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                className="form-input"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {password && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div
                    className="strength-fill"
                    style={{
                      width: `${(passwordStrength.score / 5) * 100}%`,
                      backgroundColor: passwordStrength.color,
                    }}
                  />
                </div>
                <span className="strength-label" style={{ color: passwordStrength.color }}>
                  {passwordStrength.label}
                </span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="form-input"
                required
                disabled={isLoading}
              />
              {confirmPassword && password === confirmPassword && (
                <span className="input-valid">✓</span>
              )}
            </div>
          </div>

          <div className="form-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                className="checkbox-input"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
              />
              <span>
                I agree to the{' '}
                <Link to="/terms" className="terms-link">Terms of Service</Link>
                {' '}and{' '}
                <Link to="/privacy" className="terms-link">Privacy Policy</Link>
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="auth-button primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        {/* Google Sign-In Button - Rendered by Google */}
        <div className="social-buttons">
          <div 
            ref={googleButtonRef} 
            className="google-signin-container"
            style={{ 
              display: 'flex', 
              justifyContent: 'center',
              minHeight: '44px'
            }}
          />
          {!GOOGLE_CLIENT_ID && (
            <p style={{ color: '#666', fontSize: '14px', textAlign: 'center' }}>
              Google Sign-In not configured
            </p>
          )}
        </div>

        {/* Sign In Link */}
        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">
            Sign in
          </Link>
        </p>
      </div>

      {/* Background decoration */}
      <div className="auth-bg-decoration">
        <div className="decoration-circle circle-1"></div>
        <div className="decoration-circle circle-2"></div>
        <div className="decoration-circle circle-3"></div>
      </div>
    </div>
  );
}
