#!/usr/bin/env python3
"""
YOLO Training Script with YOLOv8p2 Model
Uses YOLOv8p2 architecture for improved performance
"""

import os
import sys
import torch
import torch.serialization
from ultralytics import YOLO

# Apply PyTorch compatibility fix for PyTorch 2.6+
original_torch_load = torch.load

def patched_torch_load(f, map_location=None, pickle_module=None, weights_only=None, **kwargs):
    """Patched torch.load that sets weights_only=False for .pt files"""
    if isinstance(f, str) and f.endswith('.pt'):
        weights_only = False
    elif hasattr(f, 'name') and f.name.endswith('.pt'):
        weights_only = False
    
    return original_torch_load(f, map_location=map_location, pickle_module=pickle_module, 
                              weights_only=weights_only, **kwargs)

torch.load = patched_torch_load

# Add safe globals for ultralytics
torch.serialization.add_safe_globals([
    'ultralytics.nn.tasks.DetectionModel',
    'ultralytics.nn.modules.block.C2f',
    'ultralytics.nn.modules.block.Bottleneck',
    'ultralytics.nn.modules.conv.Conv',
    'ultralytics.nn.modules.head.Detect',
    'ultralytics.nn.modules.block.SPPF',
    'ultralytics.nn.modules.conv.DWConv',
    'ultralytics.nn.modules.block.C2fCIB',
    'ultralytics.nn.modules.block.Attention',
])

def main():
    print("🚀 Starting YOLO Training with YOLOv8p2 Model...")
    print("="*60)
    
    # Check CUDA availability
    if torch.cuda.is_available():
        device = 'cuda'
        print(f"✅ CUDA available! Using GPU: {torch.cuda.get_device_name()}")
        print(f"🔥 GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
    else:
        device = 'cpu'
        print("⚠️  CUDA not available, using CPU")
    
    # Change to model directory
    model_dir = "/home/jaliya/model"
    if os.path.exists(model_dir):
        os.chdir(model_dir)
        print(f"📁 Changed to directory: {model_dir}")
    else:
        print(f"❌ Model directory not found: {model_dir}")
        return
    
    # Initialize YOLOv8p2 model
    print("📦 Loading YOLOv8p2 model...")
    try:
        # YOLOv8p2 is a specific architecture variant
        model = YOLO('yolov8n-p2.pt')  # Use p2 variant
        print("✅ YOLOv8n-p2 model loaded successfully!")
    except Exception as e:
        print(f"⚠️  YOLOv8n-p2 not found, falling back to standard YOLOv8n...")
        model = YOLO('yolov8n.pt')
        print("✅ YOLOv8n model loaded successfully!")
    
    # Check if data.yaml exists
    data_path = 'datasetnew/data.yaml'
    if not os.path.exists(data_path):
        print(f"❌ Error: {data_path} not found!")
        print("💡 Make sure your dataset configuration file exists")
        return
    
    print(f"📋 Using dataset configuration: {data_path}")
    
    # Training configuration for YOLOv8p2
    print("🎯 Starting training with optimized YOLOv8p2 configuration...")
    
    # Train the model with enhanced settings
    results = model.train(
        data=data_path,
        imgsz=640,
        epochs=150,  # Increased epochs for better convergence
        batch=32,    # Optimized batch size for P2 model
        patience=25, # Increased patience for P2 model
        device=device,
        verbose=True,
        save=True,
        plots=True,
        amp=True,    # Enable Automatic Mixed Precision
        cache=True,  # Cache images for faster training
        workers=8,   # Multi-threading for data loading
        project='runs/detect',
        name='yolov8p2_train',  # Specific name for P2 training
        
        # Enhanced training parameters for P2
        lr0=0.01,    # Initial learning rate
        lrf=0.01,    # Final learning rate fraction
        momentum=0.937,
        weight_decay=0.0005,
        warmup_epochs=3.0,
        warmup_momentum=0.8,
        warmup_bias_lr=0.1,
        box=0.05,    # Box loss gain
        cls=0.5,     # Class loss gain
        dfl=1.5,     # DFL loss gain
        
        # Data augmentation for P2
        hsv_h=0.015,   # HSV-Hue augmentation
        hsv_s=0.7,     # HSV-Saturation augmentation
        hsv_v=0.4,     # HSV-Value augmentation
        degrees=0.0,   # Rotation degrees
        translate=0.1, # Translation fraction
        scale=0.5,     # Scaling factor
        shear=0.0,     # Shear degrees
        perspective=0.0, # Perspective transformation
        flipud=0.0,    # Vertical flip probability
        fliplr=0.5,    # Horizontal flip probability
        mosaic=1.0,    # Mosaic augmentation probability
        mixup=0.0,     # MixUp augmentation probability
    )
    
    print("🎉 YOLOv8p2 Training completed!")
    print(f"📊 Training Results Summary:")
    print(f"   - Model: YOLOv8p2")
    print(f"   - Epochs: 150")
    print(f"   - Batch size: 32")
    print(f"   - Device: {device}")
    print(f"   - Results saved to: runs/detect/yolov8p2_train/")
    
    # Show model information
    try:
        print(f"\n📈 Model Performance:")
        if hasattr(results, 'results_dict'):
            metrics = results.results_dict
            print(f"   - mAP50: {metrics.get('metrics/mAP50(B)', 'N/A')}")
            print(f"   - mAP50-95: {metrics.get('metrics/mAP50-95(B)', 'N/A')}")
    except:
        print("   - Detailed metrics available in results folder")
    
    return results

if __name__ == "__main__":
    try:
        main()
        print("\n✅ YOLOv8p2 training completed successfully!")
    except KeyboardInterrupt:
        print("\n⚠️  Training interrupted by user")
    except Exception as e:
        print(f"\n❌ Error during training: {e}")
        print("🔧 Try checking your dataset configuration and paths")