#!/usr/bin/env python3
"""
TransX ML Service - Phase 2 & 3
Python Flask service for YOLOv8 anomaly detection with similarity-based comparison
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import torch
import cv2
import numpy as np
from pathlib import Path
import uuid
import logging
import sys
import os
import json
from datetime import datetime

# Add paths to import the similarity system
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'Faulty_Detection'))

# Setup logging first
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Import similarity-based YOLO system
try:
    from similarity_yolo_system import SimilarityBasedYOLOSystem
    SIMILARITY_SYSTEM_AVAILABLE = True
    logger.info("Similarity-based YOLO system imported successfully")
except ImportError as e:
    SIMILARITY_SYSTEM_AVAILABLE = False
    logger.warning(f"Could not import similarity system: {e}")
    logger.warning("Falling back to single image inference")

# Import enhanced dataset creator for auto fine-tuning
try:
    from targeted_dataset_creator import TargetedDatasetCreator
    DATASET_CREATOR_AVAILABLE = True
    logger.info("Enhanced dataset creator imported successfully")
except ImportError as e:
    DATASET_CREATOR_AVAILABLE = False
    logger.warning(f"Could not import dataset creator: {e}")
    logger.warning("Auto fine-tuning will not be available")

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Model configuration - Updated to use YOLOv8p2 weights
MODEL_PATHS = [
    str(Path(__file__).parent.parent / "Faulty_Detection/yolov8p2.pt")
]
MODEL_PATH = None  # Will be determined dynamically
model = None

# Similarity system instance
similarity_system = None

# Class mapping from rules.txt
CLASS_NAMES = {
    0: 'faulty',
    1: 'faulty_loose_joint', 
    2: 'faulty_point_overload',
    3: 'potential_faulty'
}

# Color mapping for visualization (RGB for JSON response)
CLASS_COLORS = {
    0: [255, 0, 0],      # Red - Faulty
    1: [0, 255, 0],      # Green - faulty_loose_joint
    2: [0, 0, 255],      # Blue - faulty_point_overload
    3: [255, 255, 0]     # Yellow - potential_faulty
}


def patch_torch_load():
    """Apply PyTorch compatibility patch for weights_only parameter"""
    original_load = torch.load
    
    def patched_load(f, map_location=None, pickle_module=None, weights_only=None, **kwargs):
        # Force weights_only=False for .pt files
        if isinstance(f, (str, Path)):
            if str(f).endswith('.pt'):
                weights_only = False
        elif hasattr(f, 'name') and f.name.endswith('.pt'):
            weights_only = False
        
        return original_load(
            f, 
            map_location=map_location, 
            pickle_module=pickle_module, 
            weights_only=weights_only, 
            **kwargs
        )
    
    torch.load = patched_load
    logger.info("PyTorch compatibility patch applied")


def load_similarity_system():
    """Initialize similarity-based YOLO system with Flask-safe configuration"""
    global similarity_system
    
    if similarity_system is None and SIMILARITY_SYSTEM_AVAILABLE:
        try:
            # Find the best model path for similarity system
            selected_model_path = None
            for path in MODEL_PATHS:
                model_file = Path(path)
                if model_file.exists():
                    selected_model_path = str(model_file)
                    break
            
            if selected_model_path is None:
                raise FileNotFoundError(f"No model found for similarity system! Searched paths: {MODEL_PATHS}")
            
            # Initialize with default parameters
            similarity_system = SimilarityBasedYOLOSystem(
                similarity_threshold=0.5,  # Default threshold for similarity
                change_threshold=0.2,      # Default threshold for significance
                model_path=selected_model_path
            )
            
            # Patch the visualization method to prevent GUI issues in Flask
            def dummy_visualization(*args, **kwargs):
                """Dummy visualization that returns None to avoid matplotlib GUI threading issues"""
                return None
                
            similarity_system.create_comparison_visualization = dummy_visualization
            logger.info("Similarity-based YOLO system initialized (Flask-safe) with model: {selected_model_path}")
            return similarity_system
            
        except Exception as e:
            logger.error(f"Failed to initialize similarity system: {e}")
            raise
    
    return similarity_system


def load_model():
    """Load YOLOv8p2 model with dynamic path selection (lazy loading, keeps in memory)"""
    global model, MODEL_PATH
    
    if model is None:
        try:
            patch_torch_load()
            # Always use the latest timestamped yolov8p2 model in Faulty_Detection if available
            model_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'Faulty_Detection'))
            pt_files = [f for f in os.listdir(model_dir) if f.startswith('yolov8p2_') and f.endswith('.pt')]
            selected_model_path = None
            if pt_files:
                pt_files.sort(reverse=True)  # Latest first
                selected_model_path = os.path.join(model_dir, pt_files[0])
            else:
                # Fallback to default yolov8p2.pt
                default_path = os.path.join(model_dir, 'yolov8p2.pt')
                if os.path.exists(default_path):
                    selected_model_path = default_path
            if selected_model_path is None:
                raise FileNotFoundError(f"No YOLOv8p2 model found in {model_dir}")
            global MODEL_PATH
            MODEL_PATH = selected_model_path
            logger.info(f"Found YOLOv8p2 model: {MODEL_PATH}")
            model = YOLO(MODEL_PATH)
            logger.info("YOLOv8p2 model loaded successfully!")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise
    return model


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint with similarity system status"""
    try:
        model_loaded = model is not None
        model_path_exists = Path(MODEL_PATH).exists() if MODEL_PATH else False
        similarity_loaded = similarity_system is not None
        
        return jsonify({
            'status': 'healthy',
            'model_loaded': model_loaded,
            'model_path': MODEL_PATH,
            'model_path_exists': model_path_exists,
            'similarity_system_available': SIMILARITY_SYSTEM_AVAILABLE,
            'similarity_system_loaded': similarity_loaded,
            'service': 'TransX ML Service with Similarity Engine',
            'version': '2.0.0',
            'features': [
                'Standard YOLOv8 inference',
                'Similarity-based comparison' if SIMILARITY_SYSTEM_AVAILABLE else 'Similarity system unavailable',
                'Configurable thresholds',
                'Smart detection filtering'
            ]
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500


@app.route('/api/detect', methods=['POST'])
def detect_anomalies():
    """
    Main detection endpoint using similarity-based YOLO system
    
    Request JSON:
    {
        "inspection_image_path": "/absolute/path/to/inspection.jpg",
        "baseline_image_path": "/absolute/path/to/baseline.jpg",  // optional but recommended
        "confidence_threshold": 0.25  # threshold as decimal (0.0-1.0)
    }
    
    Response JSON:
    {
        "success": true,
        "detections": [...],
        "image_dimensions": {...},
        "inference_time_ms": 245.3,
        "model_info": {...},
        "similarity_analysis": {...}
    }
    """
    try:
        # Parse request
        data = request.json
        if not data:
            return jsonify({
                'success': False,
                'error': 'No JSON data provided'
            }), 400
        
        # Get parameters
        inspection_image_path = data.get('inspection_image_path') or data.get('image_path')  # backward compatibility
        logger.info(f"[DEBUG] Received inspection_image_path: {inspection_image_path}")
        if inspection_image_path:
            logger.info(f"[DEBUG] File exists: {os.path.exists(inspection_image_path)}")
        baseline_image_path = data.get('baseline_image_path')
        confidence_threshold = data.get('confidence_threshold', 0.25)
        
        # Debug prints
        logger.info("SIMILARITY-BASED ANOMALY DETECTION")
        logger.info(f"Inspection Image: {inspection_image_path}")
        logger.info(f"Baseline Image: {baseline_image_path}")
        logger.info(f"Confidence Threshold: {confidence_threshold}")
        
        if not inspection_image_path:
            return jsonify({
                'success': False,
                'error': 'inspection_image_path is required'
            }), 400
        
        # Verify inspection image exists
        inspection_file = Path(inspection_image_path)
        if not inspection_file.exists() and not inspection_file.is_absolute():
            # Check relative to backend/uploads or parent project directories
            possible_bases = [
                Path(__file__).resolve().parent.parent / "backend",
                Path(__file__).resolve().parent.parent,
                Path(__file__).resolve().parent,
            ]
            for base in possible_bases:
                candidate = (base / inspection_image_path).resolve()
                if candidate.exists():
                    inspection_file = candidate
                    inspection_image_path = str(candidate)
                    logger.info(f"Resolved relative inspection image to: {inspection_file}")
                    break

        if not inspection_file.exists():
            logger.error(f"Inspection image not found: {inspection_image_path}")
            return jsonify({
                'success': False,
                'error': f'Inspection image file not found: {inspection_image_path}'
            }), 404
        
        # Verify baseline image if provided
        if baseline_image_path:
            baseline_file = Path(baseline_image_path)
            if not baseline_file.exists() and not baseline_file.is_absolute():
                possible_bases = [
                    Path(__file__).resolve().parent.parent / "backend",
                    Path(__file__).resolve().parent.parent,
                    Path(__file__).resolve().parent,
                ]
                for base in possible_bases:
                    candidate = (base / baseline_image_path).resolve()
                    if candidate.exists():
                        baseline_file = candidate
                        baseline_image_path = str(candidate)
                        logger.info(f"Resolved relative baseline image to: {baseline_file}")
                        break
            if not baseline_file.exists():
                logger.warning(f"Baseline image not found: {baseline_image_path}")
                baseline_image_path = None
            else:
                logger.info(f"Baseline image found: {baseline_image_path}")
        
        # Read inspection image to get dimensions
        img = cv2.imread(str(inspection_file))
        if img is None:
            # Fallback for paths with special characters/spaces/parens on Windows
            try:
                import numpy as np
                img = cv2.imdecode(np.fromfile(str(inspection_file), dtype=np.uint8), cv2.IMREAD_COLOR)
            except Exception as e:
                logger.warning(f"cv2.imdecode fallback failed: {e}")

        if img is None:
            logger.error(f"[DEBUG] cv2.imread returned None for: {inspection_image_path}")
            return jsonify({
                'success': False,
                'error': f'Could not read inspection image: {inspection_image_path}'
            }), 400
        else:
            logger.info(f"[DEBUG] cv2.imread shape: {img.shape if img is not None else None}")
        height, width = img.shape[:2]
        logger.info(f"Image dimensions: {width}x{height}")
        
        import time
        start_time = time.time()
        
        # Choose inference method based on baseline availability
        if baseline_image_path and SIMILARITY_SYSTEM_AVAILABLE:
            # Use similarity-based YOLO system
            logger.info("SIMILARITY-BASED YOLO MODE")
            logger.info("Running advanced comparison analysis...")
        else:
            if not baseline_image_path:
                logger.info("SINGLE IMAGE MODE - No baseline image provided")
            if not SIMILARITY_SYSTEM_AVAILABLE:
                logger.warning("SINGLE IMAGE MODE - Similarity system not available")
            
            try:
                # Initialize similarity system if needed
                sim_system = load_similarity_system()
                # Run similarity-based analysis (disable visualization to prevent GUI threading issues)
                results = sim_system.analyze_image_pair(
                    baseline_image_path,  # reference image
                    inspection_image_path,  # target image
                    verbose=False  # Disable verbose to avoid matplotlib GUI issues in Flask
                )
                # Extract detections from similarity system results
                detections = []
                yolo_analysis = results.get('yolo_analysis', {})
                target_detections = yolo_analysis.get('target_detections', [])
                if target_detections:
                    logger.info(f"Similarity system found {len(target_detections)} detections")
                    for detection in target_detections:
                        conf = detection['confidence']
                        if conf >= confidence_threshold:
                            class_name = detection.get('className', detection.get('class_name', 'unknown'))
                            bbox = detection['bbox']
                            class_id = None
                            for cid, cname in CLASS_NAMES.items():
                                if cname.lower() == class_name.lower():
                                    class_id = cid
                                    break
                            if class_id is None:
                                class_id = 0
                                for cid, cname in CLASS_NAMES.items():
                                    if class_name.lower() in cname.lower() or cname.lower() in class_name.lower():
                                        class_id = cid
                                        break
                            detection_obj = {
                                'id': str(uuid.uuid4()),
                                'classId': class_id,
                                'className': CLASS_NAMES.get(class_id, class_name),
                                'confidence': round(conf, 3),
                                'bbox': {
                                    'x1': bbox['x1'],
                                    'y1': bbox['y1'],
                                    'x2': bbox['x2'],
                                    'y2': bbox['y2']
                                },
                                'color': CLASS_COLORS.get(class_id, [255, 255, 255]),
                                'source': 'similarity_ai'
                            }
                            detections.append(detection_obj)
                            logger.info(f"Detection: {detection_obj['className']} @ ({bbox['x1']},{bbox['y1']},{bbox['x2']},{bbox['y2']}) conf={conf:.3f}")
                else:
                    logger.warning("No detections found by similarity system - falling back to standard YOLO detection")
                    # Fallback to standard YOLO detection
                    raise Exception("No detections from similarity system")
                # Calculate inference time
                inference_time = (time.time() - start_time) * 1000
                similarity_data = results.get('similarity_analysis', {})
                combined_data = results.get('combined_analysis', {})
                response = {
                    'success': True,
                    'detections': detections,
                    'image_dimensions': {
                        'width': width,
                        'height': height
                    },
                    'inference_time_ms': round(inference_time, 2),
                    'model_info': {
                        'type': 'SimilarityBasedYOLO',
                        'classes': CLASS_NAMES,
                        'engine': 'similarity_yolo_system.py'
                    },
                    'similarity_analysis': {
                        'is_similar': similarity_data.get('is_similar', False),
                        'confidence': similarity_data.get('confidence', 0.0),
                        'method': similarity_data.get('best_method', 'unknown'),
                        'change_detected': combined_data.get('significant_change', False),
                        'change_magnitude': combined_data.get('change_magnitude', 0.0)
                    }
                }
                logger.info(f"Similarity-based detection completed: {len(detections)} anomalies found in {inference_time:.1f}ms")
                logger.info(f"   Similarity: {similarity_data.get('confidence', 0.0):.1%}, Change detected: {combined_data.get('significant_change', False)}")
                return jsonify(response), 200
            except Exception as e:
                logger.error(f"Similarity system failed or returned no detections, running standard YOLO: {e}")
                # Fallback to single image detection below
        
        # Fallback: Single image inference (when no baseline or similarity system failed)
        logger.info("SINGLE IMAGE INFERENCE MODE")
        logger.info("Using standard YOLOv8 detection...")
        
        # Load standard model
        model = load_model()
        logger.info(f"[INFERENCE] Using model file: {MODEL_PATH}")

        # Run YOLOv8 inference
        logger.info(f"Running YOLOv8 inference with confidence threshold: {confidence_threshold}")
        results = model(str(inspection_file), conf=confidence_threshold, verbose=False)
        result = results[0]

        # Process detections
        detections = []
        boxes = result.boxes

        if boxes is not None and len(boxes) > 0:
            logger.info(f"[DEBUG] Found {len(boxes)} detections")
            for i, box in enumerate(boxes):
                conf = float(box.conf[0].cpu().numpy())
                cls = int(box.cls[0].cpu().numpy())
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int).tolist()
                detection_obj = {
                    'id': str(uuid.uuid4()),
                    'classId': cls,
                    'className': CLASS_NAMES.get(cls, f'Class_{cls}'),
                    'confidence': round(conf, 3),
                    'bbox': {
                        'x1': x1,
                        'y1': y1,
                        'x2': x2,
                        'y2': y2
                    },
                    'color': CLASS_COLORS.get(cls, [255, 255, 255]),
                    'source': 'ai'
                }
                detections.append(detection_obj)
                logger.info(f"Detection: {detection_obj['className']} @ ({x1},{y1},{x2},{y2}) conf={conf:.3f}")
        else:
            logger.info(f"[DEBUG] No anomalies detected. Boxes: {boxes}")
            print(f"RESULT: No detections found for {Path(inspection_image_path).name}")

        # Calculate inference time
        inference_time = (time.time() - start_time) * 1000

        # Build standard response
        response = {
            'success': True,
            'detections': detections,
            'image_dimensions': {
                'width': width,
                'height': height
            },
            'inference_time_ms': round(inference_time, 2),
            'model_info': {
                'type': 'YOLOv8',
                'classes': CLASS_NAMES
            }
        }

        logger.info(f"Standard detection completed: {len(detections)} anomalies found in {inference_time:.1f}ms")

        return jsonify(response), 200

    except Exception as e:
        logger.error(f"Error during detection: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/classes', methods=['GET'])
def get_classes():
    """Get available detection classes"""
    return jsonify({
        'classes': CLASS_NAMES,
        'count': len(CLASS_NAMES)
    })


# Auto Fine-tuning Functions
def should_trigger_auto_finetune(feedback_data):
    """
    Determine if automatic fine-tuning should be triggered based on feedback data
    
    Args:
        feedback_data: The feedback JSON data
        
    Returns:
        bool: True if auto fine-tuning should be triggered
    """
    try:
        summary = feedback_data.get('summary', {})
        
        # Trigger conditions (conservative thresholds - more than 1 required):
        # 1. At least 2 human annotations (missed detections)
        # 2. Or at least 2 approved AI detections
        # 3. Or at least 2 rejected detections indicating model needs improvement
        # 4. Or at least 2 edited detections
        # 5. Or total feedback activity ≥3 (mixed combination)
        
        human_annotations = summary.get('totalHumanAnnotations', 0)
        approved_detections = summary.get('approved', 0)
        rejected_detections = summary.get('rejected', 0)
        added_annotations = summary.get('added', 0)  # Human-added missed detections
        edited_detections = summary.get('edited', 0)  # Human-edited AI detections
        
        total_feedback_activity = human_annotations + approved_detections + rejected_detections + edited_detections
        
        trigger_reasons = []
        
        if added_annotations >= 1:
            trigger_reasons.append(f"Human added {added_annotations} missed detection(s)")
            
        if approved_detections >= 1:
            trigger_reasons.append(f"{approved_detections} AI detection(s) approved")
            
        if rejected_detections >= 1:
            trigger_reasons.append(f"{rejected_detections} AI detection(s) rejected")
            
        if edited_detections >= 1:
            trigger_reasons.append(f"{edited_detections} AI detection(s) edited")
            
        if total_feedback_activity >= 1:
            trigger_reasons.append(f"Total feedback activity: {total_feedback_activity}")
        
        should_trigger = len(trigger_reasons) > 0
        
        # Log detailed feedback analysis
        logger.info(f"Feedback Analysis - Added: {added_annotations}, Approved: {approved_detections}, "
                   f"Rejected: {rejected_detections}, Edited: {edited_detections}, "
                   f"Total Human: {human_annotations}, Total Activity: {total_feedback_activity}")
        
        if should_trigger:
            logger.info(f"✅ Auto fine-tuning triggered! Reasons: {'; '.join(trigger_reasons)}")
        else:
            logger.info("❌ Auto fine-tuning not triggered - no qualifying feedback conditions met")
            logger.info("Trigger requirements: ≥2 added/approved/rejected/edited OR ≥3 total activity")
            
        return should_trigger
        
    except Exception as e:
        logger.error(f"Error evaluating auto fine-tuning trigger: {e}")
        return False


def trigger_auto_finetune(inspection_number, feedback_data=None):
    """
    Trigger automatic fine-tuning using enhanced dataset creation
    
    Args:
        inspection_number: The inspection number to create dataset for
        feedback_data: The actual feedback data from the current upload
        
    Returns:
        dict: Result of the auto fine-tuning process
    """
    try:
        if not DATASET_CREATOR_AVAILABLE:
            return {
                'status': 'error',
                'error': 'Dataset creator not available'
            }
        
        logger.info(f"Starting auto fine-tuning for inspection: {inspection_number}")
        
        # Create dataset directly from current feedback data
        dataset_creator = TargetedDatasetCreator()
        
        # Generate unique dataset name
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        dataset_name = f"auto_feedback_{inspection_number}_{timestamp}"
        
        # Create dataset directly from the current feedback data
        dataset_path = dataset_creator.create_dataset_from_current_feedback(
            inspection_number=inspection_number,
            dataset_name=dataset_name,
            feedback_data=feedback_data  # Pass the actual feedback data
        )
        
        logger.info(f"Enhanced dataset created at: {dataset_path}")
        
        # Start YOLO training in background
        training_result = start_yolo_training(dataset_path, inspection_number)
        
        return {
            'status': 'success',
            'message': 'Auto fine-tuning started successfully',
            'datasetPath': dataset_path,
            'datasetName': dataset_name,
            'trainingResult': training_result
        }
        
    except Exception as e:
        logger.error(f"Error in auto fine-tuning: {e}")
        return {
            'status': 'error',
            'error': str(e)
        }


def start_yolo_training(dataset_path, inspection_number):
    """
    Start YOLO training with the enhanced dataset
    
    Args:
        dataset_path: Path to the enhanced dataset
        inspection_number: The inspection number
        
    Returns:
        dict: Training initiation result
    """
    try:
        import subprocess
        import threading
        from datetime import datetime
        
        # Get the dataset.yaml path
        dataset_yaml = os.path.join(dataset_path, 'dataset.yaml')
        
        # Generate model name
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        model_name = f"enhanced_{inspection_number}_{timestamp}"
        
        # Find the current best model to fine-tune from
        base_model_path = None
        for model_path in MODEL_PATHS:
            if os.path.exists(model_path):
                base_model_path = model_path
                break
        
        if not base_model_path:
            base_model_path = 'yolov8n.pt'
            logger.warning("No existing trained model found, using YOLOv8n as base")
        else:
            logger.info(f"Will fine-tune from existing model: {base_model_path}")
        
        logger.info(f"Starting YOLO fine-tuning with ultralytics for model: {model_name}")
        
        def run_training():
            """Run fine-tuning in background thread using existing YOLOv8p2 model"""
            try:
                from ultralytics import YOLO
                
                logger.info(f"Fine-tuning from model: {base_model_path}")
                
                # Initialize YOLO model from existing weights
                model = YOLO(base_model_path)
                
                logger.info(f"Starting fine-tuning for {model_name}")
                logger.info(f"Base model: {base_model_path}")
                logger.info(f"Dataset: {dataset_yaml}")
                
                # Fine-tune the model (shorter training for fine-tuning)
                results = model.train(
                    data=dataset_yaml,
                    epochs=50,   # Much fewer epochs for fine-tuning
                    imgsz=640,
                    batch=8,     # Smaller batch for stability
                    name=model_name,
                    patience=3,  # Early stopping for fine-tuning
                    lr0=0.0001,  # Lower learning rate for fine-tuning
                    save=True,
                    verbose=True,
                    resume=False  # Start fine-tuning, don't resume
                )
                
                logger.info(f"✅ YOLO fine-tuning completed successfully for {model_name}")
                logger.info(f"Fine-tuning results: {results}")
                
                # Update model paths to use the new fine-tuned model
                update_model_path_after_training(model_name, dataset_path)
                    
            except Exception as e:
                logger.error(f"❌ Error during YOLO training for {model_name}: {e}")
                import traceback
                logger.error(f"Training traceback: {traceback.format_exc()}")
        
        # Start training in background thread
        training_thread = threading.Thread(target=run_training, daemon=True)
        training_thread.start()
        
        return {
            'status': 'started',
            'message': f'Fine-tuning initiated for model: {model_name}',
            'modelName': model_name,
            'baseModel': base_model_path,
            'note': 'Fine-tuning is running in background. Check logs for progress.'
        }
        
    except Exception as e:
        logger.error(f"Error starting YOLO training: {e}")
        return {
            'status': 'error',
            'error': str(e)
        }


def update_model_path_after_training(model_name):
    """
    Update the global model path to use newly trained model
    
    Args:
        model_name: Name of the newly trained model
    """
def update_model_path_after_training(model_name, dataset_path=None):
    try:
        import shutil
        # Look for the trained model
        possible_paths = [
            f"../Faulty_Detection/runs/detect/{model_name}/weights/best.pt",
            f"runs/detect/{model_name}/weights/best.pt"
        ]
        dest_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'Faulty_Detection'))
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        dest_path = os.path.join(dest_dir, f'yolov8p2_{timestamp}.pt')
        for path in possible_paths:
            if os.path.exists(path):
                shutil.copy2(path, dest_path)
                logger.info(f"Copied best model to: {dest_path}")
                # Delete the fine-tune dataset directory
                try:
                    import shutil as _shutil
                    if dataset_path and os.path.exists(dataset_path):
                        _shutil.rmtree(dataset_path)
                        logger.info(f"Deleted fine-tune dataset: {dataset_path}")
                except Exception as del_err:
                    logger.warning(f"Could not delete fine-tune dataset: {del_err}")
                global MODEL_PATH
                MODEL_PATH = dest_path
                logger.info(f"Updated MODEL_PATH to newly trained model: {dest_path}")
                # Reload the model with new weights
                global model
                model = None  # Clear existing model
                load_model()  # Reload with new path
                return True
        logger.warning(f"Could not find trained model for {model_name}")
        return False
    except Exception as e:
        logger.error(f"Error updating model path: {e}")
        return False


@app.route('/api/feedback/upload', methods=['POST'])
def upload_feedback():
    """
    Upload feedback data for model fine-tuning (Phase 3 - FR3.3)
    Accepts JSON feedback export from backend
    
    Expected JSON format:
    {
        "inspectionId": "uuid",
        "inspectionNumber": "string",
        "transformerCode": "string",
        "exportedAt": "timestamp",
        "comparisons": [...],
        "summary": {...}
    }
    """
    try:
        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 400
        
        feedback_data = request.get_json()
        
        # Validate required fields
        required_fields = ['inspectionId', 'inspectionNumber', 'comparisons']
        for field in required_fields:
            if field not in feedback_data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Create feedback storage directory
        feedback_dir = Path('feedback_data')
        feedback_dir.mkdir(exist_ok=True)
        
        # Save feedback with timestamp
        inspection_id = feedback_data['inspectionId']
        feedback_file = feedback_dir / f"feedback_{inspection_id}.json"


        
        # Save feedback file
        with open(feedback_file, 'w') as f:
            json.dump(feedback_data, f, indent=2)

        # Prepare summary for response
        summary = feedback_data.get('summary', {})

        # Optionally trigger auto fine-tuning if conditions are met
        auto_finetune_result = None
        inspection_number = feedback_data.get('inspectionNumber')
        if inspection_number and should_trigger_auto_finetune(feedback_data):
            auto_finetune_result = trigger_auto_finetune(inspection_number, feedback_data)

        response_data = {
            'status': 'success',
            'message': 'Feedback data received successfully',
            'inspectionId': inspection_id,
            'feedbackFile': str(feedback_file),
            'comparisonsCount': len(feedback_data.get('comparisons', [])),
            'summary': summary,
            'note': 'This data can be used for model fine-tuning. See feedback_data directory.'
        }

        if auto_finetune_result:
            response_data['autoFineTuning'] = auto_finetune_result

        return jsonify(response_data), 200
        response_data = {
            'status': 'success',
            'message': 'Feedback data received successfully',
            'inspectionId': inspection_id,
            'feedbackFile': str(feedback_file),
            'comparisonsCount': len(feedback_data.get('comparisons', [])),
            'summary': summary,
            'note': 'This data can be used for model fine-tuning. See feedback_data directory.'
        }
        
        if auto_finetune_result:
            response_data['autoFineTuning'] = auto_finetune_result
        
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"Error uploading feedback: {e}")
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


if __name__ == '__main__':
    logger.info("=" * 80)
    logger.info("Starting TransX ML Service with Similarity-Based YOLOv8p2")
    logger.info("=" * 80)
    logger.info("Looking for YOLOv8p2 models in priority order:")
    for i, path in enumerate(MODEL_PATHS, 1):
        exists = "Yes" if Path(path).exists() else "No"
        logger.info(f"   {i}. {path} {exists}")
    logger.info(f"Classes: {CLASS_NAMES}")
    logger.info(f"Similarity System Available: {'Yes' if SIMILARITY_SYSTEM_AVAILABLE else 'No'}")
    logger.info("=" * 80)
    
    # Preload components on startup
    try:
        load_model()
        logger.info("Standard model preloaded from: {MODEL_PATH}")
    except Exception as e:
        logger.error(f"Could not preload standard model: {e}")
    
    if SIMILARITY_SYSTEM_AVAILABLE:
        try:
            load_similarity_system()
            logger.info("Similarity-based YOLO system preloaded")
        except Exception as e:
            logger.error(f"Could not preload similarity system: {e}")
    
    # Start Flask server
    logger.info("Server Features:")
    logger.info("Single image inference (standard YOLOv8)")
    logger.info("Similarity-based comparison (with baseline)")
    logger.info("Configurable confidence thresholds")
    logger.info("Smart detection filtering")
    logger.info("Feedback upload for model fine-tuning (FR3.3)")
    logger.info("Starting Flask server on http://0.0.0.0:5001")
    app.run(host='0.0.0.0', port=5001, debug=True)
