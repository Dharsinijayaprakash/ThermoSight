// src/components/TimeInput.tsx
import { useState, useRef, useEffect } from 'react';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
};

export default function TimeInput({ label, value, onChange, disabled, required }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [hours, setHours] = useState('00');
  const [minutes, setMinutes] = useState('00');
  const pickerRef = useRef<HTMLDivElement>(null);

  // Parse value into hours and minutes
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':');
      setHours(h || '00');
      setMinutes(m || '00');
    }
  }, [value]);

  // Close picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSetCurrentTime = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    setHours(h);
    setMinutes(m);
    onChange(`${h}:${m}`);
  };

  const handleHourChange = (h: string) => {
    const hour = Math.max(0, Math.min(23, parseInt(h) || 0));
    const formattedHour = String(hour).padStart(2, '0');
    setHours(formattedHour);
    onChange(`${formattedHour}:${minutes}`);
  };

  const handleMinuteChange = (m: string) => {
    const minute = Math.max(0, Math.min(59, parseInt(m) || 0));
    const formattedMinute = String(minute).padStart(2, '0');
    setMinutes(formattedMinute);
    onChange(`${hours}:${formattedMinute}`);
  };

  const incrementHour = () => {
    const newHour = (parseInt(hours) + 1) % 24;
    handleHourChange(String(newHour));
  };

  const decrementHour = () => {
    const newHour = (parseInt(hours) - 1 + 24) % 24;
    handleHourChange(String(newHour));
  };

  const incrementMinute = () => {
    const newMinute = (parseInt(minutes) + 1) % 60;
    handleMinuteChange(String(newMinute));
  };

  const decrementMinute = () => {
    const newMinute = (parseInt(minutes) - 1 + 60) % 60;
    handleMinuteChange(String(newMinute));
  };

  return (
    <div style={{ position: 'relative' }}>
      <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '14px' }}>
        {label}
        {required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {/* Time Display Input */}
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          style={{
            flex: 1,
            padding: '10px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            fontFamily: 'monospace',
            backgroundColor: disabled ? '#f3f4f6' : 'white',
            cursor: disabled ? 'not-allowed' : 'text',
          }}
        />
        
        {/* Quick Time Buttons */}
        {!disabled && (
          <>
            <button
              type="button"
              onClick={handleSetCurrentTime}
              style={{
                padding: '10px 16px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              Now
            </button>
            
            <button
              type="button"
              onClick={() => setShowPicker(!showPicker)}
              style={{
                padding: '10px 16px',
                background: showPicker ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: showPicker ? '0 4px 8px rgba(139, 92, 246, 0.4)' : '0 2px 4px rgba(99, 102, 241, 0.3)',
              }}
            >
              Picker
            </button>
          </>
        )}
      </div>

      {/* Custom Time Picker */}
      {showPicker && !disabled && (
        <div
          ref={pickerRef}
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            background: 'white',
            border: '2px solid #e5e7eb',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            minWidth: '240px',
          }}
        >
          <div style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: '#374151', textAlign: 'center' }}>
            Select Time
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center' }}>
            {/* Hours Picker */}
            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={incrementHour}
                style={{
                  width: '40px',
                  height: '32px',
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  marginBottom: '4px',
                }}
              >
                ▲
              </button>
              <div style={{
                background: '#3b82f6',
                color: 'white',
                padding: '12px 8px',
                borderRadius: '8px',
                fontSize: '24px',
                fontWeight: 'bold',
                fontFamily: 'monospace',
                minWidth: '60px',
                marginBottom: '4px',
              }}>
                {hours}
              </div>
              <button
                type="button"
                onClick={decrementHour}
                style={{
                  width: '40px',
                  height: '32px',
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                ▼
              </button>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>Hours</div>
            </div>

            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#9ca3af' }}>:</div>

            {/* Minutes Picker */}
            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={incrementMinute}
                style={{
                  width: '40px',
                  height: '32px',
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  marginBottom: '4px',
                }}
              >
                ▲
              </button>
              <div style={{
                background: '#10b981',
                color: 'white',
                padding: '12px 8px',
                borderRadius: '8px',
                fontSize: '24px',
                fontWeight: 'bold',
                fontFamily: 'monospace',
                minWidth: '60px',
                marginBottom: '4px',
              }}>
                {minutes}
              </div>
              <button
                type="button"
                onClick={decrementMinute}
                style={{
                  width: '40px',
                  height: '32px',
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                ▼
              </button>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>Minutes</div>
            </div>
          </div>

          {/* Quick Time Presets */}
          <div style={{ marginTop: '16px', borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
            <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px', textAlign: 'center' }}>
              Quick Select
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {['08:00', '12:00', '14:00', '16:00', '18:00', '20:00'].map(time => (
                <button
                  key={time}
                  type="button"
                  onClick={() => {
                    onChange(time);
                    setShowPicker(false);
                  }}
                  style={{
                    padding: '6px',
                    background: value === time ? '#3b82f6' : '#f3f4f6',
                    color: value === time ? 'white' : '#374151',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                  }}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* Done Button */}
          <button
            type="button"
            onClick={() => setShowPicker(false)}
            style={{
              width: '100%',
              marginTop: '12px',
              padding: '10px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
