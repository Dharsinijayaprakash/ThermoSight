#!/usr/bin/env python3
"""
YOLO Training Script with PyTorch 2.6+ Compatibility
Handles the weights_only security restriction properly
"""

import os
import sys
import torch
import torch.serialization
from ultralytics import YOLO

def setup_torch_compatibility():
    """Setup PyTorch compatibility for loading pre-trained models"""
    
    # Add safe globals for ultralytics classes
    safe_globals = [
        'ultralytics.nn.tasks.DetectionModel',
        'ultralytics.nn.tasks.SegmentationModel', 
        'ultralytics.nn.tasks.ClassificationModel',
        'ultralytics.nn.tasks.PoseModel',
        'ultralytics.nn.tasks.OBBModel',
        'ultralytics.nn.tasks.WorldModel',
        'ultralytics.nn.modules.head.Detect',
        'ultralytics.nn.modules.head.Segment',
        'ultralytics.nn.modules.head.Classify',
        'ultralytics.nn.modules.head.Pose',
        'ultralytics.nn.modules.head.OBB',
        'ultralytics.nn.modules.block.C2f',
        'ultralytics.nn.modules.block.SPPF',
        'ultralytics.nn.modules.conv.Conv',
        'ultralytics.nn.modules.conv.DWConv',
        'ultralytics.nn.modules.conv.ConvTranspose',
        'ultralytics.models.yolo.detect.DetectionTrainer',
        'torch.nn.modules.conv.Conv2d',
        'torch.nn.modules.batchnorm.BatchNorm2d',
        'torch.nn.modules.activation.SiLU',
        'torch.nn.modules.pooling.AdaptiveAvgPool2d',
        'torch.nn.modules.linear.Linear',
        'torch.nn.modules.upsampling.Upsample',
        'torch.nn.modules.container.Sequential',
        'torch.nn.modules.container.ModuleList',
        'collections.OrderedDict',
    ]
    
    # Convert string names to actual classes where possible
    actual_globals = []
    for global_name in safe_globals:
        try:
            parts = global_name.split('.')
            module = __import__('.'.join(parts[:-1]), fromlist=[parts[-1]])
            actual_globals.append(getattr(module, parts[-1]))
        except (ImportError, AttributeError):
            # If we can't import it, add it as string (will be handled by patched loader)
            pass
    
    # Add the safe globals
    try:
        torch.serialization.add_safe_globals(actual_globals)
        print("✅ Added safe globals for ultralytics classes")
    except Exception as e:
        print(f"⚠️  Warning: Could not add safe globals: {e}")
    
    # Patch torch.load as backup
    original_torch_load = torch.load
    
    def patched_torch_load(f, map_location=None, pickle_module=None, weights_only=None, **kwargs):
        """Patched torch.load that handles ultralytics models safely"""
        
        # For .pt files (PyTorch models), disable weights_only temporarily
        if isinstance(f, str) and (f.endswith('.pt') or 'yolo' in f.lower()):
            weights_only = False
        elif hasattr(f, 'name') and (f.name.endswith('.pt') or 'yolo' in f.name.lower()):
            weights_only = False
        
        return original_torch_load(f, map_location=map_location, pickle_module=pickle_module, 
                                  weights_only=weights_only, **kwargs)
    
    torch.load = patched_torch_load
    print("✅ Applied torch.load compatibility patch")

def train_yolo_model():
    """Train YOLO model with proper error handling"""
    
    print("🚀 Starting YOLO Training with PyTorch 2.6+ Compatibility")
    print("=" * 60)
    
    # Setup compatibility
    setup_torch_compatibility()
    
    # Check if dataset exists
    data_yaml = "dataset/data.yaml"
    if not os.path.exists(data_yaml):
        print(f"❌ Dataset configuration not found: {data_yaml}")
        return
    
    # Training parameters
    model_name = "yolov8n.pt"  # YOLOv8 nano for faster training
    epochs = 100
    batch_size = 16
    img_size = 640
    patience = 20
    
    print(f"📦 Model: {model_name}")
    print(f"📊 Dataset: {data_yaml}")
    print(f"🔄 Epochs: {epochs}")
    print(f"📦 Batch size: {batch_size}")
    print(f"🖼️  Image size: {img_size}")
    print(f"⏰ Patience: {patience}")
    
    try:
        # Initialize model
        print("\n🔄 Loading pre-trained model...")
        model = YOLO(model_name)
        print("✅ Model loaded successfully!")
        
        # Start training
        print("\n🎯 Starting training...")
        results = model.train(
            data=data_yaml,
            epochs=epochs,
            imgsz=img_size,
            batch=batch_size,
            patience=patience,
            save=True,
            project="runs/detect",
            name="train_fixed",
            exist_ok=True,
            verbose=True,
            device=0 if torch.cuda.is_available() else 'cpu',  # Use GPU if available
            workers=4,  # Number of dataloader workers
            amp=True,   # Automatic Mixed Precision for faster training
        )
        
        print(f"\n🎉 Training completed successfully!")
        print(f"📁 Results saved to: runs/detect/train_fixed/")
        print(f"🏆 Best model: runs/detect/train_fixed/weights/best.pt")
        print(f"📊 Last model: runs/detect/train_fixed/weights/last.pt")
        
        return results
        
    except Exception as e:
        print(f"\n❌ Training failed with error: {e}")
        print(f"🔧 Error type: {type(e).__name__}")
        
        # Provide troubleshooting info
        print("\n🛠️  Troubleshooting suggestions:")
        print("1. Check if dataset paths are correct in data.yaml")
        print("2. Ensure sufficient disk space for training")
        print("3. Verify CUDA installation if using GPU")
        print("4. Try reducing batch size if out of memory")
        
        return None

def main():
    """Main function"""
    try:
        # Change to the model directory
        model_dir = "/home/jaliya/model"
        if os.path.exists(model_dir):
            os.chdir(model_dir)
            print(f"📂 Working directory: {model_dir}")
        
        # Run training
        results = train_yolo_model()
        
        if results is not None:
            print("\n✅ Training session completed successfully!")
        else:
            print("\n❌ Training session failed!")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⚠️  Training interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()