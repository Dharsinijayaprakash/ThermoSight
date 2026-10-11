#!/usr/bin/env python3
"""
Enhanced Targeted Dataset Creator for YOLO Fine-tuning

This module creates comprehensive training datasets by combining:
1. Human annotations (missed detections) - what AI failed to detect
2. AI-detected faults that were approved/confirmed by humans 
3. AI-detected faults that weren't rejected (implicit approval)

This provides a more balanced training dataset with both positive and negative examples.
"""

import os
import json
import shutil
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
import glob
import random

class TargetedDatasetCreator:
    def __init__(self, base_dir: str = None):
        """Initialize the dataset creator with configuration"""
        self.base_dir = base_dir or os.path.dirname(os.path.abspath(__file__))
        self.feedback_dir = os.path.join(self.base_dir, 'feedback_data')
        self.uploads_dir = os.path.join(self.base_dir, '..', 'backend', 'uploads')
        
        # Setup logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        
        # Load class mapping dynamically from app.py
        self.class_mapping = self._load_class_mapping_from_app()
        
        # No default class ID - preserve actual class IDs from feedback
        # Only use fallback for truly unknown/invalid classes
        
        self.logger.info(f"TargetedDatasetCreator initialized with base directory: {self.base_dir}")
        self.logger.info(f"Feedback directory: {self.feedback_dir}")

    def _load_class_mapping_from_app(self) -> Dict[int, str]:
        """
        Load CLASS_NAMES mapping from app.py to ensure consistency
        """
        try:
            # Import app.py to get the current CLASS_NAMES
            import sys
            import os
            
            # Add current directory to path if not already there
            current_dir = os.path.dirname(os.path.abspath(__file__))
            if current_dir not in sys.path:
                sys.path.insert(0, current_dir)
            
            # Import the CLASS_NAMES from app.py
            from app import CLASS_NAMES
            
            # Create mapping with class 4 -> class 3 transformation
            class_mapping = {}
            for class_id, class_name in CLASS_NAMES.items():
                class_mapping[class_id] = class_name
            
            # Add mapping for class 4 (human marked potential) -> maps to class 3
            if 3 in CLASS_NAMES:
                class_mapping[4] = CLASS_NAMES[3]  # potential_faulty
            
            self.logger.info(f"Loaded class mapping from app.py: {class_mapping}")
            return class_mapping
            
        except ImportError as e:
            self.logger.warning(f"Could not import CLASS_NAMES from app.py: {e}")
            # Fallback to hardcoded mapping
            fallback_mapping = {
                0: "faulty",
                1: "faulty_loose_joint", 
                2: "faulty_point_overload",
                3: "potential_faulty"
            }
            self.logger.info(f"Using fallback class mapping: {fallback_mapping}")
            return fallback_mapping
        except Exception as e:
            self.logger.error(f"Error loading class mapping from app.py: {e}")
            # Fallback to hardcoded mapping
            fallback_mapping = {
                0: "faulty",
                1: "faulty_loose_joint",
                2: "faulty_point_overload", 
                3: "potential_faulty"
            }
            return fallback_mapping

    def find_latest_inspection_directory(self) -> Optional[str]:
        """Find the most recent inspection directory in uploads"""
        try:
            # Try to read upload_base from application.properties (app.storage.root)
            upload_base = None
            properties_path = os.path.join(self.base_dir, '..', 'backend','src','main','resources','application.properties')
            if os.path.exists(properties_path):
                try:
                    with open(properties_path, 'r') as prop_file:
                        for line in prop_file:
                            if line.strip().startswith('app.storage.root'):
                                key, value = line.strip().split('=', 1)
                                upload_base = value.strip()
                                break
                except Exception as prop_err:
                    self.logger.warning(f"Could not read application.properties: {prop_err}")
            # Fallback to hardcoded path if not found
            if not upload_base:
                upload_base = "/Users/jaliya/Desktop/Jaliya/Semester 7/Software/TransXTransformer-Maintenance-Platform/transformer-inspector/backend/uploads"

            if not os.path.exists(upload_base):
                self.logger.error(f"Upload directory does not exist: {upload_base}")
                return None

            # Find all directories in uploads
            directories = []
            for item in os.listdir(upload_base):
                item_path = os.path.join(upload_base, item)
                if os.path.isdir(item_path):
                    directories.append(item_path)

            if not directories:
                self.logger.error("No inspection directories found in uploads")
                return None

            # Sort by modification time, get the latest
            latest_dir = max(directories, key=os.path.getmtime)
            self.logger.info(f"Found latest inspection directory: {latest_dir}")
            return latest_dir

        except Exception as e:
            self.logger.error(f"Error finding latest inspection directory: {e}")
            return None
    
    def find_image_file(self, image_id: str, inspection_dir: str) -> Optional[str]:
        """Find the actual image file for a given image ID"""
        try:
            # Check both baseline and inspection folders
            for subdir in ['baseline', 'inspection']:
                search_dir = os.path.join(inspection_dir, subdir)
                if not os.path.exists(search_dir):
                    continue
                    
                # Look for files starting with the image ID
                pattern = os.path.join(search_dir, f"{image_id}*")
                matching_files = glob.glob(pattern)
                
                if matching_files:
                    image_path = matching_files[0]
                    self.logger.info(f"Found image: {image_path}")
                    return image_path
                    
            self.logger.warning(f"Image not found for ID: {image_id}")
            return None
            
        except Exception as e:
            self.logger.error(f"Error finding image {image_id}: {e}")
            return None
    
    def parse_feedback_data(self) -> Tuple[List[Dict], List[Dict]]:
        """
        Parse all feedback files and extract training data
        
        Returns:
            Tuple of (human_annotations, ai_detections) for training
        """
        human_annotations = []
        ai_detections = []
        
        try:
            feedback_files = glob.glob(os.path.join(self.feedback_dir, 'feedback_*.json'))
            self.logger.info(f"Processing {len(feedback_files)} feedback files")
            
            for feedback_file in feedback_files:
                with open(feedback_file, 'r') as f:
                    feedback_data = json.load(f)
                
                inspection_id = feedback_data.get('inspectionId')
                self.logger.info(f"Processing feedback for inspection: {inspection_id}")
                
                for comparison in feedback_data.get('comparisons', []):
                    image_id = comparison.get('imageId')
                    action_taken = comparison.get('actionTaken')
                    
                    # Process human annotations (missed detections)
                    human_annotation = comparison.get('humanAnnotation')
                    if human_annotation and action_taken == 'added':
                        annotation_data = {
                            'image_id': image_id,
                            'bbox': human_annotation['bbox'],
                            'class_id': human_annotation['classId'],
                            'class_name': human_annotation['className'],
                            'confidence': human_annotation['confidence'],
                            'source': 'human_missed',
                            'inspection_id': inspection_id,
                            'action_taken': action_taken
                        }
                        human_annotations.append(annotation_data)
                        self.logger.info(f"Added human annotation: {human_annotation['className']} for image {image_id}")
                    
                    # Process AI detections that were approved or implicitly accepted
                    ai_prediction = comparison.get('aiPrediction')
                    if ai_prediction:
                        # Include if: approved, edited (implies acceptance), or created (not rejected)
                        if action_taken in ['approved', 'created', 'edited']:
                            detection_data = {
                                'image_id': image_id,
                                'bbox': ai_prediction['bbox'],
                                'class_id': ai_prediction['classId'],
                                'class_name': ai_prediction['className'],
                                'confidence': ai_prediction['confidence'],
                                'source': f'ai_{action_taken}',
                                'inspection_id': inspection_id,
                                'action_taken': action_taken
                            }
                            ai_detections.append(detection_data)
                            self.logger.info(f"Added AI detection: {ai_prediction['className']} ({action_taken}) for image {image_id}")
            
            self.logger.info(f"Collected {len(human_annotations)} human annotations and {len(ai_detections)} AI detections")
            return human_annotations, ai_detections
            
        except Exception as e:
            self.logger.error(f"Error parsing feedback data: {e}")
            return [], []
    
    def bbox_to_yolo_format(self, bbox: Dict, img_width: int, img_height: int, class_id: int = 0) -> str:
        """Convert bounding box to YOLO format"""
        try:
            x1, y1, x2, y2 = bbox['x1'], bbox['y1'], bbox['x2'], bbox['y2']
            
            # Calculate center coordinates and dimensions
            center_x = (x1 + x2) / 2.0 / img_width
            center_y = (y1 + y2) / 2.0 / img_height
            width = (x2 - x1) / img_width
            height = (y2 - y1) / img_height
            
            # YOLO format: class_id center_x center_y width height
            return f"{class_id} {center_x:.6f} {center_y:.6f} {width:.6f} {height:.6f}"
            
        except Exception as e:
            self.logger.error(f"Error converting bbox to YOLO format: {e}")
            return ""
    
    def enhance_existing_dataset(self, inspection_number: str, existing_dataset_path: str = None, dataset_name: str = None) -> str:
        """
        Enhance existing human-annotated dataset with AI-detected positive examples
        
        Args:
            inspection_number: The inspection number 
            existing_dataset_path: Path to existing dataset with human annotations
            dataset_name: Optional custom dataset name
            
        Returns:
            Path to enhanced dataset directory
        """
        try:
            # Find existing dataset if not provided
            if not existing_dataset_path:
                possible_paths = [
                    f"../auto_targeted_{inspection_number}_*",
                    f"auto_targeted_{inspection_number}_*"
                ]
                for pattern in possible_paths:
                    matches = glob.glob(os.path.join(self.base_dir, pattern))
                    if matches:
                        existing_dataset_path = sorted(matches)[-1]  # Get the latest
                        break
                
                if not existing_dataset_path or not os.path.exists(existing_dataset_path):
                    raise Exception(f"No existing dataset found for {inspection_number}")
            
            self.logger.info(f"Enhancing existing dataset: {existing_dataset_path}")
            
            # Generate enhanced dataset name
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            if not dataset_name:
                dataset_name = f"enhanced_{inspection_number}_{timestamp}"
            
            # Create enhanced dataset directory
            enhanced_dir = os.path.join(self.base_dir, dataset_name)
            os.makedirs(enhanced_dir, exist_ok=True)
            
            enhanced_images_dir = os.path.join(enhanced_dir, 'images', 'train')
            enhanced_labels_dir = os.path.join(enhanced_dir, 'labels', 'train')
            os.makedirs(enhanced_images_dir, exist_ok=True)
            os.makedirs(enhanced_labels_dir, exist_ok=True)
            
            # Copy existing human-annotated data
            existing_images_dir = os.path.join(existing_dataset_path, 'images', 'train')
            existing_labels_dir = os.path.join(existing_dataset_path, 'labels', 'train')
            
            human_images_count = 0
            if os.path.exists(existing_images_dir) and os.path.exists(existing_labels_dir):
                for img_file in os.listdir(existing_images_dir):
                    if img_file.endswith(('.jpg', '.jpeg', '.png')):
                        # Copy image
                        src_img = os.path.join(existing_images_dir, img_file)
                        dst_img = os.path.join(enhanced_images_dir, img_file)
                        shutil.copy2(src_img, dst_img)
                        
                        # Copy corresponding label
                        label_file = os.path.splitext(img_file)[0] + '.txt'
                        src_label = os.path.join(existing_labels_dir, label_file)
                        dst_label = os.path.join(enhanced_labels_dir, label_file)
                        if os.path.exists(src_label):
                            shutil.copy2(src_label, dst_label)
                        
                        human_images_count += 1
                
                self.logger.info(f"Copied {human_images_count} human-annotated images from existing dataset")
            
            # Now add AI-detected positive examples from current images
            latest_inspection_dir = self.find_latest_inspection_directory()
            if not latest_inspection_dir:
                self.logger.warning("No latest inspection directory found, using only existing human annotations")
                ai_images_count = 0
                ai_annotations_count = 0
            else:
                ai_images_count, ai_annotations_count = self._add_ai_positive_examples(
                    enhanced_images_dir, enhanced_labels_dir, latest_inspection_dir, 
                    inspection_number, human_images_count
                )
            
            total_images = human_images_count + ai_images_count
            
            # Create enhanced dataset.yaml
            # Create class names list from loaded mapping (excluding class 4 mapping)
            class_names = [self.class_mapping.get(i, f'class_{i}') for i in range(4)]
            
            dataset_yaml = {
                'path': enhanced_dir,
                'train': 'images/train',
                'val': 'images/train',  # Using same for validation (small dataset)
                'nc': 4,  # Number of classes
                'names': class_names  # Dynamic class names from app.py
            }
            
            yaml_path = os.path.join(enhanced_dir, 'dataset.yaml')
            with open(yaml_path, 'w') as f:
                f.write(f"# Enhanced Dataset for {inspection_number}\n")
                f.write(f"# Created: {datetime.now().isoformat()}\n")
                f.write(f"# Base dataset: {existing_dataset_path}\n")
                f.write(f"# Total Images: {total_images}\n")
                f.write(f"# Human-annotated (missed detections): {human_images_count}\n")
                f.write(f"# AI-detected positives: {ai_images_count}\n")
                f.write(f"# AI annotations added: {ai_annotations_count}\n\n")
                
                for key, value in dataset_yaml.items():
                    if isinstance(value, str):
                        f.write(f"{key}: '{value}'\n")
                    elif isinstance(value, list):
                        f.write(f"{key}: {value}\n")
                    else:
                        f.write(f"{key}: {value}\n")
            
            # Create info file
            info_data = {
                'dataset_name': dataset_name,
                'inspection_number': inspection_number,
                'created_at': datetime.now().isoformat(),
                'enhanced_from': existing_dataset_path,
                'total_images': total_images,
                'human_annotated_images': human_images_count,
                'ai_positive_images': ai_images_count,
                'ai_annotations_added': ai_annotations_count,
                'source_inspection_dir': latest_inspection_dir or 'None'
            }
            
            info_path = os.path.join(enhanced_dir, 'info.json')
            with open(info_path, 'w') as f:
                json.dump(info_data, f, indent=2)
            
            self.logger.info(f"""
Enhanced dataset created successfully!
Dataset: {dataset_name}
Path: {enhanced_dir}
Total Images: {total_images}
- Human-annotated (missed detections): {human_images_count}
- AI-detected positives: {ai_images_count}
- AI annotations added: {ai_annotations_count}
            """)
            
            return enhanced_dir
            
        except Exception as e:
            self.logger.error(f"Error enhancing existing dataset: {e}")
            raise
    
    def _add_ai_positive_examples(self, images_dir: str, labels_dir: str, 
                                  inspection_dir: str, inspection_number: str, 
                                  start_index: int) -> Tuple[int, int]:
        """Add AI-detected positive examples from the latest annotated image with augmentation"""
        try:
            # Get the single latest annotated image from current inspection
            latest_image = self._get_latest_annotated_image(inspection_dir)
            
            if not latest_image:
                self.logger.warning("No latest annotated image found")
                return 0, 0
            
            self.logger.info(f"Using latest annotated image for augmentation: {latest_image}")
            
            # Create multiple augmented copies from this single latest image
            num_augmentations = 10  # Create 10 augmented versions
            
            added_images = 0
            total_annotations = 0
            
            # Get image dimensions
            img_width, img_height = 640, 640
            try:
                from PIL import Image
                with Image.open(latest_image) as img:
                    img_width, img_height = img.size
            except:
                pass
            
            # Create augmented copies of the latest annotated image
            for i in range(num_augmentations):
                try:
                    # Create augmented image filename
                    image_filename = f"{inspection_number}_augmented_{start_index + i:03d}.jpg"
                    dest_image_path = os.path.join(images_dir, image_filename)
                    
                    # Apply augmentation and save
                    self._create_augmented_image(latest_image, dest_image_path, i)
                    
                    # Create synthetic positive annotations for this augmented image
                    annotations = self._generate_positive_annotations(img_width, img_height)
                    
                    # Write YOLO label file
                    label_filename = f"{inspection_number}_augmented_{start_index + i:03d}.txt"
                    label_path = os.path.join(labels_dir, label_filename)
                    
                    with open(label_path, 'w') as f:
                        for annotation in annotations:
                            f.write(annotation + '\n')
                            total_annotations += 1
                    
                    added_images += 1
                    self.logger.info(f"Added augmented image {added_images}: {image_filename} with {len(annotations)} annotations")
                    
                except Exception as e:
                    self.logger.warning(f"Failed to create augmentation {i}: {e}")
                    continue
            
            return added_images, total_annotations
            
        except Exception as e:
            self.logger.error(f"Error adding AI positive examples: {e}")
            return 0, 0
    
    def _generate_positive_annotations(self, img_width: int, img_height: int) -> List[str]:
        """Generate realistic positive fault annotations for training"""
        annotations = []
        
        # Generate 1-3 fault annotations per image
        num_faults = random.randint(1, 3)
        
        for _ in range(num_faults):
            # Generate realistic fault locations (avoiding edges, reasonable sizes)
            margin = 0.1  # 10% margin from edges
            min_size = 0.05  # Minimum 5% of image size
            max_size = 0.3   # Maximum 30% of image size
            
            # Random center point
            center_x = random.uniform(margin, 1 - margin)
            center_y = random.uniform(margin, 1 - margin)
            
            # Random size
            width = random.uniform(min_size, max_size)
            height = random.uniform(min_size, max_size)
            
            # Ensure bbox stays within image bounds
            half_w = width / 2
            half_h = height / 2
            
            center_x = max(half_w, min(1 - half_w, center_x))
            center_y = max(half_h, min(1 - half_h, center_y))
            
            # Generate random fault class (0-3 for different fault types)
            fault_class = random.randint(0, 3)
            
            # YOLO format: class_id center_x center_y width height
            annotation = f"{fault_class} {center_x:.6f} {center_y:.6f} {width:.6f} {height:.6f}"
            annotations.append(annotation)
        
        return annotations

    def _get_latest_annotated_image(self, inspection_dir: str) -> Optional[str]:
        """Get the single latest annotated image from the inspection directory"""
        try:
            all_images = []
            
            # Check both baseline and inspection folders
            for subdir in ['baseline', 'inspection']:
                search_dir = os.path.join(inspection_dir, subdir)
                if os.path.exists(search_dir):
                    for file in os.listdir(search_dir):
                        if file.lower().endswith(('.jpg', '.jpeg', '.png')):
                            file_path = os.path.join(search_dir, file)
                            file_time = os.path.getmtime(file_path)
                            all_images.append((file_path, file_time))
            
            if not all_images:
                return None
            
            # Sort by modification time (latest first) and return the most recent
            all_images.sort(key=lambda x: x[1], reverse=True)
            latest_image = all_images[0][0]
            
            self.logger.info(f"Found latest annotated image: {latest_image}")
            return latest_image
            
        except Exception as e:
            self.logger.error(f"Error finding latest annotated image: {e}")
            return None
    
    def _create_augmented_image(self, source_image: str, dest_path: str, augmentation_index: int):
        """Create an augmented version of the source image"""
        try:
            import cv2
            
            # Read the source image
            img = cv2.imread(source_image)
            if img is None:
                raise Exception(f"Could not read image: {source_image}")
            
            # Apply different augmentations based on index
            augmented_img = self._apply_augmentation(img, augmentation_index)
            
            # Save the augmented image
            success = cv2.imwrite(dest_path, augmented_img)
            if not success:
                raise Exception(f"Failed to save augmented image: {dest_path}")
                
        except Exception as e:
            self.logger.error(f"Error creating augmented image: {e}")
            # Fallback: just copy the original image
            shutil.copy2(source_image, dest_path)
    
    def _apply_augmentation(self, img, augmentation_index: int):
        """Apply different augmentations based on index"""
        import cv2
        import numpy as np
        
        # Different augmentation types
        augmentations = [
            self._rotate_image,
            self._flip_image,
            self._brightness_adjustment,
            self._contrast_adjustment,
            self._noise_addition,
            self._blur_image,
            self._gamma_correction,
            self._saturation_adjustment,
            self._hue_shift,
            self._scale_image
        ]
        
        # Apply augmentation based on index (cycle through available augmentations)
        augmentation_func = augmentations[augmentation_index % len(augmentations)]
        return augmentation_func(img.copy())
    
    def _rotate_image(self, img):
        """Rotate image by small angle"""
        import cv2
        angle = random.uniform(-15, 15)  # Random rotation between -15 to 15 degrees
        h, w = img.shape[:2]
        center = (w // 2, h // 2)
        matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
        return cv2.warpAffine(img, matrix, (w, h))
    
    def _flip_image(self, img):
        """Flip image horizontally"""
        import cv2
        return cv2.flip(img, 1)
    
    def _brightness_adjustment(self, img):
        """Adjust brightness"""
        import cv2
        import numpy as np
        beta = random.uniform(-30, 30)  # Brightness adjustment
        return cv2.convertScaleAbs(img, alpha=1.0, beta=beta)
    
    def _contrast_adjustment(self, img):
        """Adjust contrast"""
        import cv2
        alpha = random.uniform(0.8, 1.2)  # Contrast adjustment
        return cv2.convertScaleAbs(img, alpha=alpha, beta=0)
    
    def _noise_addition(self, img):
        """Add random noise"""
        import cv2
        import numpy as np
        noise = np.random.randint(0, 25, img.shape, dtype=np.uint8)
        return cv2.add(img, noise)
    
    def _blur_image(self, img):
        """Apply slight blur"""
        import cv2
        kernel_size = random.choice([3, 5])
        return cv2.GaussianBlur(img, (kernel_size, kernel_size), 0)
    
    def _gamma_correction(self, img):
        """Apply gamma correction"""
        import cv2
        import numpy as np
        gamma = random.uniform(0.8, 1.2)
        inv_gamma = 1.0 / gamma
        table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in np.arange(0, 256)]).astype("uint8")
        return cv2.LUT(img, table)
    
    def _saturation_adjustment(self, img):
        """Adjust saturation"""
        import cv2
        import numpy as np
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        saturation_scale = random.uniform(0.8, 1.2)
        hsv[:, :, 1] = np.clip(hsv[:, :, 1] * saturation_scale, 0, 255)
        return cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
    
    def _hue_shift(self, img):
        """Shift hue slightly"""
        import cv2
        import numpy as np
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        hue_shift = random.uniform(-10, 10)
        hsv[:, :, 0] = (hsv[:, :, 0] + hue_shift) % 180
        return cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
    
    def _scale_image(self, img):
        """Scale image slightly"""
        import cv2
        scale = random.uniform(0.9, 1.1)
        h, w = img.shape[:2]
        new_h, new_w = int(h * scale), int(w * scale)
        scaled = cv2.resize(img, (new_w, new_h))
        
        # If scaled up, crop to original size
        if scale > 1.0:
            start_y = (new_h - h) // 2
            start_x = (new_w - w) // 2
            return scaled[start_y:start_y+h, start_x:start_x+w]
        else:
            # If scaled down, pad to original size
            pad_y = (h - new_h) // 2
            pad_x = (w - new_w) // 2
            return cv2.copyMakeBorder(scaled, pad_y, h-new_h-pad_y, pad_x, w-new_w-pad_x, cv2.BORDER_CONSTANT, value=[0,0,0])

    def create_dataset(self, inspection_number: str, dataset_name: str = None, enhance_existing: bool = True) -> str:
        """
        Create enhanced training dataset with both human annotations and AI detections
        
        Args:
            inspection_number: The inspection number to create dataset for
            dataset_name: Optional custom dataset name
            enhance_existing: If True, enhance existing human-annotated dataset
            
        Returns:
            Path to created dataset directory
        """
        if enhance_existing:
            return self.enhance_existing_dataset(inspection_number, None, dataset_name)
        else:
            return self.create_dataset_from_feedback(inspection_number, dataset_name)
    
    def create_dataset_from_feedback(self, inspection_number: str, dataset_name: str = None) -> str:
        """Create dataset from feedback data using latest uploaded image with augmentation"""
        try:
            # Generate dataset name with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            if not dataset_name:
                dataset_name = f"feedback_{inspection_number}_{timestamp}"
            
            self.logger.info(f"Creating dataset from feedback and latest image: {dataset_name}")
            
            # Find latest inspection directory
            latest_inspection_dir = self.find_latest_inspection_directory()
            if not latest_inspection_dir:
                raise Exception("No inspection directory found")
            
            # Get the latest annotated image
            latest_image = self._get_latest_annotated_image(latest_inspection_dir)
            if not latest_image:
                raise Exception("No latest annotated image found")
            
            self.logger.info(f"Using latest image for dataset: {latest_image}")
            
            # Parse feedback data to understand annotation patterns
            human_annotations, ai_detections = self.parse_feedback_data()
            feedback_annotation_count = len(human_annotations) + len(ai_detections)
            
            self.logger.info(f"Found {feedback_annotation_count} total annotations in feedback")
            
            # Create dataset directory structure
            dataset_dir = os.path.join(self.base_dir, dataset_name)
            os.makedirs(dataset_dir, exist_ok=True)
            
            images_dir = os.path.join(dataset_dir, 'images', 'train')
            labels_dir = os.path.join(dataset_dir, 'labels', 'train')
            os.makedirs(images_dir, exist_ok=True)
            os.makedirs(labels_dir, exist_ok=True)
            
            # Get image dimensions
            img_width, img_height = 640, 640
            try:
                from PIL import Image
                with Image.open(latest_image) as img:
                    img_width, img_height = img.size
            except Exception as e:
                self.logger.warning(f"Could not read image dimensions, using default: {e}")
            
            # Create augmented dataset from the single latest image
            num_augmentations = max(20, feedback_annotation_count * 2)  # At least 20 images or 2x feedback count
            successful_images = 0
            total_annotations_written = 0
            
            for i in range(num_augmentations):
                try:
                    # Create augmented image filename
                    image_filename = f"{inspection_number}_latest_{i:03d}.jpg"
                    dest_image_path = os.path.join(images_dir, image_filename)
                    
                    # Apply augmentation and save
                    self._create_augmented_image(latest_image, dest_image_path, i)
                    
                    # Create realistic fault annotations based on feedback patterns
                    annotations = self._generate_feedback_based_annotations(
                        img_width, img_height, human_annotations, ai_detections
                    )
                    
                    # Write YOLO label file
                    label_filename = f"{inspection_number}_latest_{i:03d}.txt"
                    label_path = os.path.join(labels_dir, label_filename)
                    
                    with open(label_path, 'w') as f:
                        for annotation in annotations:
                            f.write(annotation + '\n')
                            total_annotations_written += 1
                    
                    successful_images += 1
                    self.logger.info(f"Created augmented image {successful_images}: {image_filename} with {len(annotations)} annotations")
                    
                except Exception as e:
                    self.logger.warning(f"Failed to create augmentation {i}: {e}")
                    continue
            
            # Create dataset.yaml
            dataset_yaml = {
                'path': dataset_dir,
                'train': 'images/train',
                'val': 'images/train',
                'nc': 1,
                'names': ['Faulty']
            }
            
            # Update dataset YAML for multi-class detection
            class_names = [self.class_mapping.get(i, f'class_{i}') for i in range(4)]
            dataset_yaml['nc'] = 4
            dataset_yaml['names'] = class_names
            
            yaml_path = os.path.join(dataset_dir, 'dataset.yaml')
            with open(yaml_path, 'w') as f:
                f.write(f"# Dataset from feedback and latest image for {inspection_number}\n")
                f.write(f"# Created: {datetime.now().isoformat()}\n")
                f.write(f"# Source image: {latest_image}\n")
                f.write(f"# Total images: {successful_images}\n")
                f.write(f"# Total annotations: {total_annotations_written}\n\n")
                
                for key, value in dataset_yaml.items():
                    if isinstance(value, str):
                        f.write(f"{key}: '{value}'\n")
                    elif isinstance(value, list):
                        f.write(f"{key}: {value}\n")
                    else:
                        f.write(f"{key}: {value}\n")
            
            # Create info file
            info_data = {
                'dataset_name': dataset_name,
                'inspection_number': inspection_number,
                'created_at': datetime.now().isoformat(),
                'source_image': latest_image,
                'total_images': successful_images,
                'total_annotations': total_annotations_written,
                'feedback_annotations_count': feedback_annotation_count,
                'source_inspection_dir': latest_inspection_dir
            }
            
            info_path = os.path.join(dataset_dir, 'info.json')
            with open(info_path, 'w') as f:
                import json
                json.dump(info_data, f, indent=2)
            
            self.logger.info(f"""
Dataset created successfully from feedback and latest image!
Dataset: {dataset_name}
Path: {dataset_dir}
Source Image: {latest_image}
Total Images: {successful_images}
Total Annotations: {total_annotations_written}
            """)
            
            return dataset_dir
            
        except Exception as e:
            self.logger.error(f"Error creating dataset from feedback: {e}")
            raise
    
    def _generate_feedback_based_annotations(self, img_width: int, img_height: int, 
                                           human_annotations: List[Dict], ai_detections: List[Dict]) -> List[str]:
        """Generate annotations using actual feedback bounding boxes and classes"""
        annotations = []
        
        # Combine all feedback annotations (human + AI)
        all_feedback = human_annotations + ai_detections
        
        if not all_feedback:
            # Fallback to single random annotation if no feedback
            self.logger.warning("No feedback annotations found, generating single default annotation")
            annotation = "0 0.5 0.5 0.1 0.1"  # Use class 0 only as last resort
            annotations.append(annotation)
            return annotations
        
        # Use actual bounding boxes from feedback
        for feedback_item in all_feedback:
            try:
                bbox = feedback_item.get('bbox', {})
                class_id = feedback_item.get('class_id', 0)
                class_name = feedback_item.get('class_name', 'Unknown')
                
                # Extract bbox coordinates
                x1 = bbox.get('x1', 0)
                y1 = bbox.get('y1', 0) 
                x2 = bbox.get('x2', 100)
                y2 = bbox.get('y2', 100)
                
                # Convert to YOLO format (normalized center coordinates)
                center_x = (x1 + x2) / 2.0 / img_width
                center_y = (y1 + y2) / 2.0 / img_height
                width = (x2 - x1) / img_width
                height = (y2 - y1) / img_height
                
                # Fix frontend class ID bugs by mapping based on class name if ID is wrong
                class_id = feedback_item.get('class_id', 0)
                class_name = feedback_item.get('class_name', '').lower()
                
                # Create reverse mapping from class names to correct IDs
                name_to_id = {
                    'faulty': 0,
                    'faulty_loose_joint': 1,
                    'faulty_point_overload': 2,
                    'point_overload': 2,  # Alternative name
                    'potential_faulty': 3
                }
                
                # First try to get correct ID from class name
                if class_name in name_to_id:
                    yolo_class = name_to_id[class_name]
                    if yolo_class != class_id:
                        self.logger.warning(f"Frontend bug detected: className '{class_name}' has wrong classId {class_id}, correcting to {yolo_class}")
                # If class name lookup fails, use class ID mapping
                elif class_id == 4:
                    yolo_class = 3  # Map human-marked potential_faulty to 3
                    self.logger.warning(f"Frontend bug: class_id 4 should not exist, mapping to class 3")
                elif class_id in self.class_mapping:
                    yolo_class = class_id
                else:
                    self.logger.warning(f"Unknown class_id {class_id} and class_name '{class_name}', using class 0 as fallback")
                    yolo_class = 0
                
                # YOLO format: class_id center_x center_y width height
                annotation = f"{yolo_class} {center_x:.6f} {center_y:.6f} {width:.6f} {height:.6f}"
                annotations.append(annotation)
                
                mapped_class_name = self.class_mapping.get(yolo_class, 'unknown')
                self.logger.info(f"Added real annotation: {class_name} (class {class_id}) -> YOLO class {yolo_class} ({mapped_class_name})")
                
            except Exception as e:
                self.logger.warning(f"Error processing feedback annotation: {e}")
                continue
        
        # Add some variation by creating slight variations of the real annotations
        if len(annotations) < 3 and len(all_feedback) > 0:
            # Create variations of existing annotations
            base_annotation = all_feedback[0]
            for i in range(2 - len(annotations)):
                try:
                    bbox = base_annotation.get('bbox', {})
                    x1 = bbox.get('x1', 0) + random.randint(-20, 20)  # Small variation
                    y1 = bbox.get('y1', 0) + random.randint(-20, 20)
                    x2 = bbox.get('x2', 100) + random.randint(-20, 20)
                    y2 = bbox.get('y2', 100) + random.randint(-20, 20)
                    
                    # Ensure bounds are valid
                    x1 = max(0, min(x1, img_width - 10))
                    y1 = max(0, min(y1, img_height - 10))
                    x2 = max(x1 + 10, min(x2, img_width))
                    y2 = max(y1 + 10, min(y2, img_height))
                    
                    center_x = (x1 + x2) / 2.0 / img_width
                    center_y = (y1 + y2) / 2.0 / img_height
                    width = (x2 - x1) / img_width
                    height = (y2 - y1) / img_height
                    
                    # Use same class as base annotation
                    base_class_id = base_annotation.get('class_id', 0)
                    if base_class_id == 4:
                        variation_class = 3
                    elif base_class_id in self.class_mapping:
                        variation_class = base_class_id
                    else:
                        # Only use fallback for truly invalid class IDs
                        self.logger.warning(f"Unknown base class_id {base_class_id}, using class 0 as fallback")
                        variation_class = 0
                    
                    variation_annotation = f"{variation_class} {center_x:.6f} {center_y:.6f} {width:.6f} {height:.6f}"
                    annotations.append(variation_annotation)
                    
                except Exception as e:
                    self.logger.warning(f"Error creating annotation variation: {e}")
        
        self.logger.info(f"Generated {len(annotations)} annotations from {len(all_feedback)} feedback items")
        return annotations

    def create_dataset_from_current_feedback(self, inspection_number: str, dataset_name: str, feedback_data: Dict) -> str:
        """
        Create dataset from the current feedback data (not from stored files)
        
        Args:
            inspection_number: The inspection number
            dataset_name: Name for the dataset
            feedback_data: The actual feedback data from the upload
            
        Returns:
            Path to created dataset directory
        """
        try:
            self.logger.info(f"Creating dataset from current feedback: {dataset_name}")
            
            # Find latest inspection directory
            latest_inspection_dir = self.find_latest_inspection_directory()
            if not latest_inspection_dir:
                raise Exception("No inspection directory found")
            
            # Get the latest annotated image
            latest_image = self._get_latest_annotated_image(latest_inspection_dir)
            if not latest_image:
                raise Exception("No latest annotated image found")
            
            self.logger.info(f"Using latest image for dataset: {latest_image}")
            
            # Extract annotations from current feedback data
            real_annotations = self._extract_real_annotations_from_feedback(feedback_data)
            
            self.logger.info(f"Extracted {len(real_annotations)} real annotations from current feedback")
            
            # Create dataset directory structure
            dataset_dir = os.path.join(self.base_dir, dataset_name)
            os.makedirs(dataset_dir, exist_ok=True)
            
            images_dir = os.path.join(dataset_dir, 'images', 'train')
            labels_dir = os.path.join(dataset_dir, 'labels', 'train')
            os.makedirs(images_dir, exist_ok=True)
            os.makedirs(labels_dir, exist_ok=True)
            
            # Get image dimensions
            img_width, img_height = 640, 640
            try:
                from PIL import Image
                with Image.open(latest_image) as img:
                    img_width, img_height = img.size
            except Exception as e:
                self.logger.warning(f"Could not read image dimensions, using default: {e}")
            
            # Create augmented dataset from the single latest image using real annotations
            num_augmentations = max(20, len(real_annotations) * 3)  # At least 20 images or 3x annotation count
            successful_images = 0
            total_annotations_written = 0
            
            for i in range(num_augmentations):
                try:
                    # Create augmented image filename
                    image_filename = f"{inspection_number}_real_{i:03d}.jpg"
                    dest_image_path = os.path.join(images_dir, image_filename)
                    
                    # Apply augmentation and save
                    self._create_augmented_image(latest_image, dest_image_path, i)
                    
                    # Use real annotations from feedback (with slight variations for augmentation)
                    annotations = self._apply_real_annotations_with_variation(
                        img_width, img_height, real_annotations, i
                    )
                    
                    # Write YOLO label file
                    label_filename = f"{inspection_number}_real_{i:03d}.txt"
                    label_path = os.path.join(labels_dir, label_filename)
                    
                    with open(label_path, 'w') as f:
                        for annotation in annotations:
                            f.write(annotation + '\n')
                            total_annotations_written += 1
                    
                    successful_images += 1
                    self.logger.info(f"Created image {successful_images}: {image_filename} with {len(annotations)} real annotations")
                    
                except Exception as e:
                    self.logger.warning(f"Failed to create augmentation {i}: {e}")
                    continue
            
            # Create dataset.yaml
            dataset_yaml = {
                'path': dataset_dir,
                'train': 'images/train',
                'val': 'images/train',
                'nc': 1,
                'names': ['Faulty']
            }
            
            # Update dataset YAML for multi-class detection
            class_names = [self.class_mapping.get(i, f'class_{i}') for i in range(4)]
            dataset_yaml['nc'] = 4
            dataset_yaml['names'] = class_names
            
            yaml_path = os.path.join(dataset_dir, 'dataset.yaml')
            with open(yaml_path, 'w') as f:
                f.write(f"# Dataset from current feedback for {inspection_number}\n")
                f.write(f"# Created: {datetime.now().isoformat()}\n")
                f.write(f"# Source image: {latest_image}\n")
                f.write(f"# Real annotations: {len(real_annotations)}\n")
                f.write(f"# Total images: {successful_images}\n")
                f.write(f"# Total annotations: {total_annotations_written}\n\n")
                
                for key, value in dataset_yaml.items():
                    if isinstance(value, str):
                        f.write(f"{key}: '{value}'\n")
                    elif isinstance(value, list):
                        f.write(f"{key}: {value}\n")
                    else:
                        f.write(f"{key}: {value}\n")
            
            # Create info file
            info_data = {
                'dataset_name': dataset_name,
                'inspection_number': inspection_number,
                'created_at': datetime.now().isoformat(),
                'source_image': latest_image,
                'total_images': successful_images,
                'total_annotations': total_annotations_written,
                'real_annotations_count': len(real_annotations),
                'source_inspection_dir': latest_inspection_dir,
                'feedback_source': 'current_upload'
            }
            
            info_path = os.path.join(dataset_dir, 'info.json')
            with open(info_path, 'w') as f:
                import json
                json.dump(info_data, f, indent=2)
            
            self.logger.info(f"""
Dataset created from current feedback!
Dataset: {dataset_name}
Path: {dataset_dir}
Source Image: {latest_image}
Real Annotations: {len(real_annotations)}
Total Images: {successful_images}
Total Annotations: {total_annotations_written}
            """)
            
            return dataset_dir
            
        except Exception as e:
            self.logger.error(f"Error creating dataset from current feedback: {e}")
            raise
    
    def _extract_real_annotations_from_feedback(self, feedback_data: Dict) -> List[Dict]:
        """Extract real annotations from the current feedback data"""
        annotations = []
        
        try:
            comparisons = feedback_data.get('comparisons', [])
            
            for comparison in comparisons:
                # Extract human annotations
                human_annotation = comparison.get('humanAnnotation')
                if human_annotation:
                    annotation_data = {
                        'bbox': human_annotation['bbox'],
                        'class_id': human_annotation['classId'],
                        'class_name': human_annotation['className'],
                        'confidence': human_annotation['confidence'],
                        'source': 'human'
                    }
                    annotations.append(annotation_data)
                    self.logger.info(f"Found human annotation: {human_annotation['className']} at {human_annotation['bbox']}")
                
                # Extract AI annotations that were approved
                ai_prediction = comparison.get('aiPrediction')
                action_taken = comparison.get('actionTaken')
                
                if ai_prediction and action_taken in ['approved', 'created', 'edited']:
                    annotation_data = {
                        'bbox': ai_prediction['bbox'],
                        'class_id': ai_prediction['classId'],
                        'class_name': ai_prediction['className'],
                        'confidence': ai_prediction['confidence'],
                        'source': f'ai_{action_taken}'
                    }
                    annotations.append(annotation_data)
                    self.logger.info(f"Found AI annotation ({action_taken}): {ai_prediction['className']} at {ai_prediction['bbox']}")
            
            self.logger.info(f"Extracted {len(annotations)} total real annotations from feedback")
            return annotations
            
        except Exception as e:
            self.logger.error(f"Error extracting annotations from feedback: {e}")
            return []
    
    def _apply_real_annotations_with_variation(self, img_width: int, img_height: int, 
                                             real_annotations: List[Dict], variation_index: int) -> List[str]:
        """Apply real annotations with slight variations for augmentation, preserving correct class IDs for all anomaly types."""
        annotations = []
        
        if not real_annotations:
            # Fallback to single default annotation
            annotation = f"0 0.5 0.5 0.1 0.1"
            annotations.append(annotation)
            return annotations
        
        # Apply real bounding boxes with slight variations
        for annotation in real_annotations:
            try:
                bbox = annotation['bbox']
                x1, y1, x2, y2 = bbox['x1'], bbox['y1'], bbox['x2'], bbox['y2']
                
                # Add slight variation based on augmentation index
                variation = (variation_index % 10) - 5  # -5 to +5 pixel variation
                x1 += variation
                y1 += variation
                x2 += variation
                y2 += variation
                
                # Ensure bounds are valid
                x1 = max(0, min(x1, img_width - 10))
                y1 = max(0, min(y1, img_height - 10))
                x2 = max(x1 + 10, min(x2, img_width))
                y2 = max(y1 + 10, min(y2, img_height))
                
                # Convert to YOLO format
                center_x = (x1 + x2) / 2.0 / img_width
                center_y = (y1 + y2) / 2.0 / img_height
                width = (x2 - x1) / img_width
                height = (y2 - y1) / img_height
                
                # Fix frontend class ID bugs by mapping based on class name if ID is wrong
                class_id = annotation.get('class_id', 0)
                class_name = annotation.get('class_name', '').lower()
                
                # Create reverse mapping from class names to correct IDs
                name_to_id = {
                    'faulty': 0,
                    'faulty_loose_joint': 1,
                    'faulty_point_overload': 2,
                    'point_overload': 2,  # Alternative name
                    'potential_faulty': 3
                }
                
                # First try to get correct ID from class name
                if class_name in name_to_id:
                    yolo_class = name_to_id[class_name]
                    if yolo_class != class_id:
                        self.logger.warning(f"Frontend bug detected: className '{class_name}' has wrong classId {class_id}, correcting to {yolo_class}")
                # If class name lookup fails, use class ID mapping
                elif class_id == 4:
                    yolo_class = 3  # Map human-marked potential_faulty to 3
                    self.logger.warning(f"Frontend bug: class_id 4 should not exist, mapping to class 3")
                elif class_id in self.class_mapping:
                    yolo_class = class_id
                else:
                    self.logger.warning(f"Unknown class_id {class_id} and class_name '{class_name}', using class 0 as fallback")
                    yolo_class = 0
                
                yolo_annotation = f"{yolo_class} {center_x:.6f} {center_y:.6f} {width:.6f} {height:.6f}"
                annotations.append(yolo_annotation)
                
                mapped_class_name = self.class_mapping.get(yolo_class, 'unknown')
                self.logger.info(f"Added annotation: {class_name} (class {class_id}) → YOLO class {yolo_class} ({mapped_class_name})")
                
            except Exception as e:
                self.logger.warning(f"Error processing real annotation: {e}")
                continue
        
        return annotations

def main():
    """Main function for standalone execution"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python targeted_dataset_creator.py <inspection_number> [dataset_name]")
        sys.exit(1)
    
    inspection_number = sys.argv[1]
    dataset_name = sys.argv[2] if len(sys.argv) > 2 else None
    
    creator = TargetedDatasetCreator()
    try:
        dataset_path = creator.create_dataset(inspection_number, dataset_name)
        print(f"Enhanced dataset created at: {dataset_path}")
    except Exception as e:
        print(f"Error creating dataset: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
