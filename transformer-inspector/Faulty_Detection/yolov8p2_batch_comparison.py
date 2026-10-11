#!/usr/bin/env python3
"""
YOLOv8p2 Batch Inference and Ground Truth Comparison Script
This script processes multiple images through the YOLOv8p2 model and compares 
predictions with ground truth annotations, providing detailed metrics and visualizations.
"""

import os
import sys
import cv2
import torch
import numpy as np
from pathlib import Path
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from collections import defaultdict
import json
from datetime import datetime

# Add patch for PyTorch compatibility
def patch_torch_load():
    original_load = torch.load
    def patched_load(f, map_location=None, pickle_module=None, weights_only=None, **kwargs):
        return original_load(f, map_location=map_location, pickle_module=pickle_module, 
                           weights_only=False, **kwargs)
    torch.load = patched_load

# Apply patch
patch_torch_load()

# Import ultralytics after patching
from ultralytics import YOLO

class YOLOComparison:
    def __init__(self, model_path, dataset_path):
        self.model_path = model_path
        self.dataset_path = Path(dataset_path)
        self.model = YOLO(model_path)
        
        # Class names from data.yaml
        self.class_names = ['Faulty', 'faulty_loose_joint', 'faulty_point_overload', 'potential_faulty']
        
        # Color map for different classes
        self.colors = {
            0: (255, 0, 0),      # Red for Faulty
            1: (0, 255, 0),      # Green for faulty_loose_joint
            2: (0, 0, 255),      # Blue for faulty_point_overload
            3: (255, 255, 0)     # Yellow for potential_faulty
        }
        
        self.results = {
            'total_images': 0,
            'total_gt_objects': 0,
            'total_pred_objects': 0,
            'per_class_metrics': {},
            'per_image_results': []
        }
        
    def parse_yolo_label(self, label_path, img_width, img_height):
        """Parse YOLO format label file"""
        bboxes = []
        
        if not os.path.exists(label_path):
            return bboxes
            
        with open(label_path, 'r') as f:
            for line in f:
                parts = line.strip().split()
                if len(parts) >= 5:
                    class_id = int(parts[0])
                    x_center = float(parts[1])
                    y_center = float(parts[2])
                    width = float(parts[3])
                    height = float(parts[4])
                    
                    # Convert from normalized coordinates to pixel coordinates
                    x_center_px = x_center * img_width
                    y_center_px = y_center * img_height
                    width_px = width * img_width
                    height_px = height * img_height
                    
                    # Convert to x1, y1, x2, y2 format
                    x1 = x_center_px - width_px / 2
                    y1 = y_center_px - height_px / 2
                    x2 = x_center_px + width_px / 2
                    y2 = y_center_px + height_px / 2
                    
                    bboxes.append({
                        'class_id': class_id,
                        'bbox': [x1, y1, x2, y2],
                        'confidence': 1.0  # Ground truth has confidence 1.0
                    })
        
        return bboxes
    
    def calculate_iou(self, box1, box2):
        """Calculate Intersection over Union (IoU) of two bounding boxes"""
        x1_1, y1_1, x2_1, y2_1 = box1
        x1_2, y1_2, x2_2, y2_2 = box2
        
        # Calculate intersection
        x1_i = max(x1_1, x1_2)
        y1_i = max(y1_1, y1_2)
        x2_i = min(x2_1, x2_2)
        y2_i = min(y2_1, y2_2)
        
        if x2_i <= x1_i or y2_i <= y1_i:
            return 0.0
        
        intersection = (x2_i - x1_i) * (y2_i - y1_i)
        
        # Calculate areas
        area1 = (x2_1 - x1_1) * (y2_1 - y1_1)
        area2 = (x2_2 - x1_2) * (y2_2 - y1_2)
        
        # Calculate union
        union = area1 + area2 - intersection
        
        if union == 0:
            return 0.0
        
        return intersection / union
    
    def match_predictions_to_gt(self, pred_boxes, gt_boxes, iou_threshold=0.5):
        """Match predictions to ground truth boxes using IoU threshold"""
        matches = []
        used_gt = set()
        used_pred = set()
        
        # Sort predictions by confidence (descending)
        pred_boxes_sorted = sorted(enumerate(pred_boxes), 
                                 key=lambda x: x[1]['confidence'], reverse=True)
        
        for pred_idx, pred_box in pred_boxes_sorted:
            if pred_idx in used_pred:
                continue
                
            best_iou = 0
            best_gt_idx = -1
            
            for gt_idx, gt_box in enumerate(gt_boxes):
                if gt_idx in used_gt:
                    continue
                
                # Only match boxes of the same class
                if pred_box['class_id'] == gt_box['class_id']:
                    iou = self.calculate_iou(pred_box['bbox'], gt_box['bbox'])
                    if iou > best_iou and iou >= iou_threshold:
                        best_iou = iou
                        best_gt_idx = gt_idx
            
            if best_gt_idx != -1:
                matches.append({
                    'pred_idx': pred_idx,
                    'gt_idx': best_gt_idx,
                    'iou': best_iou,
                    'class_id': pred_box['class_id']
                })
                used_pred.add(pred_idx)
                used_gt.add(best_gt_idx)
        
        return matches, used_pred, used_gt
    
    def process_single_image(self, image_path, confidence_threshold=0.25):
        """Process a single image and compare with ground truth"""
        image_path = Path(image_path)
        label_path = self.dataset_path / 'labels' / 'test' / (image_path.stem + '.txt')
        
        # Load image
        img = cv2.imread(str(image_path))
        if img is None:
            print(f"Warning: Could not load image {image_path}")
            return None
        
        img_height, img_width = img.shape[:2]
        
        # Get ground truth
        gt_boxes = self.parse_yolo_label(label_path, img_width, img_height)
        
        # Get predictions
        results = self.model(str(image_path), conf=confidence_threshold)
        pred_boxes = []
        
        if len(results) > 0 and results[0].boxes is not None:
            boxes = results[0].boxes
            for i in range(len(boxes)):
                x1, y1, x2, y2 = boxes.xyxy[i].cpu().numpy()
                confidence = boxes.conf[i].cpu().numpy()
                class_id = int(boxes.cls[i].cpu().numpy())
                
                pred_boxes.append({
                    'class_id': class_id,
                    'bbox': [x1, y1, x2, y2],
                    'confidence': float(confidence)
                })
        
        # Match predictions to ground truth
        matches, used_pred, used_gt = self.match_predictions_to_gt(pred_boxes, gt_boxes)
        
        # Calculate metrics for this image
        true_positives = len(matches)
        false_positives = len(pred_boxes) - len(used_pred)
        false_negatives = len(gt_boxes) - len(used_gt)
        
        image_result = {
            'image_name': image_path.name,
            'gt_boxes': gt_boxes,
            'pred_boxes': pred_boxes,
            'matches': matches,
            'metrics': {
                'true_positives': true_positives,
                'false_positives': false_positives,
                'false_negatives': false_negatives,
                'precision': true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0,
                'recall': true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 0
            }
        }
        
        return image_result
    
    def visualize_comparison(self, image_result, save_path=None):
        """Visualize predictions vs ground truth for a single image"""
        image_path = self.dataset_path / 'images' / 'test' / image_result['image_name']
        img = cv2.imread(str(image_path))
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(20, 10))
        
        # Ground Truth
        ax1.imshow(img_rgb)
        ax1.set_title(f'Ground Truth - {image_result["image_name"]}', fontsize=14)
        ax1.axis('off')
        
        for gt_box in image_result['gt_boxes']:
            x1, y1, x2, y2 = gt_box['bbox']
            width = x2 - x1
            height = y2 - y1
            class_name = self.class_names[gt_box['class_id']]
            color = np.array(self.colors[gt_box['class_id']]) / 255.0
            
            rect = patches.Rectangle((x1, y1), width, height, 
                                   linewidth=3, edgecolor=color, facecolor='none')
            ax1.add_patch(rect)
            ax1.text(x1, y1-5, f'GT: {class_name}', fontsize=12, 
                    bbox=dict(boxstyle="round,pad=0.3", facecolor=color, alpha=0.7))
        
        # Predictions
        ax2.imshow(img_rgb)
        ax2.set_title(f'Predictions - {image_result["image_name"]}', fontsize=14)
        ax2.axis('off')
        
        for pred_box in image_result['pred_boxes']:
            x1, y1, x2, y2 = pred_box['bbox']
            width = x2 - x1
            height = y2 - y1
            class_name = self.class_names[pred_box['class_id']]
            confidence = pred_box['confidence']
            color = np.array(self.colors[pred_box['class_id']]) / 255.0
            
            rect = patches.Rectangle((x1, y1), width, height, 
                                   linewidth=3, edgecolor=color, facecolor='none', linestyle='--')
            ax2.add_patch(rect)
            ax2.text(x1, y1-5, f'Pred: {class_name} ({confidence:.2f})', fontsize=12, 
                    bbox=dict(boxstyle="round,pad=0.3", facecolor=color, alpha=0.7))
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=150, bbox_inches='tight')
            print(f"Saved comparison to {save_path}")
        
        plt.show()
        
    def run_batch_comparison(self, confidence_threshold=0.25, max_images=None):
        """Run batch comparison on test images"""
        test_images_path = self.dataset_path / 'images' / 'test'
        image_files = list(test_images_path.glob('*.jpg')) + list(test_images_path.glob('*.png'))
        
        if max_images:
            image_files = image_files[:max_images]
        
        print(f"Processing {len(image_files)} test images...")
        print(f"Model: {self.model_path}")
        print(f"Confidence threshold: {confidence_threshold}")
        print("-" * 60)
        
        # Initialize per-class metrics
        for class_id in range(len(self.class_names)):
            self.results['per_class_metrics'][class_id] = {
                'class_name': self.class_names[class_id],
                'true_positives': 0,
                'false_positives': 0,
                'false_negatives': 0
            }
        
        # Process each image
        for i, image_path in enumerate(image_files, 1):
            print(f"Processing {i}/{len(image_files)}: {image_path.name}")
            
            result = self.process_single_image(image_path, confidence_threshold)
            if result is None:
                continue
            
            self.results['per_image_results'].append(result)
            
            # Update overall metrics
            self.results['total_images'] += 1
            self.results['total_gt_objects'] += len(result['gt_boxes'])
            self.results['total_pred_objects'] += len(result['pred_boxes'])
            
            # Update per-class metrics
            for gt_box in result['gt_boxes']:
                class_id = gt_box['class_id']
                # Check if this GT box was matched
                matched = any(match['gt_idx'] == i for i, match in enumerate(result['matches']) 
                            for match in result['matches'])
                if not matched:
                    self.results['per_class_metrics'][class_id]['false_negatives'] += 1
            
            for match in result['matches']:
                class_id = match['class_id']
                self.results['per_class_metrics'][class_id]['true_positives'] += 1
            
            for i, pred_box in enumerate(result['pred_boxes']):
                if i not in [match['pred_idx'] for match in result['matches']]:
                    class_id = pred_box['class_id']
                    self.results['per_class_metrics'][class_id]['false_positives'] += 1
        
        # Calculate final metrics
        self.calculate_final_metrics()
        
        return self.results
    
    def calculate_final_metrics(self):
        """Calculate final precision, recall, and F1 scores"""
        total_tp = 0
        total_fp = 0
        total_fn = 0
        
        for class_id in self.results['per_class_metrics']:
            metrics = self.results['per_class_metrics'][class_id]
            tp = metrics['true_positives']
            fp = metrics['false_positives']
            fn = metrics['false_negatives']
            
            total_tp += tp
            total_fp += fp
            total_fn += fn
            
            # Per-class metrics
            precision = tp / (tp + fp) if (tp + fp) > 0 else 0
            recall = tp / (tp + fn) if (tp + fn) > 0 else 0
            f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
            
            metrics.update({
                'precision': precision,
                'recall': recall,
                'f1_score': f1
            })
        
        # Overall metrics
        overall_precision = total_tp / (total_tp + total_fp) if (total_tp + total_fp) > 0 else 0
        overall_recall = total_tp / (total_tp + total_fn) if (total_tp + total_fn) > 0 else 0
        overall_f1 = 2 * overall_precision * overall_recall / (overall_precision + overall_recall) if (overall_precision + overall_recall) > 0 else 0
        
        self.results['overall_metrics'] = {
            'precision': overall_precision,
            'recall': overall_recall,
            'f1_score': overall_f1,
            'total_true_positives': total_tp,
            'total_false_positives': total_fp,
            'total_false_negatives': total_fn
        }
    
    def print_results(self):
        """Print comprehensive results"""
        print("\n" + "="*80)
        print("YOLOV8P2 BATCH COMPARISON RESULTS")
        print("="*80)
        
        print(f"\nDataset Summary:")
        print(f"  Total images processed: {self.results['total_images']}")
        print(f"  Total ground truth objects: {self.results['total_gt_objects']}")
        print(f"  Total predicted objects: {self.results['total_pred_objects']}")
        
        print(f"\nOverall Performance:")
        overall = self.results['overall_metrics']
        print(f"  Precision: {overall['precision']:.4f}")
        print(f"  Recall: {overall['recall']:.4f}")
        print(f"  F1-Score: {overall['f1_score']:.4f}")
        
        print(f"\nPer-Class Performance:")
        print(f"{'Class':<25} {'Precision':<12} {'Recall':<12} {'F1-Score':<12} {'TP':<6} {'FP':<6} {'FN':<6}")
        print("-" * 95)
        
        for class_id in sorted(self.results['per_class_metrics'].keys()):
            metrics = self.results['per_class_metrics'][class_id]
            print(f"{metrics['class_name']:<25} "
                  f"{metrics['precision']:<12.4f} "
                  f"{metrics['recall']:<12.4f} "
                  f"{metrics['f1_score']:<12.4f} "
                  f"{metrics['true_positives']:<6} "
                  f"{metrics['false_positives']:<6} "
                  f"{metrics['false_negatives']:<6}")
    
    def save_results(self, output_path):
        """Save results to JSON file"""
        with open(output_path, 'w') as f:
            json.dump(self.results, f, indent=2, default=str)
        print(f"\nResults saved to: {output_path}")
    
    def visualize_random_samples(self, num_samples=10):
        """Visualize random sample comparisons"""
        if not self.results['per_image_results']:
            print("No results to visualize. Run batch comparison first.")
            return
        
        # Create output directory
        viz_dir = Path("comparison_visualizations")
        viz_dir.mkdir(exist_ok=True)
        
        # Select random samples
        import random
        samples = random.sample(self.results['per_image_results'], 
                              min(num_samples, len(self.results['per_image_results'])))
        
        print(f"\nGenerating {len(samples)} visualization samples...")
        
        for i, sample in enumerate(samples, 1):
            save_path = viz_dir / f"comparison_{i}_{sample['image_name']}.png"
            self.visualize_comparison(sample, save_path)

def main():
    """Main function"""
    print("YOLOv8p2 Batch Comparison Script")
    print("=" * 50)
    
    # Configuration
    model_path = "runs/detect/yolov8p2_train/weights/best.pt"
    dataset_path = "/home/jaliya/model/dataset"
    confidence_threshold = 0.25
    max_images = None  # Process all images, or set to a number to limit
    
    # Check if model exists
    if not os.path.exists(model_path):
        print(f"Error: Model not found at {model_path}")
        print("Available models:")
        runs_dir = Path("runs/detect")
        if runs_dir.exists():
            for model_dir in runs_dir.iterdir():
                if model_dir.is_dir():
                    weights_dir = model_dir / "weights"
                    if weights_dir.exists():
                        for weight_file in weights_dir.glob("*.pt"):
                            print(f"  {weight_file}")
        return
    
    # Initialize comparison
    comparison = YOLOComparison(model_path, dataset_path)
    
    # Run batch comparison
    print(f"\nStarting batch comparison...")
    results = comparison.run_batch_comparison(confidence_threshold, max_images)
    
    # Print results
    comparison.print_results()
    
    # Save results
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    results_file = f"comparison_results_{timestamp}.json"
    comparison.save_results(results_file)
    
    # Generate sample visualizations
    print(f"\nGenerating sample visualizations...")
    comparison.visualize_random_samples(num_samples=10)
    
    print(f"\nComparison complete! Check the generated files:")
    print(f"  - Results: {results_file}")
    print(f"  - Visualizations: comparison_visualizations/")

if __name__ == "__main__":
    main()