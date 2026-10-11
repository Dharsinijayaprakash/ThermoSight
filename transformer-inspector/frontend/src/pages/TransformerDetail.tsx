// src/pages/TransformerDetail.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Input from '../components/Input';
import Select from '../components/Select';

import Modal from '../components/Modal';
import { getTransformer, updateTransformer } from '../api/transformers';
import type { Transformer } from '../api/transformers';
import { listImages, uploadImage } from '../api/images';
import type { ThermalImage } from '../api/images';
import { listInspections, createInspection, deleteInspection } from '../api/inspections';
import type { Inspection } from '../api/inspections';

type CreateInspectionForm = {
  inspectionNumber: string;
  weatherCondition: 'SUNNY' | 'CLOUDY' | 'RAINY' | '';
  inspectedBy: string;
  notes: string;
};

export default function TransformerDetail() {
  const { id } = useParams();
  const nav = useNavigate();

  const [t, setT] = useState<Transformer | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ------- editable basics -------
  const [code, setCode] = useState('');
  const [location, setLocation] = useState('');
  const [capacityKVA, setCapacity] = useState<number | ''>('');
  const [region, setRegion] = useState<string>('');
  const [poleNo, setPoleNo] = useState<string>('');
  const [type, setType] = useState<string>(''); // "Bulk" | "Distribution"
  const [locationDetails, setLocationDetails] = useState<string>('');

  // ------- images state -------
  const [images, setImages] = useState<ThermalImage[]>([]);

  // upload panel
  const [imgType, setImgType] = useState<'BASELINE' | 'MAINTENANCE'>('BASELINE');
  const [env, setEnv] = useState<'SUNNY' | 'CLOUDY' | 'RAINY' | ' '>(' ');
  const [uploader, setUploader] = useState('admin');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // notification states
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [warningMsg, setWarningMsg] = useState<string>('');

  // inspections state
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [inspectionsLoading, setInspectionsLoading] = useState(false);
  const [inspectionsError, setInspectionsError] = useState<string | null>(null);
  
  // create inspection modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [inspectionForm, setInspectionForm] = useState<CreateInspectionForm>({
    inspectionNumber: '',
    weatherCondition: '',
    inspectedBy: 'admin',
    notes: '',
  });
  const [createInspectionBusy, setCreateInspectionBusy] = useState(false);
  const [createInspectionErr, setCreateInspectionErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoadErr(null);
        if (!id) throw new Error('No transformer id in route');
        const data = await getTransformer(id);
        setT(data);

        // populate form
        setCode(data.code);
        setLocation(data.location);
        setCapacity(data.capacityKVA);
        setRegion(data.region ?? '');
        setPoleNo(data.poleNo ?? '');
        setType(data.type ?? '');
        setLocationDetails(data.locationDetails ?? '');

        await refreshImages(id);
        await refreshInspections(id);
      } catch (e: any) {
        console.error('detail init failed:', e);
        setLoadErr(e?.message || 'Failed to load transformer');
      }
    })();
  }, [id]);

  async function refreshImages(transformerId: string) {
    try {
      const res = await listImages({ transformerId, page: 0, size: 200 });
      setImages(res.content ?? []);
    } catch (e: any) {
      console.error('listImages failed:', e);
      setImages([]);
    }
  }

  async function refreshInspections(transformerId: string) {
    try {
      setInspectionsLoading(true);
      setInspectionsError(null);
      const res = await listInspections('', transformerId, 0, 50);
      setInspections(res.content ?? []);
    } catch (e: any) {
      console.error('listInspections failed:', e);
      setInspectionsError(e?.message || 'Failed to load inspections');
      setInspections([]);
    } finally {
      setInspectionsLoading(false);
    }
  }

  async function saveBasics() {
    if (!t) return;
    try {
      setSaving(true);
      await updateTransformer(t.id, {
        code,
        location,
        capacityKVA: Number(capacityKVA || 0),
        region: region || undefined,
        poleNo: poleNo || undefined,
        type: type || undefined,
        locationDetails: locationDetails || undefined,
      });
      setSuccessMsg('Transformer details saved successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to save transformer details');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setSaving(false);
    }
  }

  async function doUpload() {
    if (!t || !file) { 
      setWarningMsg('Please select a file');
      setTimeout(() => setWarningMsg(''), 4000);
      return; 
    }
    if (imgType === 'BASELINE' && env === ' ') { 
      setWarningMsg('Please pick environmental condition');
      setTimeout(() => setWarningMsg(''), 4000);
      return; 
    }
    try {
      setUploading(true);
      await uploadImage({
        transformerId: t.id,
        type: imgType,
        envCondition: imgType === 'BASELINE' ? (env as any) : undefined,
        uploader,
        file
      });
      await refreshImages(t.id);
      setFile(null);
      setSuccessMsg('Image uploaded successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Upload failed');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setUploading(false);
    }
  }

  function resetInspectionForm() {
    setInspectionForm({
      inspectionNumber: '',
      weatherCondition: '',
      inspectedBy: 'admin',
      notes: '',
    });
    setCreateInspectionErr(null);
  }

  async function handleCreateInspection(e: React.FormEvent) {
    e.preventDefault();
    if (!t || !inspectionForm.inspectionNumber.trim()) {
      setCreateInspectionErr('Please fill in the inspection number.');
      return;
    }
    try {
      setCreateInspectionBusy(true);
      setCreateInspectionErr(null);
      await createInspection({
        inspectionNumber: inspectionForm.inspectionNumber.trim(),
        transformerId: t.id,
        weatherCondition: inspectionForm.weatherCondition || undefined,
        inspectedBy: inspectionForm.inspectedBy.trim() || undefined,
        notes: inspectionForm.notes || undefined,
      });
      setShowCreateModal(false);
      resetInspectionForm();
      await refreshInspections(t.id);
      setSuccessMsg('Inspection created successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e: any) {
      setCreateInspectionErr(e?.message || 'Failed to create inspection');
    } finally {
      setCreateInspectionBusy(false);
    }
  }

  async function handleDeleteInspection(inspectionId: string) {
    if (!confirm('Are you sure you want to delete this inspection?')) return;
    if (!t) return;
    try {
      await deleteInspection(inspectionId);
      await refreshInspections(t.id);
      setSuccessMsg('Inspection deleted successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to delete inspection');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  }

  // choose two images to display side-by-side
  // Only show baseline images that do NOT belong to any inspection (true baseline)
  const latestBaseline = useMemo(
    () => images.filter(i => i.type === 'BASELINE' && !i.inspectionId).sort((a,b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt))[0],
    [images]
  );
  // Show the latest inspection image (not fallback)
  const latestInspection = useMemo(
    () => images.filter(i => i.type === 'INSPECTION').sort((a,b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt))[0],
    [images]
  );
  // Only show maintenance if needed elsewhere
  const [leftImg, rightImg] = useMemo(() => {
    // If baseline exists, always show it on the left
    // Only show inspection image on the right if it exists
    if (latestBaseline && latestInspection) {
      return [latestBaseline, latestInspection];
    }
    // If only baseline exists, show blank on right
    if (latestBaseline && !latestInspection) {
      return [latestBaseline, null];
    }
    // If neither exists, show blanks
    return [null, null];
  }, [latestBaseline, latestInspection]);

  return (
    <div className="page-container">
      {/* Notifications */}
      {successMsg && (
        <div className="success-message">
          <span className="message-icon">✓</span>
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="error-message">
          <span className="message-icon">✕</span>
          {errorMsg}
        </div>
      )}
      {warningMsg && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#f59e0b',
          color: 'white',
          padding: '16px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
          fontSize: '14px',
          fontWeight: '500',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </span>
          {warningMsg}
        </div>
      )}

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h1 style={{ marginTop: 0 }}>{t ? `Transformer ${t.code}` : 'Transformer'}</h1>
        <button 
          onClick={() => nav('/transformers')} 
          style={{ 
            borderRadius: 10, 
            padding: '8px 16px',
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
          Back to list
        </button>
      </div>

      {loadErr && <div style={{ color:'#b00020', marginBottom: 12 }}>Error: {loadErr}</div>}

      {/* Basics (all fields) */}
      <div style={{
        display:'grid',
        gridTemplateColumns:'1fr 1fr 1fr',
        gap: 12, background:'#fff', border:'1px solid #eee',
        borderRadius:12, padding:16, marginBottom:16
      }}>
        <Input label="Transformer Code" value={code} onChange={e=>setCode(e.target.value)} placeholder="TX-001" />
        <Input label="Location" value={location} onChange={e=>setLocation(e.target.value)} placeholder="Substation A" />
        <Input label="Capacity (kVA)" type="number" value={capacityKVA} onChange={e=>setCapacity(e.target.value as any)} />

        <Select
          label="Region"
          value={region}
          onChange={e=>setRegion(e.target.value)}
          options={[
            { value: '', label: 'Select region…' },
            { value: 'Nugegoda', label: 'Nugegoda' },
            { value: 'Maharagama', label: 'Maharagama' },
            { value: 'Colombo', label: 'Colombo' },
          ]}
        />
        <Input label="Pole No." value={poleNo} onChange={e=>setPoleNo(e.target.value)} placeholder="EN-122-A" />
        <Select
          label="Type"
          value={type}
          onChange={e=>setType(e.target.value)}
          options={[
            { value: '', label: 'Select type…' },
            { value: 'Bulk', label: 'Bulk' },
            { value: 'Distribution', label: 'Distribution' },
          ]}
        />

        <div style={{ gridColumn:'1 / -1' }}>
          <label style={{ display:'block', fontWeight:600, marginBottom:6 }}>Location Details</label>
          <textarea
            value={locationDetails}
            onChange={e=>setLocationDetails(e.target.value)}
            placeholder="Notes / directions"
            style={{ width:'100%', minHeight: 80, padding:8, borderRadius:6, border:'1px solid #ccc', resize:'vertical' }}
          />
        </div>

        <div style={{ gridColumn:'1 / -1', display:'flex', gap:8 }}>
          <button 
            onClick={saveBasics} 
            disabled={saving} 
            style={{ 
              borderRadius: 10, 
              padding: '12px 20px',
              background: saving ? '#94a3b8' : 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
              color: 'white',
              border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
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
              if (!saving) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(124, 58, 237, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!saving) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(124, 58, 237, 0.3)';
              }
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Image section */}
      {t && (
        <div>
          {/* Compact Upload Bar */}
          <div style={{ 
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', 
            border: '1px solid rgba(148, 163, 184, 0.3)', 
            borderRadius: 8, 
            padding: 12,
            marginBottom: 24,
            boxShadow: '0 2px 8px rgba(30, 64, 175, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: '600', color: '#374151', fontSize: '16px', whiteSpace: 'nowrap' }}>
                📤 Upload Image:
              </span>
              
              <select 
                value={imgType}
                onChange={e=>setImgType(e.target.value as any)}
                style={{ 
                  minWidth: '120px',
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  border: '1px solid #ccc',
                  fontSize: '14px',
                  background: '#fff'
                }}
              >
                <option value="BASELINE">Baseline</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
              
              {imgType === 'BASELINE' && (
                <select
                  value={env}
                  onChange={e=>setEnv(e.target.value as any)}
                  style={{ 
                    minWidth: '120px',
                    padding: '8px 12px', 
                    borderRadius: '6px', 
                    border: '1px solid #ccc',
                    fontSize: '14px',
                    background: '#fff'
                  }}
                >
                  <option value=" ">Select weather...</option>
                  <option value="SUNNY">Sunny</option>
                  <option value="CLOUDY">Cloudy</option>
                  <option value="RAINY">Rainy</option>
                </select>
              )}
              
              <input 
                type="text"
                value={uploader} 
                onChange={e=>setUploader(e.target.value)} 
                placeholder="Uploader name"
                style={{ 
                  minWidth: '120px',
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  border: '1px solid #ccc',
                  fontSize: '14px',
                  background: '#fff'
                }}
              />
              
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                style={{ 
                  minWidth: '180px',
                  fontSize: '13px',
                  padding: '6px 8px',
                  border: '1px solid #ccc',
                  borderRadius: '6px',
                  background: '#fff'
                }}
              />
                
              <button 
                onClick={doUpload} 
                disabled={uploading || !file}
                style={{ 
                  background: uploading || !file ? '#9ca3af' : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: uploading || !file ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)'
                }}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>

          {/* Side-by-side comparison */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ margin:'12px 0' }}>Thermal Image Comparison</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <ImageBox title={leftImg ? 'Baseline' : '—'} img={leftImg} />
              <ImageBox title={rightImg ? 'Latest Inspection' : '—'} img={rightImg} />
            </div>
          </div>

          {/* Inspections section */}
          <div style={{ 
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', 
            border: '1px solid rgba(124, 58, 237, 0.1)', 
            borderRadius: 16, 
            padding: 24,
            marginTop: 24,
            boxShadow: '0 4px 20px rgba(30, 64, 175, 0.08)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontFamily: 'Montserrat', color: '#1e40af', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
                Inspections for this Transformer
              </h3>
              <button 
                onClick={() => setShowCreateModal(true)}
                style={{ 
                  borderRadius: 8, 
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)';
                }}
              >
                + New Inspection
              </button>
            </div>
            
            {inspectionsError && <div style={{ color:'#b00020', marginBottom: 16 }}>Error: {inspectionsError}</div>}
            {inspectionsLoading && <div>Loading inspections…</div>}
            {!inspectionsLoading && inspections.length === 0 && <div style={{ color:'#666' }}>No inspections yet. Create one to get started.</div>}
            {!inspectionsLoading && inspections.length > 0 && (
              <div style={{ display: 'grid', gap: 12 }}>
                {inspections.map(inspection => (
                  <div key={inspection.id} style={{ 
                    border: '1px solid #e5e7eb', 
                    borderRadius: 8, 
                    padding: 16,
                    background: '#ffffff',
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto',
                    alignItems: 'center',
                    gap: 16
                  }}>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: 4 }}>
                        {inspection.inspectionNumber}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280', display: 'flex', gap: 16 }}>
                        <span>Status: <span style={{ 
                          color: inspection.status === 'COMPLETED' ? '#10b981' : 
                                inspection.status === 'IN_PROGRESS' ? '#f59e0b' : '#6b7280',
                          fontWeight: '500'
                        }}>{inspection.status}</span></span>
                        <span>By: {inspection.inspectedBy || 'N/A'}</span>
                        <span>Created: {new Date(inspection.createdAt).toLocaleDateString()}</span>
                        {inspection.notes && <span>Notes: {inspection.notes}</span>}
                      </div>
                    </div>
                    <button 
                      onClick={() => nav(`/inspections/${inspection.id}`)}
                      style={{ 
                        borderRadius: 6, 
                        padding: '6px 12px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '500',
                        fontSize: '12px',
                        boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
                      }}
                    >
                      View Details
                    </button>
                    <button 
                      onClick={() => handleDeleteInspection(inspection.id)}
                      style={{ 
                        borderRadius: 6, 
                        padding: '6px 12px',
                        background: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '500',
                        fontSize: '12px',
                        boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Create Inspection Modal */}
      <Modal open={showCreateModal} onClose={() => { setShowCreateModal(false); resetInspectionForm(); }}>
        <div style={{ padding: 24, maxWidth: 500 }}>
          <h2 style={{ marginTop: 0, marginBottom: 20, color: '#1f2937' }}>Create New Inspection</h2>
          
          {createInspectionErr && (
            <div style={{ color: '#b00020', marginBottom: 16, padding: 12, background: '#fef2f2', borderRadius: 6 }}>
              {createInspectionErr}
            </div>
          )}
          
          <form onSubmit={handleCreateInspection}>
            <div style={{ marginBottom: 16 }}>
              <Input 
                label="Inspection Number *"
                value={inspectionForm.inspectionNumber}
                onChange={e => setInspectionForm(prev => ({ ...prev, inspectionNumber: e.target.value }))}
                placeholder="INS-001"
              />
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <Select
                label="Weather Condition"
                value={inspectionForm.weatherCondition}
                onChange={e => setInspectionForm(prev => ({ ...prev, weatherCondition: e.target.value as any }))}
                options={[
                  { value: '', label: 'Select weather condition...' },
                  { value: 'SUNNY', label: 'Sunny' },
                  { value: 'CLOUDY', label: 'Cloudy' },
                  { value: 'RAINY', label: 'Rainy' },
                ]}
              />
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <Input 
                label="Inspected By"
                value={inspectionForm.inspectedBy}
                onChange={e => setInspectionForm(prev => ({ ...prev, inspectedBy: e.target.value }))}
                placeholder="Inspector name"
              />
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <Input 
                label="Notes"
                value={inspectionForm.notes}
                onChange={e => setInspectionForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional notes about this inspection"
              />
            </div>
            
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button 
                type="button"
                onClick={() => { setShowCreateModal(false); resetInspectionForm(); }}
                style={{ 
                  borderRadius: 6, 
                  padding: '8px 16px',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={createInspectionBusy}
                style={{ 
                  borderRadius: 6, 
                  padding: '8px 16px',
                  background: createInspectionBusy ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                  color: 'white',
                  border: 'none',
                  cursor: createInspectionBusy ? 'not-allowed' : 'pointer',
                  fontWeight: '500'
                }}
              >
                {createInspectionBusy ? 'Creating...' : 'Create Inspection'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
      </div>
    </div>
  );
}

function ImageBox({ title, img }: { title: string; img: ThermalImage | null }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #eee', borderRadius:12, padding:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
        <div style={{ fontWeight:600 }}>{title}</div>
        {img && <div style={{ fontSize:12, color:'#666' }}>{new Date(img.uploadedAt).toLocaleString()}</div>}
      </div>
      <div style={{ height:320, display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0f3b', borderRadius:8 }}>
        {img
          ? <img src={img.publicUrl} alt={img.originalFilename} style={{ maxHeight:'100%', maxWidth:'100%', objectFit:'contain' }} />
          : <div style={{ color:'#cbd5ff' }}>No image</div>}
      </div>
    </div>
  );
}