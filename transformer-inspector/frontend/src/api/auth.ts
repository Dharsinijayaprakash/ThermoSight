import { API_BASE } from './client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
}

export interface GoogleAuthRequest {
  credential: string;
}

export interface UpdateProfileRequest {
  name?: string;
  avatar?: string;
}

export interface UpdatePreferencesRequest {
  theme?: string;
  notifications?: boolean;
  emailNotifications?: boolean;
  language?: string;
  timezone?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UserPreferences {
  theme: string;
  notifications: boolean;
  emailNotifications: boolean;
  language: string;
  timezone: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  provider: string;
  createdAt?: string;
  lastLogin?: string;
  preferences: UserPreferences;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Helper to get auth headers
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('transx_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Generic API request helper
async function authRequest<T>(
  path: string,
  method: string = 'GET',
  body?: unknown
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const options: RequestInit = {
    method,
    headers: getAuthHeaders(),
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  const data = await response.json();
  
  if (!response.ok || data.error) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  
  return data;
}

// Login with email and password
export async function login(request: LoginRequest): Promise<AuthResponse> {
  return authRequest<AuthResponse>('/api/auth/login', 'POST', request);
}

// Sign up with email and password
export async function signup(request: SignupRequest): Promise<AuthResponse> {
  return authRequest<AuthResponse>('/api/auth/signup', 'POST', request);
}

// Authenticate with Google
export async function googleAuth(request: GoogleAuthRequest): Promise<AuthResponse> {
  return authRequest<AuthResponse>('/api/auth/google', 'POST', request);
}

// Get current user
export async function getCurrentUser(): Promise<User> {
  return authRequest<User>('/api/auth/me', 'GET');
}

// Update profile
export async function updateProfile(request: UpdateProfileRequest): Promise<User> {
  return authRequest<User>('/api/auth/profile', 'PUT', request);
}

// Update preferences
export async function updatePreferences(request: UpdatePreferencesRequest): Promise<User> {
  return authRequest<User>('/api/auth/preferences', 'PUT', request);
}

// Change password
export async function changePassword(request: ChangePasswordRequest): Promise<{ message: string }> {
  return authRequest<{ message: string }>('/api/auth/change-password', 'POST', request);
}

// Logout (client-side only for JWT)
export function logout(): void {
  localStorage.removeItem('transx_token');
  localStorage.removeItem('transx_user');
}
