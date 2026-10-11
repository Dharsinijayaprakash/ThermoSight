// src/pages/MaintenanceRecordPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MaintenanceRecordForm from '../components/MaintenanceRecordForm';
import {
  getMaintenanceRecord,
  getMaintenanceRecordByInspection,
  createMaintenanceRecord,
  updateMaintenanceRecord,
  syncAnomalies,
  type MaintenanceRecord,
  type UpdateMaintenanceRecordRequest
} from '../api/maintenanceRecords';
import { getInspection, type Inspection } from '../api/inspections';

export default function MaintenanceRecordPage() {
  const { inspectionId, recordId } = useParams();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<MaintenanceRecord | null>(null);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [saving, setSaving] = useState(false);

  // Load maintenance record
  useEffect(() => {
    loadRecord();
  }, [inspectionId, recordId]);

  async function loadRecord() {
    try {
      setLoading(true);
      setError(null);

      if (recordId) {
        // Load existing record by ID
        // First sync anomalies to get latest annotations
        const syncedRecord = await syncAnomalies(recordId);
        setRecord(syncedRecord);
        
        // Load associated inspection
        const inspectionData = await getInspection(syncedRecord.inspectionId);
        setInspection(inspectionData);
      } else if (inspectionId) {
        // Try to load existing record for this inspection
        try {
          const recordData = await getMaintenanceRecordByInspection(inspectionId);
          
          // Sync anomalies to get latest annotations
          const syncedRecord = await syncAnomalies(recordData.id);
          setRecord(syncedRecord);
          
          // Redirect to record URL
          nav(`/maintenance-records/${syncedRecord.id}`, { replace: true });
        } catch (e: any) {
          // No record exists, create one
          // Check for 404 status or "not found" message
          if (e?.message?.includes('404') || e?.message?.toLowerCase().includes('not found')) {
            console.log('No existing maintenance record found, creating new one...');
            await handleCreateRecord(inspectionId);
          } else {
            throw e;
          }
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load maintenance record');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateRecord(inspId: string) {
    try {
      setLoading(true);
      console.log('Creating new maintenance record for inspection:', inspId);
      
      // Load inspection first
      const inspectionData = await getInspection(inspId);
      setInspection(inspectionData);
      console.log('Inspection loaded:', inspectionData.inspectionNumber);

      // Create maintenance record
      const newRecord = await createMaintenanceRecord({
        inspectionId: inspId,
        createdBy: 'engineer' // TODO: Get from auth context
      });
      
      console.log('Maintenance record created successfully:', newRecord.recordNumber);
      setRecord(newRecord);
      
      // Redirect to record URL
      nav(`/maintenance-records/${newRecord.id}`, { replace: true });
    } catch (e: any) {
      console.error('Failed to create maintenance record:', e);
      setError(e?.message || 'Failed to create maintenance record');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(updates: UpdateMaintenanceRecordRequest) {
    if (!record) return;

    try {
      setSaving(true);
      setError(null);

      console.log('Saving maintenance record with data:', JSON.stringify(updates, null, 2));
      const updated = await updateMaintenanceRecord(record.id, updates);
      console.log('Save successful, updated record:', updated);
      
      setRecord(updated);
      
      alert('Maintenance record saved successfully!');
    } catch (e: any) {
      console.error('Save error:', e);
      
      // Try to extract detailed error message from the API response
      let errorMsg = 'Failed to save maintenance record';
      let fieldError = '';
      
      // Check for structured error response from our GlobalExceptionHandler
      if (e?.response?.data) {
        const errorData = e.response.data;
        if (errorData.message) {
          errorMsg = errorData.message;
        }
        if (errorData.details?.field) {
          fieldError = `\n\nProblem field: ${errorData.details.field}`;
        }
        if (errorData.details && typeof errorData.details === 'object') {
          // Validation errors with multiple fields
          const fieldErrors = Object.entries(errorData.details)
            .filter(([key]) => key !== 'field')
            .map(([field, msg]) => `${field}: ${msg}`)
            .join('\n');
          if (fieldErrors) {
            fieldError = `\n\nField errors:\n${fieldErrors}`;
          }
        }
      } else if (e?.message) {
        errorMsg = e.message;
      }
      
      console.error('Detailed error:', errorMsg, fieldError);
      setError(errorMsg + fieldError);
      
      // Show user-friendly error message
      alert('Failed to save: ' + errorMsg + fieldError);
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadPDF() {
    if (!record) return;

    try {
      // Create a new window for PDF generation
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow pop-ups to download PDF');
        return;
      }

      // Get inspection image URL
      const imageUrl = inspection?.inspectionImageUrl || record.thermalImageUrl;

      // Generate PDF HTML content
      const pdfContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Maintenance Record - ${record.recordNumber}</title>
  <style>
    @media print {
      @page { 
        size: A4;
        margin: 15mm;
      }
      body { 
        margin: 0;
        padding: 0;
      }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
    }
    
    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #333;
      max-width: 210mm;
      margin: 0 auto;
      padding: 10mm;
      background: white;
    }
    
    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 15px;
    }
    
    .header h1 {
      margin: 0 0 5px 0;
      font-size: 24pt;
      color: #1e40af;
    }
    
    .header h2 {
      margin: 0;
      font-size: 14pt;
      color: #64748b;
      font-weight: normal;
    }
    
    .image-section {
      text-align: center;
      margin: 20px 0;
      padding: 15px;
      background: #f8fafc;
      border-radius: 8px;
      border: 2px solid #e2e8f0;
    }
    
    .image-section img {
      max-width: 100%;
      height: auto;
      max-height: 300px;
      border-radius: 6px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    .image-caption {
      margin-top: 10px;
      font-size: 10pt;
      color: #64748b;
      font-style: italic;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 25px;
      background: #f1f5f9;
      padding: 15px;
      border-radius: 8px;
    }
    
    .info-item {
      padding: 8px;
    }
    
    .info-label {
      font-weight: bold;
      color: #475569;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .info-value {
      margin-top: 4px;
      font-size: 11pt;
      color: #1e293b;
    }
    
    .section {
      margin-bottom: 25px;
    }
    
    .section-title {
      font-size: 14pt;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 2px solid #3b82f6;
    }
    
    .field-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 15px;
    }
    
    .field-grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 15px;
    }
    
    .field {
      border: 1px solid #cbd5e1;
      padding: 10px;
      border-radius: 4px;
      background: white;
    }
    
    .field-label {
      font-size: 9pt;
      color: #64748b;
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .field-value {
      font-size: 11pt;
      color: #1e293b;
      min-height: 18px;
    }
    
    .readings-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    
    .readings-table th {
      background: #3b82f6;
      color: white;
      padding: 10px;
      text-align: left;
      font-size: 10pt;
      font-weight: 600;
    }
    
    .readings-table td {
      border: 1px solid #cbd5e1;
      padding: 8px;
      font-size: 10pt;
    }
    
    .readings-table tr:nth-child(even) {
      background: #f8fafc;
    }
    
    .textarea-field {
      border: 1px solid #cbd5e1;
      padding: 12px;
      border-radius: 4px;
      background: white;
      margin-top: 8px;
    }
    
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      font-size: 9pt;
      color: #64748b;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 10pt;
      font-weight: bold;
    }
    
    .status-draft {
      background: #fef3c7;
      color: #92400e;
    }
    
    .status-finalized {
      background: #d1fae5;
      color: #065f46;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <h1>MAINTENANCE RECORD</h1>
    <h2>Transformer Thermal Inspection Report</h2>
  </div>
  
  <!-- Record Information -->
  <div class="info-grid">
    <div class="info-item">
      <div class="info-label">Record Number</div>
      <div class="info-value">${record.recordNumber}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Transformer</div>
      <div class="info-value">${record.transformerCode}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Status</div>
      <div class="info-value">
        <span class="status-badge status-${record.status === 'FINALIZED' ? 'finalized' : 'draft'}">
          ${record.status}
        </span>
      </div>
    </div>
    <div class="info-item">
      <div class="info-label">Inspection Date</div>
      <div class="info-value">${record.inspectionDate || 'N/A'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Weather Condition</div>
      <div class="info-value">${record.weatherCondition || 'N/A'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Anomalies Detected</div>
      <div class="info-value">${record.anomalyCount}</div>
    </div>
  </div>
  
  <!-- Thermal Inspection Image -->
  ${imageUrl ? `
  <div class="image-section">
    <img src="${imageUrl}" alt="Thermal Inspection Image" />
    <div class="image-caption">Thermal Inspection Image - ${record.inspectionDate || 'Date N/A'}</div>
  </div>
  ` : ''}
  
  <!-- Gang Composition & Inspection Details -->
  <div class="section">
    <div class="section-title">Gang Composition & Inspection Details</div>
    
    <div class="field-grid">
      <div class="field">
        <div class="field-label">Date of Inspection</div>
        <div class="field-value">${record.dateOfInspection || ''}</div>
      </div>
      <div class="field">
        <div class="field-label">Start Time</div>
        <div class="field-value">${record.startTime || ''}</div>
      </div>
      <div class="field">
        <div class="field-label">Completion Time</div>
        <div class="field-value">${record.completionTime || ''}</div>
      </div>
      <div class="field">
        <div class="field-label">Supervised By</div>
        <div class="field-value">${record.supervisedBy || ''}</div>
      </div>
    </div>
    
    <h4 style="margin: 15px 0 10px 0; color: #475569;">Gang Members</h4>
    <div class="field-grid">
      <div class="field">
        <div class="field-label">Technician I</div>
        <div class="field-value">${record.gangTech1 || ''}</div>
      </div>
      <div class="field">
        <div class="field-label">Technician II</div>
        <div class="field-value">${record.gangTech2 || ''}</div>
      </div>
      <div class="field">
        <div class="field-label">Technician III</div>
        <div class="field-value">${record.gangTech3 || ''}</div>
      </div>
      <div class="field">
        <div class="field-label">Helpers</div>
        <div class="field-value">${record.gangHelpers || ''}</div>
      </div>
    </div>
    
    <h4 style="margin: 15px 0 10px 0; color: #475569;">Signatures</h4>
    <div class="field-grid">
      <div class="field">
        <div class="field-label">Inspected By</div>
        <div class="field-value">${record.inspectedBy || ''}</div>
      </div>
      <div class="field">
        <div class="field-label">Inspected Date</div>
        <div class="field-value">${record.inspectedDate || ''}</div>
      </div>
      <div class="field">
        <div class="field-label">Rectified By</div>
        <div class="field-value">${record.rectifiedBy || ''}</div>
      </div>
      <div class="field">
        <div class="field-label">Rectified Date</div>
        <div class="field-value">${record.rectifiedDate || ''}</div>
      </div>
      <div class="field">
        <div class="field-label">CSS Inspector</div>
        <div class="field-value">${record.cssInspector || ''}</div>
      </div>
      <div class="field">
        <div class="field-label">CSS Inspector Date</div>
        <div class="field-value">${record.cssInspectorDate || ''}</div>
      </div>
    </div>
  </div>
  
  <!-- Page Break for second page -->
  <div class="page-break"></div>
  
  <!-- Transformer Information -->
  <div class="section">
    <div class="section-title">Transformer Information</div>
    
    <div class="field-grid-3">
      <div class="field">
        <div class="field-label">Branch</div>
        <div class="field-value">${record.branch || ''}</div>
      </div>
      <div class="field">
        <div class="field-label">Transformer No</div>
        <div class="field-value">${record.transformerNo || ''}</div>
      </div>
      <div class="field">
        <div class="field-label">Pole No</div>
        <div class="field-value">${record.poleNo || ''}</div>
      </div>
    </div>
    
    <h4 style="margin: 15px 0 10px 0; color: #475569;">Baseline Thermal Readings</h4>
    <div class="field-grid-3">
      <div class="field">
        <div class="field-label">Baseline Right (°C)</div>
        <div class="field-value">${record.baselineRight || ''}</div>
      </div>
      <div class="field">
        <div class="field-label">Baseline Left (°C)</div>
        <div class="field-value">${record.baselineLeft || ''}</div>
      </div>
      <div class="field">
        <div class="field-label">Baseline Front (°C)</div>
        <div class="field-value">${record.baselineFront || ''}</div>
      </div>
    </div>
    
    <div class="field-grid-3">
      <div class="field">
        <div class="field-label">Load Growth (kVA)</div>
        <div class="field-value">${record.loadGrowthKva || ''}</div>
      </div>
      <div class="field">
        <div class="field-label">Baseline Condition</div>
        <div class="field-value">${record.baselineCondition || ''}</div>
      </div>
      <div class="field">
        <div class="field-label">Transformer Status</div>
        <div class="field-value">${record.transformerStatus || ''}</div>
      </div>
      <div class="field">
        <div class="field-label">Transformer Type</div>
        <div class="field-value">${record.transformerType || ''}</div>
      </div>
      <div class="field">
        <div class="field-label">Meter Serial No</div>
        <div class="field-value">${record.meterSerialNo || ''}</div>
      </div>
      <div class="field">
        <div class="field-label">Meter Maker</div>
        <div class="field-value">${record.meterMaker || ''}</div>
      </div>
    </div>
  </div>
  
  <!-- Electrical Readings -->
  <div class="section">
    <div class="section-title">First Inspection Readings</div>
    <table class="readings-table">
      <thead>
        <tr>
          <th>Phase</th>
          <th>Voltage (V)</th>
          <th>Current (A)</th>
          <th>Power Factor</th>
          <th>kW</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>R</strong></td>
          <td>${record.firstVoltageR || '-'}</td>
          <td>${record.firstCurrentR || '-'}</td>
          <td>${record.firstPowerFactorR || '-'}</td>
          <td>${record.firstKwR || '-'}</td>
        </tr>
        <tr>
          <td><strong>Y</strong></td>
          <td>${record.firstVoltageY || '-'}</td>
          <td>${record.firstCurrentY || '-'}</td>
          <td>${record.firstPowerFactorY || '-'}</td>
          <td>${record.firstKwY || '-'}</td>
        </tr>
        <tr>
          <td><strong>B</strong></td>
          <td>${record.firstVoltageB || '-'}</td>
          <td>${record.firstCurrentB || '-'}</td>
          <td>${record.firstPowerFactorB || '-'}</td>
          <td>${record.firstKwB || '-'}</td>
        </tr>
      </tbody>
    </table>
  </div>
  
  <div class="section">
    <div class="section-title">Second Inspection Readings</div>
    <div class="field">
      <div class="field-label">Second Inspection Date</div>
      <div class="field-value">${record.secondInspectionDate || ''}</div>
    </div>
    <table class="readings-table">
      <thead>
        <tr>
          <th>Phase</th>
          <th>Voltage (V)</th>
          <th>Current (A)</th>
          <th>Power Factor</th>
          <th>kW</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>R</strong></td>
          <td>${record.secondVoltageR || '-'}</td>
          <td>${record.secondCurrentR || '-'}</td>
          <td>${record.secondPowerFactorR || '-'}</td>
          <td>${record.secondKwR || '-'}</td>
        </tr>
        <tr>
          <td><strong>Y</strong></td>
          <td>${record.secondVoltageY || '-'}</td>
          <td>${record.secondCurrentY || '-'}</td>
          <td>${record.secondPowerFactorY || '-'}</td>
          <td>${record.secondKwY || '-'}</td>
        </tr>
        <tr>
          <td><strong>B</strong></td>
          <td>${record.secondVoltageB || '-'}</td>
          <td>${record.secondCurrentB || '-'}</td>
          <td>${record.secondPowerFactorB || '-'}</td>
          <td>${record.secondKwB || '-'}</td>
        </tr>
      </tbody>
    </table>
  </div>
  
  <!-- Notes & Remarks -->
  <div class="section">
    <div class="section-title">Notes & Remarks</div>
    
    <h4 style="margin: 10px 0; color: #475569;">Notes</h4>
    <div class="textarea-field">
      ${record.notes || 'No notes provided.'}
    </div>
    
    <h4 style="margin: 15px 0 10px 0; color: #475569;">Engineer Remarks</h4>
    <div class="textarea-field">
      ${record.engineerRemarks || 'No remarks provided.'}
    </div>
  </div>
  
  <!-- Anomalies Section -->
  ${record.anomalies && record.anomalies.length > 0 ? `
  <div class="section">
    <div class="section-title">Detected Anomalies (${record.anomalyCount})</div>
    <table class="readings-table">
      <thead>
        <tr>
          <th>Box #</th>
          <th>Classification</th>
          <th>Confidence</th>
          <th>Source</th>
          <th>Location (x1, y1, x2, y2)</th>
        </tr>
      </thead>
      <tbody>
        ${[...record.anomalies].sort((a, b) => (a.boxNumber || 0) - (b.boxNumber || 0)).map((anomaly, idx) => `
        <tr>
          <td>${anomaly.boxNumber || idx + 1}</td>
          <td>${anomaly.className}</td>
          <td>${anomaly.confidence ? (anomaly.confidence * 100).toFixed(1) + '%' : 'N/A'}</td>
          <td>${anomaly.source}</td>
          <td>(${anomaly.bboxX1}, ${anomaly.bboxY1}, ${anomaly.bboxX2}, ${anomaly.bboxY2})</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}
  
  <!-- Footer -->
  <div class="footer">
    <p>Generated on ${new Date().toLocaleString()} | TransX Transformer Maintenance Platform</p>
    <p style="margin-top: 5px; font-size: 8pt;">This is a computer-generated document. No signature is required.</p>
  </div>
  
  <script>
    // Auto-print when page loads
    window.onload = function() {
      window.print();
    };
    
    // Close window after printing or canceling
    window.onafterprint = function() {
      window.close();
    };
  </script>
</body>
</html>
      `;

      // Write content to new window and trigger print
      printWindow.document.write(pdfContent);
      printWindow.document.close();
      
    } catch (e: any) {
      console.error('PDF generation error:', e);
      alert('Failed to generate PDF: ' + (e?.message || 'Unknown error'));
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  if (error && !record) {
    return (
      <div style={{ padding: '40px' }}>
        <div style={{ 
          background: '#f8d7da', 
          color: '#721c24', 
          padding: '15px', 
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <strong>Error:</strong> {error}
        </div>
        <button
          onClick={() => nav(-1)}
          style={{
            padding: '10px 20px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!record) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>No maintenance record found</h2>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div>
          <button
            onClick={() => nav(`/inspections/${record.inspectionId}`)}
            style={{
              padding: '8px 16px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            ← Back to Inspection
          </button>
          <h1 style={{ display: 'inline', marginLeft: '10px' }}>
            Maintenance Record
          </h1>
        </div>
        
        {inspection && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', color: '#666' }}>
              Inspection: {inspection.inspectionNumber}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              Transformer: {inspection.transformerCode}
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ 
          background: '#fff3cd', 
          color: '#856404', 
          padding: '12px', 
          borderRadius: '6px',
          marginBottom: '20px',
          border: '1px solid #ffeaa7'
        }}>
          <strong>Warning:</strong> {error}
        </div>
      )}

      {/* Saving Indicator */}
      {saving && (
        <div style={{ 
          background: '#d1ecf1', 
          color: '#0c5460', 
          padding: '12px', 
          borderRadius: '6px',
          marginBottom: '20px',
          border: '1px solid #bee5eb'
        }}>
          Saving changes...
        </div>
      )}

      {/* Form */}
      <div style={{ 
        background: 'white', 
        borderRadius: '8px', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <MaintenanceRecordForm
          record={record}
          onSave={handleSave}
          onDownloadPDF={handleDownloadPDF}
          inspectionImageUrl={inspection?.inspectionImageUrl || record.thermalImageUrl}
        />
      </div>

      {/* Anomalies Section */}
      {record.anomalies && record.anomalies.length > 0 && (
        <div style={{ 
          marginTop: '30px',
          background: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          padding: '20px'
        }}>
          <h3 style={{ marginTop: 0 }}>Detected Anomalies ({record.anomalyCount})</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Box #</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Class</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Confidence</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Source</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Location (BBox)</th>
                </tr>
              </thead>
              <tbody>
                {[...record.anomalies].sort((a, b) => (a.boxNumber || 0) - (b.boxNumber || 0)).map((anomaly, idx) => (
                  <tr key={anomaly.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '12px' }}>{anomaly.boxNumber || idx + 1}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: anomaly.className.includes('faulty') ? '#f8d7da' : '#fff3cd',
                        color: anomaly.className.includes('faulty') ? '#721c24' : '#856404',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {anomaly.className}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      {anomaly.confidence ? `${(anomaly.confidence * 100).toFixed(1)}%` : 'N/A'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: anomaly.source === 'ai' ? '#d1ecf1' : '#d4edda',
                        color: anomaly.source === 'ai' ? '#0c5460' : '#155724',
                        fontSize: '12px'
                      }}>
                        {anomaly.source}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>
                      ({anomaly.bboxX1}, {anomaly.bboxY1}) - ({anomaly.bboxX2}, {anomaly.bboxY2})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
