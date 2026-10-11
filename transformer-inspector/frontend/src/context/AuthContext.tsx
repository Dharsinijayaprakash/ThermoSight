// src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { 
  setCookie, 
  getCookie, 
  deleteCookie, 
  COOKIE_NAMES, 
  SESSION_DURATION 
} from '../utils/cookies';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'inspector' | 'viewer';
  provider: 'email' | 'google';
  createdAt: string;
  lastLogin?: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  emailNotifications: boolean;
  language: string;
  timezone: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => Promise<void>;
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  refreshUser: () => Promise<void>;
  updateLastActivity: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:8080';

// Helper to get stored token (checks both cookie and localStorage for migration)
const getStoredToken = (): string | null => {
  // First check cookies (preferred)
  const cookieToken = getCookie(COOKIE_NAMES.AUTH_TOKEN);
  if (cookieToken) return cookieToken;
  
  // Fallback to localStorage for backward compatibility
  const localToken = localStorage.getItem('transx_token');
  if (localToken) {
    // Migrate to cookie
    setCookie(COOKIE_NAMES.AUTH_TOKEN, localToken, { expires: SESSION_DURATION.DEFAULT });
    localStorage.removeItem('transx_token');
    return localToken;
  }
  
  return null;
};

// Helper to get stored user
const getStoredUser = (): User | null => {
  // First check cookies
  const cookieUser = getCookie(COOKIE_NAMES.USER_DATA);
  if (cookieUser) {
    try {
      return JSON.parse(cookieUser);
    } catch {
      return null;
    }
  }
  
  // Fallback to localStorage
  const localUser = localStorage.getItem('transx_user');
  if (localUser) {
    try {
      const user = JSON.parse(localUser);
      // Migrate to cookie
      setCookie(COOKIE_NAMES.USER_DATA, localUser, { expires: SESSION_DURATION.DEFAULT });
      localStorage.removeItem('transx_user');
      return user;
    } catch {
      return null;
    }
  }
  
  return null;
};

// Store auth data in cookies
const storeAuthData = (token: string, user: User, rememberMe: boolean = false) => {
  const duration = rememberMe ? SESSION_DURATION.REMEMBER_ME : SESSION_DURATION.DEFAULT;
  
  setCookie(COOKIE_NAMES.AUTH_TOKEN, token, { expires: duration });
  setCookie(COOKIE_NAMES.USER_DATA, JSON.stringify(user), { expires: duration });
  
  if (rememberMe) {
    setCookie(COOKIE_NAMES.REMEMBER_ME, 'true', { expires: SESSION_DURATION.REMEMBER_ME });
  }
  
  // Update last activity
  setCookie(COOKIE_NAMES.LAST_ACTIVITY, Date.now().toString(), { expires: duration });
};

// Clear all auth data
const clearAuthData = () => {
  deleteCookie(COOKIE_NAMES.AUTH_TOKEN);
  deleteCookie(COOKIE_NAMES.USER_DATA);
  deleteCookie(COOKIE_NAMES.SESSION_ID);
  deleteCookie(COOKIE_NAMES.REMEMBER_ME);
  deleteCookie(COOKIE_NAMES.LAST_ACTIVITY);
  
  // Also clear localStorage for complete cleanup
  localStorage.removeItem('transx_token');
  localStorage.removeItem('transx_user');
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getStoredUser);
  const [isLoading, setIsLoading] = useState(true);

  // Update last activity timestamp
  const updateLastActivity = useCallback(() => {
    const rememberMe = getCookie(COOKIE_NAMES.REMEMBER_ME) === 'true';
    const duration = rememberMe ? SESSION_DURATION.REMEMBER_ME : SESSION_DURATION.DEFAULT;
    setCookie(COOKIE_NAMES.LAST_ACTIVITY, Date.now().toString(), { expires: duration });
  }, []);

  // Check for session timeout (30 min of inactivity for non-remember-me sessions)
  useEffect(() => {
    const checkSession = () => {
      const lastActivity = getCookie(COOKIE_NAMES.LAST_ACTIVITY);
      const rememberMe = getCookie(COOKIE_NAMES.REMEMBER_ME) === 'true';
      
      if (lastActivity && !rememberMe) {
        const inactiveTime = Date.now() - parseInt(lastActivity, 10);
        const thirtyMinutes = 30 * 60 * 1000;
        
        if (inactiveTime > thirtyMinutes && user) {
          console.log('Session expired due to inactivity');
          clearAuthData();
          setUser(null);
          window.location.href = '/login?expired=true';
        }
      }
    };

    // Check every minute
    const interval = setInterval(checkSession, 60 * 1000);
    
    // Update activity on user interaction
    const handleActivity = () => updateLastActivity();
    window.addEventListener('click', handleActivity);
    window.addEventListener('keypress', handleActivity);
    window.addEventListener('scroll', handleActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, [user, updateLastActivity]);

  // Validate token on mount
  useEffect(() => {
    const validateSession = async () => {
      const token = getStoredToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
          
          // Refresh cookie expiration
          const rememberMe = getCookie(COOKIE_NAMES.REMEMBER_ME) === 'true';
          storeAuthData(token, userData, rememberMe);
        } else {
          // Token invalid or expired - silently clear and redirect to login
          // This is expected when token expires or user session is invalid
          clearAuthData();
          setUser(null);
        }
      } catch (error) {
        // Network error - keep existing user data to allow offline-first behavior
        // User will need to re-authenticate when network is restored if token is invalid
        console.warn('Session validation network error - keeping cached session');
      } finally {
        setIsLoading(false);
      }
    };

    validateSession();
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean = false) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Login failed');
    }

    const { token, user: userData } = await res.json();
    storeAuthData(token, userData, rememberMe);
    setUser(userData);
  }, []);

  const loginWithGoogle = useCallback(async (credential: string) => {
    const res = await fetch(`${API_BASE}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Google login failed');
    }

    const { token, user: userData } = await res.json();
    storeAuthData(token, userData, true); // Google login always remembers
    setUser(userData);
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Signup failed');
    }

    const { token, user: userData } = await res.json();
    storeAuthData(token, userData, false);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    clearAuthData();
    setUser(null);
    window.location.href = '/login';
  }, []);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    const token = getStoredToken();
    if (!token || !user) throw new Error('Not authenticated');

    const res = await fetch(`${API_BASE}/api/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to update profile');
    }

    const updatedUser = await res.json();
    const rememberMe = getCookie(COOKIE_NAMES.REMEMBER_ME) === 'true';
    storeAuthData(token, updatedUser, rememberMe);
    setUser(updatedUser);
  }, [user]);

  const updatePreferences = useCallback(async (preferences: Partial<UserPreferences>) => {
    const token = getStoredToken();
    if (!token || !user) throw new Error('Not authenticated');

    const res = await fetch(`${API_BASE}/api/auth/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(preferences),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to update preferences');
    }

    const updatedUser = await res.json();
    const rememberMe = getCookie(COOKIE_NAMES.REMEMBER_ME) === 'true';
    storeAuthData(token, updatedUser, rememberMe);
    setUser(updatedUser);
    
    // Also store theme preference separately for quick access
    if (preferences.theme) {
      setCookie(COOKIE_NAMES.THEME, preferences.theme, { expires: SESSION_DURATION.PREFERENCES });
    }
  }, [user]);

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) return;

    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (res.ok) {
      const userData = await res.json();
      const rememberMe = getCookie(COOKIE_NAMES.REMEMBER_ME) === 'true';
      storeAuthData(token, userData, rememberMe);
      setUser(userData);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginWithGoogle,
        signup,
        logout,
        updateUser,
        updatePreferences,
        refreshUser,
        updateLastActivity,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper hook to get auth header for API calls
export function useAuthHeader(): Record<string, string> {
  const token = getStoredToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// Helper function to get current user ID for tracking
export function getCurrentUserId(): string | null {
  const user = getStoredUser();
  return user?.id || null;
}

// Helper function to get current user name for display
export function getCurrentUserName(): string {
  const user = getStoredUser();
  return user?.name || 'Unknown User';
}

// Helper to get stored theme preference
export function getStoredTheme(): 'light' | 'dark' | 'system' {
  const theme = getCookie(COOKIE_NAMES.THEME);
  if (theme === 'light' || theme === 'dark' || theme === 'system') {
    return theme;
  }
  return 'system';
}
