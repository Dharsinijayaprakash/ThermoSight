import { useState, useEffect } from 'react';
import Input from './Input';
import Select from './Select';
import TimeInput from './TimeInput';
import type { MaintenanceRecord, UpdateMaintenanceRecordRequest } from '../api/maintenanceRecords';

type Props = {
  record: MaintenanceRecord;
  onSave: (updates: UpdateMaintenanceRecordRequest) => void;
  onDownloadPDF: () => void;
  inspectionImageUrl?: string | null;
};

export default function MaintenanceRecordForm({ record, onSave, onDownloadPDF, inspectionImageUrl }: Props) {
  const [activeTab, setActiveTab] = useState<'tab1' | 'tab2'>('tab1');
  const [isEditing, setIsEditing] = useState(true);
  
  // Helper to get current time in HH:MM format
  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5); // HH:MM
  };
  
  // Helper to get current date in YYYY-MM-DD format
  const getCurrentDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };
  
  const initializeFormData = (): UpdateMaintenanceRecordRequest => ({
    // Tab 1 fields - Auto-fill with current time if empty
    dateOfInspection: record.dateOfInspection || getCurrentDate(),
    startTime: record.startTime || getCurrentTime(),
    completionTime: record.completionTime || '',
    supervisedBy: record.supervisedBy || '',
    gangTech1: record.gangTech1 || '',
    gangTech2: record.gangTech2 || '',
    gangTech3: record.gangTech3 || '',
    gangHelpers: record.gangHelpers || '',
    inspectedBy: record.inspectedBy || '',
    inspectedDate: record.inspectedDate || getCurrentDate(),
    rectifiedBy: record.rectifiedBy || '',
    rectifiedDate: record.rectifiedDate || '',
    cssInspector: record.cssInspector || '',
    cssInspectorDate: record.cssInspectorDate || '',
    
    // Tab 2 fields
    branch: record.branch || '',
    transformerNo: record.transformerNo || '',
    poleNo: record.poleNo || '',
    baselineRight: record.baselineRight,
    baselineLeft: record.baselineLeft,
    baselineFront: record.baselineFront,
    loadGrowthKva: record.loadGrowthKva,
    baselineCondition: record.baselineCondition,
    transformerStatus: record.transformerStatus,
    transformerType: record.transformerType,
    meterSerialNo: record.meterSerialNo || '',
    meterMaker: record.meterMaker || '',
    meterMake: record.meterMake || '',
    workContent: record.workContent && Object.keys(record.workContent).length > 0 ? record.workContent : undefined,
    
    firstVoltageR: record.firstVoltageR,
    firstVoltageY: record.firstVoltageY,
    firstVoltageB: record.firstVoltageB,
    firstCurrentR: record.firstCurrentR,
    firstCurrentY: record.firstCurrentY,
    firstCurrentB: record.firstCurrentB,
    firstPowerFactorR: record.firstPowerFactorR,
    firstPowerFactorY: record.firstPowerFactorY,
    firstPowerFactorB: record.firstPowerFactorB,
    firstKwR: record.firstKwR,
    firstKwY: record.firstKwY,
    firstKwB: record.firstKwB,
    
    secondVoltageR: record.secondVoltageR,
    secondVoltageY: record.secondVoltageY,
    secondVoltageB: record.secondVoltageB,
    secondCurrentR: record.secondCurrentR,
    secondCurrentY: record.secondCurrentY,
    secondCurrentB: record.secondCurrentB,
    secondPowerFactorR: record.secondPowerFactorR,
    secondPowerFactorY: record.secondPowerFactorY,
    secondPowerFactorB: record.secondPowerFactorB,
    secondKwR: record.secondKwR,
    secondKwY: record.secondKwY,
    secondKwB: record.secondKwB,
    secondInspectionDate: record.secondInspectionDate || '',
    
    notes: record.notes || '',
    engineerRemarks: record.engineerRemarks || '',
    
    updatedBy: 'engineer', // TODO: Get from auth context
  });
  
  const [formData, setFormData] = useState<UpdateMaintenanceRecordRequest>(initializeFormData());
  
  // Update form data when record changes (after successful save)
  useEffect(() => {
    setFormData(initializeFormData());
  }, [record.updatedAt]); // Re-initialize when record is updated

  const handleInputChange = (field: keyof UpdateMaintenanceRecordRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const cleanFormData = (data: UpdateMaintenanceRecordRequest): UpdateMaintenanceRecordRequest => {
    // Create a clean copy and remove all undefined/null/empty values
    const cleaned: any = {};
    
    // Numeric field names that need conversion
    const numericFields = [
      'baselineRight', 'baselineLeft', 'baselineFront', 'loadGrowthKva',
      'firstVoltageR', 'firstVoltageY', 'firstVoltageB',
      'firstCurrentR', 'firstCurrentY', 'firstCurrentB',
      'firstPowerFactorR', 'firstPowerFactorY', 'firstPowerFactorB',
      'firstKwR', 'firstKwY', 'firstKwB',
      'secondVoltageR', 'secondVoltageY', 'secondVoltageB',
      'secondCurrentR', 'secondCurrentY', 'secondCurrentB',
      'secondPowerFactorR', 'secondPowerFactorY', 'secondPowerFactorB',
      'secondKwR', 'secondKwY', 'secondKwB'
    ];
    
    // Enum fields that should be null instead of empty string
    const enumFields = [
      'baselineCondition', 'transformerStatus', 'transformerType'
    ];
    
    Object.keys(data).forEach(key => {
      const value = (data as any)[key];
      
      // Skip undefined and null
      if (value === undefined || value === null) {
        return;
      }
      
      // For enum fields, skip empty strings (will be null in the backend)
      if (enumFields.includes(key)) {
        if (value === '' || value === 'Select...') {
          return; // Don't include empty enum values
        }
        cleaned[key] = value;
        return;
      }
      
      // Skip other empty strings
      if (value === '') {
        return;
      }
      
      // Handle numeric fields - convert strings to numbers, keep numbers as-is
      if (numericFields.includes(key)) {
        if (typeof value === 'number') {
          // Already a number, keep it
          cleaned[key] = value;
        } else if (typeof value === 'string' && value.trim() !== '') {
          // String that needs conversion
          const numValue = Number(value);
          if (!isNaN(numValue)) {
            cleaned[key] = numValue;
          }
        }
        return;
      }
      
      // Skip empty workContent map
      if (key === 'workContent' && typeof value === 'object' && Object.keys(value).length === 0) {
        return;
      }
      
      // Include the value (strings, enums, etc.)
      cleaned[key] = value;
    });
    
    // Always include updatedBy
    cleaned.updatedBy = 'engineer';
    
    console.log('Cleaned form data:', cleaned);
    
    return cleaned as UpdateMaintenanceRecordRequest;
  };

  const handleSave = () => {
    const cleanedData = cleanFormData(formData);
    onSave(cleanedData);
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  return (
    <div style={{ padding: '20px' }} className="maintenance-record-container">
      {/* Header Info */}
      <div style={{ marginBottom: '20px', background: '#f5f5f5', borderRadius: '8px', padding: '15px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
          <div>
            <strong>Record Number:</strong><br />{record.recordNumber}
          </div>
          <div>
            <strong>Transformer:</strong><br />{record.transformerCode}
          </div>
          <div>
            <strong>Status:</strong><br />
            <span style={{ 
              color: record.status === 'FINALIZED' ? '#28a745' : '#ffc107',
              fontWeight: 'bold'
            }}>{record.status}</span>
          </div>
          <div>
            <strong>Inspection Date:</strong><br />{record.inspectionDate || 'N/A'}
          </div>
          <div>
            <strong>Weather:</strong><br />{record.weatherCondition || 'N/A'}
          </div>
          <div>
            <strong>Anomalies:</strong><br />{record.anomalyCount}
          </div>
        </div>
      </div>

      {/* Inspection Image Section - Centered and Large */}
      <div style={{ 
        marginBottom: '30px', 
        display: 'flex', 
        justifyContent: 'center',
        background: '#1e293b',
        borderRadius: '12px',
        padding: '20px'
      }} className="inspection-image-section">
        {inspectionImageUrl ? (
          <img 
            src={inspectionImageUrl} 
            alt="Inspection thermal image" 
            style={{ 
              maxWidth: '800px',
              width: '100%',
              height: 'auto',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}
          />
        ) : (
          <div style={{ color: '#94a3b8', textAlign: 'center', padding: '60px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>[ Image ]</div>
            <div style={{ fontSize: '16px' }}>No inspection image available</div>
          </div>
        )}
      </div>

      {/* Action Buttons - Download PDF and Edit */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
        <button
          onClick={onDownloadPDF}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          Download PDF
        </button>
        
        {!isEditing && (
          <button
            onClick={handleEdit}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </span> Edit
          </button>
        )}
        
        {isEditing && (
          <button
            onClick={handleSave}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            Save Changes
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #e0e0e0' }}>
        <button
          onClick={() => setActiveTab('tab1')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: activeTab === 'tab1' ? '#007bff' : 'transparent',
            color: activeTab === 'tab1' ? 'white' : '#333',
            fontWeight: 'bold',
            cursor: 'pointer',
            borderRadius: '5px 5px 0 0',
          }}
        >
          Maintenance Record
        </button>
        <button
          onClick={() => setActiveTab('tab2')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: activeTab === 'tab2' ? '#007bff' : 'transparent',
            color: activeTab === 'tab2' ? 'white' : '#333',
            fontWeight: 'bold',
            cursor: 'pointer',
            borderRadius: '5px 5px 0 0',
          }}
        >
          Work-Data Sheet
        </button>
      </div>

      {/* Tab 1: Maintenance Record */}
      {activeTab === 'tab1' && (
        <div style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '10px' }}>
          <h3 style={{ marginTop: 0 }}>Gang Composition & Inspection Details</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
            <Input
              label="Date of Inspection"
              type="date"
              value={formData.dateOfInspection}
              onChange={(e) => handleInputChange('dateOfInspection', e.target.value)}
              disabled={!isEditing}
            />
            <TimeInput
              label="Start Time"
              value={formData.startTime || ''}
              onChange={(value) => handleInputChange('startTime', value)}
              disabled={!isEditing}
            />
            <TimeInput
              label="Completion Time"
              value={formData.completionTime || ''}
              onChange={(value) => handleInputChange('completionTime', value)}
              disabled={!isEditing}
            />
            <Input
              label="Supervised By"
              type="text"
              value={formData.supervisedBy}
              onChange={(e) => handleInputChange('supervisedBy', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <h4 style={{ marginTop: '20px' }}>Gang Members</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
            <Input
              label="Technician I"
              type="text"
              value={formData.gangTech1}
              onChange={(e) => handleInputChange('gangTech1', e.target.value)}
              disabled={!isEditing}
            />
            <Input
              label="Technician II"
              type="text"
              value={formData.gangTech2}
              onChange={(e) => handleInputChange('gangTech2', e.target.value)}
              disabled={!isEditing}
            />
            <Input
              label="Technician III"
              type="text"
              value={formData.gangTech3}
              onChange={(e) => handleInputChange('gangTech3', e.target.value)}
              disabled={!isEditing}
            />
            <Input
              label="Helpers (comma-separated)"
              type="text"
              value={formData.gangHelpers}
              onChange={(e) => handleInputChange('gangHelpers', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <h4 style={{ marginTop: '20px' }}>Signatures</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
            <Input
              label="Inspected By"
              type="text"
              value={formData.inspectedBy}
              onChange={(e) => handleInputChange('inspectedBy', e.target.value)}
              disabled={!isEditing}
            />
            <Input
              label="Inspected Date"
              type="date"
              value={formData.inspectedDate}
              onChange={(e) => handleInputChange('inspectedDate', e.target.value)}
              disabled={!isEditing}
            />
            <Input
              label="Rectified By"
              type="text"
              value={formData.rectifiedBy}
              onChange={(e) => handleInputChange('rectifiedBy', e.target.value)}
              disabled={!isEditing}
            />
            <Input
              label="Rectified Date"
              type="date"
              value={formData.rectifiedDate}
              onChange={(e) => handleInputChange('rectifiedDate', e.target.value)}
              disabled={!isEditing}
            />
            <Input
              label="CSS Inspector"
              type="text"
              value={formData.cssInspector}
              onChange={(e) => handleInputChange('cssInspector', e.target.value)}
              disabled={!isEditing}
            />
            <Input
              label="CSS Inspector Date"
              type="date"
              value={formData.cssInspectorDate}
              onChange={(e) => handleInputChange('cssInspectorDate', e.target.value)}
              disabled={!isEditing}
            />
          </div>
        </div>
      )}

      {/* Tab 2: Work-Data Sheet */}
      {activeTab === 'tab2' && (
        <div style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '10px' }}>
          <h3 style={{ marginTop: 0 }}>Transformer Information</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
            <Input
              label="Branch"
              type="text"
              value={formData.branch}
              onChange={(e) => handleInputChange('branch', e.target.value)}
              disabled={!isEditing}
            />
            <Input
              label="Transformer No"
              type="text"
              value={formData.transformerNo}
              onChange={(e) => handleInputChange('transformerNo', e.target.value)}
              disabled={!isEditing}
            />
            <Input
              label="Pole No"
              type="text"
              value={formData.poleNo}
              onChange={(e) => handleInputChange('poleNo', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <h4 style={{ marginTop: '20px' }}>Baseline Thermal Readings</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
            <Input
              label="Baseline Right (°C)"
              type="number"
              step="0.01"
              value={formData.baselineRight || ''}
              onChange={(e) => handleInputChange('baselineRight', parseFloat(e.target.value))}
              disabled={!isEditing}
            />
            <Input
              label="Baseline Left (°C)"
              type="number"
              step="0.01"
              value={formData.baselineLeft || ''}
              onChange={(e) => handleInputChange('baselineLeft', parseFloat(e.target.value))}
              disabled={!isEditing}
            />
            <Input
              label="Baseline Front (°C)"
              type="number"
              step="0.01"
              value={formData.baselineFront || ''}
              onChange={(e) => handleInputChange('baselineFront', parseFloat(e.target.value))}
              disabled={!isEditing}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginTop: '15px' }}>
            <Input
              label="Load Growth (kVA)"
              type="number"
              step="0.01"
              value={formData.loadGrowthKva || ''}
              onChange={(e) => handleInputChange('loadGrowthKva', parseFloat(e.target.value))}
              disabled={!isEditing}
            />
            <Select
              label="Baseline Condition"
              value={formData.baselineCondition || ''}
              onChange={(e) => handleInputChange('baselineCondition', e.target.value as any)}
              disabled={!isEditing}
              options={[
                { value: '', label: 'Select...' },
                { value: 'GOOD', label: 'Good' },
                { value: 'FAIR', label: 'Fair' },
                { value: 'POOR', label: 'Poor' }
              ]}
            />
            <Select
              label="Transformer Status"
              value={formData.transformerStatus || ''}
              onChange={(e) => handleInputChange('transformerStatus', e.target.value as any)}
              disabled={!isEditing}
              options={[
                { value: '', label: 'Select...' },
                { value: 'WORKING', label: 'Working' },
                { value: 'NOT_WORKING', label: 'Not Working' },
                { value: 'PARTIALLY_WORKING', label: 'Partially Working' }
              ]}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginTop: '15px' }}>
            <Select
              label="Transformer Type"
              value={formData.transformerType || ''}
              onChange={(e) => handleInputChange('transformerType', e.target.value as any)}
              disabled={!isEditing}
              options={[
                { value: '', label: 'Select...' },
                { value: 'DISTRIBUTION', label: 'Distribution' },
                { value: 'POWER', label: 'Power' },
                { value: 'INSTRUMENT', label: 'Instrument' },
                { value: 'AUTO_TRANSFORMER', label: 'Auto Transformer' }
              ]}
            />
            <Input
              label="Meter Serial No"
              type="text"
              value={formData.meterSerialNo}
              onChange={(e) => handleInputChange('meterSerialNo', e.target.value)}
              disabled={!isEditing}
            />
            <Input
              label="Meter Maker"
              type="text"
              value={formData.meterMaker}
              onChange={(e) => handleInputChange('meterMaker', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <Input
            label="Meter Make"
            type="text"
            value={formData.meterMake}
            onChange={(e) => handleInputChange('meterMake', e.target.value)}
            disabled={!isEditing}
            style={{ marginTop: '15px' }}
          />

          <h4 style={{ marginTop: '20px' }}>First Inspection Readings</h4>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '80px repeat(4, 1fr)', 
            gap: '10px',
            alignItems: 'center'
          }}>
            <div><strong>Phase</strong></div>
            <div><strong>Voltage (V)</strong></div>
            <div><strong>Current (A)</strong></div>
            <div><strong>Power Factor</strong></div>
            <div><strong>kW</strong></div>
            
            {/* Phase R */}
            <div style={{ fontWeight: '600', fontSize: '16px' }}>R</div>
            <Input
              type="number"
              step="0.01"
              value={formData.firstVoltageR || ''}
              onChange={(e) => handleInputChange('firstVoltageR', parseFloat(e.target.value))}
              disabled={!isEditing}
            />
            <Input
              type="number"
              step="0.01"
              value={formData.firstCurrentR || ''}
              onChange={(e) => handleInputChange('firstCurrentR', parseFloat(e.target.value))}
              disabled={!isEditing}
            />
            <Input
              type="number"
              step="0.001"
              value={formData.firstPowerFactorR || ''}
              onChange={(e) => handleInputChange('firstPowerFactorR', parseFloat(e.target.value))}
              disabled={!isEditing}
              placeholder="0.000-1.000"
            />
            <Input
              type="number"
              step="0.01"
              value={formData.firstKwR || ''}
              onChange={(e) => handleInputChange('firstKwR', parseFloat(e.target.value))}
              disabled={!isEditing}
            />
            
            {/* Phase Y */}
            <div style={{ fontWeight: '600', fontSize: '16px' }}>Y</div>
            <Input
              type="number"
              step="0.01"
              value={formData.firstVoltageY || ''}
              onChange={(e) => handleInputChange('firstVoltageY', parseFloat(e.target.value))}
              disabled={!isEditing}
            />
            <Input
              type="number"
              step="0.01"
              value={formData.firstCurrentY || ''}
              onChange={(e) => handleInputChange('firstCurrentY', parseFloat(e.target.value))}
              disabled={!isEditing}
            />
            <Input
              type="number"
              step="0.001"
              value={formData.firstPowerFactorY || ''}
              onChange={(e) => handleInputChange('firstPowerFactorY', parseFloat(e.target.value))}
              disabled={!isEditing}
              placeholder="0.000-1.000"
            />
            <Input
              type="number"
              step="0.01"
              value={formData.firstKwY || ''}
              onChange={(e) => handleInputChange('firstKwY', parseFloat(e.target.value))}
              disabled={!isEditing}
            />
            
            {/* Phase B */}
            <div style={{ fontWeight: '600', fontSize: '16px' }}>B</div>
            <Input
              type="number"
              step="0.01"
              value={formData.firstVoltageB || ''}
              onChange={(e) => handleInputChange('firstVoltageB', parseFloat(e.target.value))}
              disabled={!isEditing}
            />
            <Input
              type="number"
              step="0.01"
              value={formData.firstCurrentB || ''}
              onChange={(e) => handleInputChange('firstCurrentB', parseFloat(e.target.value))}
              disabled={!isEditing}
            />
            <Input
              type="number"
              step="0.001"
              value={formData.firstPowerFactorB || ''}
              onChange={(e) => handleInputChange('firstPowerFactorB', parseFloat(e.target.value))}
              disabled={!isEditing}
              placeholder="0.000-1.000"
            />
            <Input
              type="number"
              step="0.01"
              value={formData.firstKwB || ''}
              onChange={(e) => handleInputChange('firstKwB', parseFloat(e.target.value))}
              disabled={!isEditing}
            />
          </div>

          <h4 style={{ marginTop: '20px' }}>Second Inspection Readings</h4>
          
          <Input
            label="Second Inspection Date"
            type="date"
            value={formData.secondInspectionDate}
            onChange={(e) => handleInputChange('secondInspectionDate', e.target.value)}
            disabled={!isEditing}
            style={{ marginBottom: '15px' }}
          />
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '80px repeat(4, 1fr)', 
            gap: '10px',
            alignItems: 'center'
          }}>
            <div><strong>Phase</strong></div>
            <div><strong>Voltage (V)</strong></div>
            <div><strong>Current (A)</strong></div>
            <div><strong>Power Factor</strong></div>
            <div><strong>kW</strong></div>
            
            {/* Phase R */}
            <div style={{ fontWeight: '600', fontSize: '16px' }}>R</div>
            <Input
              type="number"
              step="0.01"
              value={formData.secondVoltageR || ''}
              onChange={(e) => handleInputChange('secondVoltageR', parseFloat(e.target.value))}
              disabled={!isEditing}
            />
            <Input
              type="number"
              step="0.01"
              value={formData.secondCurrentR || ''}
              onChange={(e) => handleInputChange('secondCurrentR', parseFloat(e.target.value))}
              disabled={!isEditing}
            />
            <Input
              type="number"
              step="0.001"
              value={formData.secondPowerFactorR || ''}
              onChange={(e) => handleInputChange('secondPowerFactorR', parseFloat(e.target.value))}
              disabled={!isEditing}
              placeholder="0.000-1.000"
            />
            <Input
              type="number"
              step="0.01"
              value={formData.secondKwR || ''}
              onChange={(e) => handleInputChange('secondKwR', parseFloat(e.target.value))}
              disabled={!isEditing}
            />
            
            {/* Phase Y */}
            <div style={{ fontWeight: '600', fontSize: '16px' }}>Y</div>
            <Input
              type="number"
              step="0.01"
              value={formData.secondVoltageY || ''}
              onChange={(e) => handleInputChange('secondVoltageY', parseFloat(e.target.value))}
              disabled={!isEditing}
            />
            <Input
              type="number"
              step="0.01"
              value={formData.secondCurrentY || ''}
              onChange={(e) => handleInputChange('secondCurrentY', parseFloat(e.target.value))}
              disabled={!isEditing}
            />
            <Input
              type="number"
              step="0.001"
              value={formData.secondPowerFactorY || ''}
              onChange={(e) => handleInputChange('secondPowerFactorY', parseFloat(e.target.value))}
              disabled={!isEditing}
              placeholder="0.000-1.000"
            />
            <Input
              type="number"
              step="0.01"
              value={formData.secondKwY || ''}
              onChange={(e) => handleInputChange('secondKwY', parseFloat(e.target.value))}
              disabled={!isEditing}
            />
            
            {/* Phase B */}
            <div style={{ fontWeight: '600', fontSize: '16px' }}>B</div>
            <Input
              type="number"
              step="0.01"
              value={formData.secondVoltageB || ''}
              onChange={(e) => handleInputChange('secondVoltageB', parseFloat(e.target.value))}
              disabled={!isEditing}
            />
            <Input
              type="number"
              step="0.01"
              value={formData.secondCurrentB || ''}
              onChange={(e) => handleInputChange('secondCurrentB', parseFloat(e.target.value))}
              disabled={!isEditing}
            />
            <Input
              type="number"
              step="0.001"
              value={formData.secondPowerFactorB || ''}
              onChange={(e) => handleInputChange('secondPowerFactorB', parseFloat(e.target.value))}
              disabled={!isEditing}
              placeholder="0.000-1.000"
            />
            <Input
              type="number"
              step="0.01"
              value={formData.secondKwB || ''}
              onChange={(e) => handleInputChange('secondKwB', parseFloat(e.target.value))}
              disabled={!isEditing}
            />
          </div>

          <h4 style={{ marginTop: '20px' }}>Notes & Remarks</h4>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              disabled={!isEditing}
              rows={4}
              style={{ 
                width: '100%', 
                padding: 8, 
                borderRadius: 6, 
                border: '1px solid #ccc', 
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Engineer Remarks</label>
            <textarea
              value={formData.engineerRemarks}
              onChange={(e) => handleInputChange('engineerRemarks', e.target.value)}
              disabled={!isEditing}
              rows={4}
              style={{ 
                width: '100%', 
                padding: 8, 
                borderRadius: 6, 
                border: '1px solid #ccc', 
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
