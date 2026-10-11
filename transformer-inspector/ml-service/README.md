# TransX ML Service

Python Flask service for thermal image anomaly detection using YOLOv8.

## Features

- **Real-time Anomaly Detection**: Uses YOLOv8 model to detect thermal anomalies
- **RESTful API**: Simple HTTP endpoints for detection
- **Model Persistence**: Keeps model loaded in memory for fast inference
- **Health Monitoring**: Health check endpoint for service monitoring

## Detection Classes

Based on `rules.txt`, the model detects 4 classes of thermal anomalies:

1. **Faulty** (Class 0) - Red
   - Loose joints with reddish/orange-yellowish hotspots
   - Point overloads with reddish/orange-yellowish spots

2. **faulty_loose_joint** (Class 1) - Green
   - Specific loose joint anomalies

3. **faulty_point_overload** (Class 2) - Blue
   - Specific point overload anomalies

4. **potential_faulty** (Class 3) - Yellow
   - Yellowish loose joints (not reddish)
   - Yellowish point overloads
   - Full wire overloads

## Setup

### 1. Install Python 3.9+

Ensure you have Python 3.9 or higher installed:

```bash
python3 --version
```

### 2. Create Virtual Environment

```bash
cd transformer-inspector/ml-service
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Verify Model File

Ensure the YOLOv8 model weights are in place:

```bash
ls -lh ../Faulty_Detection/yolov8n.pt
```

If the model file doesn't exist, you need to train it or place the pre-trained weights there.

## Running the Service

### Development Mode

```bash
python app.py
```

The service will start on `http://localhost:5001`

### Production Mode (using Gunicorn)

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5001 app:app
```

## API Endpoints

### 1. Health Check

**GET** `/api/health`

Check if the service is running and model is loaded.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_path": "../Faulty_Detection/yolov8n.pt",
  "model_path_exists": true,
  "service": "TransX ML Service",
  "version": "1.0.0"
}
```

### 2. Detect Anomalies

**POST** `/api/detect`

Run anomaly detection on a thermal image.

**Request:**
```json
{
  "image_path": "/absolute/path/to/thermal/image.jpg",
  "confidence_threshold": 0.25
}
```

**Response:**
```json
{
  "success": true,
  "detections": [
    {
      "id": "uuid-string",
      "class_id": 0,
      "class_name": "Faulty",
      "confidence": 0.87,
      "bbox": {
        "x1": 120,
        "y1": 150,
        "x2": 300,
        "y2": 400
      },
      "color": [255, 0, 0],
      "source": "ai"
    }
  ],
  "image_dimensions": {
    "width": 1920,
    "height": 1080
  },
  "inference_time_ms": 245.3,
  "model_info": {
    "type": "YOLOv8",
    "classes": {
      "0": "Faulty",
      "1": "faulty_loose_joint",
      "2": "faulty_point_overload",
      "3": "potential_faulty"
    }
  }
}
```

### 3. Get Classes

**GET** `/api/classes`

Get list of detection classes and their colors.

**Response:**
```json
{
  "classes": {
    "0": "Faulty",
    "1": "faulty_loose_joint",
    "2": "faulty_point_overload",
    "3": "potential_faulty"
  },
  "colors": {
    "0": [255, 0, 0],
    "1": [0, 255, 0],
    "2": [0, 0, 255],
    "3": [255, 255, 0]
  }
}
```

## Testing

### Test Health Endpoint

```bash
curl http://localhost:5000/api/health
```

### Test Detection

```bash
curl -X POST http://localhost:5000/api/detect \
  -H "Content-Type: application/json" \
  -d '{
    "image_path": "/path/to/your/thermal/image.jpg",
    "confidence_threshold": 0.25
  }'
```

## Integration with Spring Boot Backend

The Spring Boot backend (port 8080) communicates with this ML service via the `MLServiceClient`:

1. Backend sends image path to ML service
2. ML service runs YOLOv8 inference
3. ML service returns detection coordinates (not rendered image)
4. Backend stores annotations in database
5. Frontend renders annotations dynamically

## Performance

- **Model Loading**: ~2-5 seconds (one-time on startup)
- **Inference Time**: ~100-300ms per image (depends on image size and GPU)
- **Memory Usage**: ~500MB-1GB (model in RAM)

## Troubleshooting

### Model Not Found

If you get "Model file not found" error:
- Check that `yolov8n.pt` exists in `../Faulty_Detection/`
- Update `MODEL_PATH` in `app.py` if your model is elsewhere

### Import Errors

If you get import errors:
```bash
pip install -r requirements.txt --upgrade
```

### PyTorch Compatibility

If you get `weights_only` parameter error:
- The code includes a compatibility patch
- Ensure you're using PyTorch 2.0+

### CUDA/GPU Issues

For GPU acceleration:
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

For CPU only:
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
```

## Development

### Logs

The service logs all requests and detections. Check console output for:
- Model loading status
- Inference time
- Detection results
- Errors

### Modify Detection Logic

Edit `app.py` to customize:
- Confidence threshold
- Post-processing logic
- Class filtering
- Response format

## Deployment

### Docker (Recommended)

Create a `Dockerfile`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
EXPOSE 5000

CMD ["gunicorn", "-w", "2", "-b", "0.0.0.0:5000", "--timeout", "300", "app:app"]
```

Build and run:
```bash
docker build -t transx-ml-service .
docker run -p 5000:5000 -v /path/to/uploads:/uploads transx-ml-service
```

### Cloud Deployment

- **AWS Lambda**: Use AWS Lambda with container support
- **AWS ECS/Fargate**: Deploy as container service
- **Google Cloud Run**: Serverless container deployment
- **Azure Container Instances**: Simple container deployment

## License

Part of TransX Transformer Maintenance Platform - Phase 2 & 3
