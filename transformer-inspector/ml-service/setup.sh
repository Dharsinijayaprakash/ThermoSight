#!/bin/bash

# TransX ML Service - Quick Start Script

echo "🚀 Starting TransX ML Service Setup"
echo "===================================="

# Check Python version
echo "Checking Python version..."
python3 --version

# Create virtual environment
echo "Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Check model file
echo "Checking for YOLOv8 model weights..."
if [ -f "../Faulty_Detection/yolov8n.pt" ]; then
    echo "✅ Model file found: ../Faulty_Detection/yolov8n.pt"
else
    echo "⚠️  Warning: Model file not found at ../Faulty_Detection/yolov8n.pt"
    echo "Please ensure the model weights are in place before running the service."
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the ML service:"
echo "  1. Activate virtual environment: source venv/bin/activate"
echo "  2. Run the service: python app.py"
echo ""
echo "The service will be available at: http://localhost:5000"
echo ""
