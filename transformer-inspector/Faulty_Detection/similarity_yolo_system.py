#!/usr/bin/env python3
"""
Enhanced Similarity-Based YOLO Inference System
1. Check similarity between two images
2. Run YOLO inference on TARGET image only
3. Compare detected regions from target with corresponding regions in reference image
4. Create visualization showing both images with target detections overlaid
"""

import os
import sys
import cv2
import numpy as np
import json
from pathlib import Path
import time

# Add paths for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from swift_matcher import SwiftMatcher
from clean_thermal_detector import CleanThermalDetector

class SimilarityBasedYOLOSystem:
    def __init__(self, 
                 similarity_threshold=0.5,
                 change_threshold=0.2,
                 model_path=None):
        """
        Integrated system: Similarity checking + YOLO inference + Change Analysis
        
        Args:
            similarity_threshold: Minimum similarity to consider images as same scene
            change_threshold: Minimum change ratio to trigger visualization (0.0-1.0)
            model_path: Path to YOLO model
        """
        self.similarity_threshold = similarity_threshold
        self.confidence_threshold = 0.3  # Fixed threshold for HIGH/LOW classification
        self.change_threshold = change_threshold
        
        # Set default model path if none provided
        if model_path is None:
            model_path = "/Users/jaliya/Desktop/Jaliya/Semester 7/Software/model/yolov8p2.pt"
        
        # Initialize components
        self.matcher = SwiftMatcher(threshold=similarity_threshold)
        # Initialize YOLO detector with very low threshold to capture ALL detections
        self.yolo_detector = CleanThermalDetector(
            model_path=model_path,
            confidence_threshold=0.01  # Fixed low threshold to show all detections
        )
        
        print(f"Similarity-Based YOLO System Initialized")
        print(f"   Similarity threshold: {similarity_threshold:.2f}")
        print(f"   YOLO detection: Showing ALL detections (threshold: 0.01)")
        print(f"   Classification: HIGH/LOW split at 0.30 confidence")
        print(f"   Change threshold: {change_threshold:.2f} (for visualization)")
    
    def analyze_image_pair(self, reference_img_path, target_img_path, verbose=True):
        """
        Main analysis pipeline:
        1. Check similarity
        2. If similar, run YOLO on target image
        3. Compare and classify regions
        """
        if verbose:
            print(f"\nSIMILARITY-BASED YOLO ANALYSIS")
            print(f"=" * 60)
            print(f"Reference Image: {Path(reference_img_path).name}")
            print(f"Target Image: {Path(target_img_path).name}")
        
        results = {
            'reference_image': reference_img_path,
            'target_image': target_img_path,
            'similarity_analysis': {},
            'yolo_analysis': {},
            'combined_analysis': {},
            'processing_time': {}
        }
        
        start_time = time.time()
        
        # Step 1: Similarity Analysis
        if verbose:
            print(f"\nStep 1: Similarity Analysis")
            print("-" * 40)
        
        similarity_start = time.time()
        try:
            is_similar, confidence, best_method, sim_time, individual_scores, method_names = self.matcher.swift_compare(
                reference_img_path, target_img_path, verbose=verbose
            )
            
            results['similarity_analysis'] = {
                'is_similar': is_similar,
                'confidence': confidence,
                'best_method': best_method,
                'individual_scores': individual_scores,
                'method_names': method_names,
                'processing_time': sim_time
            }
            
            if verbose:
                status = "SIMILAR" if is_similar else " DIFFERENT"
                print(f"Result: {status} (confidence: {confidence:.1%})")
            
        except Exception as e:
            print(f" Similarity analysis failed: {e}")
            results['similarity_analysis']['error'] = str(e)
            return results
        
        results['processing_time']['similarity'] = time.time() - similarity_start
        
        # Step 2: YOLO Analysis (run only on TARGET image)
        if verbose:
            print(f"\nStep 2: YOLO Inference (Running on target image only)")
            print("-" * 40)
        
        yolo_start = time.time()
        
        # Run YOLO only on target image
        if verbose:
            print(f"Running YOLO on target image (showing ALL detections)...")
        target_img, target_detections = self.yolo_detector.detect(target_img_path)
        
        # Show all detections with their confidence levels
        if verbose and target_detections:
            print(f"Found {len(target_detections)} total detections:")
            for i, det in enumerate(target_detections):
                conf = det['confidence']
                class_name = det['class_name']
                status = "HIGH" if conf >= self.confidence_threshold else "LOW"
                print(f"  {i+1}. {class_name} (conf: {conf:.3f}) - {status} confidence")
        
        results['yolo_analysis'] = {
            'target_detections': target_detections,
            'target_detection_count': len(target_detections) if target_detections else 0,
            'high_confidence_count': len([d for d in target_detections if d['confidence'] >= self.confidence_threshold]) if target_detections else 0,
            'low_confidence_count': len([d for d in target_detections if d['confidence'] < self.confidence_threshold]) if target_detections else 0,
            'reference_analysis': 'No YOLO analysis - using region comparison instead',
            'showing_all_detections': True
        }
        
        results['processing_time']['yolo'] = time.time() - yolo_start
        
        # Step 3: Region Comparison (compare detected regions with reference image)
        if verbose:
            print(f"\nStep 3: Region Comparison (Target detections vs Reference regions)")
            print("-" * 40)
        
        combined_start = time.time()
        combined_analysis = self.compare_detected_regions_with_reference(
            reference_img_path, target_img_path, target_detections, verbose=verbose
        )
        results['combined_analysis'] = combined_analysis
        results['processing_time']['combined'] = time.time() - combined_start
        
        # Step 4: Visualization (always create visualization)
        if verbose:
            print(f"\nStep 4: Creating Visualization")
            print("-" * 40)
        
        viz_start = time.time()
        visualization_path = self.create_comparison_visualization(
            reference_img_path, target_img_path, results, verbose=verbose
        )
        viz_time = time.time() - viz_start
        
        # Determine if bounding boxes should be shown based on change threshold
        significant_change = combined_analysis.get('significant_change', False)
        change_mag = combined_analysis.get('change_magnitude', 0.0)
        
        results['visualization'] = {
            'created': True,
            'path': visualization_path,
            'bounding_boxes_shown': significant_change,
            'reason': f"Change magnitude: {change_mag:.3f} (threshold: {self.change_threshold:.2f}) - {'Boxes shown' if significant_change else 'Boxes hidden'}"
        }
        results['processing_time']['visualization'] = viz_time
        
        results['processing_time']['total'] = time.time() - start_time
        
        # Final Summary
        if verbose:
            self.print_summary(results)
        
        results['processing_time']['total'] = time.time() - start_time
        
        # Final Summary
        if verbose:
            self.print_summary(results)
        
        return results
    
    def create_comparison_visualization(self, ref_img_path, target_img_path, results, verbose=True):
        """Create side-by-side visualization of detection results"""
        try:
            import matplotlib.pyplot as plt
            import matplotlib.patches as patches
            from matplotlib.gridspec import GridSpec
            
            # Load images
            ref_img = cv2.imread(ref_img_path)
            target_img = cv2.imread(target_img_path)
            
            if ref_img is None or target_img is None:
                print("Could not load images for visualization")
                return None
            
            # Convert BGR to RGB
            ref_img_rgb = cv2.cvtColor(ref_img, cv2.COLOR_BGR2RGB)
            target_img_rgb = cv2.cvtColor(target_img, cv2.COLOR_BGR2RGB)
            
            # Get detection data
            target_detections = results['yolo_analysis']['target_detections']
            combined_data = results['combined_analysis']
            similarity_data = results['similarity_analysis']
            
            # Determine if bounding boxes should be shown
            images_are_similar = similarity_data.get('is_similar', False)
            change_mag = combined_data.get('change_magnitude', 0.0)
            significant = combined_data.get('significant_change', False)
            
            # Show bounding boxes logic:
            # - If images are DIFFERENT: Always show boxes (independent analysis)
            # - If images are SIMILAR: Only show boxes if change is significant
            if not images_are_similar:
                show_bounding_boxes = True  # Always show for different images
                title_text = f'DIFFERENT IMAGES - INDEPENDENT ANALYSIS | {len(target_detections)} detections found'
            else:
                show_bounding_boxes = significant  # Only show if significant change for similar images
                analysis_type = combined_data.get('analysis_type', 'unknown')
                if show_bounding_boxes:
                    title_text = f'SIMILAR IMAGES - SIGNIFICANT CHANGE | Magnitude: {change_mag:.3f} | {combined_data.get("summary", "")}'
                else:
                    title_text = f'SIMILAR IMAGES - NO SIGNIFICANT CHANGE | Magnitude: {change_mag:.3f} | {combined_data.get("summary", "")}'
            
            # Create figure
            fig = plt.figure(figsize=(20, 12))
            gs = GridSpec(3, 4, figure=fig, height_ratios=[0.1, 2, 0.8], width_ratios=[1, 1, 0.2, 1])
            
            # Title
            title_color = '#DC143C' if significant else '#2E8B57'
            
            fig.suptitle(title_text, fontsize=16, fontweight='bold', color=title_color)
            
            # Reference image (original)
            ax1 = fig.add_subplot(gs[1, 0])
            ax1.imshow(ref_img_rgb)
            ax1.set_title(f"Reference Image (Original)\nNo YOLO analysis", fontsize=14, fontweight='bold')
            ax1.axis('off')
            
            # Note: No detections drawn on reference image since YOLO only runs on target
                
                            # Target image with conditional detections
            ax2 = fig.add_subplot(gs[1, 1])
            ax2.imshow(target_img_rgb)
            high_conf_count = len([d for d in target_detections if d['confidence'] >= self.confidence_threshold])
            low_conf_count = len([d for d in target_detections if d['confidence'] < self.confidence_threshold])
            
            if show_bounding_boxes:
                ax2.set_title(f"Target Image (YOLO Detections Shown)\n{len(target_detections)} total ({high_conf_count} high, {low_conf_count} low confidence)", fontsize=14, fontweight='bold')
            else:
                ax2.set_title(f"Target Image (YOLO Detections Hidden)\n{len(target_detections)} detections found but not significant", fontsize=14, fontweight='bold')
            ax2.axis('off')
            
            # Draw target detections only if show_bounding_boxes is True
            if show_bounding_boxes:
                for i, det in enumerate(target_detections):
                    x1, y1, x2, y2 = det['bbox']
                    conf = det['confidence']
                    class_name = det['class_name']
                    
                    # Determine confidence level and styling
                    is_high_confidence = conf >= self.confidence_threshold
                    
                    # Color based on fault type and confidence
                    if 'faulty' in class_name.lower():
                        color = 'red' if is_high_confidence else 'pink'
                    else:
                        color = 'orange' if is_high_confidence else 'yellow'
                    
                    # Line style based on confidence
                    linestyle = '-' if is_high_confidence else '--'
                    linewidth = 3 if is_high_confidence else 2
                    alpha = 0.8 if is_high_confidence else 0.5
                    
                    rect = patches.Rectangle((x1, y1), x2-x1, y2-y1, 
                                           linewidth=linewidth, edgecolor=color, facecolor='none', 
                                           alpha=alpha, linestyle=linestyle)
                    ax2.add_patch(rect)
                    
                    # Label with confidence indicator
                    conf_indicator = "H" if is_high_confidence else "L"
                    label_color = 'white' if is_high_confidence else 'black'
                    box_alpha = 0.7 if is_high_confidence else 0.4
                    
                    ax2.text(x1, y1-10, f"{i+1}. {class_name}\n{conf:.3f} ({conf_indicator})", 
                            bbox=dict(boxstyle="round,pad=0.3", facecolor=color, alpha=box_alpha),
                            fontsize=9, fontweight='bold', color=label_color)
            else:
                # Add text overlay indicating detections are hidden
                ax2.text(0.5, 0.5, f'DETECTIONS HIDDEN\n(Change magnitude: {change_mag:.3f} < {self.change_threshold:.2f})\n{len(target_detections)} detections found', 
                        transform=ax2.transAxes, fontsize=16, fontweight='bold', 
                        ha='center', va='center', color='white',
                        bbox=dict(boxstyle="round,pad=0.5", facecolor='red', alpha=0.7))
            
            # Comparison arrow/indicator
            ax_arrow = fig.add_subplot(gs[1, 2])
            ax_arrow.axis('off')
            
            analysis_type = combined_data.get('analysis_type', 'unknown')
            if analysis_type == 'region_comparison':
                if significant:
                    ax_arrow.text(0.5, 0.6, 'WARNING', fontsize=40, ha='center', va='center')
                    ax_arrow.text(0.5, 0.3, 'REGIONS\nCHANGED', fontsize=12, color='red', 
                                 ha='center', va='center', fontweight='bold')
                else:
                    ax_arrow.text(0.5, 0.6, 'OK', fontsize=40, ha='center', va='center')
                    ax_arrow.text(0.5, 0.3, 'REGIONS\nSTABLE', fontsize=12, color='green', 
                                 ha='center', va='center', fontweight='bold')
            else:
                ax_arrow.text(0.5, 0.6, 'SEARCH', fontsize=30, ha='center', va='center')
                ax_arrow.text(0.5, 0.3, 'TARGET\nANALYSIS', fontsize=12, color='blue', 
                             ha='center', va='center', fontweight='bold')
            
            # Analysis summary
            ax3 = fig.add_subplot(gs[1, 3])
            ax3.axis('off')
            ax3.set_title('Analysis Results', fontsize=14, fontweight='bold')
            
            # Create summary text based on analysis type
            yolo_data = results['yolo_analysis']
            high_conf_count = yolo_data.get('high_confidence_count', 0)
            low_conf_count = yolo_data.get('low_confidence_count', 0)
            
            if analysis_type == 'region_comparison':
                region_comparisons = combined_data.get('region_comparisons', [])
                significant_regions = combined_data.get('significant_region_count', 0)
                
                summary_text = f"Region Comparison Analysis:\n\n"
                summary_text += f"Total detections: {len(target_detections)}\n"
                summary_text += f"High confidence: {high_conf_count}\n"
                summary_text += f"Low confidence: {low_conf_count}\n"
                summary_text += f"Regions analyzed: {len(region_comparisons)}\n"
                summary_text += f"Significant changes: {significant_regions}\n"
                summary_text += f"Change magnitude: {change_mag:.3f}\n\n"
                
                # Show some region details with confidence indicators
                for i, region in enumerate(region_comparisons[:3]):  # Show max 3
                    status = "WARN" if region['significant_change'] else "OK"
                    conf_level = "H" if region['confidence'] >= self.confidence_threshold else "L"
                    summary_text += f"{status} {region['class_name']} ({conf_level}): {region['combined_difference']:.3f}\n"
                
                if len(region_comparisons) > 3:
                    summary_text += f"... and {len(region_comparisons) - 3} more regions"
            else:
                # For other analysis types
                summary_text = f"Target Image Analysis (All Detections):\n\n"
                summary_text += f"Total detections: {len(target_detections)}\n"
                summary_text += f"High confidence: {high_conf_count}\n"
                summary_text += f"Low confidence: {low_conf_count}\n\n"
                
                # List detections with confidence indicators
                for i, det in enumerate(target_detections[:3]):  # Show max 3
                    conf_level = "H" if det['confidence'] >= self.confidence_threshold else "L"
                    summary_text += f"  {i+1}. {det['class_name']} ({det['confidence']:.3f}) [{conf_level}]\n"
                
                if len(target_detections) > 3:
                    summary_text += f"... and {len(target_detections) - 3} more detections"
            
            ax3.text(0.05, 0.95, summary_text, fontsize=12, va='top', ha='left',
                    bbox=dict(boxstyle="round,pad=0.5", facecolor='lightgray', alpha=0.8),
                    transform=ax3.transAxes)
            
            # Bottom summary
            ax4 = fig.add_subplot(gs[2, :])
            ax4.axis('off')
            
            # Processing time and similarity info
            sim_data = results['similarity_analysis']
            timing = results['processing_time']
            
            # Calculate total time up to this point (in case 'total' isn't set yet)
            total_time = timing.get('total', timing.get('similarity', 0) + timing.get('yolo', 0) + timing.get('combined', 0))
            
            analysis_type = combined_data.get('analysis_type', 'unknown')
            if analysis_type == 'region_comparison':
                # For region comparison analysis
                bottom_text = f"""
ANALYSIS DETAILS:
• Similarity: {sim_data['confidence']:.1%} ({sim_data['best_method']})
• Processing Time: Total {total_time:.2f}s (Similarity: {timing.get('similarity', 0):.2f}s | YOLO: {timing.get('yolo', 0):.2f}s | Region Analysis: {timing.get('combined', 0):.2f}s | Visualization: {timing.get('visualization', 0):.2f}s)
• Analysis Type: Region comparison between target detections and reference image regions
• Change Threshold: {self.change_threshold:.2f} (Changes above this indicate significant change)
• Image Paths: {Path(ref_img_path).name} → {Path(target_img_path).name}
                """
            else:
                # For other analysis types
                bottom_text = f"""
ANALYSIS DETAILS:
• Similarity: {sim_data['confidence']:.1%} ({sim_data['best_method']})
• Processing Time: Total {total_time:.2f}s (Similarity: {timing.get('similarity', 0):.2f}s | YOLO: {timing.get('yolo', 0):.2f}s | Visualization: {timing.get('visualization', 0):.2f}s)
• Analysis Type: YOLO detection on target image only
• Image Paths: {Path(ref_img_path).name} → {Path(target_img_path).name}
                """
            
            ax4.text(0.02, 0.5, bottom_text, fontsize=11, va='center',
                    bbox=dict(boxstyle="round,pad=0.5", facecolor='lightblue', alpha=0.3))
            
            plt.tight_layout()
            
            # Save visualization
            os.makedirs("significant_changes", exist_ok=True)
            timestamp = int(time.time())
            viz_filename = f"significant_change_{timestamp}.png"
            viz_path = os.path.join("significant_changes", viz_filename)
            
            plt.savefig(viz_path, dpi=300, bbox_inches='tight')
            if verbose:
                print(f"Visualization saved: {viz_path}")
            
            plt.show()
            
            return viz_path
            
        except ImportError:
            print("Matplotlib not available for visualization")
            return None
        except Exception as e:
            print(f"Visualization error: {e}")
            return None
    
    def compare_detections(self, ref_detections, target_detections, verbose=True):
        """Compare YOLO detections between reference and target images"""
        
        if not ref_detections and not target_detections:
            return {
                'summary': 'No detections in either image',
                'comparison_type': 'both_clean',
                'change_magnitude': 0.0,
                'significant_change': False,
                'details': {}
            }
        
        if not ref_detections:
            change_magnitude = 1.0  # Complete change from clean to faulty
            return {
                'summary': f'Target has {len(target_detections)} new detections',
                'comparison_type': 'target_has_new_faults',
                'change_magnitude': change_magnitude,
                'significant_change': change_magnitude >= self.change_threshold,
                'target_detections': target_detections,
                'details': {
                    'new_fault_types': list(set(d['class_name'] for d in target_detections))
                }
            }
        
        if not target_detections:
            change_magnitude = 1.0  # Complete change from faulty to clean
            return {
                'summary': f'Reference had {len(ref_detections)} faults, target is clean',
                'comparison_type': 'target_improved',
                'change_magnitude': change_magnitude,
                'significant_change': change_magnitude >= self.change_threshold,
                'reference_detections': ref_detections,
                'details': {
                    'resolved_fault_types': list(set(d['class_name'] for d in ref_detections))
                }
            }
        
        # Both have detections - detailed comparison
        ref_classes = [d['class_name'] for d in ref_detections]
        target_classes = [d['class_name'] for d in target_detections]
        
        ref_class_counts = {}
        target_class_counts = {}
        
        for cls in ref_classes:
            ref_class_counts[cls] = ref_class_counts.get(cls, 0) + 1
        for cls in target_classes:
            target_class_counts[cls] = target_class_counts.get(cls, 0) + 1
        
        # Analyze changes
        all_classes = set(ref_classes + target_classes)
        changes = {}
        total_ref_detections = len(ref_detections)
        total_target_detections = len(target_detections)
        
        for cls in all_classes:
            ref_count = ref_class_counts.get(cls, 0)
            target_count = target_class_counts.get(cls, 0)
            
            if ref_count == target_count:
                changes[cls] = {'status': 'unchanged', 'ref_count': ref_count, 'target_count': target_count}
            elif target_count > ref_count:
                changes[cls] = {'status': 'increased', 'ref_count': ref_count, 'target_count': target_count}
            else:
                changes[cls] = {'status': 'decreased', 'ref_count': ref_count, 'target_count': target_count}
        
        # Calculate change magnitude
        detection_count_change = abs(total_target_detections - total_ref_detections)
        max_detections = max(total_ref_detections, total_target_detections, 1)
        change_magnitude = detection_count_change / max_detections
        
        # Consider class-level changes for more nuanced analysis
        class_changes = sum(1 for data in changes.values() if data['status'] != 'unchanged')
        total_classes = len(all_classes)
        class_change_ratio = class_changes / max(total_classes, 1) if total_classes > 0 else 0
        
        # Combined change magnitude (weighted)
        final_change_magnitude = (change_magnitude * 0.7 + class_change_ratio * 0.3)
        
        # Determine significance
        significant_change = final_change_magnitude >= self.change_threshold
        
        # Summary analysis
        increased_faults = [cls for cls, data in changes.items() if data['status'] == 'increased']
        decreased_faults = [cls for cls, data in changes.items() if data['status'] == 'decreased']
        unchanged_faults = [cls for cls, data in changes.items() if data['status'] == 'unchanged']
        
        if increased_faults:
            summary = f"Condition worsened: {', '.join(increased_faults)} increased"
            comparison_type = 'condition_worsened'
        elif decreased_faults:
            summary = f"Condition improved: {', '.join(decreased_faults)} decreased"
            comparison_type = 'condition_improved'
        else:
            summary = f"Condition stable: {len(unchanged_faults)} fault types unchanged"
            comparison_type = 'condition_stable'
        
        if verbose:
            print(f"Detection Comparison:")
            print(f"  Reference: {len(ref_detections)} detections")
            print(f"  Target: {len(target_detections)} detections")
            print(f"  Change magnitude: {final_change_magnitude:.2f}")
            print(f"  Significant change: {'YES' if significant_change else 'NO'} (threshold: {self.change_threshold:.2f})")
            print(f"  Summary: {summary}")
            
            if changes:
                print(f"  Detailed changes:")
                for cls, data in changes.items():
                    status_icon = "UP" if data['status'] == 'increased' else "DOWN" if data['status'] == 'decreased' else "SAME"
                    print(f"    {status_icon} {cls}: {data['ref_count']} → {data['target_count']}")
        
        return {
            'summary': summary,
            'comparison_type': comparison_type,
            'change_magnitude': final_change_magnitude,
            'significant_change': significant_change,
            'reference_detection_count': len(ref_detections),
            'target_detection_count': len(target_detections),
            'class_changes': changes,
            'increased_faults': increased_faults,
            'decreased_faults': decreased_faults,
            'unchanged_faults': unchanged_faults,
            'details': {
                'reference_detections': ref_detections,
                'target_detections': target_detections
            }
        }
    
    def compare_detected_regions_with_reference(self, ref_img_path, target_img_path, target_detections, verbose=True):
        """
        Compare detected regions from target image with corresponding regions in reference image
        This function extracts regions from target detections and compares them with 
        the same regions in the reference image
        """
        try:
            import cv2
            import numpy as np
            
            # Load images
            ref_img = cv2.imread(ref_img_path)
            target_img = cv2.imread(target_img_path)
            
            if ref_img is None or target_img is None:
                return {
                    'error': 'Could not load images for region comparison',
                    'change_magnitude': 0.0,
                    'significant_change': False
                }
            
            if not target_detections:
                return {
                    'summary': 'No detections found in target image',
                    'comparison_type': 'no_detections',
                    'change_magnitude': 0.0,
                    'significant_change': False,
                    'target_detection_count': 0,
                    'region_comparisons': []
                }
            
            region_comparisons = []
            total_difference = 0.0
            
            for i, detection in enumerate(target_detections):
                x1, y1, x2, y2 = detection['bbox']
                class_name = detection['class_name']
                confidence = detection['confidence']
                
                # Extract region from both images
                target_region = target_img[y1:y2, x1:x2]
                ref_region = ref_img[y1:y2, x1:x2]
                
                # Calculate difference between regions
                if target_region.size > 0 and ref_region.size > 0:
                    # Resize regions to same size if needed
                    if target_region.shape != ref_region.shape:
                        ref_region = cv2.resize(ref_region, (target_region.shape[1], target_region.shape[0]))
                    
                    # Calculate structural similarity or simple difference
                    diff = cv2.absdiff(target_region, ref_region)
                    region_difference = np.mean(diff) / 255.0  # Normalize to 0-1
                    
                    # Calculate histogram comparison for color differences
                    target_hist = cv2.calcHist([target_region], [0, 1, 2], None, [50, 50, 50], [0, 256, 0, 256, 0, 256])
                    ref_hist = cv2.calcHist([ref_region], [0, 1, 2], None, [50, 50, 50], [0, 256, 0, 256, 0, 256])
                    hist_correlation = cv2.compareHist(target_hist, ref_hist, cv2.HISTCMP_CORREL)
                    hist_difference = 1.0 - hist_correlation
                    
                    # Combined difference score
                    combined_difference = (region_difference * 0.6 + hist_difference * 0.4)
                    total_difference += combined_difference
                    
                    region_comparisons.append({
                        'detection_id': i + 1,
                        'class_name': class_name,
                        'confidence': confidence,
                        'bbox': [x1, y1, x2, y2],
                        'region_difference': region_difference,
                        'histogram_difference': hist_difference,
                        'combined_difference': combined_difference,
                        'significant_change': combined_difference > 0.3  # Threshold for significant region change
                    })
                    
                    if verbose:
                        print(f"  Region {i+1} ({class_name}): Difference = {combined_difference:.3f}")
                else:
                    if verbose:
                        print(f"  Region {i+1} ({class_name}): Could not extract valid region")
            
            # Calculate overall change magnitude
            avg_difference = total_difference / len(target_detections) if target_detections else 0.0
            change_magnitude = avg_difference
            significant_change = change_magnitude >= self.change_threshold
            
            # Count significant region changes
            significant_regions = [r for r in region_comparisons if r['significant_change']]
            
            # Create summary
            if significant_regions:
                if len(significant_regions) == 1:
                    summary = f"Significant change detected in 1 region ({significant_regions[0]['class_name']})"
                else:
                    classes = [r['class_name'] for r in significant_regions]
                    summary = f"Significant changes detected in {len(significant_regions)} regions ({', '.join(set(classes))})"
                comparison_type = 'regions_changed'
            else:
                summary = f"No significant changes in detected regions ({len(target_detections)} regions analyzed)"
                comparison_type = 'regions_stable'
            
            if verbose:
                print(f"Region Comparison Summary:")
                print(f"  Target detections: {len(target_detections)}")
                print(f"  Regions analyzed: {len(region_comparisons)}")
                print(f"  Significant region changes: {len(significant_regions)}")
                print(f"  Overall change magnitude: {change_magnitude:.3f}")
                print(f"  Significant overall change: {'YES' if significant_change else 'NO'} (threshold: {self.change_threshold:.2f})")
                print(f"  Summary: {summary}")
            
            return {
                'summary': summary,
                'comparison_type': comparison_type,
                'change_magnitude': change_magnitude,
                'significant_change': significant_change,
                'target_detection_count': len(target_detections),
                'region_comparisons': region_comparisons,
                'significant_region_count': len(significant_regions),
                'analysis_type': 'region_comparison'
            }
            
        except Exception as e:
            if verbose:
                print(f"Error in region comparison: {e}")
            return {
                'error': str(e),
                'change_magnitude': 0.0,
                'significant_change': False,
                'analysis_type': 'region_comparison_failed'
            }
    
    def print_summary(self, results):
        """Print comprehensive summary of analysis"""
        print(f"\nANALYSIS SUMMARY")
        print("=" * 60)
        
        # Similarity Summary
        sim_data = results['similarity_analysis']
        if 'error' not in sim_data:
            status = "SIMILAR" if sim_data['is_similar'] else "DIFFERENT"
            print(f"Similarity: {status} (confidence: {sim_data['confidence']:.1%})")
            print(f"Best method: {sim_data['best_method']}")
        
        # YOLO Summary
        yolo_data = results['yolo_analysis']
        if 'skipped' in yolo_data:
            print(f"YOLO Analysis: SKIPPED - {yolo_data['reason']}")
        else:
            total_count = yolo_data['target_detection_count']
            high_conf_count = yolo_data.get('high_confidence_count', total_count)
            low_conf_count = yolo_data.get('low_confidence_count', 0)
            print(f"YOLO Analysis: Target image analyzed → {total_count} total detections")
            print(f"  High confidence (≥{self.confidence_threshold:.2f}): {high_conf_count}")
            print(f"  Low confidence (<{self.confidence_threshold:.2f}): {low_conf_count}")
            
            if yolo_data.get('showing_all_detections', False):
                print(f"  NOTE: Showing ALL detections regardless of confidence")
        
        # Combined Analysis Summary
        combined_data = results['combined_analysis']
        if 'error' not in combined_data:
            analysis_type = combined_data.get('analysis_type', 'unknown')
            if analysis_type == 'region_comparison':
                print(f"Region Analysis: {combined_data['summary']}")
                
                # Highlight significant changes for region comparison
                if combined_data.get('significant_change', False):
                    print(f"ALERT: Significant changes detected in regions")
                else:
                    print(f"STABLE: No significant changes in regions")
            else:
                print(f"Analysis: {combined_data.get('summary', 'Analysis completed')}")
        
        # Performance Summary
        timing = results['processing_time']
        total_time = timing.get('total', 0)
        print(f"\nProcessing Time: {total_time:.3f}s")
        if 'similarity' in timing:
            print(f"  Similarity: {timing['similarity']:.3f}s")
        if 'yolo' in timing:
            print(f"  YOLO: {timing['yolo']:.3f}s")
        if 'combined' in timing:
            print(f"  Analysis: {timing['combined']:.3f}s")
    
    def save_results(self, results, output_file):
        """Save analysis results to JSON file"""
        # Convert numpy types to Python types for JSON serialization
        def convert_numpy(obj):
            if isinstance(obj, np.ndarray):
                return obj.tolist()
            elif isinstance(obj, (np.integer, np.int64, np.int32)):
                return int(obj)
            elif isinstance(obj, (np.floating, np.float64, np.float32)):
                return float(obj)
            elif isinstance(obj, (np.bool_, bool)):
                return bool(obj)
            elif isinstance(obj, dict):
                return {key: convert_numpy(value) for key, value in obj.items()}
            elif isinstance(obj, list):
                return [convert_numpy(item) for item in obj]
            return obj
        
        cleaned_results = convert_numpy(results)
        
        with open(output_file, 'w') as f:
            json.dump(cleaned_results, f, indent=2)
        
        print(f"Results saved: {output_file}")
        return output_file

def main():
    if len(sys.argv) < 3:
        print("Usage: python similarity_yolo_system.py <reference_image> <target_image> [similarity_threshold] [change_threshold]")
        print("Example: python similarity_yolo_system.py ref.jpg target.jpg 0.5 0.2")
        print("  similarity_threshold: Images must be this similar for comparison (default: 0.5)")
        print("  change_threshold: Change magnitude to trigger visualization (default: 0.2)")
        print("  NOTE: ALL YOLO detections are shown (HIGH/LOW split at 0.3 confidence)")
        return
    
    reference_img = sys.argv[1]
    target_img = sys.argv[2]
    similarity_threshold = float(sys.argv[3]) if len(sys.argv) > 3 else 0.5
    change_threshold = float(sys.argv[4]) if len(sys.argv) > 4 else 0.2
    
    if not os.path.exists(reference_img) or not os.path.exists(target_img):
        print("Error: One or both image paths are invalid.")
        return
    
    # Initialize system
    system = SimilarityBasedYOLOSystem(
        similarity_threshold=similarity_threshold,
        change_threshold=change_threshold
    )
    
    # Run analysis
    results = system.analyze_image_pair(reference_img, target_img)
    
    # Save results
    output_filename = f"similarity_yolo_results_{int(time.time())}.json"
    system.save_results(results, output_filename)

if __name__ == "__main__":
    main()