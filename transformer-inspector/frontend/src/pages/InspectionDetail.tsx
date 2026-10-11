// src/pages/InspectionDetail.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import FileDrop from '../components/FileDrop';
import CommentsSection from '../components/CommentsSection';
import { getInspection, updateInspectionStatus } from '../api/inspections';
import { listImages, uploadImage } from '../api/images';
import type { Inspection } from '../api/inspections';
import type { ThermalImage } from '../api/images';

export default function InspectionDetail() {
  const { id } = useParams();
  const nav = useNavigate();

  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  // Images state
  const [images, setImages] = useState<ThermalImage[]>([]);
  const [imgErr, setImgErr] = useState<string | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  // 1) Load the inspection when the route id changes
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoadErr(null);
        const data = await getInspection(id);
        setInspection(data);
      } catch (e: any) {
        setLoadErr(e?.message || 'Failed to load inspection');
      }
    })();
  }, [id]);

  // 2) After the inspection is available, load images for that transformer & inspection
  useEffect(() => {
    if (!inspection) return;
    loadImagesFor(inspection);
  }, [inspection]);

  async function loadImagesFor(ins: Inspection) {
    try {
      setImgErr(null);
      const [baselineRes, inspectionRes] = await Promise.all([
        listImages({ transformerId: ins.transformerId, type: 'BASELINE' }),
        listImages({ inspectionId: String(ins.id), type: 'INSPECTION' })
      ]);

      const allImages = [
        ...(baselineRes.content || []),
        ...(inspectionRes.content || [])
      ];
      setImages(allImages);
    } catch (e: any) {
      setImgErr(e?.message || 'Failed to load images');
    }
  }

  async function handleUpload(file: File) {
    if (!file || !inspection) return;

    try {
      setUploading(true);
      setUploadErr(null);

      await uploadImage({
        transformerId: inspection.transformerId,
        type: 'INSPECTION',
        uploader: inspection.inspectedBy,
        file,
        inspectionId: inspection.id
      });

      await loadImagesFor(inspection);
    } catch (e: any) {
      setUploadErr(e?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleStatusUpdate(status: 'IN_PROGRESS' | 'DRAFT' | 'UNDER_REVIEW' | 'COMPLETED' | 'CANCELLED') {
    if (!inspection) return;

    try {
      const updated = await updateInspectionStatus(inspection.id, status);
      setInspection(updated);
    } catch (e: any) {
      alert('Failed to update status: ' + (e?.message || 'Unknown error'));
    }
  }

  function formatDateTime(date: string, time?: string) {
    if (!date) return '-';
    const dateObj = new Date(date);
    const dateStr = dateObj.toLocaleDateString();
    return time ? `${dateStr} ${time}` : dateStr;
  }

  function getStatusBadge(status: string) {
    const statusClass = status.toLowerCase().replace('_', '-');
    return <span className={`status-badge ${statusClass}`}>{status.replace('_', ' ')}</span>;
  }

  // --- Image selection logic ---
  // Latest true-baseline (no inspectionId) for the transformer
  const baselineImage =
    images
      .filter(img => img.type === 'BASELINE' && !img.inspectionId && img.publicUrl && img.originalFilename)
      .sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt))[0] || null;

  // Latest inspection image for this inspection
  const inspectionImage =
    images
      .filter(img => img.type === 'INSPECTION' && img.inspectionId === inspection?.id)
      .sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt))[0] || null;

  if (!inspection && !loadErr) {
    return <div className="loading-message">Loading inspection...</div>;
  }

  return (
    <div className="page-container">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h1 style={{ marginTop: 0 }}>
            {inspection ? `Inspection ${inspection.inspectionNo}` : 'Inspection'}
          </h1>
          <button 
            onClick={() => nav('/inspections')} 
            style={{ 
              borderRadius: 10, 
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            Back to Inspections
          </button>
        </div>

        {loadErr && <div style={{ color:'#b00020', marginBottom: 12 }}>Error: {loadErr}</div>}

        {inspection && (
          <>
            {/* Inspection Details */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: 20,
              marginBottom: 24,
              padding: 20,
              background: 'white',
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <div>
                <label style={{ fontSize: 14, color: '#6b7280', fontWeight: 600 }}>Inspection No.</label>
                <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{inspection.inspectionNo}</div>
              </div>
              <div>
                <label style={{ fontSize: 14, color: '#6b7280', fontWeight: 600 }}>Transformer</label>
                <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{inspection.transformerCode}</div>
              </div>
              <div>
                <label style={{ fontSize: 14, color: '#6b7280', fontWeight: 600 }}>Branch</label>
                <div style={{ fontSize: 16, marginTop: 4 }}>{inspection.branch}</div>
              </div>
              <div>
                <label style={{ fontSize: 14, color: '#6b7280', fontWeight: 600 }}>Inspected By</label>
                <div style={{ fontSize: 16, marginTop: 4 }}>{inspection.inspectedBy}</div>
              </div>
              <div>
                <label style={{ fontSize: 14, color: '#6b7280', fontWeight: 600 }}>Inspection Date</label>
                <div style={{ fontSize: 16, marginTop: 4 }}>
                  {formatDateTime(inspection.inspectionDate, inspection.inspectionTime)}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 14, color: '#6b7280', fontWeight: 600 }}>Maintenance Date</label>
                <div style={{ fontSize: 16, marginTop: 4 }}>
                  {inspection.maintenanceDate ? 
                    formatDateTime(inspection.maintenanceDate, inspection.maintenanceTime || undefined) : 
                    'Not scheduled'
                  }
                </div>
              </div>
              <div>
                <label style={{ fontSize: 14, color: '#6b7280', fontWeight: 600 }}>Status</label>
                <div style={{ marginTop: 4 }}>{getStatusBadge(inspection.status)}</div>
              </div>
              <div>
                <label style={{ fontSize: 14, color: '#6b7280', fontWeight: 600 }}>Actions</label>
                <div style={{ marginTop: 4, display: 'flex', gap: 8 }}>
                  <select 
                    value={inspection.status} 
                    onChange={(e) => handleStatusUpdate(e.target.value as any)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      border: '1px solid #d1d5db',
                      fontSize: 14
                    }}
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="UNDER_REVIEW">Under Review</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            {inspection.notes && (
              <div style={{
                padding: 20,
                background: 'white',
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                marginBottom: 24
              }}>
                <label style={{ fontSize: 14, color: '#6b7280', fontWeight: 600 }}>Notes</label>
                <div style={{ fontSize: 16, marginTop: 4, lineHeight: 1.6 }}>{inspection.notes}</div>
              </div>
            )}

            {/* Thermal Image Comparison */}
            <div style={{
              background: 'white',
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              padding: 20,
              marginBottom: 24
            }}>
              <h2 style={{ margin: '0 0 20px 0', fontSize: 20 }}>Thermal Image Comparison</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <ImageBox title="Baseline" img={baselineImage} />
                <ImageBox 
                  title="Inspection Image" 
                  img={inspectionImage}
                  onUpload={handleUpload}
                  uploading={uploading}
                  uploadErr={uploadErr}
                />
              </div>
              
              {imgErr && <div style={{ color: '#b00020', marginTop: 12 }}>Error loading images: {imgErr}</div>}
            </div>

            {/* Comments Section */}
            {inspection && <CommentsSection inspectionId={inspection.id} />}
          </>
        )}
      </div>
    </div>
  );
}

function ImageBox({ 
  title, 
  img, 
  onUpload, 
  uploading, 
  uploadErr 
}: { 
  title: string; 
  img: ThermalImage | null; 
  onUpload?: (file: File) => void;
  uploading?: boolean;
  uploadErr?: string | null;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileDrop = (file: File) => {
    setSelectedFile(file);
  };

  const handleUploadClick = () => {
    if (selectedFile && onUpload) {
      onUpload(selectedFile);
      setSelectedFile(null);
    }
  };

  return (
    <div style={{
      border: '2px solid #e5e7eb',
      borderRadius: 8,
      padding: 16,
      minHeight: 300,
      background: '#f9fafb'
    }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 600 }}>{title}</h3>
      {img && (
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <img 
            src={img.publicUrl} 
            alt={img.originalFilename}
            style={{ 
              maxWidth: '100%', 
              maxHeight: 250, 
              borderRadius: 6,
              objectFit: 'contain'
            }}
          />
          <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
            {img.originalFilename}
            {img.envCondition && ` (${img.envCondition})`}
          </div>
        </div>
      )}
      {onUpload && (
        <div>
          <FileDrop onFile={handleFileDrop} />
          {selectedFile && (
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 14, color: '#1e40af', fontWeight: 500 }}>Selected: {selectedFile.name}</span>
              <button
                onClick={handleUploadClick}
                disabled={uploading}
                style={{
                  background: uploading ? '#94a3b8' : 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 18px',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(124, 58, 237, 0.15)',
                  transition: 'all 0.2s ease'
                }}
              >
                {uploading ? 'Uploading…' : 'Upload Image'}
              </button>
            </div>
          )}
          {uploading && <div style={{ textAlign: 'center', color: '#6b7280', marginTop: 8 }}>Uploading...</div>}
          {uploadErr && <div style={{ color: '#b00020', marginTop: 8, fontSize: 14 }}>{uploadErr}</div>}
        </div>
      )}
      {!img && !onUpload && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 200,
          color: '#6b7280',
          fontSize: 14
        }}>
          No image available
        </div>
      )}
    </div>
  );
}