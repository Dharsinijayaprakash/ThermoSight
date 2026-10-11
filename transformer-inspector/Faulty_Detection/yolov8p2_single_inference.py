#!/usr/bin/env python3
"""
Single Image YOLOv8p2 Inference
Quick inference on a single image using YOLOv8p2 model
"""

import os
import sys
from pathlib import Path

def run_yolov8p2_inference(image_path):
    """Run YOLOv8p2 inference on a single image"""
    
    print(f"🔍 Single Image YOLOv8p2 Inference")
    print("=" * 40)
    print(f"📷 Image: {image_path}")
    
    # Check if image exists
    if not os.path.exists(image_path):
        print(f"❌ Image not found: {image_path}")
        return
    
    # Look for YOLOv8p2 trained models
    model_paths = [
        "/home/jaliya/model/runs/detect/yolov8p2_train/weights/best.pt",
        "/home/jaliya/model/runs/detect/yolov8p2_train/weights/last.pt",
        "/home/jaliya/model/runs/detect/yolov8p2_high_performance/weights/best.pt",
        "/home/jaliya/model/runs/detect/yolov8p2_quick/weights/best.pt",
        "/home/jaliya/model/runs/detect/train4/weights/best.pt",
        "/home/jaliya/model/runs/detect/train4/weights/last.pt",
        "yolov8s.pt"  # Fallback to pretrained YOLOv8s (p2 typically uses small model)
    ]
    
    model_path = None
    for path in model_paths:
        if os.path.exists(path):
            model_path = path
            break
    
    if model_path is None:
        print(f"❌ No YOLOv8p2 model found! Searched in:")
        for path in model_paths:
            print(f"   - {path}")
        return
    
    print(f"📦 Model: {model_path}")
    
    try:
        # Import required packages
        from ultralytics import YOLO
        import torch
        import cv2
        import numpy as np
        
        # Apply PyTorch compatibility fix
        original_torch_load = torch.load
        def patched_torch_load(f, map_location=None, pickle_module=None, weights_only=None, **kwargs):
            if isinstance(f, str) and f.endswith('.pt'):
                weights_only = False
            elif hasattr(f, 'name') and f.name.endswith('.pt'):
                weights_only = False
            return original_torch_load(f, map_location=map_location, pickle_module=pickle_module, 
                                      weights_only=weights_only, **kwargs)
        torch.load = patched_torch_load
        
        # Load YOLOv8p2 model
        print("🔄 Loading YOLOv8p2 model...")
        model = YOLO(model_path)
        
        # Check if this is a custom trained model or pretrained
        if "runs/detect" in model_path:
            print("🎯 Using custom trained YOLOv8p2 model")
            class_names = ['Faulty', 'faulty_loose_joint', 'faulty_point_overload', 'potential_faulty']
        else:
            print("🎯 Using pretrained YOLOv8p2 model (COCO dataset)")
            class_names = model.names
        
        # Create output directory
        output_dir = Path("yolov8p2_inference")
        output_dir.mkdir(exist_ok=True)
        
        # Run inference
        print("🎯 Running YOLOv8p2 inference...")
        results = model(image_path, conf=0.25, save=False)  # Don't save automatically
        
        # Parse results
        result = results[0]
        boxes = result.boxes
        
        print(f"\n✅ Inference completed!")
        
        if boxes is not None and len(boxes) > 0:
            # First, collect all detections with their details
            detections = []
            for i, box in enumerate(boxes):
                conf = box.conf[0].cpu().numpy()
                cls = int(box.cls[0].cpu().numpy())
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
                
                detections.append({
                    'index': i,
                    'confidence': conf,
                    'class_id': cls,
                    'bbox': [x1, y1, x2, y2]
                })
            
            # Sort by confidence (descending)
            detections.sort(key=lambda x: x['confidence'], reverse=True)
            
            # Smart filtering: check if top 3 are close together
            if len(detections) > 3:
                # Calculate distances between top 3 detections
                top_3 = detections[:3]
                distances = []
                
                for i in range(len(top_3)):
                    for j in range(i + 1, len(top_3)):
                        # Calculate center points
                        x1_center = (top_3[i]['bbox'][0] + top_3[i]['bbox'][2]) / 2
                        y1_center = (top_3[i]['bbox'][1] + top_3[i]['bbox'][3]) / 2
                        x2_center = (top_3[j]['bbox'][0] + top_3[j]['bbox'][2]) / 2
                        y2_center = (top_3[j]['bbox'][1] + top_3[j]['bbox'][3]) / 2
                        
                        # Calculate Euclidean distance
                        distance = ((x1_center - x2_center)**2 + (y1_center - y2_center)**2)**0.5
                        distances.append(distance)
                
                # Check if all top 3 are close (more generous thresholds for clustering detection)
                avg_distance = sum(distances) / len(distances) if distances else 0
                max_distance = max(distances) if distances else 0
                
                print(f"   📏 Distance analysis: avg={avg_distance:.1f}, max={max_distance:.1f}")
                
                if avg_distance < 100 and max_distance < 150:
                    print(f"🎯 Found {len(detections)} detections, showing top 3 (clustered close together):")
                    final_detections = detections[:3]
                else:
                    print(f"🎯 Found {len(detections)} detections (spread apart, showing all):")
                    final_detections = detections
            else:
                print(f"🎯 Found {len(detections)} detections:")
                final_detections = detections
            
            # Display the filtered detections
            for i, detection in enumerate(final_detections, 1):
                conf = detection['confidence']
                cls = detection['class_id']
                x1, y1, x2, y2 = detection['bbox']
                
                # Get class name
                if isinstance(class_names, dict):
                    class_name = class_names.get(cls, f'Class_{cls}')
                else:
                    class_name = class_names[cls] if cls < len(class_names) else f'Class_{cls}'
                
                # Calculate box dimensions
                width = x2 - x1
                height = y2 - y1
                
                print(f"   🔸 Detection {i}:")
                print(f"      📋 Class: {class_name}")
                print(f"      📊 Confidence: {conf:.3f}")
                print(f"      📍 Bounding Box: [{x1}, {y1}, {x2}, {y2}]")
                print(f"      📏 Size: {width}x{height} pixels")
            
            # Create custom annotated image with only filtered detections
            img = cv2.imread(image_path)
            if img is not None:
                # Define colors for each class (BGR format for OpenCV)
                colors = {
                    0: (0, 0, 255),      # Red for Faulty
                    1: (0, 255, 0),      # Green for faulty_loose_joint  
                    2: (255, 0, 0),      # Blue for faulty_point_overload
                    3: (0, 255, 255)     # Yellow for potential_faulty
                }
                
                # Draw bounding boxes for filtered detections only
                for detection in final_detections:
                    x1, y1, x2, y2 = detection['bbox']
                    cls = detection['class_id']
                    conf = detection['confidence']
                    
                    # Get class name
                    if isinstance(class_names, dict):
                        class_name = class_names.get(cls, f'Class_{cls}')
                    else:
                        class_name = class_names[cls] if cls < len(class_names) else f'Class_{cls}'
                    
                    # Get color for this class
                    color = colors.get(cls, (255, 255, 255))  # Default white
                    
                    # Draw bounding box
                    cv2.rectangle(img, (x1, y1), (x2, y2), color, 3)
                    
                    # Create label
                    label = f"{class_name}: {conf:.3f}"
                    
                    # Get text size for background
                    (text_width, text_height), baseline = cv2.getTextSize(
                        label, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)
                    
                    # Draw label background
                    cv2.rectangle(img, 
                                (x1, y1 - text_height - 10),
                                (x1 + text_width, y1), 
                                color, -1)
                    
                    # Draw label text
                    cv2.putText(img, label, (x1, y1 - 5),
                              cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
                
                # Save the custom annotated image
                output_path = output_dir / "predict" / f"annotated_{Path(image_path).name}"
                output_path.parent.mkdir(parents=True, exist_ok=True)
                cv2.imwrite(str(output_path), img)
                print(f"\n💾 Filtered annotated image saved to: {output_path}")
            else:
                print(f"\n❌ Could not load image for annotation: {image_path}")
                
        else:
            print(f"   ℹ️  No detections found")
        
        print(f"\n💾 Results saved to: {output_dir}/predict/")
        print("🖼️  Check the output image with bounding boxes!")
        
        # Display inference speed
        if hasattr(result, 'speed'):
            speed = result.speed
            total_time = sum(speed.values()) if isinstance(speed, dict) else speed
            print(f"⚡ Inference speed: {total_time:.1f}ms")
        
        # Additional model info
        print(f"\n📊 Model Information:")
        print(f"   🏷️  Model type: YOLOv8p2")
        print(f"   📏 Input size: {result.orig_shape}")
        if hasattr(model, 'model') and hasattr(model.model, 'yaml'):
            yaml_info = model.model.yaml
            if 'nc' in yaml_info:
                print(f"   🎯 Number of classes: {yaml_info['nc']}")
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("💡 Make sure ultralytics and torch are installed:")
        print("   pip install ultralytics torch torchvision")
    except Exception as e:
        print(f"❌ Error during YOLOv8p2 inference: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python yolov8p2_single_inference.py <image_path>")
        print("Example: python yolov8p2_single_inference.py '/path/to/image.jpg'")
        sys.exit(1)
    
    image_path = sys.argv[1]
    run_yolov8p2_inference(image_path)