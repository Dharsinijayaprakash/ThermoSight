#!/usr/bin/env python3
"""
Clean YOLO Thermal Detector - No Special Characters
Simple detector that completely ignores low-confidence detections
"""

import os
import sys
import json
import cv2
import numpy as np
from pathlib import Path

class CleanThermalDetector:
    def __init__(self, 
                 model_path=None,
                 confidence_threshold=0.5):
        """
        Clean thermal detector
        
        Args:
            model_path: Path to YOLO model
            confidence_threshold: Minimum confidence to show detection
        """
        self.confidence_threshold = confidence_threshold
        
        # Load YOLO model
        self.model_path = self._find_model(model_path)
        self.model = None
        self.class_names = None
        
    def _find_model(self, provided_path):
        """Find YOLO model"""
        if provided_path and os.path.exists(provided_path):
            return provided_path
        
        search_paths = [
            "model/yolov8p2.pt",
            "model/yolov8n.pt", 
            "yolov8p2.pt",
            "yolov8n.pt"
        ]
        
        for path in search_paths:
            if os.path.exists(path):
                return path
        return "yolov8n.pt"
    
    def load_model(self):
        """Load YOLO model"""
        try:
            from ultralytics import YOLO
            import torch
            
            # PyTorch compatibility fix
            original_torch_load = torch.load
            def patched_torch_load(f, map_location=None, pickle_module=None, weights_only=None, **kwargs):
                if isinstance(f, str) and f.endswith('.pt'):
                    weights_only = False
                elif hasattr(f, 'name') and f.name.endswith('.pt'):
                    weights_only = False
                return original_torch_load(f, map_location=map_location, pickle_module=pickle_module, 
                                         weights_only=weights_only, **kwargs)
            torch.load = patched_torch_load
            
            print(f"Loading YOLO model: {self.model_path}")
            self.model = YOLO(self.model_path)
            
            # Set class names
            if "yolov8p2" in self.model_path or "runs/detect" in self.model_path:
                self.class_names = {
                    0: 'Faulty',
                    1: 'faulty_loose_joint', 
                    2: 'faulty_point_overload',
                    3: 'potential_faulty',
                    4: 'normal'
                }
                print("Using custom thermal model")
            else:
                self.class_names = self.model.names
                print("Using pretrained model")
            
            print(f"Model loaded successfully")
            print(f"Available classes: {list(self.class_names.values())}")
            return True
            
        except Exception as e:
            print(f"Error loading model: {e}")
            return False
    
    def _apply_nms_and_limit(self, detections, iou_threshold=0.2, max_detections=8):
        """
        Apply Non-Maximum Suppression to remove overlapping detections
        and limit to top N detections
        
        Args:
            iou_threshold: Lower = less aggressive NMS (keeps more detections)
            max_detections: Increased to show more confident detections
        """
        if len(detections) <= 1:
            return detections
        
        # Convert to format needed for NMS
        boxes = []
        scores = []
        for det in detections:
            x1, y1, x2, y2 = det['bbox']
            boxes.append([x1, y1, x2, y2])
            scores.append(det['confidence'])
        
        boxes = np.array(boxes, dtype=np.float32)
        scores = np.array(scores, dtype=np.float32)
        
        # Apply OpenCV NMS
        indices = cv2.dnn.NMSBoxes(
            boxes.tolist(), 
            scores.tolist(), 
            score_threshold=0.0,  # We already filtered by confidence
            nms_threshold=iou_threshold
        )
        
        # Get filtered detections
        filtered_detections = []
        if len(indices) > 0:
            # Flatten indices if needed
            if isinstance(indices[0], list):
                indices = [i[0] for i in indices]
            else:
                indices = indices.flatten()
            
            for i in indices:
                filtered_detections.append(detections[i])
        
        # Sort by confidence and limit to max_detections
        filtered_detections.sort(key=lambda x: x['confidence'], reverse=True)
        return filtered_detections[:max_detections]
    
    def detect(self, image_path):
        """Run detection and filter by confidence"""
        if self.model is None:
            if not self.load_model():
                return None, []
        
        print(f"\nYOLO Thermal Detection")
        print(f"=" * 40)
        print(f"Image: {os.path.basename(image_path)}")
        print(f"Model: {os.path.basename(self.model_path)}")
        print(f"Confidence threshold: {self.confidence_threshold:.2f}")
        
        # Run YOLO inference
        results = self.model(
            image_path, 
            conf=0.1,  # Use low threshold for YOLO, filter later
            save=False,
            verbose=False
        )
        
        # Parse results
        result = results[0]
        boxes = result.boxes
        
        valid_detections = []
        
        if boxes is not None and len(boxes) > 0:
            for i, box in enumerate(boxes):
                conf = float(box.conf[0].cpu().numpy())
                cls_id = int(box.cls[0].cpu().numpy())
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
                
                # Only include if confidence meets threshold
                if conf >= self.confidence_threshold:
                    class_name = self.class_names.get(cls_id, f"class_{cls_id}")
                    
                    # Ensure clean string values
                    clean_class_name = str(class_name).strip()
                    clean_conf = float(conf)
                    
                    detection = {
                        'id': len(valid_detections) + 1,
                        'confidence': clean_conf,
                        'class_id': int(cls_id),
                        'class_name': clean_class_name,
                        'bbox': [int(x1), int(y1), int(x2), int(y2)]
                    }
                    
                    valid_detections.append(detection)
        
        # Sort by confidence first
        valid_detections.sort(key=lambda x: x['confidence'], reverse=True)
        
        # Apply NMS to remove overlapping detections and limit to top 8
        final_detections = self._apply_nms_and_limit(valid_detections, iou_threshold=0.2, max_detections=8)
        
        # Re-assign IDs after filtering
        for i, det in enumerate(final_detections):
            det['id'] = i + 1
        
        # Create annotated image
        annotated_img = self._draw_detections(image_path, final_detections)
        
        # Print results
        print(f"\nDetection Results:")
        print(f"Raw detections (above threshold): {len(valid_detections)}")
        print(f"Final detections (after NMS + limit): {len(final_detections)}")
        
        if final_detections:
            print(f"\nTop {len(final_detections)} Detections:")
            for det in final_detections:
                print(f"  {det['id']}: {det['class_name']} - {det['confidence']:.3f} - {det['bbox']}")
        else:
            print(f"No detections above confidence threshold {self.confidence_threshold:.2f}")
        
        # Save results
        self._save_results(image_path, annotated_img, final_detections)
        
        return annotated_img, final_detections
        
        return annotated_img, valid_detections
    
    def _draw_detections(self, image_path, detections):
        """Draw detection boxes on image"""
        img = cv2.imread(image_path)
        if img is None:
            print(f"Could not load image: {image_path}")
            return None
        
        for det in detections:
            x1, y1, x2, y2 = det['bbox']
            conf = det['confidence']
            class_name = det['class_name']
            
            # Color based on class
            if 'faulty' in class_name.lower():
                color = (0, 0, 255)  # Red
            elif 'potential' in class_name.lower():
                color = (0, 165, 255)  # Orange
            else:
                color = (0, 255, 0)  # Green
            
            # Draw bounding box
            thickness = max(2, int(conf * 4))
            cv2.rectangle(img, (x1, y1), (x2, y2), color, thickness)
            
            # Label with clean formatting
            # Ensure confidence is a clean float value
            clean_conf = float(conf)
            label = "{}: {:.2f}".format(class_name, clean_conf)
            label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)[0]
            
            # Background for label
            cv2.rectangle(img, (x1, y1 - label_size[1] - 10), 
                         (x1 + label_size[0] + 10, y1), color, -1)
            
            # Text with clean ASCII encoding
            cv2.putText(img, label, (x1 + 5, y1 - 5),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        
        return img
    
    def _save_results(self, image_path, annotated_img, detections):
        """Save results"""
        output_dir = Path("clean_detection_results")
        output_dir.mkdir(exist_ok=True)
        
        base_name = Path(image_path).stem
        
        # Save image
        if annotated_img is not None:
            img_path = output_dir / f"{base_name}_clean_detected.jpg"
            cv2.imwrite(str(img_path), annotated_img)
            print(f"Image saved: {img_path}")
        
        # Save data
        results_data = {
            'image_path': image_path,
            'confidence_threshold': float(self.confidence_threshold),
            'detections': detections
        }
        
        json_path = output_dir / f"{base_name}_clean_detections.json"
        with open(json_path, 'w') as f:
            json.dump(results_data, f, indent=2)
        print(f"Data saved: {json_path}")


def main():
    if len(sys.argv) < 2:
        print("Usage: python clean_thermal_detector.py image.jpg [confidence_threshold]")
        print("Example: python clean_thermal_detector.py T1_faulty_011.jpg 0.7")
        sys.exit(1)
    
    image_path = sys.argv[1]
    confidence_threshold = float(sys.argv[2]) if len(sys.argv) > 2 else 0.5
    
    if not os.path.exists(image_path):
        print(f"Image not found: {image_path}")
        sys.exit(1)
    
    # Create detector
    detector = CleanThermalDetector(confidence_threshold=confidence_threshold)
    
    # Run detection
    annotated_img, detections = detector.detect(image_path)
    
    if annotated_img is not None:
        print(f"\nDetection completed successfully!")
        print(f"Results saved in 'clean_detection_results/' directory")
    else:
        print("Detection failed")

if __name__ == "__main__":
    main()