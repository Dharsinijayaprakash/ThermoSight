// src/pages/InspectionsList.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from '../components/Input';
import Select from '../components/Select';
import Modal from '../components/Modal';
import { listInspections, createInspection, deleteInspection } from '../api/inspections';
import { listTransformers } from '../api/transformers';
import { useAuth } from '../context/AuthContext';
import type { Inspection } from '../api/inspections';
import type { Transformer } from '../api/transformers';

type CreateInspectionForm = {
  inspectionNumber: string;
  transformerId: string;
  weatherCondition: 'SUNNY' | 'CLOUDY' | 'RAINY' | '';
  inspectedBy: string;
  notes: string;
};

export default function InspectionsList() {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Inspection[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const size = 10;
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateInspectionForm>({
    inspectionNumber: '',
    transformerId: '',
    weatherCondition: '',
    inspectedBy: user?.name || '',
    notes: '',
  });
  const [createBusy, setCreateBusy] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  const [transformers, setTransformers] = useState<Transformer[]>([]);

  const nav = useNavigate();

  async function load() {
    try {
      setLoading(true); setLoadErr(null);
      const res = await listInspections(q, '', page, size);
      setItems(res.content ?? []);
      setTotal(res.totalElements ?? 0);
    } catch (e: any) {
      console.error(e);
      setLoadErr(e?.message || 'Failed to load inspections');
      setItems([]); setTotal(0);
    } finally { setLoading(false); }
  }

  async function loadTransformers() {
    try {
      const res = await listTransformers('', 0, 100);
      setTransformers(res.content ?? []);
    } catch (e: any) {
      console.error(e);
    }
  }

  useEffect(() => { load(); }, [page, q]);
  useEffect(() => { loadTransformers(); }, []);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / size)), [total, size]);

  function resetForm() {
    setForm({
      inspectionNumber: '',
      transformerId: '',
      weatherCondition: '',
      inspectedBy: user?.name || '',
      notes: '',
    });
    setCreateErr(null);
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.inspectionNumber.trim() || !form.transformerId) {
      setCreateErr('Please fill all required fields.');
      return;
    }
    try {
      setCreateBusy(true); setCreateErr(null);
      await createInspection({
        inspectionNumber: form.inspectionNumber.trim(),
        transformerId: form.transformerId,
        weatherCondition: form.weatherCondition || undefined,
        inspectedBy: form.inspectedBy.trim() || undefined,
        notes: form.notes || undefined,
      });
      setOpen(false);
      resetForm();
      setPage(0);
      await load();
      setSuccessMsg(`Inspection ${form.inspectionNumber} created successfully!`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (e: any) {
      const message = String(e?.message || '');
      if (message.toLowerCase().includes('already exists') || message.includes('409')) {
        setCreateErr('This Inspection No. already exists.');
      } else {
        setCreateErr(message || 'Failed to create inspection');
      }
    } finally {
      setCreateBusy(false);
    }
  }

  function getStatusBadge(status: string) {
    const statusClass = status.toLowerCase().replace('_', '-');
    return <span className={`status-badge ${statusClass}`}>{status.replace('_', ' ')}</span>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Inspections</h1>
        <button className="primary-button add-button" onClick={() => { resetForm(); setOpen(true); }}>
          <span className="button-icon">+</span>
          Add Inspection
        </button>
      </div>

      {/* Search toolbar */}
      <div className="search-section">
        <div className="search-inputs">
          <input 
            className="search-input"
            placeholder="Search by inspection no, transformer code, or branch..." 
            value={q} 
            onChange={e => setQ(e.target.value)} 
          />
          <button className="search-button" onClick={() => { setPage(0); load(); }}>
            Search
          </button>
          <button className="reset-button" onClick={() => { setQ(''); setPage(0); load(); }}>
            Reset
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && <div className="success-message">{successMsg}</div>}
      {deleteError && <div className="error-message">{deleteError}</div>}
      {loadErr && <div className="error-message">{loadErr}</div>}
      {loading && <div className="loading-message">Loading inspections...</div>}

      {/* List */}
      <div className="table-container">
        <table className="transformer-table">
          <thead>
          <tr>
            <th>Inspection No.</th>
            <th>Transformer No.</th>
            <th>Weather</th>
            <th>Inspected Date</th>
            <th>Annotations</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
          </thead>
          <tbody>
          {!loading && items.map(i => (
            <tr key={i.id}>
              <td className="code-data">
                <div className="code-info">
                  <span className="code-number">{i.inspectionNumber}</span>
                  <div className="inspected-by">by {i.inspectedBy || 'Unknown'}</div>
                </div>
              </td>
              <td className="transformer-data">
                <span className="transformer-code">{i.transformerCode || '-'}</span>
              </td>
              <td className="branch-data">{i.weatherCondition || '-'}</td>
              <td className="date-data">
                {i.inspectedAt ? new Date(i.inspectedAt).toLocaleString() : '-'}
              </td>
              <td className="date-data">
                {i.annotationCount !== undefined ? `${i.annotationCount} annotations` : '-'}
              </td>
              <td className="status-data">
                {getStatusBadge(i.status)}
              </td>
              <td className="actions-cell">
                <div className="action-buttons" style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="action-btn view-btn" 
                    onClick={() => nav(`/inspections/${i.id}`)}
                    style={{ 
                      display: 'flex', 
                      width: '32px',
                      height: '32px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <span className="btn-icon" style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    </span>
                  </button>
                  <button 
                    className="action-btn delete-btn" 
                    onClick={async () => {
                      if (!confirm('Delete this inspection?')) return;
                      try { 
                        await deleteInspection(i.id); 
                        await load(); 
                        setSuccessMsg(`Inspection ${i.inspectionNumber} deleted successfully!`);
                        setTimeout(() => setSuccessMsg(null), 5000);
                      } catch (e: any) { 
                        setDeleteError(e?.message || 'Delete failed');
                        setTimeout(() => setDeleteError(null), 5000);
                      }
                    }}
                    style={{ 
                      display: 'flex', 
                      width: '32px',
                      height: '32px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <span className="btn-icon" style={{ fontSize: '0.9rem' }}>🗑️</span>
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {!loading && items.length === 0 && !loadErr && (
            <tr><td colSpan={7} className="empty-state">No inspections yet.</td></tr>
          )}
          </tbody>
        </table>
      </div>

      {/* Pager */}
      <div className="pagination-section">
        <button className="pagination-button" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>
          ← Prev
        </button>
        <span className="pagination-info">Page {page + 1} of {totalPages}</span>
        <button className="pagination-button" disabled={(page + 1) >= totalPages} onClick={() => setPage(p => p + 1)}>
          Next →
        </button>
      </div>

      {/* Modal: Add Inspection */}
      <Modal open={open} onClose={() => setOpen(false)} title="Add Inspection" width={720}>
        <form onSubmit={onCreate} style={{ display: 'grid', gridTemplateColumns:'1fr 1fr', gap: 12 }}>
          <Input 
            label="Inspection No." 
            placeholder="INS-001"
            value={form.inspectionNumber} 
            onChange={e => setForm(f => ({ ...f, inspectionNumber: e.target.value }))} 
          />
          <Select
            label="Transformer"
            value={form.transformerId}
            onChange={e => setForm(f => ({ ...f, transformerId: e.target.value }))}
            options={[
              { value: '', label: 'Select transformer…' },
              ...transformers.map(t => ({ value: t.id, label: `${t.code} - ${t.location}` }))
            ]}
          />
          <Select
            label="Weather Condition (Optional)"
            value={form.weatherCondition}
            onChange={e => setForm(f => ({ ...f, weatherCondition: e.target.value as any }))}
            options={[
              { value: '', label: 'Select weather…' },
              { value: 'SUNNY', label: 'Sunny' },
              { value: 'CLOUDY', label: 'Cloudy' },
              { value: 'RAINY', label: 'Rainy' }
            ]}
          />
          <Input 
            label="Inspected By" 
            placeholder="Inspector Name"
            value={form.inspectedBy} 
            onChange={e => setForm(f => ({ ...f, inspectedBy: e.target.value }))} 
            disabled={!!user?.name}
          />
          <div style={{ gridColumn: '1 / -1' }}>
            <Input 
              label="Notes (Optional)" 
              placeholder="Additional notes or comments"
              value={form.notes} 
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} 
            />
          </div>

          {createErr && <div className="modal-error" style={{ gridColumn:'1 / -1' }}>{createErr}</div>}

          <div style={{ gridColumn: '1 / -1', display:'flex', gap:8, justifyContent:'flex-end', marginTop: 4 }}>
            <button 
              type="button" 
              onClick={() => setOpen(false)}
              style={{ 
                borderRadius: 10, 
                padding: '12px 20px',
                background: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={createBusy}
              style={{ 
                borderRadius: 10, 
                padding: '12px 20px',
                background: createBusy ? '#94a3b8' : 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                color: 'white',
                border: 'none',
                cursor: createBusy ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              {createBusy ? 'Saving…' : 'Confirm'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
