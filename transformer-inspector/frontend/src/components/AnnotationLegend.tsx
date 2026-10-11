// src/components/AnnotationLegend.tsx
interface AnnotationLegendProps {
  layout?: 'horizontal' | 'vertical';
  compact?: boolean;
}

const DETECTION_CLASSES = [
  { value: 'Faulty', label: 'Faulty', color: '#ef4444' },
  { value: 'faulty_loose_joint', label: 'Loose Joint', color: '#22c55e' },
  { value: 'faulty_point_overload', label: 'Point Overload', color: '#3b82f6' },
  { value: 'potential_faulty', label: 'Potential Faulty', color: '#eab308' },
];

export default function AnnotationLegend({ 
  layout = 'vertical', 
  compact = false 
}: AnnotationLegendProps) {
  const isVertical = layout === 'vertical';
  
  return (
    <div style={{
      background: 'linear-gradient(135deg, #fefce8 0%, #fef3c7 100%)',
      borderRadius: '10px',
      padding: '12px 14px',
      boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06)',
      border: '1px solid #fde68a'
    }}>
      <h4 style={{ 
        margin: '0 0 10px 0', 
        fontSize: '13px', 
        fontWeight: '600', 
        color: '#92400e',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        Fault Types
      </h4>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: isVertical ? '1fr 1fr' : 'repeat(4, auto)',
        gap: '8px 12px',
        alignItems: 'center'
      }}>
        {DETECTION_CLASSES.map((cls) => (
          <div 
            key={cls.value} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '4px 8px',
              background: 'white',
              borderRadius: '6px',
              border: '1px solid #f3f4f6'
            }}
          >
            <div style={{
              width: '10px',
              height: '10px',
              background: cls.color,
              borderRadius: '3px',
              boxShadow: `0 0 0 2px ${cls.color}22`,
              flexShrink: 0
            }} />
            <span style={{ 
              color: '#374151', 
              fontSize: '11px', 
              fontWeight: '500',
              lineHeight: 1.2,
              whiteSpace: 'nowrap'
            }}>
              {cls.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}