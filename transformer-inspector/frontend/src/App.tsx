import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import TransformersList from './pages/TransformersList';
import TransformerDetail from './pages/TransformerDetail';
import InspectionsList from './pages/InspectionsList';
import InspectionDetailNew from './pages/InspectionDetailNew';
import MaintenanceRecordPage from './pages/MaintenanceRecordPage';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Signup from './pages/Signup';

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-logo">⚡</div>
          <div className="loading-spinner"></div>
          <p>Loading TransX...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

// Public Route wrapper (redirect to dashboard if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-logo">⚡</div>
          <div className="loading-spinner"></div>
          <p>Loading TransX...</p>
        </div>
      </div>
    );
  }
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/signup" element={
        <PublicRoute>
          <Signup />
        </PublicRoute>
      } />
      
      {/* Protected routes with Layout */}
      <Route element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transformers" element={<TransformersList />} />
        <Route path="/transformers/:id" element={<TransformerDetail />} />
        <Route path="/inspections" element={<InspectionsList />} />
        <Route path="/inspections/:id" element={<InspectionDetailNew />} />
        <Route path="/maintenance-records/:recordId" element={<MaintenanceRecordPage />} />
        <Route path="/maintenance-records/inspection/:inspectionId" element={<MaintenanceRecordPage />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<div style={{ padding: 24 }}>Not found</div>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}