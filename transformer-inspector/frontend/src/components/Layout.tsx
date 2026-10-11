// src/components/Layout.tsx
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { useState, useRef, useEffect } from 'react';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isLoading } = useAuth();
  const toast = useToast();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: 'dashboard' },
    { path: '/transformers', label: 'Transformers', icon: 'transformers' },
    { path: '/inspections', label: 'Inspections', icon: 'inspections' },
    { path: '/settings', label: 'Settings', icon: 'settings' },
  ];

  const getNavIcon = (icon: string, isActive: boolean) => {
    const color = isActive ? '#1e40af' : '#fff';
    switch (icon) {
      case 'dashboard':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
            <rect x="3" y="3" width="7" height="9"></rect>
            <rect x="14" y="3" width="7" height="5"></rect>
            <rect x="14" y="12" width="7" height="9"></rect>
            <rect x="3" y="16" width="7" height="5"></rect>
          </svg>
        );
      case 'transformers':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
          </svg>
        );
      case 'inspections':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        );
      case 'settings':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        );
      default:
        return null;
    }
  };

  const isActivePath = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleLogout = () => {
    setShowUserMenu(false);
    toast.info('Goodbye!', 'You have been signed out successfully');
    // Small delay to show toast before redirect
    setTimeout(() => logout(), 500);
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeColor = (role: string): string => {
    switch (role) {
      case 'admin': return '#ef4444';
      case 'inspector': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-logo">TX</div>
          <div className="loading-spinner"></div>
          <p>Loading TransX...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <aside className="app-sidebar">
        <div style={{ fontFamily: 'Montserrat', fontWeight: 900, fontSize: 26, marginBottom: 36, letterSpacing: '-1px' }}>
          TransX
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}>
          {navItems.map((item) => (
            <button 
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 20px',
                borderRadius: 12,
                textDecoration: 'none',
                color: isActivePath(item.path) ? '#1e40af' : '#fff',
                background: isActivePath(item.path) ? '#fff' : 'transparent',
                fontWeight: 700,
                fontFamily: 'Montserrat',
                fontSize: 18,
                boxShadow: isActivePath(item.path) ? '0 2px 12px #a18cd122' : 'none',
                transition: 'all 0.18s',
                border: 'none',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              {getNavIcon(item.icon, isActivePath(item.path))} {item.label}
            </button>
          ))}
        </nav>
        <div style={{ flex: 1 }} />
        
        {/* User info at bottom of sidebar */}
        {user && (
          <div className="sidebar-user-info">
            <div className="sidebar-user-avatar">
              {user.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    // Fallback to initials if image fails to load
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = `<span>${getInitials(user.name)}</span>`;
                  }}
                />
              ) : (
                <span>{getInitials(user.name)}</span>
              )}
            </div>
            <div className="sidebar-user-details">
              <span className="sidebar-user-name" title={user.name}>{user.name}</span>
              <span className="sidebar-user-email" title={user.email}>{user.email}</span>
            </div>
          </div>
        )}
        
        <button 
          className="btn" 
          style={{ 
            marginTop: 12, 
            width: '100%', 
            background: 'none', 
            color: '#fff', 
            fontWeight: 700, 
            fontSize: 16, 
            border: '1.5px solid #fff', 
            borderRadius: 12 
          }}
          onClick={handleLogout}
        >
          Log out
        </button>
      </aside>
      
      <div className="app-main">
        {/* Top Bar with User Info */}
        <header className="top-bar">
          <div className="top-bar-left">
            <h2 className="page-breadcrumb">
              {location.pathname === '/' && 'Dashboard'}
              {location.pathname === '/transformers' && 'Transformers'}
              {location.pathname.startsWith('/transformers/') && 'Transformer Details'}
              {location.pathname === '/inspections' && 'Inspections'}
              {location.pathname.startsWith('/inspections/') && 'Inspection Details'}
              {location.pathname === '/settings' && 'Settings'}
            </h2>
          </div>
          
          <div className="top-bar-right">
            {/* User Menu */}
            {user && (
              <div className="user-menu-container" ref={menuRef}>
                <button 
                  className="user-menu-trigger"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  <div className="user-avatar">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} referrerPolicy="no-referrer" />
                    ) : (
                      <span className="avatar-initials">{getInitials(user.name)}</span>
                    )}
                  </div>
                  <div className="user-info">
                    <span className="user-name">{user.name}</span>
                    <span 
                      className="user-role"
                      style={{ color: getRoleBadgeColor(user.role) }}
                    >
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </div>
                  <span className={`menu-arrow ${showUserMenu ? 'open' : ''}`}>▼</span>
                </button>
                
                {showUserMenu && (
                  <div className="user-dropdown">
                    <div className="dropdown-header">
                      <div className="dropdown-avatar">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} referrerPolicy="no-referrer" />
                        ) : (
                          <span>{getInitials(user.name)}</span>
                        )}
                      </div>
                      <div className="dropdown-user-info">
                        <span className="dropdown-name">{user.name}</span>
                        <span className="dropdown-email">{user.email}</span>
                      </div>
                    </div>
                    
                    <div className="dropdown-divider" />
                    
                    <button 
                      className="dropdown-item"
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate('/settings');
                      }}
                    >
                      <span className="dropdown-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                      </span>
                      My Profile
                    </button>
                    <button 
                      className="dropdown-item"
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate('/settings');
                      }}
                    >
                      <span className="dropdown-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="3"></circle>
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                      </span>
                      Settings
                    </button>
                    <button 
                      className="dropdown-item"
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate('/settings');
                      }}
                    >
                      <span className="dropdown-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                      </span>
                      Activity Log
                    </button>
                    
                    <div className="dropdown-divider" />
                    
                    <button 
                      className="dropdown-item logout"
                      onClick={handleLogout}
                    >
                      <span className="dropdown-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                          <polyline points="16 17 21 12 16 7"></polyline>
                          <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                      </span>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>
        
        <main className="main-content">
          <Outlet />
        </main>
        
        <footer className="app-footer">
          <div className="footer-content">
            <div className="footer-left">
              <span className="footer-brand">TransX Platform</span>
              <span className="footer-divider">|</span>
              <span className="footer-copyright">&copy; {new Date().getFullYear()} All rights reserved</span>
            </div>
            <div className="footer-right">
              {user && (
                <span className="footer-user">
                  Logged in as <strong>{user.name}</strong>
                </span>
              )}
              <span className="footer-version">v1.0.0</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}