import { useEffect, useState } from 'react';
import Input from '../components/Input';
import Select from '../components/Select';
import FileDrop from '../components/FileDrop';
import { listTransformers } from '../api/transformers';
import type { Transformer } from '../api/transformers';
import { uploadImage } from '../api/images';

export default function ImageUpload() {
  const [transformers, setTransformers] = useState<Transformer[]>([]);
  const [transformerId, setTransformerId] = useState('');
  const [type, setType] = useState<'BASELINE'|'MAINTENANCE'>('BASELINE');
  const [env, setEnv] = useState<'SUNNY'|'CLOUDY'|'RAINY'|' '>(' ');
  const [uploader, setUploader] = useState('admin');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await listTransformers('', 0, 100);
      setTransformers(res.content);
      if (res.content[0]) setTransformerId(res.content[0].id);
    })();
  }, []);

  async function submit() {
    if (!transformerId || !file) { 
      setErrorMsg('Please select transformer and file'); 
      setTimeout(() => setErrorMsg(null), 5000);
      return; 
    }
    if (type === 'BASELINE' && env === ' ') { 
      setErrorMsg('Please choose environmental condition for baseline images'); 
      setTimeout(() => setErrorMsg(null), 5000);
      return; 
    }
    try {
      setBusy(true);
      setErrorMsg(null);
      await uploadImage({
        transformerId, type,
        envCondition: type === 'BASELINE' ? (env as any) : undefined,
        uploader, file
      });
      setSuccessMsg('Image uploaded successfully!');
      setTimeout(() => setSuccessMsg(null), 5000);
      setFile(null);
    } catch (e: any) {
      setErrorMsg(e.message || 'Upload failed');
      setTimeout(() => setErrorMsg(null), 5000);
    } finally { setBusy(false); }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Upload Thermal Image</h1>
      </div>

      {/* Notifications */}
      {successMsg && <div className="success-message">{successMsg}</div>}
      {errorMsg && <div className="error-message">{errorMsg}</div>}
      {busy && <div className="loading-message">Uploading image...</div>}

      <div className="search-section">
        <Select
          label="Transformer"
          value={transformerId}
          onChange={e => setTransformerId(e.target.value)}
          options={transformers.map(t => ({ value: t.id, label: `${t.code} – ${t.location}` }))}
        />
        <Select
          label="Type"
          value={type}
          onChange={e => setType(e.target.value as any)}
          options={[{ value: 'BASELINE', label: 'Baseline' }, { value: 'MAINTENANCE', label: 'Maintenance' }]}
        />
        {type === 'BASELINE' && (
          <Select
            label="Environmental Condition"
            value={env}
            onChange={e => setEnv(e.target.value as any)}
            options={[
              { value: ' ', label: 'Select condition…' },
              { value: 'SUNNY', label: 'Sunny' },
              { value: 'CLOUDY', label: 'Cloudy' },
              { value: 'RAINY', label: 'Rainy' },
            ]}
          />
        )}
        <Input label="Uploader" value={uploader} onChange={e => setUploader(e.target.value)} />
        <FileDrop onFile={setFile} />
        {file && <div style={{ marginTop: 8, fontWeight: 600, color: '#1e40af' }}>Selected: <strong>{file.name}</strong></div>}
        <div style={{ marginTop: 12 }}>
          <button className="search-button" onClick={submit} disabled={busy}>
            {busy ? 'Uploading…' : 'Upload Image'}
          </button>
        </div>
      </div>
    </div>
  );
}