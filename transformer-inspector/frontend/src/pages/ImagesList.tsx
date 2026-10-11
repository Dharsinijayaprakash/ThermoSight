import { useEffect, useState } from 'react';
import Select from '../components/Select';
import { listTransformers } from '../api/transformers';
import type { Transformer } from '../api/transformers';
import { listImages } from '../api/images';
import type { ThermalImage } from '../api/images';

export default function ImagesList() {
  const [transformers, setTransformers] = useState<Transformer[]>([]);
  const [transformerId, setTransformerId] = useState('');
  const [type, setType] = useState<'BASELINE'|'MAINTENANCE'|' '>(' ');
  const [images, setImages] = useState<ThermalImage[]>([]);

  async function load() {
    const res = await listImages({
      transformerId: transformerId || undefined,
      type: (type === ' ' ? undefined : type) as any,
      page: 0, size: 100
    });
    setImages(res.content);
  }

  useEffect(() => {
    (async () => {
      const res = await listTransformers('', 0, 100);
      setTransformers(res.content);
    })();
  }, []);

  return (
    <div style={{ maxWidth: 1100, margin: '24px auto', padding: 16 }}>
      <h2>Images</h2>
      <div style={{ display: 'flex', gap: 8 }}>
        <Select
          label="Transformer"
          value={transformerId}
          onChange={e => setTransformerId(e.target.value)}
          options={[{ value: '', label: 'All' }, ...transformers.map(t => ({ value: t.id, label: `${t.code} – ${t.location}` }))]}
        />
        <Select
          label="Type"
          value={type}
          onChange={e => setType(e.target.value as any)}
          options={[
            { value: ' ', label: 'All' },
            { value: 'BASELINE', label: 'Baseline' },
            { value: 'MAINTENANCE', label: 'Maintenance' },
          ]}
        />
        <button onClick={load}>Apply</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginTop: 16 }}>
        {images.map(img => (
          <div key={img.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 8 }}>
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', borderRadius: 6 }}>
              <img src={img.publicUrl} alt={img.originalFilename} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
            </div>
            <div style={{ fontSize: 12, marginTop: 6 }}>
              <div><strong>{img.type}</strong>{img.envCondition ? ` • ${img.envCondition}` : ''}</div>
              <div>{new Date(img.uploadedAt).toLocaleString()}</div>
              <div>{(img.sizeBytes/1024).toFixed(1)} KB</div>
              <div>{img.uploader}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}