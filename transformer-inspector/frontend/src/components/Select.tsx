import React from 'react';

type Props = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
};

export default function Select({ label, error, options, ...rest }: Props) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>{label}</label>}
      <select {...rest} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc' }}>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <div style={{ color: '#c00', marginTop: 4, fontSize: 12 }}>{error}</div>}
    </div>
  );
}