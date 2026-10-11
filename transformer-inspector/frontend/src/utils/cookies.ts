// src/utils/cookies.ts
// Secure cookie management utilities

interface CookieOptions {
  expires?: Date | number; // Date object or days from now
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  httpOnly?: boolean;
}

const DEFAULT_OPTIONS: CookieOptions = {
  path: '/',
  secure: window.location.protocol === 'https:',
  sameSite: 'lax',
};

/**
 * Set a cookie with the given name, value, and options
 */
export function setCookie(name: string, value: string, options: CookieOptions = {}): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  
  if (opts.expires) {
    let expiresDate: Date;
    if (typeof opts.expires === 'number') {
      expiresDate = new Date();
      expiresDate.setTime(expiresDate.getTime() + opts.expires * 24 * 60 * 60 * 1000);
    } else {
      expiresDate = opts.expires;
    }
    cookieString += `; expires=${expiresDate.toUTCString()}`;
  }
  
  if (opts.path) {
    cookieString += `; path=${opts.path}`;
  }
  
  if (opts.domain) {
    cookieString += `; domain=${opts.domain}`;
  }
  
  if (opts.secure) {
    cookieString += '; secure';
  }
  
  if (opts.sameSite) {
    cookieString += `; samesite=${opts.sameSite}`;
  }
  
  document.cookie = cookieString;
}

/**
 * Get a cookie value by name
 */
export function getCookie(name: string): string | null {
  const nameEQ = encodeURIComponent(name) + '=';
  const cookies = document.cookie.split(';');
  
  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.indexOf(nameEQ) === 0) {
      return decodeURIComponent(cookie.substring(nameEQ.length));
    }
  }
  
  return null;
}

/**
 * Delete a cookie by name
 */
export function deleteCookie(name: string, options: Pick<CookieOptions, 'path' | 'domain'> = {}): void {
  setCookie(name, '', {
    ...options,
    expires: new Date(0),
  });
}

/**
 * Check if cookies are enabled in the browser
 */
export function areCookiesEnabled(): boolean {
  try {
    document.cookie = 'testcookie=1; samesite=strict';
    const enabled = document.cookie.indexOf('testcookie') !== -1;
    deleteCookie('testcookie');
    return enabled;
  } catch {
    return false;
  }
}

// Cookie names used in the application
export const COOKIE_NAMES = {
  AUTH_TOKEN: 'transx_auth_token',
  USER_DATA: 'transx_user',
  SESSION_ID: 'transx_session',
  PREFERENCES: 'transx_preferences',
  REMEMBER_ME: 'transx_remember',
  THEME: 'transx_theme',
  LAST_ACTIVITY: 'transx_last_activity',
} as const;

// Session management
export const SESSION_DURATION = {
  DEFAULT: 1, // 1 day
  REMEMBER_ME: 30, // 30 days
  PREFERENCES: 365, // 1 year
} as const;
