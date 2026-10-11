// src/components/InspectorAccessModal.tsx
import React, { useState } from 'react';
import { validateInspectorAccess, type InspectorAccessRequest, type InspectorAccessResponse } from '../api/history';

interface InspectorAccessModalProps {
  inspectionId: string;
  isOpen: boolean;
  onClose: () => void;
  onAccessGranted: (inspector: string, accessLevel: string) => void;
  accessType: 'CREATE' | 'EDIT' | 'VIEW';
  currentStatus?: string;
}

const InspectorAccessModal: React.FC<InspectorAccessModalProps> = ({
  inspectionId,
  isOpen,
  onClose,
  onAccessGranted,
  accessType,
  currentStatus
}) => {
  const [inspectorName, setInspectorName] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationResponse, setValidationResponse] = useState<InspectorAccessResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inspectorName.trim() || inspectorName.trim().length < 2) {
      setError('Please enter your name (minimum 2 characters)');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const request: InspectorAccessRequest = {
        inspectorName: inspectorName.trim(),
        accessType,
        reason: reason.trim() || undefined
      };

      const response = await validateInspectorAccess(inspectionId, request);
      setValidationResponse(response);

      if (response.accessGranted) {
        onAccessGranted(inspectorName.trim(), response.accessLevel);
      } else {
        setError(response.message || 'Access denied');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate access');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setInspectorName('');
    setReason('');
    setError('');
    setValidationResponse(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '480px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ 
            margin: 0, 
            fontSize: '20px', 
            fontWeight: '600',
            color: '#1f2937',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </span>
            Inspector Access Required
          </h2>
          <p style={{ 
            margin: '8px 0 0 0', 
            color: '#6b7280',
            fontSize: '14px',
            lineHeight: '1.5'
          }}>
            {accessType === 'CREATE' 
              ? 'Creating a new inspection requires inspector identification.'
              : accessType === 'EDIT'
              ? 'Editing this inspection requires inspector identification.'
              : 'Accessing this inspection requires inspector identification.'}
          </p>
          
          {currentStatus && (
            <div style={{
              marginTop: '12px',
              padding: '8px 12px',
              backgroundColor: getStatusColor(currentStatus).bg,
              color: getStatusColor(currentStatus).text,
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              Status: {currentStatus}
            </div>
          )}
        </div>

        {/* Validation Response Message */}
        {validationResponse && (
          <div style={{
            marginBottom: '16px',
            padding: '12px',
            borderRadius: '6px',
            backgroundColor: validationResponse.accessGranted 
              ? validationResponse.accessLevel === 'READ_ONLY' 
                ? '#fef3c7' 
                : '#dcfce7'
              : '#fee2e2',
            color: validationResponse.accessGranted 
              ? validationResponse.accessLevel === 'READ_ONLY'
                ? '#92400e'
                : '#166534'
              : '#dc2626',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            {validationResponse.accessLevel === 'READ_ONLY' && (
              <span style={{ marginRight: '8px', display: 'inline-flex', alignItems: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              </span>
            )}
            {validationResponse.accessGranted && validationResponse.accessLevel === 'READ_WRITE' && (
              <span style={{ marginRight: '8px', display: 'inline-flex', alignItems: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              </span>
            )}
            {!validationResponse.accessGranted && (
              <span style={{ marginRight: '8px', display: 'inline-flex', alignItems: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </span>
            )}
            {validationResponse.message}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: '6px', verticalAlign: 'middle' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </span>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '6px'
            }}>
              Inspector Name *
            </label>
            <input
              type="text"
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              placeholder="Enter your full name"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '2px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>

          {accessType === 'EDIT' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '6px'
              }}>
                Reason for Access (Optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why are you accessing this inspection? (e.g., Quality review, Correction needed, etc.)"
                disabled={isLoading}
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'vertical',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            justifyContent: 'flex-end',
            marginTop: '24px'
          }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              style={{
                padding: '10px 20px',
                border: '2px solid #d1d5db',
                backgroundColor: 'white',
                color: '#374151',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
                transition: 'all 0.2s'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !inspectorName.trim()}
              style={{
                padding: '10px 20px',
                border: 'none',
                backgroundColor: isLoading || !inspectorName.trim() ? '#9ca3af' : '#3b82f6',
                color: 'white',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: (isLoading || !inspectorName.trim()) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {isLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    width: '16px', 
                    height: '16px', 
                    border: '2px solid transparent',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Validating...
                </span>
              ) : (
                `Request ${accessType} Access`
              )}
            </button>
          </div>
        </form>

        {/* Add spinning animation */}
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

// Helper function to get status colors
function getStatusColor(status: string): { bg: string; text: string } {
  switch (status?.toUpperCase()) {
    case 'DRAFT':
      return { bg: '#f3f4f6', text: '#374151' };
    case 'IN_PROGRESS':
      return { bg: '#dbeafe', text: '#1d4ed8' };
    case 'UNDER_REVIEW':
      return { bg: '#fef3c7', text: '#92400e' };
    case 'COMPLETED':
      return { bg: '#dcfce7', text: '#166534' };
    case 'CANCELLED':
      return { bg: '#fee2e2', text: '#dc2626' };
    default:
      return { bg: '#f3f4f6', text: '#374151' };
  }
}

export default InspectorAccessModal;