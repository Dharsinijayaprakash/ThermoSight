import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Input from '../components/Input';
import { createTransformer, getTransformer, updateTransformer } from '../api/transformers';

export default function TransformerForm() {
  const [params] = useSearchParams();
  const id = params.get('id');
  const isEdit = Boolean(id);
  const nav = useNavigate();

  const [code, setCode] = useState('');
  const [location, setLocation] = useState('');
  const [capacityKVA, setCapacity] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      const t = await getTransformer(id);
      setCode(t.code); setLocation(t.location); setCapacity(t.capacityKVA);
    })();
  }, [id]);

  async function submit() {
    try {
      setLoading(true);
      const body = { code, location, capacityKVA: Number(capacityKVA || 0) };
      if (isEdit && id) await updateTransformer(id, body);
      else await createTransformer(body);
      nav('/transformers');
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to save transformer');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally { setLoading(false); }
  }

  return (
    <div className="page-container">
      {/* Notifications */}
      {errorMsg && (
        <div className="error-message">
          <span className="message-icon">✕</span>
          {errorMsg}
        </div>
      )}

      <div style={{ maxWidth: 520, margin: '24px auto', padding: 16 }}>
      <h2>{isEdit ? 'Edit Transformer' : 'New Transformer'}</h2>
      <Input label="Code" value={code} onChange={e => setCode(e.target.value)} placeholder="TX-001" />
      <Input label="Location" value={location} onChange={e => setLocation(e.target.value)} placeholder="Substation A" />
      <Input label="Capacity (kVA)" type="number" value={capacityKVA} onChange={e => setCapacity(e.target.value as any)} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={submit} disabled={loading}>{loading ? 'Saving…' : 'Save'}</button>
        <button onClick={() => nav('/transformers')} disabled={loading}>Cancel</button>
      </div>
      </div>
    </div>
  );
}