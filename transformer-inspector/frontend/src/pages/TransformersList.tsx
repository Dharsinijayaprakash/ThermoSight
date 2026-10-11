// src/pages/TransformersList.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from '../components/Input';
import Select from '../components/Select';
import Modal from '../components/Modal';
import { listTransformers, createTransformer, deleteTransformer } from '../api/transformers';
import type { Transformer } from '../api/transformers';

// Extended UI type (keeps page working even if API type changes)
type UITransformer = Transformer & {
  region?: string | null;
  poleNo?: string | null;
  type?: string | null;
  locationDetails?: string | null;
};

type CreateForm = {
  region: string;
  code: string;            // Transformer No.
  poleNo: string;
  type: string;            // "Bulk" | "Distribution"
  locationDetails: string;
  location: string;
  capacityKVA: string;
};

export default function TransformersList() {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<UITransformer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const size = 10;
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>({
    region: '', code: '', poleNo: '', type: '', locationDetails: '',
    location: '', capacityKVA: '',
  });
  const [createBusy, setCreateBusy] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  const nav = useNavigate();

  async function load() {
    try {
      setLoading(true); setLoadErr(null);
      const res = await listTransformers(q, page, size);
      setItems((res.content ?? []) as unknown as UITransformer[]);
      setTotal(res.totalElements ?? 0);
    } catch (e: any) {
      console.error(e);
      setLoadErr(e?.message || 'Failed to load transformers');
      setItems([]); setTotal(0);
    } finally { setLoading(false); }
  }

  async function resetAndLoad() {
    try {
      setLoading(true); setLoadErr(null);
      setQ(''); // Clear search query
      setPage(0); // Reset to first page
      // Load with empty query to get all transformers
      const res = await listTransformers('', 0, size);
      setItems((res.content ?? []) as unknown as UITransformer[]);
      setTotal(res.totalElements ?? 0);
    } catch (e: any) {
      console.error(e);
      setLoadErr(e?.message || 'Failed to load transformers');
      setItems([]); setTotal(0);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / size)), [total, size]);

  function resetForm() {
    setForm({ region: '', code: '', poleNo: '', type: '', locationDetails: '', location: '', capacityKVA: '' });
    setCreateErr(null);
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const capacity = Number(form.capacityKVA || 0);
    if (!form.code.trim() || !form.location.trim()) {
      setCreateErr('Transformer No. and Location are required.');
      return;
    }
    try {
      setCreateBusy(true); setCreateErr(null);
      await createTransformer({
        code: form.code.trim(),
        location: form.location.trim(),
        capacityKVA: capacity > 0 ? capacity : 1,
        region: form.region || undefined,
        poleNo: form.poleNo || undefined,
        type: form.type || undefined,
        locationDetails: form.locationDetails || undefined,
      });
      setOpen(false);
      resetForm();
      setPage(0);
      await load();
      setSuccessMsg(`Transformer ${form.code} created successfully!`);
      setTimeout(() => setSuccessMsg(null), 5000); // Auto-hide after 5 seconds
    } catch (e: any) {
      const message = String(e?.message || '');
      if (message.toLowerCase().includes('already exists') || message.includes('409')) {
        setCreateErr('This Transformer No. already exists.');
      } else {
        setCreateErr(message || 'Failed to create transformer');
      }
    } finally {
      setCreateBusy(false);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Transformers</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            className="secondary-button" 
            onClick={() => nav('/inspections')}
            style={{
              borderRadius: 10,
              padding: '12px 20px',
              background: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            View Inspections
          </button>
          <button className="primary-button add-button" onClick={() => { resetForm(); setOpen(true); }}>
            <span className="button-icon">+</span>
            Add Transformer
          </button>
        </div>
      </div>

      {/* Search toolbar */}
      <div className="search-section">
        <div className="search-inputs">
          <input 
            className="search-input"
            placeholder="Search by transformer code or location..." 
            value={q} 
            onChange={e => setQ(e.target.value)} 
          />
          <button className="search-button" onClick={() => { setPage(0); load(); }}>
            Search
          </button>
          <button className="reset-button" onClick={resetAndLoad}>
            Reset
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && <div className="success-message">{successMsg}</div>}
      {deleteError && <div className="error-message">{deleteError}</div>}
      {loadErr && <div className="error-message">{loadErr}</div>}
      {loading && <div className="loading-message">Loading transformers...</div>}

      {/* List */}
      <div className="table-container">
        <table className="transformer-table">
          <thead>
          <tr>
            <th>Transformer No.</th>
            <th>Pole No.</th>
            <th>Region</th>
            <th>Type</th>
            <th>Location</th>
            <th>Capacity (kVA)</th>
            <th></th>
          </tr>
          </thead>
          <tbody>
          {loading && <tr><td colSpan={7} className="loading-cell">Loading transformers...</td></tr>}
          {!loading && (() => {
            // Calculate the maximum capacity from all transformers for dynamic scaling
            const maxCapacity = Math.max(...items.map(item => item.capacityKVA || 0), 1);
            
            return items.map(t => (
            <tr key={t.id}>
              <td className="transformer-code" onClick={() => nav(`/transformers/${t.id}`)}>
                <div className="code-wrapper">
                  <span className="code-text">{t.code}</span>
                </div>
              </td>
              <td className="pole-data">
                <span className="pole-number">{t.poleNo ?? '-'}</span>
              </td>
              <td className="region-data">
                <div className="region-wrapper">
                  <span className="region-dot"></span>
                  <span>{t.region ?? '-'}</span>
                </div>
              </td>
              <td className="type-data">
                <span className={`type-badge ${t.type?.toLowerCase() || 'default'}`}>
                  {t.type ?? '-'}
                </span>
              </td>
              <td className="location-data">{t.location}</td>
              <td className="capacity-data">
                <div className="capacity-wrapper">
                  <div className="capacity-info">
                    <span className="capacity-value">{t.capacityKVA} kVA</span>
                  </div>
                  <div className="capacity-bar">
                    <div 
                      className="capacity-fill" 
                      style={{ 
                        width: `${(t.capacityKVA / maxCapacity) * 100}%`,
                        background: (() => {
                          const percentage = (t.capacityKVA / maxCapacity) * 100;
                          if (percentage <= 50) {
                            return 'linear-gradient(90deg, #10b981 0%, #34d399 100%)'; // Green
                          } else if (percentage <= 80) {
                            return 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)'; // Yellow/Orange
                          } else {
                            return 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)'; // Red
                          }
                        })()
                      }}
                    ></div>
                  </div>
                </div>
              </td>
              <td className="actions-cell">
                <div className="action-buttons" style={{ display: 'flex', gap: '0.5rem', opacity: 1, visibility: 'visible' }}>
                  <button 
                    className="action-btn view-btn" 
                    onClick={() => nav(`/transformers/${t.id}`)}
                    style={{ 
                      display: 'flex', 
                      opacity: 1, 
                      visibility: 'visible',
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
                      if (!confirm('Delete this transformer?')) return;
                      try { 
                        await deleteTransformer(t.id); 
                        await load(); 
                        setSuccessMsg(`Transformer ${t.code} deleted successfully!`);
                        setTimeout(() => setSuccessMsg(null), 5000);
                      } catch (e:any) { 
                        setDeleteError(e?.message || 'Delete failed');
                        setTimeout(() => setDeleteError(null), 5000);
                      }
                    }}
                    style={{ 
                      display: 'flex', 
                      opacity: 1, 
                      visibility: 'visible',
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
                    <span style={{ fontSize: '1rem' }}>🗑️</span>
                  </button>
                </div>
              </td>
            </tr>
            ));
          })()}
          {!loading && items.length === 0 && !loadErr && (
            <tr><td colSpan={7} className="empty-state">No transformers yet.</td></tr>
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

      {/* Modal: Add Transformer */}
      <Modal open={open} onClose={() => setOpen(false)} title="Add Transformer" width={720}>
        <form onSubmit={onCreate} style={{ display: 'grid', gridTemplateColumns:'1fr 1fr', gap: 12 }}>
          <Select
            label="Region"
            value={form.region}
            onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
            options={[
              { value: '', label: 'Select region…' },
              { value: 'Colombo', label: 'Colombo' },
              { value: 'Gampaha', label: 'Gampaha' },
              { value: 'Kalutara', label: 'Kalutara' },
              { value: 'Kandy', label: 'Kandy' },
              { value: 'Matale', label: 'Matale' },
              { value: 'Nuwara Eliya', label: 'Nuwara Eliya' },
              { value: 'Galle', label: 'Galle' },
              { value: 'Matara', label: 'Matara' },
              { value: 'Hambantota', label: 'Hambantota' },
              { value: 'Jaffna', label: 'Jaffna' },
              { value: 'Kilinochchi', label: 'Kilinochchi' },
              { value: 'Mannar', label: 'Mannar' },
              { value: 'Vavuniya', label: 'Vavuniya' },
              { value: 'Mullaitivu', label: 'Mullaitivu' },
              { value: 'Batticaloa', label: 'Batticaloa' },
              { value: 'Ampara', label: 'Ampara' },
              { value: 'Trincomalee', label: 'Trincomalee' },
              { value: 'Kurunegala', label: 'Kurunegala' },
              { value: 'Puttalam', label: 'Puttalam' },
              { value: 'Anuradhapura', label: 'Anuradhapura' },
              { value: 'Polonnaruwa', label: 'Polonnaruwa' },
              { value: 'Badulla', label: 'Badulla' },
              { value: 'Moneragala', label: 'Moneragala' },
              { value: 'Ratnapura', label: 'Ratnapura' },
              { value: 'Kegalle', label: 'Kegalle' },
              { value: 'Nugegoda', label: 'Nugegoda' },
              { value: 'Maharagama', label: 'Maharagama' },
              { value: 'Dehiwala-Mount Lavinia', label: 'Dehiwala-Mount Lavinia' },
              { value: 'Moratuwa', label: 'Moratuwa' },
              { value: 'Negombo', label: 'Negombo' },
              { value: 'Kelaniya', label: 'Kelaniya' },
              { value: 'Kaduwela', label: 'Kaduwela' },
              { value: 'Panadura', label: 'Panadura' },
              { value: 'Avissawella', label: 'Avissawella' },
              { value: 'Ja-Ela', label: 'Ja-Ela' },
            ]}
          />
          <Input label="Transformer No." placeholder="TX-001"
                 value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
          <Input label="Pole No." placeholder="EN-122-A"
                 value={form.poleNo} onChange={e => setForm(f => ({ ...f, poleNo: e.target.value }))} />
          <Select
            label="Type"
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            options={[
              { value: '', label: 'Select type…' },
              { value: 'Bulk', label: 'Bulk' },
              { value: 'Distribution', label: 'Distribution' },
            ]}
          />
          <Input label="Location" placeholder="Substation / Area"
                 value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
          <Input label="Capacity (kVA)" type="number" placeholder="1000"
                 value={form.capacityKVA} onChange={e => setForm(f => ({ ...f, capacityKVA: e.target.value }))} />
          <div style={{ gridColumn: '1 / -1' }}>
            <Input label="Location Details" placeholder="Notes / directions"
                   value={form.locationDetails} onChange={e => setForm(f => ({ ...f, locationDetails: e.target.value }))} />
          </div>

          {createErr && <div className="modal-error" style={{ gridColumn:'1 / -1' }}>{createErr}</div>}

          <div style={{ gridColumn: '1 / -1', display:'flex', gap:8, justifyContent:'flex-end', marginTop: 4 }}>
            <button 
              type="button" 
              onClick={() => setOpen(false)}
              style={{ 
                borderRadius: 10, 
                padding: '12px 20px',
                background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                opacity: 1,
                visibility: 'visible',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(124, 58, 237, 0.3)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(124, 58, 237, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(124, 58, 237, 0.3)';
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
                fontSize: '14px',
                opacity: 1,
                visibility: 'visible',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(124, 58, 237, 0.3)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!createBusy) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(124, 58, 237, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!createBusy) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(124, 58, 237, 0.3)';
                }
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