# TransX - Transformer Maintenance Platform

> **Complete 4-Phase Implementation:** Transformer Management, Anomaly Detection, Annotation System, and Comprehensive Inspection Workflow

A full-stack application for managing electrical transformers with AI-powered thermal image analysis, annotation system, and comprehensive inspection workflow. Built with React, TypeScript, Spring Boot, MySQL, and YOLOv8 machine learning.

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Database Setup](#2-database-setup)
  - [3. ML Service Setup](#3-ml-service-setup)
  - [4. Backend Configuration](#4-backend-configuration)
  - [5. Frontend Setup](#5-frontend-setup)
  - [Quick Multi-Service Startup](#quick-multi-service-startup)
- [Project Structure](#project-structure)
- [Testing the Complete System](#testing-the-complete-system)
- [Application URLs & API Reference](#application-urls--api-reference)
  - [Frontend Routes](#frontend-routes)
  - [API Endpoints](#api-endpoints)
- [File Storage Structure](#file-storage-structure)
- [Development & Advanced Usage](#development--advanced-usage)
  - [Multi-Service Environment Configuration](#multi-service-environment-configuration)
  - [Hot Reload & Development Workflow](#hot-reload--development-workflow)
  - [Enhanced API Testing Examples](#enhanced-api-testing-examples)
  - [Troubleshooting & Performance](#troubleshooting--performance)
  - [Advanced Features](#advanced-features)
- [License](#license)

## Features

### Phase 1: Transformer & Image Management
- **Transformer Management** - Create, update, and manage transformers with code, location, and capacity information
- **Thermal Image Upload** - Upload thermal images tagged as **Baseline** (with environmental conditions: SUNNY/CLOUDY/RAINY) or **Maintenance**
- **Side-by-Side Comparison** - Compare images on transformer detail page with intelligent fallback display
- **Local File Storage** - Secure file uploads with organized storage structure

### Phase 2: AI-Powered Anomaly Detection
**Inspection and Anomaly Detection Workflow**

- **Similarity Check:**
  - When an inspection image is uploaded, the backend first performs a similarity check between the **baseline** and **maintenance** images.
  - This process determines whether both images were captured from approximately the same angle and viewpoint.
  - The computed similarity value is stored as a flag for use in the final comparison stage.

- **YOLOv8 Based Anomaly Detection:**
  - Regardless of the similarity outcome, both images are forwarded to the **YOLOv8 model** for anomaly detection.
  - The model analyzes the **maintenance (inspection)** thermal image and identifies potential faults or abnormal heat zones.

- **Detected Fault Classes:**
  - **Faulty (Class 0)** – 🔴 *Loose joints or point overloads*
  - **Faulty Loose Joint (Class 1)** – 🟢 *Localized loose joints*
  - **Faulty Point Overload (Class 2)** – 🔵 *Specific point overloads*
  - **Potential Faulty (Class 3)** – 🟡 *Yellowish joints or wire overloads*

- **Detection Output:**
  - Each detected region includes:
    - Bounding box coordinates `(x₁, y₁, x₂, y₂)`
    - Predicted class label
    - Confidence score

- **Comparative Analysis (if Similarity Passes):**
  - If the similarity check confirms matching viewpoints, a **comparative analysis** is performed between the baseline and inspection images.
  - Based on threshold values, bounding boxes are fine-tuned to align accurately with the baseline reference.

- **Visualization & User Interaction:**
  - Final anomalies are visualized on the maintenance image using **color-coded bounding boxes** for each fault type.
  - The interface allows engineers to:
    - Approve or reject detections
    - Add notes and comments
    - Save the updated inspection record

- **Data Logging & Traceability:**
  - All user actions — detections, approvals, rejections, and comments — are securely stored in the database.
  - Provides a complete audit trail for **traceability and analysis**.

- **System Integration:**
  - Demonstrates end-to-end integration of:
    - YOLOv8 inference engine  
    - Flask-based ML microservice  
    - Spring Boot backend  
    - React TypeScript frontend


**Sample JSON Output**
~~~json
{
  "success": true,
  "detections": [
    {
      "id": "uuid-string",
      "class_id": 0,
      "class_name": "Faulty",
      "confidence": 0.87,
      "bbox": { "x1": 120, "y1": 150, "x2": 300, "y2": 400 },
      "color": [255, 0, 0],
      "source": "ai"
    }
  ],
  "image_dimensions": { "width": 1920, "height": 1080 },
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
~~~
**Side-by-Side Image Comparison View**
- React frontend displays baseline (left) and maintenance (right) images.
  
![Anomaly Detection Result](assests/detection01.jpg)
![Anomaly Detection Result](assests/detection02.jpg)
![Anomaly Detection Result](assests/detection03.jpg)
![Anomaly Detection Result](assests/detection04.jpg)
![Anomaly Detection Result](assests/detection05.jpg)


### Phase 3: Interactive Annotation & Feedback System  

**Annotation Creation & Editing**

- When a user draws or edits a bounding box on the annotation canvas (**AnnotationCanvas.tsx**), the coordinates, class label, and optional note are captured.  
- Each action (`ADD`, `EDIT`, `DELETE`, `APPROVE`, `REJECT`) is automatically sent to the backend no manual “Save” button is required.  
  Every modification triggers an API call that immediately updates the database.

---

### ⚙️ Backend API Controllers

| Controller | Purpose | Key Endpoints |
|-------------|----------|---------------|
| **AnnotationController.java** | Core of the annotation module manages bounding box creation, updates, deletions, approvals/rejections, and feedback export. | `POST /api/annotations` • `POST /api/annotations/batch` • `DELETE /api/annotations/{id}` • `POST /api/annotations/{id}/approve` • `POST /api/annotations/{id}/reject` • `GET /api/annotations?inspectionId={inspectionId}` • `GET /api/annotations/feedback/export?inspectionId={inspectionId}` |
| **InspectionController.java** | Handles inspection creation, image upload, anomaly detection, and YOLOv8 ML service integration. | `POST /api/inspections` • `POST /api/inspections/{id}/detect-anomalies` • `POST /api/inspections/{id}/upload-image` • `POST /api/inspections/{id}/upload-annotated-image` • `PUT /api/inspections/{id}/status` • `GET /api/inspections/ml-service/health` |
| **InspectionCommentController.java** | Enables threaded comments and notes for collaborative engineer feedback. | `POST /api/inspection-comments` • `GET /api/inspection-comments/inspection/{inspectionId}` • `DELETE /api/inspection-comments/{commentId}` |
| **InspectionHistoryController.java** | Tracks revision history, inspector access, and inspection statistics for auditability. | `POST /api/inspections/{inspectionId}/history/access` • `GET /api/inspections/{inspectionId}/history` • `GET /api/inspections/{inspectionId}/history/summary` • `GET /api/inspections/{inspectionId}/history/stats` |
| **ThermalImageController.java** | Manages upload and retrieval of transformer thermal images (Baseline / Inspection). | `POST /api/images` • `GET /api/images` |
| **TransformerController.java** | CRUD operations for transformer metadata (ID, location, capacity). | `POST /api/transformers` • `GET /api/transformers` • `PUT /api/transformers/{id}` • `DELETE /api/transformers/{id}` |
| **ApiExceptionHandler.java** | Global exception handler for consistent REST error responses. | *(Handles `DataIntegrityViolationException` → returns `409 Conflict`)* |
| **HealthController.java** | Quick backend status check for integration and CI/CD probes. | `GET /api/health` |


> Note: Static file serving for uploads is configured via web config, mapping `GET /files/**` to the uploads directory.
All controllers belong to the package  
`com.acme.backend.api` and communicate with their corresponding service classes in  
`com.acme.backend.service`.

All annotation-related requests are **JSON-based** and persisted in the  
`annotations` and `annotation_history` tables of the `en3350_db` MySQL database.

---

### 🧠 Backend Processing

- The **Spring Boot backend** receives JSON payloads (from frontend API calls) and maps them to JPA entities such as `Annotation`, `Inspection`, and `InspectionComment`.  
- Metadata such as `user_id`, `inspection_id`, `transformer_id`, and `timestamp` are automatically appended.  
- The updated records are persisted via **Spring Data JPA** in the relational database (`en3350_db`).  
- All actions — add, edit, approve, reject are versioned for traceability through the `InspectionHistoryController`.

---
- **Annotation Retrieval:**
  - When an inspection is reopened, the frontend calls the **annotations API client** (`frontend/src/api/annotations.ts`) to fetch all boxes for that inspection.
  - Endpoint used:
    ```
    GET /api/annotations?inspectionId={inspectionId}
    ```
  - The response is rendered back onto the canvas with correct coordinates, labels, and fault types.

- **Feedback Export & Dataset Generation:**
  - All annotation logs (AI + user) are exported as structured JSON:
    ```
    GET /api/annotations/export/{inspectionId}
    ```
  - These JSON files are automatically saved under:
    ```
    /ml-service/feedback_data/
    ```
    (Each file is named as `feedback_<inspection_id>_<timestamp>.json`)
  - The script **targeted_dataset_creator.py** processes these JSONs and converts them into **YOLO-format datasets** (`.txt` label files with bounding box coordinates and class IDs).
  - The generated dataset is then used by the **quick_finetune/** or **train_yolo_fixed.py** script to **fine-tune the YOLOv8 model**, improving accuracy using real user feedback.
  - After finetuning, new weights are saved at:
    ```
    runs/detect/feedback_finetune/weights/best.pt
    ```
  - The **Flask ML service (`app.py`)** is automatically updated to use the new model weights for future detections.


---

## 🧠 ML Service Endpoints (Flask - Port 5001)

| Endpoint | Purpose | Request/Response |
|----------|---------|------------------|
| `POST /api/detect` | YOLOv8 anomaly detection on thermal images | Request: `{image_path, confidence_threshold}` • Response: `{detections: [{bbox, class_id, confidence}]}` |
| `POST /api/feedback` | Store user feedback for model fine-tuning | Request: `{inspection_id, original_detections, final_annotations, metadata}` |
| `POST /api/finetune` | Trigger targeted model fine-tuning with feedback data | Request: `{feedback_path}` • Response: `{status, dataset_path, training_logs}` |
| `GET /api/classes` | Get fault class definitions and color mappings | Response: `{0: "faulty", 1: "faulty_loose_joint", 2: "faulty_point_overload", 3: "potential_faulty"}` |
| `GET /api/health` | ML service health check | Response: `{status: "healthy", model_loaded: true}` |

**Database Dump for Record Storage**


#### 🧩 Core Tables

| Table | Purpose |
|--------|----------|
| **annotations** | Stores bounding box coordinates, class IDs, confidence scores, and metadata for AI and human detections. Each record tracks its source (`ai` or `human`) and action type (`created`, `edited`, `approved`, `rejected`, `deleted`). |
| **annotation_history** | Maintains full version history for each annotation (snapshot JSON per action). Enables rollback and change traceability. |
| **box_numbering_sequence** | Tracks incremental bounding-box numbering per inspection session to maintain unique indices. |
| **inspection_access_log** | Logs inspector session details — including edit/view access, timestamps, and user device/IP metadata. |

#### ⚙️ Schema Extract (MySQL 8.0)

```sql
-- Enhanced Table structure for table `annotations` (Phase 3 updates)
CREATE TABLE `annotations` (
  `id` binary(16) NOT NULL,
  `inspection_id` binary(16) NOT NULL,
  `version` int DEFAULT '1',
  `box_number` int DEFAULT NULL,                    -- NEW: Sequential numbering per inspection
  `bbox_x1` int NOT NULL,
  `bbox_y1` int NOT NULL,
  `bbox_x2` int NOT NULL,
  `bbox_y2` int NOT NULL,
  `class_id` int DEFAULT NULL,
  `class_name` varchar(50) DEFAULT NULL,
  `confidence` decimal(5,3) DEFAULT NULL,
  `source` enum('ai','human') NOT NULL,
  `action_type` enum('created','edited','deleted','approved','rejected') DEFAULT 'created',
  `comments` text DEFAULT NULL,                     -- NEW: User comments on annotations
  `created_by` varchar(100) DEFAULT NULL,
  `modified_by` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `modified_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `idx_inspection_id` (`inspection_id`),
  KEY `idx_box_number` (`inspection_id`, `box_number`),  -- NEW: Box numbering index
  KEY `idx_active_annotations` (`inspection_id`, `is_active`),
  CONSTRAINT `annotations_ibfk_1` FOREIGN KEY (`inspection_id`) REFERENCES `inspections` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `annotation_history` (unchanged, core Phase 3)
CREATE TABLE `annotation_history` (
  `id` binary(16) NOT NULL,
  `annotation_id` binary(16) NOT NULL,
  `inspection_id` binary(16) NOT NULL,
  `action_type` varchar(50) DEFAULT NULL,
  `snapshot_data` json DEFAULT NULL,
  `user_id` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_annotation_id` (`annotation_id`),
  KEY `idx_inspection_action` (`inspection_id`, `action_type`),
  CONSTRAINT `annotation_history_ibfk_1` FOREIGN KEY (`annotation_id`) REFERENCES `annotations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `box_numbering_sequence` (unchanged, core Phase 3)
CREATE TABLE `box_numbering_sequence` (
  `inspection_id` binary(16) NOT NULL,
  `next_box_number` int NOT NULL DEFAULT '1',
  `last_updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`inspection_id`),
  CONSTRAINT `box_numbering_sequence_ibfk_1` FOREIGN KEY (`inspection_id`) REFERENCES `inspections` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `inspection_access_log` (unchanged, core Phase 3)
CREATE TABLE `inspection_access_log` (
  `id` binary(16) NOT NULL,
  `inspection_id` binary(16) NOT NULL,
  `user_name` varchar(255) NOT NULL,
  `access_type` enum('VIEW','EDIT','CREATE') NOT NULL,
  `session_start` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `session_end` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_inspection_id` (`inspection_id`),
  KEY `idx_user_access` (`user_name`, `access_type`),
  CONSTRAINT `inspection_access_log_ibfk_1` FOREIGN KEY (`inspection_id`) REFERENCES `inspections` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NEW: Table structure for table `inspection_feedback_log` (Phase 3 - ML feedback tracking)
CREATE TABLE `inspection_feedback_log` (
  `id` binary(16) NOT NULL,
  `inspection_id` binary(16) NOT NULL,
  `feedback_file_path` varchar(500) DEFAULT NULL,
  `total_detections` int DEFAULT '0',
  `approved_count` int DEFAULT '0',
  `rejected_count` int DEFAULT '0',
  `manual_additions` int DEFAULT '0',
  `exported_by` varchar(100) DEFAULT NULL,
  `exported_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `ml_training_triggered` tinyint(1) DEFAULT '0',
  `dataset_path` varchar(500) DEFAULT NULL,          -- Path to generated training dataset
  PRIMARY KEY (`id`),
  KEY `idx_inspection_id` (`inspection_id`),
  KEY `idx_exported_at` (`exported_at`),
  CONSTRAINT `inspection_feedback_log_ibfk_1` FOREIGN KEY (`inspection_id`) REFERENCES `inspections` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NEW: Table structure for table `users` (Phase 4 - Authentication)
CREATE TABLE `users` (
  `id` binary(16) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `role` enum('USER','ENGINEER','ADMIN') DEFAULT 'USER',
  `is_active` tinyint(1) DEFAULT '1',
  `last_login_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_email` (`email`),
  KEY `idx_role_active` (`role`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NEW: Table structure for table `maintenance_records` (Phase 4 - Record sheets)
CREATE TABLE `maintenance_records` (
  `id` binary(16) NOT NULL,
  `inspection_id` binary(16) NOT NULL,
  `transformer_id` binary(16) NOT NULL,
  `record_number` varchar(50) NOT NULL,
  `inspector_name` varchar(255) DEFAULT NULL,
  `inspector_notes` text DEFAULT NULL,
  `corrective_actions` text DEFAULT NULL,
  `recommendations` text DEFAULT NULL,
  `maintenance_status` enum('PENDING','IN_PROGRESS','COMPLETED','REQUIRES_FOLLOWUP') DEFAULT 'PENDING',
  `severity_level` enum('LOW','MEDIUM','HIGH','CRITICAL') DEFAULT 'MEDIUM',
  `next_inspection_date` date DEFAULT NULL,
  `parts_required` text DEFAULT NULL,              -- Required replacement parts
  `estimated_cost` decimal(10,2) DEFAULT NULL,     -- Cost estimate for maintenance
  `work_order_number` varchar(100) DEFAULT NULL,   -- External work order reference
  `created_by` binary(16) DEFAULT NULL,
  `approved_by` binary(16) DEFAULT NULL,           -- Engineer approval
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_record_number` (`record_number`),
  KEY `idx_inspection_id` (`inspection_id`),
  KEY `idx_transformer_id` (`transformer_id`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_approved_by` (`approved_by`),
  KEY `idx_maintenance_status` (`maintenance_status`),
  CONSTRAINT `maintenance_records_ibfk_1` FOREIGN KEY (`inspection_id`) REFERENCES `inspections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `maintenance_records_ibfk_2` FOREIGN KEY (`transformer_id`) REFERENCES `transformers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `maintenance_records_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `maintenance_records_ibfk_4` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NEW: View for active annotations (Phase 3 - Performance optimization)
CREATE VIEW `inspection_boxes_current` AS
SELECT 
  a.*,
  CONCAT('Box #', a.box_number, ' - ', a.class_name) as display_label
FROM `annotations` a 
WHERE a.is_active = 1 
ORDER BY a.inspection_id, a.box_number;

-- NEW: View for maintenance record summary (Phase 4)
CREATE VIEW `maintenance_records_summary` AS
SELECT 
  mr.*,
  t.code as transformer_code,
  t.location as transformer_location,
  i.status as inspection_status,
  i.inspected_at,
  CONCAT(u1.first_name, ' ', u1.last_name) as created_by_name,
  CONCAT(u2.first_name, ' ', u2.last_name) as approved_by_name
FROM `maintenance_records` mr
JOIN `transformers` t ON mr.transformer_id = t.id
JOIN `inspections` i ON mr.inspection_id = i.id
LEFT JOIN `users` u1 ON mr.created_by = u1.id
LEFT JOIN `users` u2 ON mr.approved_by = u2.id;
```




### Phase 4: Maintenance Record Sheet Generation & Workflow Management
- **Auto-Generated Maintenance Record Forms**
  - Per inspection: includes transformer metadata (ID, location, capacity), timestamps, and embedded thumbnail of thermal image with anomaly markers
  - Lists detected/annotated anomalies with type, location, confidence, and engineer notes
- **Editable Engineer Input Fields**  
  - Authorized users add notes, comments, corrective actions, recommendations, and maintenance status updates
  - Form-ready inputs with clear separation of system-generated vs editable fields; printable PDF-ready layout
- **Save & Retrieve Completed Records**
  - Records saved with transformer + inspection linkage, timestamps, and unique record numbers
  - Simple history viewer: view past maintenance records per transformer; filterable by date range and status
- **Authentication System**
  - Sign-in workflow with email/password (JWT-ready architecture)
  - User roles: USER, ENGINEER, ADMIN with appropriate access controls
  - Google Sign-In placeholder for future OAuth integration
- **Inspection Lifecycle - Complete workflow from creation to completion**
- **Multi-User Comments - Real-time commenting system with author tracking**
- **Notes System - Inspection-specific notes and observations**  
- **Status Tracking - PENDING → IN_PROGRESS → COMPLETED workflow**
- **Image Management - Upload, remove, and re-upload inspection images before detection**
- **Transformer Filtering - Filter inspections by specific transformer**

### Additional Features
- **Type-Safe APIs** - Full TypeScript support with defensive UI patterns
- **Real-time Updates** - Live comment updates and status changes
- **Responsive Design** - Works on desktop and tablet devices
- **Error Handling** - Comprehensive error boundaries and user feedback

## Technology Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | React 18, TypeScript, Vite, React Router, Konva.js (Canvas) |
| **Backend** | Spring Boot 3.3, Java 21, Spring Data JPA, RESTful APIs |
| **ML Service** | Flask, Python, YOLOv8p2, OpenCV, Pillow |
| **Database** | MySQL with comprehensive schema (transformers, inspections, annotations, comments) |
| **File Storage** | Local disk storage with HTTP serving and organized structure |
| **AI/ML** | YOLOv8p2 trained model for thermal anomaly detection |
| **CORS** | Configured for development environment |

### Component Updates:
| Component | Technology |
|-----------|------------|
| **Authentication** | JWT-ready architecture, bcrypt password hashing |
| **Record Generation** | PDF-ready HTML forms, maintenance sheet templates |
| **User Management** | Role-based access (USER/ENGINEER/ADMIN) |
| **File Storage** | UUID-organized directories with metadata tracking |


## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** ≥ 18 and npm
- **Java** 21 (or 17)
- **Python** ≥ 3.8 (for ML service)
- **Gradle** (handled by wrapper)
- **MySQL Community Server** ≥ 8.0 (version 9.4.0 recommended)
- **MySQL Workbench** (for database management)
- **IDE**: IntelliJ IDEA (recommended) or any Java IDE
- **curl** (optional, for API testing)

## Project Structure

```
transformer-inspector/
├── backend/                                # Spring Boot Application
│   ├── src/main/java/com/acme/backend/
│   │   ├── api/                           # REST Controllers
│   │   │   ├── TransformerController.java
│   │   │   ├── InspectionController.java
│   │   │   ├── InspectionCommentController.java
│   │   │   ├── AnnotationController.java
│   │   │   ├── ThermalImageController.java
│   │   │   ├── AuthController.java                    # NEW: JWT auth endpoints
│   │   │   └── MaintenanceRecordController.java       # NEW: Phase 4 record sheets
│   │   ├── api/dto/                       # Data Transfer Objects
│   │   │   ├── CreateTransformerReq.java, TransformerDTO.java
│   │   │   ├── CreateInspectionReq.java, InspectionDTO.java
│   │   │   ├── CreateAnnotationReq.java, AnnotationDTO.java
│   │   │   ├── InspectionCommentDTO.java
│   │   │   ├── DetectionResponse.java
│   │   │   ├── ThermalImageDTO.java
│   │   │   ├── AuthRequestDTO.java                    # NEW: Login/register DTOs
│   │   │   └── MaintenanceRecordDTO.java              # NEW: Phase 4 record DTOs
│   │   ├── config/                        # Configuration Classes
│   │   │   ├── CorsConfig.java
│   │   │   ├── DataSeeder.java (with sample images)
│   │   │   ├── StaticFileConfig.java
│   │   │   └── SecurityConfig.java                    # NEW: JWT security config
│   │   ├── domain/                        # Entity Models
│   │   │   ├── Inspection.java (with status workflow)
│   │   │   ├── Annotation.java (with fault classifications)
│   │   │   ├── InspectionComment.java (multi-user comments)
│   │   │   ├── Transformer.java
│   │   │   ├── ThermalImage.java
│   │   │   ├── User.java                              # NEW: User entity for auth
│   │   │   └── MaintenanceRecord.java                 # NEW: Phase 4 record entity
│   │   ├── repo/                          # JPA Repositories
│   │   │   ├── InspectionRepo.java, TransformerRepo.java
│   │   │   ├── AnnotationRepo.java, InspectionCommentRepo.java
│   │   │   ├── ThermalImageRepo.java
│   │   │   ├── UserRepository.java                    # NEW: User data access
│   │   │   └── MaintenanceRecordRepository.java       # NEW: Record queries
│   │   ├── service/                       # Business Logic
│   │   │   ├── InspectionService.java (with ML integration)
│   │   │   ├── InspectionCommentService.java
│   │   │   ├── MLServiceClient.java
│   │   │   ├── FileStorageService.java
│   │   │   ├── AuthService.java                       # NEW: User authentication
│   │   │   └── MaintenanceRecordService.java          # NEW: Record generation
│   │   └── storage/                       # File Storage Service
│   │       └── FileStorageService.java
│   ├── src/main/resources/
│   │   └── application.properties (with ML service config)
│   └── build.gradle
│
├── frontend/
│   ├── src/
│   │   ├── api/                           # API Client Layer
│   │   │   ├── client.ts, transformers.ts, inspections.ts
│   │   │   ├── annotations.ts, inspectionComments.ts
│   │   │   ├── images.ts
│   │   │   ├── auth.ts                                # NEW: Auth API calls
│   │   │   └── maintenanceRecords.ts                  # NEW: Record API calls
│   │   ├── components/                    # UI Components
│   │   │   ├── ErrorBoundary.tsx, Layout.tsx, FileDrop.tsx
│   │   │   ├── AnnotationCanvas.tsx (Konva.js canvas)
│   │   │   ├── AnnotationToolbar.tsx (mode controls)
│   │   │   ├── AnnotationLegend.tsx, AnnotationCard.tsx
│   │   │   ├── CommentsSection.tsx (real-time comments)
│   │   │   ├── NotesSection.tsx
│   │   │   ├── Input.tsx, Select.tsx, Table.tsx, Modal.tsx
│   │   │   ├── AuthGuard.tsx                          # NEW: Route protection
│   │   │   └── MaintenanceRecordForm.tsx              # NEW: Editable record form
│   │   ├── pages/                         # Page Components
│   │   │   ├── Dashboard.tsx, TransformersList.tsx
│   │   │   ├── TransformerDetail.tsx, TransformerForm.tsx
│   │   │   ├── InspectionList.tsx
│   │   │   ├── InspectionDetailNew.tsx (full annotation interface)
│   │   │   ├── ImagesList.tsx, ImageUpload.tsx
│   │   │   ├── InspectionDetail.tsx (legacy view)
│   │   │   ├── LoginPage.tsx                          # NEW: Sign-in interface
│   │   │   └── MaintenanceRecordPage.tsx              # NEW: Phase 4 record view
│   │   ├── context/                       # React Context
│   │   │   └── AuthContext.tsx                        # NEW: User session state
│   │   ├── App.tsx, main.tsx
│   │   └── vite-env.d.ts
│   ├── package.json (with Konva.js dependencies)
│   └── tsconfig.json, vite.config.ts
│
├── ml-service/                            # Flask ML Microservice
│   ├── app.py                            # Flask application with YOLOv8
│   ├── requirements.txt                  # Python dependencies
│   ├── setup.sh                          # Setup script
│   ├── README.md                         # ML service documentation
│   ├── targeted_dataset_creator.py       # Fine-tuning Pipeline
│   ├── feedback_data/                    # NEW: User Feedback Storage
│   │   └── feedback_*.json               # NEW: Generated feedback files
│   └── auto_feedback_*/                  # NEW: Generated training datasets
│       ├── images/                       # NEW: Training images
│       ├── labels/                       # NEW: YOLO format labels
│       └── dataset.yaml                  # NEW: Training config
│
├── Faulty_Detection/                     # ML Model Training
│   ├── train_yolo_fixed.py              # Training script
│   ├── train_yolov8p2.py                # NEW: Enhanced training script
│   ├── yolov8p2_single_inference.py     # Inference testing
│   ├── similarity_yolo_system.py        # NEW: Baseline comparison
│   ├── yolov8n.pt, yolov8p2.pt         # Model files
│   ├── samples/                          # Training data
│   └── runs/                             # NEW: Training output logs
│       └── detect/                       # NEW: YOLO training artifacts
│
└── Database-MYSQL/
    ├── en3350_db.sql                     # Latest schema
    └── latest/                           # NEW: Version-controlled schemas
        ├── en3350_db.sql                 # NEW: Current schema
        └── migrations/                   # NEW: Schema change tracking
            ├── V1__initial.sql           # NEW: Initial schema
            ├── V2__add_auth.sql          # NEW: User/auth tables
            └── V3__add_records.sql       # NEW: Maintenance record tables
```

## Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/PrabathBK/TransX-Transformer-Maintenance-Platform.git
cd TransX-Transformer-Maintenance-Platform
```

### 2. Database Setup

1. **Install MySQL Community Server**
   - Install **MySQL Community Server** (version **9.4.0** recommended, but ≥ 8.0 works)
   - Install **MySQL Workbench** during setup
   - During installation, set your own **root username and password** (keep these safe for later configuration)

2. **Verify MySQL Server is running**
   - Open **MySQL Workbench**
   - Check that your MySQL instance (e.g., *Local instance MySQL94*) is **running**
   - If stopped, start it using the **Server Start/Stop** button

3. **Create the database schema**
   ```sql
   CREATE DATABASE en3350_db;
   ```

4. **Import the complete SQL dump**
   - In Workbench, go to **Server > Data Import**
   - Select **Import from Self-Contained File**
   - File path: `Database-MYSQL/en3350_db.sql`
   - Set **Default Target Schema** to `en3350_db`
   - Set **Import Options** to **Dump Structure and Data**
   - Click **Start Import**

5. **Verify the import**
   - Refresh the **Schemas** panel
   - Expand `en3350_db` → **Tables**
   - You should see tables: `transformers`, `thermal_images`, `inspections`, `annotations`, `inspection_comments`

### 3. ML Service Setup

1. **Navigate to ML service directory**
   ```bash
   cd ml-service
   ```
2. **Create and activate virtual environment**
   ```bash
   # Create virtual environment
   python -m venv venv

   # Activate virtual environment
   .\venv\Scripts\activate
   ```
3. **Install Python dependencies**
   ```bash
   # Ensure pip is up to date
   python -m pip install --upgrade pip

   # Install requirements
   pip install -r requirements.txt
   ```

4. **Start the ML service**
   ```bash
   python app.py
   ```
   
   🟢 ML Service will start at **http://localhost:5001**

### 4. Backend Configuration

1. **Navigate to backend directory**
   ```bash
   cd transformer-inspector/backend
   ```

2. **Configure `application.properties`**
   ```properties
   # MySQL Database Configuration
   spring.datasource.url=jdbc:mysql://localhost:3306/en3350_db
   spring.datasource.username=YOUR_MYSQL_USERNAME
   spring.datasource.password=YOUR_MYSQL_PASSWORD
   spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
   spring.jpa.hibernate.ddl-auto=update
   spring.jpa.show-sql=true
   spring.jpa.database-platform=org.hibernate.dialect.MySQLDialect

   # File Storage Configuration
   app.server.public-base-url=http://localhost:8080
   app.storage.root=PATH_TO_YOUR_"upload_FOLDER 

   # ML Service Configuration (YOLOv8 Detection)
   app.ml-service.url=http://localhost:5001
   app.ml-service.timeout=30000

   # CORS Configuration
   app.cors.allowed-origins=http://localhost:5173
   ```

3. **Start the backend server**
   ```bash
   ./gradlew bootRun
   ```
   
   🟢 Server will start at **http://localhost:8080**

### 5. Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd transformer-inspector/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```
   
   🟢 Application will be available at **http://localhost:5173**

### Quick Multi-Service Startup

```bash
# Terminal 1: Start ML Service
cd ml-service && pip install -r requirements.txt && python app.py

# Terminal 2: Start Backend
cd transformer-inspector/backend && ./gradlew bootRun

# Terminal 3: Start Frontend  
cd transformer-inspector/frontend && npm install && npm run dev
```

## Testing the Complete System

### 1. Access the Application
1. **Open browser to** **http://localhost:5173**

2. **Create Account** (First Time Users):
   - Open browser → Navigate to main application page
   - Click "Create account" link at bottom of sign-in form
   - Enter full name, email address, and password
   - Confirm password and agree to terms
   - Click "Create Account" button
   - System creates user with default role 'USER'

3. **Sign In** (Returning Users):
   - Open browser → Navigate to main application page
   - Enter email address (e.g., `example@gmail.com`) and password
   - Optional: Check "Remember me for 30 days" checkbox
   - Click "Sign In" button
   - System redirects to Dashboard upon successful authentication

4. **Google Sign-In** (Future Enhancement):
   - Placeholder displayed: "Google Sign-in not configured"
   - Requires `VITE_GOOGLE_CLIENT_ID` configuration in frontend `.env` file

### 3. Dashboard Navigation & Overview

**After successful sign-in:**
1. **Dashboard Access**: Click "Dashboard" in left sidebar → View system overview
2. **Transformer Statistics**: Review counts for total transformers, healthy/warning/critical status
3. **Recent Activity**: Monitor recent uploads, system status, and additions
4. **Alert Summary**: Check critical issues, monitoring requirements, and maintenance schedules
5. **User Profile**: Click profile avatar (top-right) → View logged-in user details
6. **Logout**: Click "Log out" button in left sidebar bottom

### 4. Transformer Management Testing

**Navigate to Transformers:**
1. **Access Transformers**: Click "Transformers" in left sidebar
2. **View Transformer List**: See all transformers with codes, locations, capacity, and status indicators
3. **Search Functionality**: Use search bar → "Search by transformer code or location" → Click "Search"
4. **Add New Transformer**:
   - Click "+ Add Transformer" button
   - Fill transformer details (code, location, capacity, region, pole number, type)
   - Click "Save" button
   - Verify transformer appears in list

**Individual Transformer Management:**
1. **View Transformer Details**: Click eye icon (👁) on any transformer row
2. **Edit Transformer**: 
   - Click "Back to list" → Click edit icon on transformer
   - Modify transformer code, location, or capacity
   - Update location details in text area
   - Click "Save" button
3. **Baseline Image Upload**:
   - In transformer details → Click "Upload Image" section
   - Select "Baseline" from dropdown
   - Choose weather condition (Sunny/Cloudy/Rainy)
   - Enter admin name
   - Click "Choose File" → Select thermal image
   - Click "Upload" button
4. **Thermal Image Comparison**:
   - Verify baseline image appears in left panel with timestamp
   - Check "Latest Inspection" panel shows recent inspection image
5. **Delete Transformer**: Click delete icon (🗑) → Confirm deletion

### 5. Inspection Management & Workflow Testing

**Navigate to Inspections:**
1. **Access Inspections**: Click "Inspections" in left sidebar
2. **View All Inspections**: Review inspection list with statuses (COMPLETED, IN_PROGRESS, PENDING)
3. **Filter by Transformer**: Use transformer filter dropdown → Select specific transformer

**Create New Inspection:**
1. **From Transformer Details**:
   - Click "Transformers" → Select transformer → Click eye icon
   - Scroll down to "Inspections for this Transformer"
   - Click "+ New Inspection" button
2. **From Inspections Page**:
   - Click "Inspections" → Click "Create New Inspection"
   - Select transformer from dropdown
   - Click "Create Inspection"

**Inspection Image Management:**
1. **Upload Inspection Image**:
   - In inspection detail page → Click "Upload Image" button
   - Select thermal image file
   - Verify image appears in canvas area
   - Check image auto-scales for large files (640×640 to 3077×1920+)
2. **Remove/Replace Image**:
   - Click "Remove Image" button → Confirm deletion
   - Upload new image → Previous annotations are cleared
   - Verify warning message about annotation loss

### 6. AI-Powered Anomaly Detection Testing 

**Trigger Detection:**
1. **Set Detection Threshold**:
   - Click "Detect Anomalies" button
   - Set confidence threshold (0-100%) in modal
   - Click "Start Detection" button
2. **Verify ML Service Integration**:
   - Check detection progress indicator
   - Verify YOLOv8 model processes image (1-3 seconds typical)
   - Confirm bounding boxes appear with fault classifications:
     - 🔴 **Faulty (Class 0)** - Loose joints or point overloads
     - 🟢 **Faulty Loose Joint (Class 1)** - Localized loose joints
     - 🔵 **Faulty Point Overload (Class 2)** - Specific point overloads  
     - 🟡 **Potential Faulty (Class 3)** - Yellowish joints or wire overloads

**Review Detection Results:**
1. **Annotation Legend**: Verify color-coded legend shows class names and counts
2. **Confidence Scores**: Check each detection shows confidence percentage
3. **Baseline Comparison**: If baseline exists, verify similarity check performed

### 7. Interactive Annotation System Testing 

**Annotation Tools:**
1. **Mode Switching**:
   - Click "View" mode → Read-only canvas navigation
   - Click "Draw" mode → Create new bounding boxes by dragging
   - Click "Edit" mode → Select and modify existing annotations
2. **Manual Annotation Creation**:
   - Switch to "Draw" mode
   - Click and drag on image → Create bounding box
   - Select fault class from dropdown
   - Add optional comment
   - Verify box appears immediately (auto-save)
3. **Edit Existing Annotations**:
   - Switch to "Edit" mode
   - Click on annotation → Resize handles appear
   - Drag corners/edges to resize
   - Move entire box by dragging
   - Verify changes save automatically

**Approve/Reject AI Detections:**
1. **Individual Approval**:
   - Click green checkmark (✓) on AI detection
   - Verify annotation marked as "Approved"
   - Check action logged in annotation history
2. **Individual Rejection**:
   - Click red X (✗) on AI detection  
   - Add rejection reason in modal
   - Verify annotation marked as "Rejected" and becomes inactive
3. **Bulk Operations**:
   - Test approving multiple detections
   - Verify each action triggers separate API call

**Canvas Navigation:**
1. **Zoom & Pan**: Use mouse wheel to zoom, click-drag to pan large images
2. **Box Selection**: Click on annotations to select/highlight
3. **Keyboard Shortcuts**: Test Delete key to remove selected annotation

### 8. Comments & Collaboration Testing 

**Add Comments:**
1. **Inspection-Level Comments**:
   - Scroll to "Comments" section
   - Enter comment text in input field
   - Click "Add Comment" button
   - Verify comment appears with author name and timestamp
2. **Annotation-Specific Comments**:
   - Click on annotation box → Select from dropdown
   - Add comment in annotation card
   - Click "Update Comment" button
   - Verify comment saves to specific annotation

**Multi-User Testing:**
1. **Different Authors**: Test with different user names
2. **Real-Time Updates**: Add comments and verify immediate appearance
3. **Comment History**: Check all comments persist on page reload

### 9. Feedback Export & ML Improvement Testing 

**Export Feedback Data:**
1. **Generate Feedback**:
   - Complete annotation review (approve/reject/edit detections)
   - Click "Export Feedback" button
   - Verify JSON and CSV files download locally
   - Check feedback summary shows total detections, approvals, rejections
2. **ML Service Integration**:
   - Verify feedback POST to ML service (`/api/feedback/upload`)
   - Check `ml-service/feedback_data/` folder contains new feedback file
   - Confirm targeted dataset generation triggered
3. **Fine-Tuning Pipeline**:
   - Monitor ML service logs for dataset creation
   - Check `auto_feedback_*/` directories contain training images and labels
   - Verify YOLO format labels generated correctly

### 10. Maintenance Record Generation Testing 

**Complete Inspection Workflow:**
1. **Finalize Inspection**:
   - Complete annotation review and comments
   - Click "Save Annotated Image" → Canvas captured as overlay
   - Click "Complete Inspection" button
   - Verify status changes to "COMPLETED"
   - System navigates back to transformer details page

**Auto-Generated Maintenance Records:**
1. **Access Records**:
   - From completed inspection → Click "View Maintenance Record"
   - Or navigate via "Maintenance Records" menu (if available)
2. **Review Generated Content**:
   - Transformer metadata (ID, location, capacity) populated
   - Inspection timestamp and inspector details
   - Embedded thermal image with anomaly markers
   - List of detected/annotated faults with confidence scores

**Engineer Input Fields:**
1. **Editable Sections**:
   - Add inspector notes in text area
   - Enter corrective actions required
   - Add recommendations for future maintenance
   - Set maintenance status (PENDING/IN_PROGRESS/COMPLETED)
   - Specify severity level (LOW/MEDIUM/HIGH/CRITICAL)
2. **Additional Fields**:
   - Enter required parts list
   - Add cost estimates
   - Set next inspection date
   - Reference work order numbers
3. **Save Changes**: Click "Save Record" → Verify all inputs persist

**Record History & Retrieval:**
1. **Per-Transformer History**:
   - Access transformer details
   - View "Maintenance History" section
   - Filter records by date range or status
2. **System-Wide Records**:
   - Navigate to "Maintenance Records" (if global menu exists)
   - Search and filter across all transformers
   - Export records to PDF (if implemented)

### 11. Authentication & User Management Testing 

**Role-Based Access:**
1. **User Roles**:
   - Test with USER role → Basic inspection access
   - Test with ENGINEER role → Full annotation and record access
   - Test with ADMIN role → User management capabilities
2. **Session Management**:
   - Verify "Remember me" checkbox extends session
   - Test session timeout and re-authentication
   - Check "Last login" tracking in user profile

**Account Management:**
1. **Profile Updates**: Access user settings → Update name/email
2. **Password Changes**: Change password → Verify new credentials work
3. **Account Security**: Test failed login attempts and lockout (if implemented)

### 12. Error Handling & Edge Cases

**Network & Service Issues:**
1. **ML Service Down**: Stop ML service → Test detection gracefully fails
2. **Database Connection**: Test with invalid DB credentials
3. **Large File Uploads**: Upload 5MB+ images → Check timeout handling
4. **Invalid File Types**: Try uploading non-image files → Verify rejection

**Data Validation:**
1. **Required Fields**: Try creating transformer without code → Check validation
2. **Duplicate Data**: Create transformer with existing code → Test conflict handling  
3. **Invalid Coordinates**: Manual annotation outside image bounds → Check constraints

**UI Responsiveness:**
1. **Long Operations**: Test detection on large images → Verify progress indicators
2. **Canvas Performance**: Load high-resolution images → Check zoom/pan smoothness
3. **Concurrent Users**: Multiple browsers → Test annotation conflicts

### 13. API Health Checks & Verification

**Service Status:**
```bash
# Backend health
curl http://localhost:8080/api/health
# Expected: {"status": "UP", "timestamp": "..."}

# ML service health  
curl http://localhost:5001/api/health
# Expected: {"status": "healthy", "model_loaded": true}
```

**Database Verification:**
```sql
USE en3350_db;

-- Check user accounts
SELECT email, role, is_active, created_at FROM users;

-- Verify inspection data
SELECT id, status, inspected_at FROM inspections ORDER BY created_at DESC LIMIT 5;

-- Check annotation counts  
SELECT inspection_id, COUNT(*) as annotation_count, 
       SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_count
FROM annotations GROUP BY inspection_id;

-- Review maintenance records
SELECT record_number, maintenance_status, created_at 
FROM maintenance_records ORDER BY created_at DESC LIMIT 5;
```

### 14. Performance & Scalability Testing

**Load Testing:**
1. **Multiple Transformers**: Create 20+ transformers → Check list performance
2. **Large Inspections**: Upload 50+ annotations per inspection → Verify canvas performance  
3. **Concurrent Detection**: Trigger detection on multiple inspections simultaneously
4. **Database Queries**: Check response times for filtered inspection lists

**Storage Testing:**
1. **File Organization**: Verify UUID directories created correctly in `uploads/`
2. **Disk Usage**: Monitor storage growth with multiple image uploads
3. **Cleanup**: Test annotation deletion → Check orphaned file cleanup


## Application URLs & API Reference

### Frontend Routes
| URL | Description |
|-----|-------------|
| `http://localhost:5173` | Dashboard with statistics and alerts |
| `http://localhost:5173/login` | User sign-in page |
| `http://localhost:5173/signup` | User registration page |
| `http://localhost:5173/transformers` | Transformer overview with search/filter |
| `http://localhost:5173/transformers/{ID}` | Transformer details with inspection history |
| `http://localhost:5173/inspections` | All inspections list with status filtering |
| `http://localhost:5173/inspections/{ID}` | Full inspection interface with interactive annotations |
| `http://localhost:5173/images` | Thermal images management |
| `http://localhost:5173/maintenance-records` | Maintenance record sheets (Phase 4) |
| `http://localhost:5173/maintenance-records/{ID}` | Individual maintenance record view/edit |

### API Endpoints

#### Authentication 
- `POST /api/auth/login` - User sign-in with email/password
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/refresh` - Refresh JWT token
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/logout` - User sign-out

#### Transformer Management
- `GET /api/transformers` - List all transformers with search/pagination
- `POST /api/transformers` - Create new transformer
- `GET /api/transformers/{id}` - Get transformer details
- `PUT /api/transformers/{id}` - Update transformer
- `DELETE /api/transformers/{id}` - Delete transformer

#### Inspection Management 
- `GET /api/inspections` - List inspections with filtering (`?transformerId=uuid&status=COMPLETED`)
- `POST /api/inspections` - Create new inspection
- `GET /api/inspections/{id}` - Get inspection details
- `PUT /api/inspections/{id}` - Update inspection
- `PUT /api/inspections/{id}/status` - Update inspection status (PENDING→IN_PROGRESS→COMPLETED)
- `DELETE /api/inspections/{id}` - Delete inspection
- `POST /api/inspections/{id}/upload-image` - Upload inspection image
- `DELETE /api/inspections/{id}/inspection-image` - Remove inspection image
- `POST /api/inspections/{id}/detect-anomalies` - Trigger YOLOv8 detection with threshold
- `POST /api/inspections/{id}/upload-annotated-image` - Save canvas overlay with annotations

#### Interactive Annotation Management 
- `GET /api/annotations` - Get annotations for inspection (`?inspectionId={uuid}`)
- `POST /api/annotations` - Create new manual annotation
- `POST /api/annotations/batch` - Create multiple annotations
- `PUT /api/annotations/{id}` - Update annotation (coordinates, class, comments)
- `DELETE /api/annotations/{id}` - Delete annotation (soft delete)
- `POST /api/annotations/{id}/approve` - Approve AI detection
- `POST /api/annotations/{id}/reject` - Reject AI detection with reason
- `GET /api/annotations/feedback/export` - Export feedback for ML fine-tuning (`?inspectionId={uuid}`)

#### Annotation History & Audit Trail 
- `POST /api/inspections/{inspectionId}/history/access` - Log user access
- `GET /api/inspections/{inspectionId}/history` - Get annotation change history
- `GET /api/inspections/{inspectionId}/history/summary` - Get audit summary
- `GET /api/inspections/{inspectionId}/history/stats` - Get inspection statistics

#### Comment System (Multi-User Collaboration)
- `GET /api/inspection-comments/inspection/{inspectionId}` - Get inspection comments
- `POST /api/inspection-comments` - Add new comment
- `PUT /api/inspection-comments/{id}` - Update comment
- `DELETE /api/inspection-comments/{id}` - Delete comment

#### Maintenance Records 
- `GET /api/maintenance-records` - List all maintenance records
- `POST /api/maintenance-records` - Create maintenance record from inspection
- `GET /api/maintenance-records/{id}` - Get specific maintenance record
- `PUT /api/maintenance-records/{id}` - Update maintenance record (engineer inputs)
- `GET /api/maintenance-records/inspection/{inspectionId}` - Get record by inspection
- `GET /api/maintenance-records/transformer/{transformerId}` - Get records by transformer

#### Thermal Image Management
- `GET /api/images` - List all thermal images
- `POST /api/images` - Upload thermal image (baseline/inspection)
- `GET /api/images/{id}` - Get image details

#### ML Service Integration
- `GET /api/inspections/ml-service/health` - Check ML service status
- Backend automatically calls ML service for anomaly detection
- ML service endpoints (Flask - Port 5001):
  - `POST /api/detect` - YOLOv8 inference
  - `POST /api/feedback` - Store feedback for fine-tuning
  - `GET /api/classes` - Get fault class definitions
  - `GET /api/health` - ML service health check

#### File Serving
- `GET /files/**` - Serve uploaded files and images

## File Storage Structure

Files are organized with UUID-based directories:
```
uploads/
├── {UUID}/                              # Generated UUID for each upload session
│   ├── baseline/
│   │   └── thermal_baseline_sunny.jpg   # Weather-tagged baseline images
│   └── inspection/
│       ├── thermal_inspection.jpg       # Original inspection image
│       └── annotated_overlay.png        # Canvas-captured annotated overlay
├── {UUID}/
│   └── maintenance_record_export.pdf    # Generated maintenance documents
└── feedback_exports/                    # ML feedback data
    ├── feedback_{inspection_uuid}.json  # Annotation feedback
    └── auto_feedback_{timestamp}/       # Generated training datasets
        ├── images/
        ├── labels/                      # YOLO format labels
        └── dataset.yaml
```

- **Storage Path**: `{app.storage.root}/{uuid}/{category}/{filename}`
- **Public Access**: Files served via `/files/**` endpoint at `http://localhost:8080/files/{uuid}/{filename}`
- **Organization**: UUID directories with baseline/inspection subdirectories
- **Supported Formats**: JPG, PNG, JPEG for thermal images; PDF for maintenance records
- **Image Scaling**: Frontend auto-scales images from 640×640 to 3077×1920+ resolution
- **Security**: UUID-based paths prevent enumeration attacks

## Development & Advanced Usage

### Multi-Service Environment Configuration

#### Backend Configuration (application.properties)
```properties
# Database
spring.datasource.url=jdbc:mysql://localhost:3306/en3350_db
spring.datasource.username=${DB_USERNAME:root}
spring.datasource.password=${DB_PASSWORD:your_password}

# File Storage
app.storage.root=${STORAGE_ROOT:./uploads}
app.server.public-base-url=${PUBLIC_URL:http://localhost:8080}

# ML Service Integration  
app.ml-service.url=${ML_SERVICE_URL:http://localhost:5001}
app.ml-service.timeout=${ML_TIMEOUT:60000}

# CORS (Development)
app.cors.allowed-origins=${CORS_ORIGINS:http://localhost:5173,http://localhost:3000}

# JWT Authentication 
app.jwt.secret=${JWT_SECRET:your_jwt_secret_key}
app.jwt.expiration=${JWT_EXPIRATION:86400000}
```

#### Frontend Environment (.env)
```env
VITE_API_BASE_URL=http://localhost:8080
VITE_ML_SERVICE_URL=http://localhost:5001
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

#### ML Service Configuration (app.py)
```python
# Model configuration
DEFAULT_CONFIDENCE = 0.25
MODEL_PATH = "../Faulty_Detection/yolov8p2.pt"
FEEDBACK_DIR = "./feedback_data"

# Fault class mappings
CLASS_NAMES = {
    0: "faulty",
    1: "faulty_loose_joint", 
    2: "faulty_point_overload",
    3: "potential_faulty"
}

# Server configuration
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
```

### Hot Reload & Development Workflow
- **Frontend**: Automatic reload via Vite HMR (React Fast Refresh)
- **Backend**: Use Spring Boot DevTools for hot swap, or manual restart
- **ML Service**: Manual restart required after model/dependency changes
- **Database**: Schema updates via Hibernate DDL auto-update

### Enhanced API Testing Examples

#### Authentication Flow
```bash
# Register new user
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"engineer@example.com","password":"password123","firstName":"John","lastName":"Engineer"}'

# Sign in
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"engineer@example.com","password":"password123"}'

# Use JWT token for authenticated requests
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8080/api/transformers
```

#### Complete Inspection Workflow
```bash
# 1. Create inspection
INSPECTION_ID=$(curl -X POST http://localhost:8080/api/inspections \
  -H "Content-Type: application/json" \
  -d '{"transformerId":"TRANSFORMER_UUID"}' | jq -r '.id')

# 2. Upload image  
curl -X POST "http://localhost:8080/api/inspections/$INSPECTION_ID/upload-image" \
  -F "file=@thermal_image.jpg"

# 3. Trigger detection
curl -X POST "http://localhost:8080/api/inspections/$INSPECTION_ID/detect-anomalies?confidenceThreshold=0.3"

# 4. Get annotations
curl "http://localhost:8080/api/annotations?inspectionId=$INSPECTION_ID"

# 5. Export feedback
curl "http://localhost:8080/api/annotations/feedback/export?inspectionId=$INSPECTION_ID"
```

#### Maintenance Record Generation
```bash
# Complete inspection and generate record
curl -X PUT "http://localhost:8080/api/inspections/$INSPECTION_ID/status" \
  -H "Content-Type: application/json" \
  -d '{"status":"COMPLETED"}'

# Get generated maintenance record
curl "http://localhost:8080/api/maintenance-records/inspection/$INSPECTION_ID"
```

### Troubleshooting & Performance

#### Common Issues & Solution
1. **ML Service Connection Failed**
   - Verify Python virtual environment activated: `source venv/bin/activate`
   - Check model file exists: `ls -la ../Faulty_Detection/yolov8p2.pt`
   - Test ML health: `curl http://localhost:5001/api/health`

2. **Canvas Performance Issues**
   - Large images (3000+ pixels) auto-scale to optimize rendering
   - Konva.js stage uses hardware acceleration
   - Monitor memory usage during annotation editing

3. **Database Connection Issues**
   - Verify MySQL server status: `sudo systemctl status mysql`
   - Test connection: `mysql -u root -p en3350_db`
   - Check schema exists with proper tables

4. **File Upload Timeouts**
   - Increase Spring Boot file size limits:
     ```properties
     spring.servlet.multipart.max-file-size=20MB
     spring.servlet.multipart.max-request-size=25MB
     ```
   - Configure ML service timeout for large image processing

#### Performance Monitoring
- **Image Processing**: Thermal images up to 3077×1920 handled efficiently
- **ML Inference**: YOLOv8 detection averages 1-3 seconds per image
- **Auto-Save Operations**: All annotation actions persist within 100ms
- **Canvas Rendering**: Smooth 60fps zoom/pan on modern browsers
- **Database Queries**: Indexed UUID lookups < 10ms typical response

#### Load Testing Recommendations
```bash
# Test concurrent detections
for i in {1..5}; do
  curl -X POST "http://localhost:8080/api/inspections/$INSPECTION_ID/detect-anomalies?confidenceThreshold=0.3" &
done

# Monitor ML service performance
watch -n 1 'curl -s http://localhost:5001/api/health | jq'

# Check database performance
mysql -u root -p -e "SHOW PROCESSLIST; SELECT COUNT(*) FROM annotations;"
```

### Advanced Features

#### Feedback Loop Integration
- **Annotation Export**: User feedback automatically exported as JSON/CSV
- **Dataset Generation**: `targeted_dataset_creator.py` converts feedback to YOLO format
- **Model Fine-Tuning**: `train_yolov8p2.py` retrains model with user corrections
- **Model Deployment**: Updated weights automatically loaded by ML service

#### Security Features
- **JWT Authentication**: Secure API access with role-based permissions
- **File Upload Validation**: MIME type checking and size limits
- **UUID-based Storage**: Prevents directory traversal attacks
- **CORS Protection**: Configurable allowed origins
- **SQL Injection Prevention**: JPA parameterized queries

This completes the comprehensive 4-phase TransX platform with full annotation system, ML feedback loop, and maintenance record generation capabilities.
