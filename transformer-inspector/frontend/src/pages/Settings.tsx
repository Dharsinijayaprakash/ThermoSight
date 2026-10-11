// src/pages/Settings.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface TabConfig {
  id: string;
  label: string;
  icon: string;
}

const tabs: TabConfig[] = [
  { id: 'profile', label: 'Profile', icon: 'profile' },
  { id: 'security', label: 'Security', icon: 'security' },
  { id: 'activity', label: 'Activity Log', icon: 'activity' },
];

const getTabIcon = (iconId: string) => {
  switch (iconId) {
    case 'profile':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      );
    case 'security':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      );
    case 'activity':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      );
    default:
      return null;
  }
};

export default function Settings() {
  const { user, updateUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');

  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setAvatarPreview(user.avatar || '');
    }
  }, [user]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updateUser({ name, email, avatar: avatarPreview });
      showMessage('success', 'Profile updated successfully');
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      showMessage('error', 'Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      showMessage('error', 'Password must be at least 8 characters');
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('transx_token');
      const res = await fetch('http://localhost:8080/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok) throw new Error(await res.text());
      
      showMessage('success', 'Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="settings-section">
            <h2 className="section-title">Profile Information</h2>
            <p className="section-description">Update your personal information and profile picture</p>

            <div className="profile-avatar-section">
              <div className="avatar-container">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profile" className="avatar-image" />
                ) : (
                  <div className="avatar-placeholder">
                    {name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
                <label className="avatar-upload-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
              <div className="avatar-info">
                <h3>{name || 'User'}</h3>
                <p>{user?.role || 'Inspector'}</p>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="settings-input"
                  placeholder="Your full name"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="settings-input"
                  placeholder="your@email.com"
                  disabled={user?.provider === 'google'}
                />
                {user?.provider === 'google' && (
                  <span className="input-hint">Email cannot be changed for Google accounts</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Role</label>
                <input
                  type="text"
                  value={user?.role || 'Inspector'}
                  className="settings-input"
                  disabled
                />
                <span className="input-hint">Contact admin to change your role</span>
              </div>

              <div className="form-group">
                <label className="form-label">Member Since</label>
                <input
                  type="text"
                  value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  className="settings-input"
                  disabled
                />
              </div>
            </div>

            <div className="section-actions">
              <button className="btn-secondary" onClick={() => {
                setName(user?.name || '');
                setEmail(user?.email || '');
                setAvatarPreview(user?.avatar || '');
              }}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSaveProfile} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="settings-section">
            <h2 className="section-title">Security Settings</h2>
            <p className="section-description">Manage your account security</p>

            {user?.provider === 'google' ? (
              <div className="info-banner">
                <span className="banner-icon" style={{ display: 'flex', alignItems: 'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                </span>
                <div>
                  <h4>Google Account</h4>
                  <p>Your account is secured through Google. Password changes are managed through your Google account.</p>
                </div>
              </div>
            ) : (
              <div className="password-change-section">
                <h3>Change Password</h3>
                <div className="form-grid single-column">
                  <div className="form-group">
                    <label className="form-label">Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="settings-input"
                      placeholder="Enter current password"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="settings-input"
                      placeholder="Enter new password"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="settings-input"
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>

                <button className="btn-primary" onClick={handleChangePassword} disabled={isSaving}>
                  {isSaving ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            )}

            <div className="security-info">
              <h3>Session Information</h3>
              <div className="session-item">
                <span className="session-label">Last Login</span>
                <span className="session-value">
                  {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A'}
                </span>
              </div>
              <div className="session-item">
                <span className="session-label">Login Provider</span>
                <span className="session-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {user?.provider === 'google' ? (
                    <><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4285f4', display: 'inline-block' }}></span> Google</>
                  ) : (
                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> Email</>
                  )}
                </span>
              </div>
            </div>

            <div className="danger-zone">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                Danger Zone
              </h3>
              <div className="danger-item">
                <div>
                  <h4>Sign Out Everywhere</h4>
                  <p>Sign out from all devices</p>
                </div>
                <button className="btn-danger-outline" onClick={logout}>
                  Sign Out All
                </button>
              </div>
              <div className="danger-item">
                <div>
                  <h4>Delete Account</h4>
                  <p>Permanently delete your account and all data</p>
                </div>
                <button className="btn-danger">Delete Account</button>
              </div>
            </div>
          </div>
        );

      case 'activity':
        return (
          <div className="settings-section">
            <h2 className="section-title">Activity Log</h2>
            <p className="section-description">Review your recent activity on the platform</p>

            <div className="activity-list">
              <div className="activity-item">
                <div className="activity-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </div>
                <div className="activity-content">
                  <h4>Completed inspection INS-081</h4>
                  <p>Approved 3 anomalies, rejected 1</p>
                </div>
                <span className="activity-time">2 hours ago</span>
              </div>
              <div className="activity-item">
                <div className="activity-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </div>
                <div className="activity-content">
                  <h4>Added annotation to inspection</h4>
                  <p>Manual annotation for transformer T-001</p>
                </div>
                <span className="activity-time">Yesterday</span>
              </div>
              <div className="activity-item">
                <div className="activity-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  </svg>
                </div>
                <div className="activity-content">
                  <h4>Added comment</h4>
                  <p>"Need to recheck this area"</p>
                </div>
                <span className="activity-time">2 days ago</span>
              </div>
              <div className="activity-item">
                <div className="activity-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
                <div className="activity-content">
                  <h4>Uploaded thermal image</h4>
                  <p>Baseline image for transformer T-005</p>
                </div>
                <span className="activity-time">1 week ago</span>
              </div>
            </div>

            <button className="btn-secondary load-more">
              Load More Activity
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  if (!user) {
    return (
      <div className="settings-page">
        <div className="loading-state">
          <span className="spinner large"></span>
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account and preferences</p>
      </div>

      {message && (
        <div className={`settings-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="settings-container">
        <aside className="settings-nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="nav-icon">{getTabIcon(tab.icon)}</span>
              <span className="nav-label">{tab.label}</span>
            </button>
          ))}
        </aside>

        <main className="settings-content">
          {renderTabContent()}
        </main>
      </div>
    </div>
  );
}
