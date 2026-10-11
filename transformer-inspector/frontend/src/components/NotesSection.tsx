// src/components/NotesSection.tsx
import { useState } from 'react';
import { updateInspectionNotes } from '../api/inspections';

interface NotesSectionProps {
  inspectionId: string;
  initialNotes: string;
  onNotesUpdate: () => void;
}

export default function NotesSection({ inspectionId, initialNotes, onNotesUpdate }: NotesSectionProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    if (notes.trim() === initialNotes.trim()) {
      setIsEditing(false);
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      
      await updateInspectionNotes(inspectionId, notes.trim());
      
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 2000);
      onNotesUpdate();
    } catch (e: any) {
      setSaveError(e?.message || 'Failed to save notes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setNotes(initialNotes);
    setIsEditing(false);
    setSaveError(null);
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      padding: '14px 16px',
      border: '1px solid #e2e8f0'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isEditing ? '10px' : (notes ? '8px' : '0') }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
          Inspector Notes
        </h3>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: 'white',
              color: '#64748b',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s'
            }}
          >
            Edit
          </button>
        )}
      </div>

      {isEditing ? (
        <div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add inspection notes..."
            style={{
              width: '100%',
              minHeight: '80px',
              maxHeight: '120px',
              padding: '10px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '13px',
              lineHeight: '1.5',
              resize: 'vertical',
              fontFamily: 'inherit',
              background: 'white'
            }}
          />
          
          {saveError && (
            <div style={{ 
              marginTop: '6px', 
              color: '#dc2626', 
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              {saveError}
            </div>
          )}
          
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            marginTop: '10px',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: 'white',
                color: '#64748b',
                fontSize: '12px',
                fontWeight: '500',
                cursor: isSaving ? 'not-allowed' : 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: isSaving ? '#9ca3af' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: 'white',
                fontSize: '12px',
                fontWeight: '600',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          {saveSuccess && (
            <div style={{ 
              marginBottom: '8px', 
              color: '#059669', 
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              Notes saved successfully
            </div>
          )}
          
          {notes && (
            <div style={{ 
              fontSize: '13px', 
              color: '#475569', 
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
              maxHeight: '80px',
              overflowY: 'auto',
              padding: '8px 10px',
              background: 'white',
              borderRadius: '6px',
              border: '1px solid #e2e8f0'
            }}>
              {notes}
            </div>
          )}
          
          {!notes && (
            <div style={{ 
              fontSize: '12px', 
              color: '#94a3b8', 
              fontStyle: 'italic',
              textAlign: 'center',
              padding: '4px 0'
            }}>
              No notes yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}