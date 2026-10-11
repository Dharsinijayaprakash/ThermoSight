// src/components/AnnotationToolbar.tsx
import React from 'react';

interface AnnotationToolbarProps {
  mode: 'view' | 'edit' | 'draw';
  onModeChange: (mode: 'view' | 'edit' | 'draw') => void;
  selectedClass: string;
  onClassChange: (className: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onDetectAnomalies?: () => void;
  isDetecting?: boolean;
}

const DETECTION_CLASSES = [
  { value: 'Faulty', label: 'Faulty', color: '#ef4444' },
  { value: 'faulty_loose_joint', label: 'Loose Joint', color: '#22c55e' },
  { value: 'faulty_point_overload', label: 'Point Overload', color: '#3b82f6' },
  { value: 'potential_faulty', label: 'Potential Faulty', color: '#eab308' },
];

export default function AnnotationToolbar({
  mode,
  onModeChange,
  selectedClass,
  onClassChange,
  onZoomIn,
  onZoomOut,
  onResetView,
  onDetectAnomalies,
  isDetecting = false,
}: AnnotationToolbarProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '20px',
      background: '#ffffff',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      marginBottom: '16px',
      border: '1px solid #e5e7eb'
    }}>
      {/* Top Row: Mode Controls and AI Detection */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginRight: '8px' }}>
            Mode:
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <ToolButton
              active={mode === 'view'}
              onClick={() => onModeChange('view')}
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
              label="View"
            />
            <ToolButton
              active={mode === 'edit'}
              onClick={() => onModeChange('edit')}
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
              label="Edit"
            />
            <ToolButton
              active={mode === 'draw'}
              onClick={() => onModeChange('draw')}
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
              label="Draw"
            />
          </div>
        </div>

        {/* AI Detection Button */}
        {onDetectAnomalies && (
          <button
            onClick={onDetectAnomalies}
            disabled={isDetecting}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: isDetecting 
                ? '#9ca3af' 
                : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: isDetecting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              boxShadow: isDetecting ? 'none' : '0 2px 8px rgba(59, 130, 246, 0.3)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center' }}>
              {isDetecting ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                  <line x1="12" y1="2" x2="12" y2="6"/>
                  <line x1="12" y1="18" x2="12" y2="22"/>
                  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
                  <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
                  <line x1="2" y1="12" x2="6" y2="12"/>
                  <line x1="18" y1="12" x2="22" y2="12"/>
                  <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
                  <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="10" rx="2"/>
                  <circle cx="12" cy="5" r="2"/>
                  <path d="M12 7v4"/>
                  <line x1="8" y1="16" x2="8" y2="16"/>
                  <line x1="16" y1="16" x2="16" y2="16"/>
                </svg>
              )}
            </span>
            {isDetecting ? 'Detecting...' : 'Detect Anomalies'}
          </button>
        )}
      </div>

      {/* Second Row: Class Selector and Zoom Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        {mode === 'draw' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
              Fault Type:
            </span>
            <select
              value={selectedClass}
              onChange={(e) => onClassChange(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                background: 'white',
                color: '#374151',
                fontSize: '14px',
                cursor: 'pointer',
                minWidth: '150px'
              }}
            >
              {DETECTION_CLASSES.map((cls) => (
                <option key={cls.value} value={cls.value}>
                  {cls.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: mode === 'draw' ? '0' : 'auto' }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
            Zoom:
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <ToolButton onClick={onZoomIn} icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>} label="In" />
            <ToolButton onClick={onZoomOut} icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>} label="Out" />
            <ToolButton onClick={onResetView} icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>} label="Reset" />
          </div>
        </div>
      </div>
    </div>
  );
}

interface ToolButtonProps {
  active?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function ToolButton({ active = false, onClick, icon, label }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 12px',
        borderRadius: '6px',
        border: active ? '2px solid #3b82f6' : '1px solid #d1d5db',
        background: active ? '#eff6ff' : 'white',
        color: active ? '#1d4ed8' : '#374151',
        fontSize: '14px',
        fontWeight: active ? '600' : '500',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.2s',
        minWidth: '80px',
        justifyContent: 'center'
      }}
      title={label}
    >
      <span style={{ fontSize: '16px', display: 'flex', alignItems: 'center' }}>{icon}</span>
      <span style={{ fontSize: '13px' }}>{label}</span>
    </button>
  );
}
