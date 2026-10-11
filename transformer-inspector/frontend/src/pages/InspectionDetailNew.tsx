// src/pages/InspectionDetailNew.tsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AnnotationCanvas from '../components/AnnotationCanvas';
import AnnotationToolbar from '../components/AnnotationToolbar';
import AnnotationLegend from '../components/AnnotationLegend';
import NotesSection from '../components/NotesSection';
import CommentsSection from '../components/CommentsSection';
import FileDrop from '../components/FileDrop';
import InspectionHistoryList from '../components/InspectionHistoryList';
import { useToast } from '../components/Toast';
import {
  getInspection,
  detectAnomalies,
  uploadInspectionImage,
  updateInspectionStatus,
  uploadAnnotatedImage,
  removeInspectionImage,
} from '../api/inspections';
import { getAnnotationsByInspection, saveAnnotation, approveAnnotation, rejectAnnotation, deleteAnnotation, exportFeedback, exportFeedbackCSV } from '../api/annotations';
import { uploadImage, listImages } from '../api/images';
import type { ThermalImage } from '../api/images';
import type { Inspection } from '../api/inspections';
import type { Annotation } from '../api/annotations';

export default function InspectionDetailNew() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();

  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [baselineImage, setBaselineImage] = useState<ThermalImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Annotation canvas state
  const [mode, setMode] = useState<'view' | 'edit' | 'draw'>('view');
  const [selectedClass, setSelectedClass] = useState('Faulty');
  const [isDetecting, setIsDetecting] = useState(false);
  
  // Image upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [removingImage, setRemovingImage] = useState(false);
  
  // Inspection completion state
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Canvas capture state
  const captureCanvasRef = useRef<(() => string | null) | null>(null);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [isSavingImage, setIsSavingImage] = useState(false);
  
  // Threshold modal state
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [threshold, setThreshold] = useState(50); // Default threshold value (0-100)
  
  // Feedback export state (FR3.3)
  const [isExportingFeedback, setIsExportingFeedback] = useState(false);
  
  // Load inspection and annotations
  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

  async function loadData() {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const [inspectionData, annotationsData] = await Promise.all([
        getInspection(id),
        getAnnotationsByInspection(id)
      ]);
      
      setInspection(inspectionData);
      setAnnotations(annotationsData);
      
      // Load baseline image for the transformer
      if (inspectionData.transformerId) {
        await loadBaselineImage(inspectionData.transformerId, inspectionData.weatherCondition);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }




  
  async function loadBaselineImage(transformerId: string, weatherCondition?: string | null) {
    try {
      const response = await listImages({ transformerId, type: 'BASELINE', page: 0, size: 10 });
      const baselineImages = response.content || [];
      
      // Try to find a baseline image matching the weather condition first
      let selectedBaseline = null;
      if (weatherCondition) {
        selectedBaseline = baselineImages.find(img => 
          img.envCondition === weatherCondition
        );
      }
      
      // If no matching weather condition, use the most recent baseline image
      if (!selectedBaseline && baselineImages.length > 0) {
        selectedBaseline = baselineImages.sort((a, b) => 
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        )[0];
      }
      
      setBaselineImage(selectedBaseline || null);
    } catch (e: any) {
      console.error('Failed to load baseline image:', e);
      setBaselineImage(null);
    }
  }

  async function handleDetectAnomalies() {
    if (!id) return;
    
    // Validate that inspection exists and has an image uploaded
    if (!inspection || !inspection.inspectionImageId) {
      alert('Please upload an inspection image before detecting anomalies.');
      return;
    }
    
    // Check if baseline image exists
    if (!baselineImage && !inspection.baselineImageUrl) {
      alert('No baseline image found for comparison. Please upload a baseline image for this transformer first.');
      return;
    }
    
    // Open threshold modal instead of directly calling detection
    setShowThresholdModal(true);
  }

  async function handleDetectWithThreshold() {
    if (!id) return;
    
    try {
      setIsDetecting(true);
      setShowThresholdModal(false);
      
      // Convert threshold from 0-100 to 0.0-1.0 range expected by backend
      const normalizedThreshold = threshold / 100;
      
      const result = await detectAnomalies(id, normalizedThreshold);
      
      // Refresh annotations, inspection data, and baseline image
      const [updatedAnnotations, updatedInspection] = await Promise.all([
        getAnnotationsByInspection(id),
        getInspection(id)
      ]);
      
      setAnnotations(updatedAnnotations);
      setInspection(updatedInspection);
      
      // Refresh baseline image as well
      if (updatedInspection.transformerId) {
        await loadBaselineImage(updatedInspection.transformerId, updatedInspection.weatherCondition);
      }
      
      toast.success('Detection Complete!', `Found ${result.detections?.length || 0} anomalies with threshold ${threshold}%`);
    } catch (e: any) {
      toast.error('Detection Failed', e?.message || 'Unknown error');
    } finally {
      setIsDetecting(false);
    }
  }

  async function handleAnnotationCreate(bbox: { x1: number; y1: number; x2: number; y2: number }) {
    if (!id) return;
    
    // Map className to classId (matches backend enum/constants)
    const getClassId = (className: string): number => {
      const classMap: Record<string, number> = {
        'Faulty': 1,
        'faulty_loose_joint': 2, 
        'faulty_point_overload': 3,
        'potential_faulty': 4,
      };
      return classMap[className] || 1;
    };
    
    try {
      const annotationRequest = {
        inspectionId: id,
        bbox: {
          x1: Math.round(bbox.x1),
          y1: Math.round(bbox.y1), 
          x2: Math.round(bbox.x2),
          y2: Math.round(bbox.y2),
        },
        classId: getClassId(selectedClass),
        className: selectedClass,
        confidence: 1.0,
        source: 'human' as const,
        userId: 'current-user@example.com', // TODO: Get from auth context
      };
      
      console.log('Creating annotation with request:', annotationRequest);
      
      await saveAnnotation(annotationRequest);
      
      await loadData();
      toast.success('Annotation Created', `Added ${selectedClass} annotation`);
    } catch (e: any) {
      console.error('Annotation creation error:', e);
      toast.error('Failed to Create Annotation', e?.message || 'Unknown error');
    }
  }

  async function handleAnnotationUpdate(annotation: Annotation) {
    // Map className to classId (matches backend enum/constants)
    const getClassId = (className: string): number => {
      const classMap: Record<string, number> = {
        'Faulty': 1,
        'faulty_loose_joint': 2, 
        'faulty_point_overload': 3,
        'potential_faulty': 4,
      };
      return classMap[className] || 1;
    };
    
    try {
      console.log('Updating annotation with ID:', annotation.id, 'for version creation');
      
      await saveAnnotation({
        id: annotation.id, // Include ID for version creation
        inspectionId: annotation.inspectionId,
        bbox: annotation.bbox,
        classId: getClassId(annotation.className),
        className: annotation.className,
        confidence: annotation.confidence,
        source: annotation.source,
        userId: 'current-user@example.com',
      });
      
      await loadData();
      toast.success('Annotation Updated', 'Changes saved successfully');
    } catch (e: any) {
      toast.error('Failed to Update Annotation', e?.message || 'Unknown error');
    }
  }

  async function handleAnnotationDelete(annotationId: string) {
    if (!confirm('Delete this annotation?')) return;
    
    try {
      await deleteAnnotation(annotationId, 'current-user@example.com');
      await loadData();
      toast.success('Annotation Deleted', 'The annotation has been removed');
    } catch (e: any) {
      toast.error('Failed to Delete Annotation', e?.message || 'Unknown error');
    }
  }

  async function handleUpdateComment(annotationId: string, comments: string) {
    try {
      // Find the annotation to update
      const annotation = annotations.find(a => a.id === annotationId);
      if (!annotation) {
        throw new Error('Annotation not found');
      }

      // Map className to classId
      const getClassId = (className: string): number => {
        const classMap: Record<string, number> = {
          'Faulty': 1,
          'faulty_loose_joint': 2,
          'faulty_point_overload': 3,
          'potential_faulty': 4,
        };
        return classMap[className] || 1;
      };

      // Update annotation with new comments
      await saveAnnotation({
        id: annotation.id,
        inspectionId: annotation.inspectionId,
        bbox: annotation.bbox,
        classId: getClassId(annotation.className),
        className: annotation.className,
        confidence: annotation.confidence,
        source: annotation.source,
        userId: 'current-user@example.com',
        comments: comments
      });

      await loadData();
      toast.success('Comment Updated', 'Your comment has been saved');
    } catch (e: any) {
      toast.error('Failed to Update Comment', e?.message || 'Unknown error');
      throw e;
    }
  }

  async function handleApprove(annotationId: string) {
    try {
      await approveAnnotation(annotationId, 'current-user@example.com');
      await loadData();
      toast.success('Annotation Approved', 'The detection has been verified');
    } catch (e: any) {
      toast.error('Failed to Approve', e?.message || 'Unknown error');
    }
  }

  async function handleReject(annotationId: string) {
    try {
      await rejectAnnotation(annotationId, 'current-user@example.com', 'User rejected this annotation');
      await loadData();
      toast.warning('Annotation Rejected', 'The detection has been marked as incorrect');
    } catch (e: any) {
      toast.error('Failed to Reject', e?.message || 'Unknown error');
    }
  }

  // Zoom control functions - will be set by canvas component
  const [zoomFunctions, setZoomFunctions] = useState<{
    zoomIn: () => void;
    zoomOut: () => void;
    resetView: () => void;
  } | null>(null);

  const handleZoomIn = () => {
    zoomFunctions?.zoomIn();
  };

  const handleZoomOut = () => {
    zoomFunctions?.zoomOut();
  };

  const handleResetView = () => {
    zoomFunctions?.resetView();
  };

  const handleZoomChange = (zoomIn: () => void, zoomOut: () => void, resetView: () => void) => {
    setZoomFunctions({ zoomIn, zoomOut, resetView });
  };

  async function handleImageUpload(file: File) {
    if (!inspection) return;
    
    try {
      setUploading(true);
      setUploadError(null);
      
      // Upload image to server
      const uploadedImage = await uploadImage({
        transformerId: inspection.transformerId,
        type: 'INSPECTION',
        uploader: inspection.inspectedBy || 'unknown',
        file,
        inspectionId: inspection.id,
      });
      
      // Link image to inspection
      await uploadInspectionImage(inspection.id, uploadedImage.id);
      
      // Reload inspection data
      await loadData();
      
      setSelectedFile(null);
      toast.success('Image Uploaded', 'You can now trigger anomaly detection');
    } catch (e: any) {
      setUploadError(e?.message || 'Upload failed');
      toast.error('Upload Failed', e?.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveImage() {
    if (!inspection) return;
    
    const hasAnnotations = annotations.length > 0;
    const confirmMessage = hasAnnotations 
      ? `Are you sure you want to remove the uploaded image?\n\nThis will permanently delete:\n• The current inspection image\n• All ${annotations.length} annotation${annotations.length > 1 ? 's' : ''}\n\nThis action cannot be undone.`
      : 'Are you sure you want to remove the uploaded image? You can upload a new one afterwards.';
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      setRemovingImage(true);
      
      // Remove image from inspection
      await removeInspectionImage(inspection.id);
      
      // Reload inspection data to reflect changes
      await loadData();
      
      toast.success('Image Removed', 'You can now upload a new image');
    } catch (e: any) {
      console.error('Error removing image:', e);
      toast.error('Failed to Remove Image', e?.message || 'Unknown error');
    } finally {
      setRemovingImage(false);
    }
  }

  const handleCaptureReady = (captureFunc: () => string | null) => {
    console.log('Capture function received:', typeof captureFunc);
    captureCanvasRef.current = captureFunc;
    setIsCanvasReady(true);
  };

  async function handleSaveAnnotatedImage() {
    console.log('handleSaveAnnotatedImage called');
    console.log('inspection:', inspection);
    console.log('captureCanvasRef.current:', captureCanvasRef.current);
    console.log('captureCanvas type:', typeof captureCanvasRef.current);
    
    if (!inspection) {
      toast.error('No Inspection', 'No inspection available');
      return;
    }
    
    if (!captureCanvasRef.current) {
      toast.warning('Not Ready', 'Canvas capture function not ready. Please wait for the image to load completely.');
      return;
    }
    
    if (typeof captureCanvasRef.current !== 'function') {
      toast.error('Error', 'Canvas capture is not a function. Please refresh the page and try again.');
      return;
    }
    
    try {
      setIsSavingImage(true);
      
      console.log('Calling captureCanvas function...');
      // Capture canvas as base64 data URL
      const dataUrl = captureCanvasRef.current();
      console.log('Capture result:', dataUrl ? 'Success' : 'Failed');
      
      if (!dataUrl) {
        toast.error('Capture Failed', 'Failed to capture annotated image. Please ensure the image is fully loaded.');
        return;
      }
      
      // Convert base64 to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      // Create file from blob
      const file = new File([blob], `annotated_${inspection.inspectionNumber}_${Date.now()}.png`, { type: 'image/png' });
      
      // Upload annotated image
      const uploadedImage = await uploadImage({
        transformerId: inspection.transformerId,
        type: 'INSPECTION',
        uploader: inspection.inspectedBy || 'system',
        file,
        inspectionId: inspection.id,
      });
      
      // Update inspection with annotated image
      await uploadAnnotatedImage(inspection.id, uploadedImage.id);
      
      // Reload data to show updated image
      await loadData();
      
      toast.success('Image Saved!', 'This annotated image will now appear on the transformer page');
    } catch (e: any) {
      toast.error('Save Failed', e?.message || 'Unknown error');
    } finally {
      setIsSavingImage(false);
    }
  }

  async function handleCompleteInspection() {
    if (!inspection) return;
    
    try {
      setIsCompleting(true);
      
      // Update inspection status to COMPLETED
      await updateInspectionStatus(inspection.id, 'COMPLETED');
      
      // Reload the inspection to get updated status
      const updatedInspection = await getInspection(inspection.id);
      setInspection(updatedInspection);
      
      // Show success toast
      toast.success('Inspection Completed!', 'You can now create a maintenance report.');
      
    } catch (e: any) {
      console.error('Completion error:', e);
      toast.error('Completion Failed', e?.message || 'Unknown error');
    } finally {
      setIsCompleting(false);
    }
  }
  
  // Navigate to maintenance record page
  function handleViewMaintenanceReport() {
    if (!inspection) return;
    nav(`/maintenance-records/inspection/${inspection.id}`);
  }

  /**
   * Export feedback and send to ML service for model fine-tuning (FR3.3)
   */
  async function handleExportFeedback() {
    if (!id) return;

    try {
      setIsExportingFeedback(true);

      // 1. Export feedback data (JSON format)
      const feedbackData = await exportFeedback(id);
      
      // 2. Download JSON file
      const jsonBlob = new Blob([JSON.stringify(feedbackData, null, 2)], { type: 'application/json' });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const jsonLink = document.createElement('a');
      jsonLink.href = jsonUrl;
      jsonLink.download = `feedback_${inspection?.inspectionNumber || id}.json`;
      document.body.appendChild(jsonLink);
      jsonLink.click();
      document.body.removeChild(jsonLink);
      URL.revokeObjectURL(jsonUrl);

      // 3. Download CSV file
      exportFeedbackCSV(id);

      // 4. Send to Flask ML service
      const mlServiceUrl = import.meta.env.VITE_ML_SERVICE_URL || 'http://localhost:5001';
      const response = await fetch(`${mlServiceUrl}/api/feedback/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      });

      if (!response.ok) {
        throw new Error(`ML service returned ${response.status}`);
      }

      const result = await response.json();
      
      toast.success('Feedback Exported!', 
        `AI: ${result.summary?.totalAiDetections || 0}, Human: ${result.summary?.totalHumanAnnotations || 0}, ` +
        `Approved: ${result.summary?.approved || 0}, Rejected: ${result.summary?.rejected || 0}`);
      
    } catch (e: any) {
      console.error('Feedback export error:', e);
      toast.warning('Partial Export', 'Files downloaded, but ML service connection failed. Check console for details.');
    } finally {
      setIsExportingFeedback(false);
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-message">Loading inspection...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-message">{error}</div>
        <button onClick={() => window.location.href = '/inspections'} className="primary-button">
          Back to Inspections
        </button>
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="page-container">
        <div className="error-message">Inspection not found</div>
        <button onClick={() => window.location.href = '/inspections'} className="primary-button">
          Back to Inspections
        </button>
      </div>
    );
  }

  // Use original image URL for editing annotations, fall back to current inspection image
  // Use data URI for placeholder to avoid external service dependency
  const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
  const imageUrl = inspection.originalInspectionImageUrl || inspection.inspectionImageUrl || PLACEHOLDER_IMAGE;

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        padding: '20px',
        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(30, 64, 175, 0.2)',
        border: 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={() => {
              // Force navigation with page refresh for reliability
              window.location.href = '/inspections';
            }} 
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: 'white',
              fontSize: '14px',
              cursor: 'pointer',
              padding: '8px 12px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
              backdropFilter: 'blur(10px)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            ← Back
          </button>
          <div>
            <h1 style={{ 
              margin: 0, 
              fontSize: '20px', 
              fontWeight: '600', 
              color: 'white' 
            }}>
              Inspection {inspection.inspectionNumber}
            </h1>
            <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', marginTop: '2px' }}>
              {inspection.transformerCode} • {inspection.weatherCondition || 'Weather N/A'}
            </div>
          </div>
        </div>
        <div style={{
          padding: '6px 12px',
          background: 'rgba(255, 255, 255, 0.9)',
          color: inspection.status === 'COMPLETED' ? '#166534' : inspection.status === 'IN_PROGRESS' ? '#92400e' : '#374151',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: '600',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          {inspection.status.replace('_', ' ')}
        </div>
      </div>

      {/* Main content - always accessible */}
      <>
          {/* Side-by-side Image Comparison */}
      {(baselineImage || inspection.baselineImageUrl || inspection.inspectionImageUrl || inspection.originalInspectionImageUrl) && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
            Thermal Image Comparison
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <ImageBox 
              title="Baseline" 
              imageUrl={baselineImage?.publicUrl || inspection.baselineImageUrl}
              timestamp={baselineImage?.uploadedAt}
            />
            <ImageBox 
              title="Inspection" 
              imageUrl={inspection.inspectionImageUrl || inspection.originalInspectionImageUrl}
              timestamp={inspection.inspectedAt}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'stretch' }}>
        {/* Left: Annotation Canvas */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <AnnotationToolbar
            mode={mode}
            onModeChange={setMode}
            selectedClass={selectedClass}
            onClassChange={setSelectedClass}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetView={handleResetView}
            onDetectAnomalies={handleDetectAnomalies}
            isDetecting={isDetecting}
          />

          {/* Image Upload Section */}
          {!inspection.inspectionImageId && (
            <div style={{
              marginBottom: '16px',
              padding: '20px',
              background: 'white',
              border: '2px dashed #d1d5db',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <div style={{ marginBottom: '16px', color: '#374151', fontWeight: '600', fontSize: '16px' }}>
                Upload Thermal Image
              </div>
              <div style={{ marginBottom: '16px', color: '#6b7280', fontSize: '14px' }}>
                Upload an inspection image to start annotation and detection
              </div>
              <FileDrop onFile={setSelectedFile} />
              {selectedFile && (
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>
                    {selectedFile.name}
                  </span>
                  <button
                    onClick={() => handleImageUpload(selectedFile)}
                    disabled={uploading}
                    style={{
                      background: uploading ? '#9ca3af' : '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px 24px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: uploading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {uploading ? 'Uploading...' : 'Upload Image'}
                  </button>
                </div>
              )}
              {uploadError && (
                <div style={{ marginTop: '12px', color: '#dc2626', fontSize: '14px' }}>
                  ❌ {uploadError}
                </div>
              )}
            </div>
          )}

          {/* Remove Image Section - Show when image is uploaded */}
          {inspection.inspectionImageId && (
            <div style={{
              marginBottom: '16px',
              padding: '16px',
              background: annotations.length > 0 ? '#fef2f2' : '#fef3c7',
              border: `1px solid ${annotations.length > 0 ? '#fca5a5' : '#fbbf24'}`,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ 
                  color: annotations.length > 0 ? '#dc2626' : '#92400e', 
                  fontWeight: '600', 
                  fontSize: '14px', 
                  marginBottom: '4px' 
                }}>
                  Inspection Image
                </div>
                <div style={{ 
                  color: annotations.length > 0 ? '#b91c1c' : '#a16207', 
                  fontSize: '13px' 
                }}>
                  {annotations.length > 0 
                    ? `Warning: Removing this image will delete ${annotations.length} annotation${annotations.length > 1 ? 's' : ''}.`
                    : 'Want to upload a different image? You can remove this one and upload a new one.'
                  }
                </div>
              </div>
              <button
                onClick={handleRemoveImage}
                disabled={removingImage}
                style={{
                  background: removingImage ? '#9ca3af' : '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: removingImage ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {removingImage ? (
                  <>
                    Removing...
                  </>
                ) : (
                  <>
                    Remove Image
                  </>
                )}
              </button>
            </div>
          )}

          <AnnotationCanvas
            imageUrl={imageUrl}
            annotations={annotations}
            mode={mode}
            selectedClass={selectedClass}
            onAnnotationCreate={handleAnnotationCreate}
            onAnnotationUpdate={handleAnnotationUpdate}
            onAnnotationDelete={handleAnnotationDelete}
            onCaptureReady={handleCaptureReady}
            onZoomChange={handleZoomChange}
          />

          {/* Quick Help */}
          <div style={{
            marginTop: '16px',
            padding: '10px 16px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#64748b'
          }}>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <span><strong>View:</strong> Drag to pan, scroll to zoom</span>
              <span><strong>Edit:</strong> Click to select, drag corners to resize</span>
              <span><strong>Draw:</strong> Click and drag to create</span>
            </div>
          </div>

          {/* Action Buttons Bar */}
          {inspection.status !== 'COMPLETED' && (
            <div style={{
              marginTop: '16px',
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              {/* Save Image Button */}
              {annotations.length > 0 && (
                <button
                  onClick={handleSaveAnnotatedImage}
                  disabled={isSavingImage || !inspection.inspectionImageId || !isCanvasReady}
                  title="Save the current image with annotations"
                  style={{
                    flex: '1 1 auto',
                    minWidth: '140px',
                    background: (isSavingImage || !isCanvasReady) ? '#94a3b8' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px 20px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: (isSavingImage || !inspection.inspectionImageId || !isCanvasReady) ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                    opacity: (!inspection.inspectionImageId || !isCanvasReady) ? 0.6 : 1,
                    transition: 'all 0.2s'
                  }}
                >
                  {isSavingImage ? 'Saving...' : !isCanvasReady ? 'Loading...' : 'Save Image'}
                </button>
              )}

              {/* Complete Inspection Button */}
              <button
                onClick={handleCompleteInspection}
                disabled={isCompleting || !inspection.inspectionImageId}
                title="Mark inspection as complete"
                style={{
                  flex: '1 1 auto',
                  minWidth: '140px',
                  background: isCompleting ? '#94a3b8' : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 20px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: isCompleting || !inspection.inspectionImageId ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
                  opacity: !inspection.inspectionImageId ? 0.6 : 1,
                  transition: 'all 0.2s'
                }}
              >
                {isCompleting ? 'Processing...' : 'Mark Complete'}
              </button>

              {/* Export Feedback Button */}
              {annotations.length > 0 && (
                <button
                  onClick={handleExportFeedback}
                  disabled={isExportingFeedback}
                  title="Export feedback for model fine-tuning"
                  style={{
                    flex: '1 1 auto',
                    minWidth: '140px',
                    background: isExportingFeedback ? '#94a3b8' : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px 20px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: isExportingFeedback ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                    transition: 'all 0.2s'
                  }}
                >
                  {isExportingFeedback ? 'Exporting...' : 'Finetune'}
                </button>
              )}
            </div>
          )}
          
          {/* Maintenance Report Button - Always visible */}
          <div style={{
            marginTop: '16px',
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={handleViewMaintenanceReport}
              title="View or create maintenance report for this inspection"
              style={{
                flex: '1 1 auto',
                minWidth: '200px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '14px 24px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              Maintenance Report
            </button>
          </div>

          {/* Comments Section */}
          <CommentsSection inspectionId={inspection.id} />
        </div>

        {/* Right: Sidebar Panel */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px',
          height: '100%'
        }}>
          {/* Fault Types Legend - Compact at top */}
          <div style={{ flexShrink: 0 }}>
            <AnnotationLegend layout="vertical" />
          </div>

          {/* Inspector Notes - Fixed compact card */}
          <div style={{ flexShrink: 0 }}>
            <NotesSection 
              inspectionId={inspection.id}
              initialNotes={inspection.notes || ''}
              onNotesUpdate={() => loadData()}
            />
          </div>

          {/* Annotations List - Fills remaining space with scroll */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: '200px',
            overflow: 'hidden'
          }}>
            <h2 style={{ 
              margin: '0 0 12px 0', 
              fontSize: '16px', 
              fontWeight: '600',
              color: '#1f2937',
              flexShrink: 0
            }}>
              Annotations ({annotations.length})
            </h2>

            {annotations.length === 0 ? (
              <div style={{ 
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center', 
                padding: '24px 16px', 
                color: '#6b7280',
                fontSize: '13px',
                background: '#f9fafb',
                borderRadius: '8px'
              }}>
                No annotations yet. Click "Detect Anomalies" or draw manually.
              </div>
            ) : (
              /* Scrollable Annotations Container */
              <div style={{ 
                flex: 1,
                overflowY: 'auto', 
                overflowX: 'hidden',
                paddingRight: '4px',
                scrollbarWidth: 'thin',
                scrollbarColor: '#cbd5e1 #f1f5f9'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {annotations.map((ann) => (
                    <AnnotationCard
                      key={ann.id}
                      annotation={ann}
                      onApprove={() => handleApprove(ann.id)}
                      onReject={() => handleReject(ann.id)}
                      onDelete={() => handleAnnotationDelete(ann.id)}
                      onUpdateComment={handleUpdateComment}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Inspection Completed Status */}
          {inspection.status === 'COMPLETED' && (
            <div style={{
              flexShrink: 0,
              background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
              border: '1px solid #10b981'
            }}>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '600', color: '#059669' }}>
                Inspection Completed
              </h3>
              <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px' }}>
                This inspection has been marked as complete.
              </p>
              <button
                onClick={() => nav(`/transformers/${inspection.transformerId}`)}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(59, 130, 246, 0.2)'
                }}
              >
                View Transformer
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Threshold Modal */}
      {showThresholdModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            minWidth: '400px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
          }}>
            <h3 style={{ 
              margin: '0 0 16px 0', 
              fontSize: '20px', 
              fontWeight: '600',
              color: '#1f2937'
            }}>
              Configure Anomaly Detection
            </h3>
            
            <div style={{ marginBottom: '20px' }}>
              <p style={{ 
                fontSize: '14px', 
                color: '#6b7280', 
                marginBottom: '16px' 
              }}>
                Set the detection threshold.
                Lower values detect more anomalies, higher values are more selective.
              </p>
              
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#374151',
                marginBottom: '8px'
              }}>
                Threshold Value (0-100)
              </label>
              
              <input
                type="range"
                min="0"
                max="100"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  background: `linear-gradient(to right, #ef4444 0%, #eab308 50%, #22c55e 100%)`,
                  outline: 'none',
                  marginBottom: '12px'
                }}
              />
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#6b7280',
                marginBottom: '8px'
              }}>
                <span>More Sensitive</span>
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: '700', 
                  color: '#1f2937' 
                }}>
                  {threshold}%
                </span>
                <span>More Selective</span>
              </div>
              
              <div style={{ 
                fontSize: '13px', 
                color: '#374151',
                padding: '8px 12px',
                backgroundColor: '#f3f4f6',
                borderRadius: '6px'
              }}>
                <strong>Tip:</strong> Start with 50% for balanced detection, 
                adjust based on results.
              </div>
            </div>
            
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end' 
            }}>
              <button
                onClick={() => setShowThresholdModal(false)}
                disabled={isDetecting}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  background: 'white',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: isDetecting ? 'not-allowed' : 'pointer',
                  opacity: isDetecting ? 0.6 : 1
                }}
              >
                Cancel
              </button>
              
              <button
                onClick={handleDetectWithThreshold}
                disabled={isDetecting}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  background: isDetecting 
                    ? '#9ca3af' 
                    : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: isDetecting ? 'not-allowed' : 'pointer',
                  boxShadow: isDetecting ? 'none' : '0 2px 8px rgba(59, 130, 246, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {isDetecting ? (
                  <>
                    Detecting...
                  </>
                ) : (
                  <>
                    Start Detection
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

          {/* Inspection History List */}
          {inspection && (
            <InspectionHistoryList inspectionId={inspection.id} />
          )}
        </>
    </div>
  );
}

interface AnnotationCardProps {
  annotation: Annotation;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  onUpdateComment: (annotationId: string, comments: string) => void;
}

function AnnotationCard({ annotation, onApprove, onReject, onDelete, onUpdateComment }: AnnotationCardProps) {
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState(annotation.comments || '');
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  const CLASS_COLORS: Record<string, string> = {
    'Faulty': '#ef4444',           // RED
    'faulty_loose_joint': '#22c55e', // GREEN  
    'faulty_point_overload': '#3b82f6', // BLUE
    'potential_faulty': '#f59e0b',  // ORANGE/YELLOW
  };

  const color = CLASS_COLORS[annotation.className] || '#6b7280';
  
  const handleSaveComment = async () => {
    setIsSavingComment(true);
    try {
      await onUpdateComment(annotation.id, commentText);
      setShowCommentInput(false);
    } catch (error) {
      console.error('Failed to save comment:', error);
    } finally {
      setIsSavingComment(false);
    }
  };

  return (
    <div style={{
      border: `1px solid ${color}40`,
      borderLeft: `3px solid ${color}`,
      borderRadius: '8px',
      padding: '10px 12px',
      background: 'white',
      transition: 'all 0.2s ease',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    }}>
      {/* Compact Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Box Number Badge */}
          {annotation.boxNumber && (
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: color,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 'bold',
              flexShrink: 0
            }}>
              {annotation.boxNumber}
            </div>
          )}
          
          <div style={{ fontWeight: '600', fontSize: '12px', color: color }}>
            {annotation.className.replace(/_/g, ' ')}
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', color: '#9ca3af' }}>
            {annotation.source === 'ai' ? 'AI' : 'Manual'} • {Math.round(annotation.confidence * 100)}%
          </span>
          <button
            onClick={() => setShowDetails(!showDetails)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              color: '#9ca3af',
              padding: '2px'
            }}
          >
            {showDetails ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Status Badge Row */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
        {annotation.actionType && annotation.actionType !== 'created' && (
          <span style={{ 
            fontSize: '10px', 
            padding: '2px 6px',
            borderRadius: '4px',
            fontWeight: '600',
            background: annotation.actionType === 'approved' ? '#dcfce7' : 
                       annotation.actionType === 'rejected' ? '#fee2e2' : '#dbeafe',
            color: annotation.actionType === 'approved' ? '#16a34a' : 
                   annotation.actionType === 'rejected' ? '#dc2626' : '#3b82f6'
          }}>
            {annotation.actionType === 'approved' ? '✓ Approved' : 
             annotation.actionType === 'rejected' ? '✗ Rejected' : 
             `✎ ${annotation.actionType}`}
          </span>
        )}
        <span style={{ fontSize: '10px', color: '#9ca3af' }}>v{annotation.version}</span>
      </div>

      {/* Expandable Details */}
      {showDetails && (
        <div style={{
          fontSize: '10px',
          color: '#6b7280',
          background: '#f9fafb',
          padding: '8px',
          borderRadius: '4px',
          marginBottom: '8px',
          lineHeight: '1.5'
        }}>
          <div style={{ marginBottom: '4px' }}>
            Coords: ({Math.round(annotation.bbox.x1)}, {Math.round(annotation.bbox.y1)}) → 
            ({Math.round(annotation.bbox.x2)}, {Math.round(annotation.bbox.y2)})
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>By: {annotation.createdBy || 'System'}</span>
            <span>
              {new Date(annotation.createdAt).toLocaleString('en-US', { 
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
              })}
            </span>
          </div>
          {annotation.modifiedBy && (
            <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #e5e7eb' }}>
              Modified by {annotation.modifiedBy}
            </div>
          )}
        </div>
      )}

      {/* Comment Preview (always visible if exists) */}
      {annotation.comments && !showCommentInput && (
        <div style={{
          background: '#fefce8',
          padding: '6px 8px',
          borderRadius: '4px',
          marginBottom: '8px',
          fontSize: '11px',
          color: '#713f12',
          lineHeight: '1.4'
        }}>
          {annotation.comments.length > 60 ? annotation.comments.slice(0, 60) + '...' : annotation.comments}
        </div>
      )}

      {/* Action Buttons - Compact */}
      {annotation.source === 'ai' && annotation.actionType === 'created' && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
          <button
            onClick={onApprove}
            style={{
              flex: 1,
              padding: '5px 8px',
              border: 'none',
              borderRadius: '5px',
              background: '#22c55e',
              color: 'white',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            ✓ Approve
          </button>
          <button
            onClick={onReject}
            style={{
              flex: 1,
              padding: '5px 8px',
              border: 'none',
              borderRadius: '5px',
              background: '#ef4444',
              color: 'white',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            ✗ Reject
          </button>
        </div>
      )}

      {annotation.source === 'human' && (
        <button
          onClick={onDelete}
          style={{
            width: '100%',
            padding: '5px 8px',
            border: 'none',
            borderRadius: '5px',
            background: '#fee2e2',
            color: '#dc2626',
            fontSize: '11px',
            fontWeight: '600',
            cursor: 'pointer',
            marginBottom: '6px'
          }}
        >
          Delete
        </button>
      )}

      {/* Comment Input - Compact */}
      {showCommentInput ? (
        <div style={{ paddingTop: '6px', borderTop: '1px solid #f3f4f6' }}>
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add note..."
            style={{
              width: '100%',
              minHeight: '45px',
              padding: '6px',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              fontSize: '11px',
              fontFamily: 'inherit',
              resize: 'vertical',
              marginBottom: '6px'
            }}
          />
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={handleSaveComment}
              disabled={isSavingComment}
              style={{
                flex: 1,
                padding: '4px',
                border: 'none',
                borderRadius: '4px',
                background: isSavingComment ? '#9ca3af' : '#3b82f6',
                color: 'white',
                fontSize: '10px',
                fontWeight: '600',
                cursor: isSavingComment ? 'not-allowed' : 'pointer'
              }}
            >
              {isSavingComment ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => {
                setShowCommentInput(false);
                setCommentText(annotation.comments || '');
              }}
              disabled={isSavingComment}
              style={{
                flex: 1,
                padding: '4px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                background: 'white',
                color: '#6b7280',
                fontSize: '10px',
                fontWeight: '600',
                cursor: isSavingComment ? 'not-allowed' : 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowCommentInput(true)}
          style={{
            width: '100%',
            padding: '4px',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            background: '#f9fafb',
            color: '#6b7280',
            fontSize: '10px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          {annotation.comments ? 'Edit Note' : 'Add Note'}
        </button>
      )}
    </div>
  );
}

// ImageBox component for side-by-side comparison
function ImageBox({ title, imageUrl, timestamp }: { title: string; imageUrl: string | null | undefined; timestamp: string | null | undefined }) {
  return (
    <div style={{ 
      background: '#fff', 
      border: '1px solid #e5e7eb', 
      borderRadius: 12, 
      padding: 16,
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 12 
      }}>
        <div style={{ 
          fontWeight: 600, 
          fontSize: '16px',
          color: '#1f2937'
        }}>
          {title}
        </div>
        {timestamp && (
          <div style={{ 
            fontSize: 12, 
            color: '#6b7280',
            background: '#f3f4f6',
            padding: '4px 8px',
            borderRadius: '4px'
          }}>
            {new Date(timestamp).toLocaleString()}
          </div>
        )}
      </div>
      <div style={{ 
        height: 280, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
        borderRadius: 8,
        border: '2px solid #334155'
      }}>
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={`${title} thermal image`}
            style={{ 
              maxHeight: '100%', 
              maxWidth: '100%', 
              objectFit: 'contain',
              borderRadius: '4px'
            }} 
          />
        ) : (
          <div style={{ 
            color: '#94a3b8',
            textAlign: 'center',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px', color: '#64748b' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
            </div>
            <div>No {title.toLowerCase()} image</div>
          </div>
        )}
      </div>
    </div>
  );
}
