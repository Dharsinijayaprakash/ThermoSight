import React from 'react';

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export default function Input({ label, error, ...rest }: Props) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>{label}</label>}
            <input {...rest} style={{ width: '100%', marginBottom: '1em', padding: 8, borderRadius: 6, border: '1px solid #ccc' }} />
      {error && <div style={{ color: '#c00', marginTop: 4, fontSize: 12 }}>{error}</div>}
    </div>
  );
}