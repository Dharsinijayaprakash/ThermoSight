// src/components/AnnotationCanvas.tsx
import { useEffect, useRef, useState, useCallback, Fragment } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Transformer, Text, Circle } from 'react-konva';
import type { Annotation } from '../api/annotations';

interface AnnotationCanvasProps {
  imageUrl: string;
  annotations: Annotation[];
  onAnnotationUpdate?: (annotation: Annotation) => void;
  onAnnotationCreate?: (bbox: { x1: number; y1: number; x2: number; y2: number }) => void;
  onAnnotationDelete?: (annotationId: string) => void;
  mode?: 'view' | 'edit' | 'draw';
  selectedClass?: string;
  onCaptureReady?: (captureFunction: () => string | null) => void;
  onZoomChange?: (zoomIn: () => void, zoomOut: () => void, resetView: () => void) => void;
}

const CLASS_COLORS: Record<string, string> = {
  'Faulty': '#ef4444',
  'faulty_loose_joint': '#22c55e',
  'faulty_point_overload': '#3b82f6',
  'potential_faulty': '#eab308',
};

export default function AnnotationCanvas({
  imageUrl,
  annotations,
  onAnnotationUpdate,
  onAnnotationCreate,
  onAnnotationDelete,
  mode = 'view',
  selectedClass = 'Faulty',
  onCaptureReady,
  onZoomChange
}: AnnotationCanvasProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [newBox, setNewBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);

  // Load image and calculate initial scale
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
      
      // Calculate scale to fit image in canvas
      const stageWidth = 800;
      const stageHeight = 600;
      const scaleX = stageWidth / img.width;
      const scaleY = stageHeight / img.height;
      const fitScale = Math.min(scaleX, scaleY, 1); // Don't scale up small images
      
      // Center the image
      const centerX = (stageWidth - img.width * fitScale) / 2;
      const centerY = (stageHeight - img.height * fitScale) / 2;
      
      setScale(fitScale);
      setStagePos({ x: centerX, y: centerY });
    };
    img.onerror = () => console.error('Failed to load image');
    img.src = imageUrl;
  }, [imageUrl]);

    // Update transformer when selection changes
  useEffect(() => {
    if (mode === 'edit' && selectedId) {
      const node = stageRef.current?.findOne(`#${selectedId}`);
      if (node && transformerRef.current) {
        transformerRef.current.nodes([node]);
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
    }
  }, [selectedId, mode]);

  // Create stable capture function
  const captureCanvas = useCallback(() => {
    if (!stageRef.current) {
      console.error('Stage ref is not available');
      return null;
    }
    try {
      console.log('Capturing canvas with stage:', stageRef.current);
      // Capture the stage as image data URL
      const dataURL = stageRef.current.toDataURL({
        pixelRatio: 1,
        mimeType: 'image/png',
      });
      console.log('Canvas captured successfully, data URL length:', dataURL.length);
      return dataURL;
    } catch (error) {
      console.error('Failed to capture canvas:', error);
      return null;
    }
  }, []);

  // Zoom control functions
  const zoomIn = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    
    const scaleBy = 1.2;
    const oldScale = stage.scaleX();
    const newScale = Math.min(3, oldScale * scaleBy);
    
    const stageCenter = {
      x: stage.width() / 2,
      y: stage.height() / 2
    };
    
    const mousePointTo = {
      x: (stageCenter.x - stage.x()) / oldScale,
      y: (stageCenter.y - stage.y()) / oldScale,
    };
    
    const newPos = {
      x: stageCenter.x - mousePointTo.x * newScale,
      y: stageCenter.y - mousePointTo.y * newScale,
    };
    
    setScale(newScale);
    setStagePos(newPos);
  }, []);
  
  const zoomOut = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    
    const scaleBy = 1.2;
    const oldScale = stage.scaleX();
    const newScale = Math.max(0.5, oldScale / scaleBy);
    
    const stageCenter = {
      x: stage.width() / 2,
      y: stage.height() / 2
    };
    
    const mousePointTo = {
      x: (stageCenter.x - stage.x()) / oldScale,
      y: (stageCenter.y - stage.y()) / oldScale,
    };
    
    const newPos = {
      x: stageCenter.x - mousePointTo.x * newScale,
      y: stageCenter.y - mousePointTo.y * newScale,
    };
    
    setScale(newScale);
    setStagePos(newPos);
  }, []);
  
  const resetView = useCallback(() => {
    if (!image) return;
    
    // Recalculate fit scale
    const stageWidth = 800;
    const stageHeight = 600;
    const scaleX = stageWidth / image.width;
    const scaleY = stageHeight / image.height;
    const fitScale = Math.min(scaleX, scaleY, 1);
    
    // Center the image
    const centerX = (stageWidth - image.width * fitScale) / 2;
    const centerY = (stageHeight - image.height * fitScale) / 2;
    
    setScale(fitScale);
    setStagePos({ x: centerX, y: centerY });
  }, [image]);

  // Expose capture function to parent component when stage is ready
  useEffect(() => {
    if (onCaptureReady && image && stageRef.current) {
      console.log('Setting up capture function');
      onCaptureReady(captureCanvas);
    }
  }, [onCaptureReady, captureCanvas, image]);

  // Expose zoom functions to parent component - use ref to prevent infinite loops
  const zoomFunctionsRef = useRef({ zoomIn, zoomOut, resetView });
  
  // Update ref when functions change
  useEffect(() => {
    zoomFunctionsRef.current = { zoomIn, zoomOut, resetView };
  }, [zoomIn, zoomOut, resetView]);
  
  // Only call onZoomChange once on mount
  const hasCalledZoomChange = useRef(false);
  useEffect(() => {
    if (onZoomChange && !hasCalledZoomChange.current) {
      hasCalledZoomChange.current = true;
      // Wrap functions to always use latest from ref
      onZoomChange(
        () => zoomFunctionsRef.current.zoomIn(),
        () => zoomFunctionsRef.current.zoomOut(),
        () => zoomFunctionsRef.current.resetView()
      );
    }
  }, [onZoomChange]);

  const handleMouseDown = (e: any) => {
    if (mode !== 'draw') return;
    
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    const x = (pos.x - stagePos.x) / scale;
    const y = (pos.y - stagePos.y) / scale;

    setIsDrawing(true);
    setNewBox({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing || !newBox || mode !== 'draw') return;

    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    const x = (pos.x - stagePos.x) / scale;
    const y = (pos.y - stagePos.y) / scale;

    setNewBox({
      ...newBox,
      width: x - newBox.x,
      height: y - newBox.y,
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !newBox || mode !== 'draw') return;

    setIsDrawing(false);

    // Only create if box is big enough
    if (Math.abs(newBox.width) > 10 && Math.abs(newBox.height) > 10) {
      const x1 = Math.min(newBox.x, newBox.x + newBox.width);
      const y1 = Math.min(newBox.y, newBox.y + newBox.height);
      const x2 = Math.max(newBox.x, newBox.x + newBox.width);
      const y2 = Math.max(newBox.y, newBox.y + newBox.height);

      onAnnotationCreate?.({ x1, y1, x2, y2 });
    }

    setNewBox(null);
  };

  const handleBoxClick = (annotationId: string) => {
    if (mode === 'edit') {
      setSelectedId(selectedId === annotationId ? null : annotationId);
    }
  };

  const handleBoxDragEnd = (annotation: Annotation, e: any) => {
    if (mode !== 'edit') return;

    const node = e.target;
    const width = annotation.bbox.x2 - annotation.bbox.x1;
    const height = annotation.bbox.y2 - annotation.bbox.y1;

    onAnnotationUpdate?.({
      ...annotation,
      bbox: {
        x1: node.x(),
        y1: node.y(),
        x2: node.x() + width,
        y2: node.y() + height,
      }
    });
  };

  const handleBoxTransform = (annotation: Annotation, e: any) => {
    if (mode !== 'edit') return;

    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale
    node.scaleX(1);
    node.scaleY(1);

    onAnnotationUpdate?.({
      ...annotation,
      bbox: {
        x1: node.x(),
        y1: node.y(),
        x2: node.x() + node.width() * scaleX,
        y2: node.y() + node.height() * scaleY,
      }
    });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Delete' && selectedId && mode === 'edit') {
      onAnnotationDelete?.(selectedId);
      setSelectedId(null);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, mode]);

  const handleWheel = (e: any) => {
    e.evt.preventDefault();

    const scaleBy = 1.1;
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clampedScale = Math.max(0.5, Math.min(3, newScale));

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };

    setScale(clampedScale);
    setStagePos(newPos);
  };

  const stageWidth = 800;
  const stageHeight = 600;

  return (
    <div style={{ position: 'relative', border: '2px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
      <Stage
        ref={stageRef}
        width={stageWidth}
        height={stageHeight}
        scaleX={scale}
        scaleY={scale}
        x={stagePos.x}
        y={stagePos.y}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: mode === 'draw' ? 'crosshair' : 'default' }}
      >
        <Layer>
          {image && <KonvaImage image={image} />}

          {/* Existing annotations */}
          {annotations.map((annotation) => {
            const { x1, y1, x2, y2 } = annotation.bbox;
            const width = x2 - x1;
            const height = y2 - y1;
            const color = CLASS_COLORS[annotation.className] || '#ef4444';
            const boxNumber = annotation.boxNumber || '?';

            return (
              <Fragment key={annotation.id}>
                {/* Main bounding box */}
                <Rect
                  id={annotation.id}
                  x={x1}
                  y={y1}
                  width={width}
                  height={height}
                  stroke={color}
                  strokeWidth={3}
                  fill={selectedId === annotation.id ? `${color}33` : 'transparent'}
                  draggable={mode === 'edit'}
                  onClick={() => handleBoxClick(annotation.id)}
                  onTap={() => handleBoxClick(annotation.id)}
                  onDragEnd={(e) => handleBoxDragEnd(annotation, e)}
                  onTransformEnd={(e) => handleBoxTransform(annotation, e)}
                />
                
                {/* Box number label with background circle */}
                <Circle
                  x={x1 + 15}
                  y={y1 + 15}
                  radius={12}
                  fill={color}
                  stroke="white"
                  strokeWidth={1}
                />
                
                {/* Box number text */}
                <Text
                  x={x1 + 15}
                  y={y1 + 15}
                  text={boxNumber.toString()}
                  fontSize={10}
                  fontWeight="bold"
                  fill="white"
                  align="center"
                  verticalAlign="middle"
                  offsetX={4} // Half the estimated text width for centering
                  offsetY={5} // Half the font size for vertical centering
                />
              </Fragment>
            );
          })}

          {/* Drawing new box */}
          {newBox && (
            <Rect
              x={newBox.x}
              y={newBox.y}
              width={newBox.width}
              height={newBox.height}
              stroke={CLASS_COLORS[selectedClass] || '#ef4444'}
              strokeWidth={2}
              dash={[5, 5]}
              fill="transparent"
            />
          )}

          {/* Transformer for editing */}
          {mode === 'edit' && <Transformer ref={transformerRef} />}
        </Layer>
      </Stage>

      {/* Controls overlay */}
      <div style={{ 
        position: 'absolute', 
        bottom: '10px', 
        right: '10px', 
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '8px',
        borderRadius: '6px',
        fontSize: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div>Zoom: {Math.round(scale * 100)}%</div>
        {mode === 'edit' && selectedId && (
          <div style={{ color: '#ef4444', marginTop: '4px' }}>Press Delete to remove</div>
        )}
      </div>
    </div>
  );
}
