// src/pages/Login.tsx
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

// Google OAuth Client ID
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Google Sign-In script URL
const GOOGLE_GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, loginWithGoogle } = useAuth();
  const toast = useToast();
  const googleButtonRef = useRef<HTMLDivElement>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleScriptLoaded, setGoogleScriptLoaded] = useState(false);
  const [googleInitialized, setGoogleInitialized] = useState(false);

  // Check for session expiration
  useEffect(() => {
    if (searchParams.get('expired') === 'true') {
      toast.warning('Session Expired', 'Your session has expired due to inactivity. Please sign in again.');
    }
  }, [searchParams, toast]);

  // Load Google Sign-In script and render button
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.log('Google OAuth not configured - skipping Google Sign-In');
      return;
    }

    const initializeGoogle = () => {
      try {
        const google = (window as any).google;
        if (google && googleButtonRef.current) {
          google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCallback,
            auto_select: false,
            cancel_on_tap_outside: true,
            ux_mode: 'popup',
            context: 'signin',
          });
          
          // Render the Google button
          google.accounts.id.renderButton(googleButtonRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            width: 300, // Fixed width in pixels to avoid GSI warning
            logo_alignment: 'center',
          });
          
          setGoogleInitialized(true);
        }
      } catch (err) {
        console.warn('Google Sign-In initialization failed:', err);
        setGoogleInitialized(false);
      }
    };

    // Check if script already loaded
    if ((window as any).google) {
      setGoogleScriptLoaded(true);
      initializeGoogle();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector(`script[src="${GOOGLE_GSI_SCRIPT_URL}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        setGoogleScriptLoaded(true);
        setTimeout(initializeGoogle, 100);
      });
      return;
    }

    // Load script
    const script = document.createElement('script');
    script.src = GOOGLE_GSI_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setGoogleScriptLoaded(true);
      setTimeout(initializeGoogle, 100);
    };
    script.onerror = () => {
      console.error('Failed to load Google Sign-In script');
      setGoogleScriptLoaded(false);
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, []);

  const handleGoogleCallback = async (response: { credential: string }) => {
    setGoogleLoading(true);
    setError(null);
    try {
      await loginWithGoogle(response.credential);
      toast.success('Welcome!', 'Successfully signed in with Google');
      navigate('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google login failed';
      setError(msg);
      toast.error('Login Failed', msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  // Fallback Google Sign-In using popup (when button render fails)
  const handleGoogleSignInFallback = () => {
    if (!GOOGLE_CLIENT_ID) {
      toast.error('Configuration Error', 'Google Sign-In is not configured');
      return;
    }

    const google = (window as any).google;
    if (!google) {
      toast.error('Script Error', 'Google Sign-In script not loaded. Please refresh the page.');
      return;
    }

    try {
      google.accounts.id.prompt();
    } catch (err) {
      console.error('Google prompt failed:', err);
      toast.error('Error', 'Failed to open Google Sign-In. Please try again.');
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password, rememberMe);
      toast.success('Welcome back!', rememberMe ? 'You will stay signed in for 30 days' : 'Successfully signed in');
      navigate('/');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(errorMessage);
      toast.error('Login Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Logo and Header */}
        <div className="auth-header">
          <div className="auth-logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">TransX</span>
          </div>
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to continue to TransX Platform</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="auth-error">
            <svg className="error-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleEmailLogin} className="auth-form">
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email Address</label>
            <div className="input-wrapper">
              <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
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
              <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
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
          </div>

          <div className="form-options">
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                className="checkbox-input" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me for 30 days</span>
            </label>
            <Link to="/forgot-password" className="forgot-link">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            className="auth-button primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        {/* Google Sign-In Button */}
        <div className="social-buttons">
          {GOOGLE_CLIENT_ID ? (
            <>
              {/* Google rendered button container */}
              <div 
                ref={googleButtonRef} 
                className="google-signin-container"
                style={{ 
                  display: googleInitialized ? 'flex' : 'none', 
                  justifyContent: 'center',
                  minHeight: '44px'
                }}
              />
              
              {/* Fallback/Loading button */}
              {(!googleInitialized || googleLoading) && (
                <button
                  type="button"
                  className="google-signin-fallback"
                  onClick={handleGoogleSignInFallback}
                  disabled={googleLoading || !googleScriptLoaded}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    width: '300px',
                    height: '44px',
                    margin: '0 auto',
                    padding: '0 16px',
                    border: '1px solid #dadce0',
                    borderRadius: '4px',
                    backgroundColor: '#fff',
                    cursor: googleLoading || !googleScriptLoaded ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#3c4043',
                    fontFamily: 'Google Sans, Roboto, Arial, sans-serif',
                    transition: 'background-color 0.2s, box-shadow 0.2s',
                  }}
                  onMouseOver={(e) => {
                    if (!googleLoading && googleScriptLoaded) {
                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                    }
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {googleLoading ? (
                    <>
                      <span className="spinner" style={{ width: '18px', height: '18px' }}></span>
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      </svg>
                      <span>{googleScriptLoaded ? 'Continue with Google' : 'Loading...'}</span>
                    </>
                  )}
                </button>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '12px' }}>
              <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
                Google Sign-In not configured
              </p>
              <p style={{ color: '#999', fontSize: '12px', marginTop: '4px' }}>
                Add VITE_GOOGLE_CLIENT_ID to your .env file
              </p>
            </div>
          )}
        </div>

        {/* Sign Up Link */}
        <p className="auth-footer">
          Don't have an account?{' '}
          <Link to="/signup" className="auth-link">
            Create account
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
