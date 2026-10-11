// src/components/InspectionHistoryList.tsx
import React, { useEffect, useState } from 'react';
import { getInspectionHistory, type HistoryEntry } from '../api/history';

interface InspectionHistoryListProps {
  inspectionId: string;
}

const InspectionHistoryList: React.FC<InspectionHistoryListProps> = ({ inspectionId }) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [inspectionId]);

  async function loadHistory() {
    try {
      setLoading(true);
      setError(null);
      const historyData = await getInspectionHistory(inspectionId);
      setHistory(historyData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load inspection history');
    } finally {
      setLoading(false);
    }
  }

  const getActionIcon = (actionType: string) => {
    const iconStyle = { width: 14, height: 14, stroke: 'currentColor', strokeWidth: 2, fill: 'none' };
    switch (actionType) {
      case 'CREATED': return <svg {...iconStyle} viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>;
      case 'STATUS_CHANGED': return <svg {...iconStyle} viewBox="0 0 24 24"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>;
      case 'ANNOTATION_ADDED': return <svg {...iconStyle} viewBox="0 0 24 24"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 10-16 0c0 3 2.7 7 8 11.7z"/></svg>;
      case 'ANNOTATION_MODIFIED': return <svg {...iconStyle} viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
      case 'ANNOTATION_DELETED': return <svg {...iconStyle} viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>;
      case 'INSPECTOR_ASSIGNED': return <svg {...iconStyle} viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
      case 'NOTES_UPDATED': return <svg {...iconStyle} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
      default: return <svg {...iconStyle} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'CREATED': return '#22c55e';
      case 'STATUS_CHANGED': return '#3b82f6';
      case 'ANNOTATION_ADDED': return '#8b5cf6';
      case 'ANNOTATION_MODIFIED': return '#f59e0b';
      case 'ANNOTATION_DELETED': return '#ef4444';
      case 'INSPECTOR_ASSIGNED': return '#06b6d4';
      case 'NOTES_UPDATED': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        background: '#f9fafb',
        borderRadius: '12px',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ fontSize: '16px', color: '#6b7280' }}>Loading history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        background: '#fef2f2',
        borderRadius: '12px',
        border: '1px solid #fecaca'
      }}>
        <div style={{ fontSize: '16px', color: '#ef4444' }}>Error: {error}</div>
        <button
          onClick={loadHistory}
          style={{
            marginTop: '8px',
            padding: '6px 12px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{
      marginTop: '24px',
      background: '#fff',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
    }}>
      {/* Header */}
      <div 
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: collapsed ? 'none' : '1px solid #e5e7eb',
          cursor: 'pointer',
          background: collapsed ? '#f9fafb' : '#fff',
          borderRadius: collapsed ? '12px' : '12px 12px 0 0'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px', display: 'flex', alignItems: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </span>
          <h3 style={{ 
            margin: 0, 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#1f2937' 
          }}>
            Inspection History
          </h3>
          <span style={{
            background: '#e5e7eb',
            color: '#374151',
            fontSize: '12px',
            fontWeight: '600',
            padding: '2px 8px',
            borderRadius: '12px'
          }}>
            {history.length} {history.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
        <div style={{ 
          fontSize: '18px', 
          transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s'
        }}>
          ▼
        </div>
      </div>

      {/* History List */}
      {!collapsed && (
        <div style={{ padding: '0' }}>
          {history.length === 0 ? (
            <div style={{ 
              padding: '40px 20px', 
              textAlign: 'center',
              color: '#6b7280'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div>No history entries yet</div>
              <div style={{ fontSize: '14px', marginTop: '4px' }}>
                Actions on this inspection will appear here
              </div>
            </div>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {history.map((entry, index) => (
                <div 
                  key={index}
                  style={{
                    padding: '16px 20px',
                    borderBottom: index < history.length - 1 ? '1px solid #f3f4f6' : 'none',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}
                >
                  {/* Action Icon */}
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: `${getActionColor(entry.actionType)}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    flexShrink: 0
                  }}>
                    {getActionIcon(entry.actionType)}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      marginBottom: '4px'
                    }}>
                      <span style={{
                        fontWeight: '600',
                        fontSize: '14px',
                        color: getActionColor(entry.actionType)
                      }}>
                        {entry.actionType.replace('_', ' ')}
                      </span>
                      {entry.boxNumber && (
                        <span style={{
                          background: '#f3f4f6',
                          color: '#374151',
                          fontSize: '11px',
                          fontWeight: '600',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          Box #{entry.boxNumber}
                        </span>
                      )}
                    </div>

                    <div style={{ 
                      fontSize: '14px', 
                      color: '#374151',
                      marginBottom: '6px',
                      lineHeight: 1.4
                    }}>
                      {entry.actionDescription}
                    </div>

                    <div style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '12px',
                      color: '#6b7280'
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        {entry.userName || 'System'}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        {formatDateTime(entry.createdAt)}
                      </span>
                    </div>

                    {(entry.previousData || entry.newData) && (
                      <div style={{
                        marginTop: '8px',
                        padding: '8px 12px',
                        background: '#f9fafb',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#6b7280'
                      }}>
                        {entry.previousData && <div><strong>Before:</strong> {entry.previousData}</div>}
                        {entry.newData && <div><strong>After:</strong> {entry.newData}</div>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InspectionHistoryList;