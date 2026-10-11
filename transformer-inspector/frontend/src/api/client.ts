// src/api/client.ts
import { getCookie, COOKIE_NAMES, deleteCookie } from '../utils/cookies';

export const API_BASE =
  (import.meta.env.VITE_API_BASE as string) || 'http://localhost:8080';

console.log('API_BASE =', API_BASE);

// Helper to get auth token from cookie (with localStorage fallback for migration)
function getAuthToken(): string | null {
  // First check cookies (preferred)
  const cookieToken = getCookie(COOKIE_NAMES.AUTH_TOKEN);
  if (cookieToken) return cookieToken;
  
  // Fallback to localStorage for backward compatibility during migration
  const localToken = localStorage.getItem('transx_token');
  return localToken;
}

// Helper to build headers with optional auth
function buildHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers);
  
  // Add auth token if available and not already set
  const token = getAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  return headers;
}

// Clear all auth data
function clearAuthData() {
  deleteCookie(COOKIE_NAMES.AUTH_TOKEN);
  deleteCookie(COOKIE_NAMES.USER_DATA);
  deleteCookie(COOKIE_NAMES.SESSION_ID);
  deleteCookie(COOKIE_NAMES.REMEMBER_ME);
  deleteCookie(COOKIE_NAMES.LAST_ACTIVITY);
  localStorage.removeItem('transx_token');
  localStorage.removeItem('transx_user');
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  
  // Build request with auth headers
  const requestInit: RequestInit = {
    ...init,
    headers: buildHeaders(init),
  };
  
  const res = await fetch(url, requestInit).catch(err => {
    throw new Error(`Network error calling ${url}: ${err?.message || err}`);
  });
  
  // Handle 401 Unauthorized - redirect to login
  if (res.status === 401) {
    clearAuthData();
    window.location.href = '/login?expired=true';
    throw new Error('Session expired. Please log in again.');
  }
  
  // Handle 403 Forbidden - might also be auth issue
  if (res.status === 403) {
    const token = getAuthToken();
    if (!token) {
      // No token present, redirect to login
      window.location.href = '/login';
      throw new Error('Please log in to access this resource.');
    }
    // Token present but forbidden - might be permissions issue
    throw new Error(`Access denied for ${url}`);
  }
  
  const text = await res.text();
  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  if (!res.ok) throw new Error(text || `HTTP ${res.status} for ${url}`);
  if (!text) return undefined as unknown as T;
  return isJson ? JSON.parse(text) as T : (text as unknown as T);
}