package com.acme.backend.api;

import com.acme.backend.api.dto.*;
import com.acme.backend.domain.Inspection;
import com.acme.backend.service.InspectionService;
import com.acme.backend.service.MLServiceClient;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * REST Controller for Inspection management (Phase 2 & 3)
 */
@RestController
@RequestMapping("/api/inspections")
@CrossOrigin(origins = "${app.cors.allowed-origins}")
public class InspectionController {
    
    private static final Logger log = LoggerFactory.getLogger(InspectionController.class);

    private final InspectionService inspectionService;
    private final MLServiceClient mlServiceClient;

    public InspectionController(InspectionService inspectionService, MLServiceClient mlServiceClient) {
        this.inspectionService = inspectionService;
        this.mlServiceClient = mlServiceClient;
    }

    /**
     * Create a new inspection
     * POST /api/inspections
     */
    @PostMapping
    public ResponseEntity<InspectionDTO> createInspection(@Valid @RequestBody CreateInspectionRequest request) {
        try {
            log.info("Creating inspection: {}", request.inspectionNumber());
            InspectionDTO inspection = inspectionService.createInspection(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(inspection);
        } catch (Exception e) {
            log.error("Error creating inspection: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create inspection: " + e.getMessage());
        }
    }

    /**
     * Get all inspections with pagination and search
     * GET /api/inspections?page=0&size=10&q=search&transformerId=uuid
     */
    @GetMapping
    public ResponseEntity<Page<InspectionDTO>> getAllInspections(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(required = false) UUID transformerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") Sort.Direction direction
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        
        Page<InspectionDTO> inspections;
        if (transformerId != null) {
            // Filter by transformer ID
            inspections = inspectionService.getInspectionsByTransformerId(transformerId, pageable);
        } else if (q.trim().isEmpty()) {
            inspections = inspectionService.getAllInspections(pageable);
        } else {
            inspections = inspectionService.searchInspections(q, pageable);
        }
        
        return ResponseEntity.ok(inspections);
    }

    /**
     * Get inspection by ID
     * GET /api/inspections/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<InspectionDTO> getInspectionById(@PathVariable UUID id) {
        try {
            InspectionDTO inspection = inspectionService.getInspectionById(id);
            return ResponseEntity.ok(inspection);
        } catch (Exception e) {
            log.error("Inspection not found: {}", id);
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Upload inspection image and link to inspection
     * POST /api/inspections/{id}/upload-image
     */
    @PostMapping("/{id}/upload-image")
    public ResponseEntity<InspectionDTO> uploadInspectionImage(
            @PathVariable UUID id,
            @RequestParam UUID imageId
    ) {
        try {
            log.info("Uploading inspection image {} to inspection {}", imageId, id);
            InspectionDTO inspection = inspectionService.uploadInspectionImage(id, imageId);
            return ResponseEntity.ok(inspection);
        } catch (Exception e) {
            log.error("Error uploading inspection image: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to upload inspection image: " + e.getMessage());
        }
    }

    /**
     * Upload annotated image (with bounding boxes drawn) to inspection
     * POST /api/inspections/{id}/upload-annotated-image
     */
    @PostMapping("/{id}/upload-annotated-image")
    public ResponseEntity<InspectionDTO> uploadAnnotatedImage(
            @PathVariable UUID id,
            @RequestParam UUID imageId
    ) {
        try {
            log.info("Uploading annotated image {} to inspection {}", imageId, id);
            InspectionDTO inspection = inspectionService.updateAnnotatedImage(id, imageId);
            return ResponseEntity.ok(inspection);
        } catch (Exception e) {
            log.error("Error uploading annotated image: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to upload annotated image: " + e.getMessage());
        }
    }

    /**
     * Remove inspection image from inspection (before detection)
     * DELETE /api/inspections/{id}/inspection-image
     */
    @DeleteMapping("/{id}/inspection-image")
    public ResponseEntity<InspectionDTO> removeInspectionImage(@PathVariable UUID id) {
        try {
            log.info("Removing inspection image from inspection: {}", id);
            InspectionDTO inspection = inspectionService.removeInspectionImage(id);
            return ResponseEntity.ok(inspection);
        } catch (Exception e) {
            log.error("Error removing inspection image: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to remove inspection image: " + e.getMessage());
        }
    }

    /**
     * Trigger anomaly detection on inspection image (Phase 2 - FR2.1)
     * POST /api/inspections/{id}/detect-anomalies
     */
    @PostMapping("/{id}/detect-anomalies")
    public ResponseEntity<DetectionResponse> detectAnomalies(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "0.25") Double confidenceThreshold
    ) {
        log.info("Triggering anomaly detection for inspection: {}", id);
        DetectionResponse response = inspectionService.detectAnomalies(id, confidenceThreshold);
        return ResponseEntity.ok(response);
    }

    /**
     * Update inspection status
     * PUT /api/inspections/{id}/status
     */
    @PutMapping("/{id}/status")
    public ResponseEntity<InspectionDTO> updateInspectionStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> request
    ) {
        try {
            String statusStr = (String) request.get("status");
            if (statusStr == null) {
                throw new RuntimeException("Status is required");
            }
            
            Inspection.Status status = Inspection.Status.valueOf(statusStr);
            log.info("Updating inspection {} status to: {}", id, status);
            
            InspectionDTO inspection = inspectionService.updateInspection(id, status, null);
            return ResponseEntity.ok(inspection);
        } catch (Exception e) {
            log.error("Error updating inspection status: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to update inspection status: " + e.getMessage());
        }
    }

    /**
     * Update inspection status and notes
     * PUT /api/inspections/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<InspectionDTO> updateInspection(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> updates
    ) {
        try {
            Inspection.Status status = updates.containsKey("status") ? 
                    Inspection.Status.valueOf((String) updates.get("status")) : null;
            String notes = updates.containsKey("notes") ? (String) updates.get("notes") : null;
            
            InspectionDTO inspection = inspectionService.updateInspection(id, status, notes);
            return ResponseEntity.ok(inspection);
        } catch (Exception e) {
            log.error("Error updating inspection: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to update inspection: " + e.getMessage());
        }
    }

    /**
     * Delete inspection
     * DELETE /api/inspections/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteInspection(@PathVariable UUID id) {
        try {
            log.info("Deleting inspection: {}", id);
            inspectionService.deleteInspection(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("Error deleting inspection: {}", e.getMessage(), e);
            return ResponseEntity.notFound().build();
        }
    }
    
    /**
     * Check ML service health
     * GET /api/inspections/ml-service/health
     */
    @GetMapping("/ml-service/health")
    public ResponseEntity<Map<String, Object>> checkMLServiceHealth() {
        Map<String, Object> info = mlServiceClient.getServiceInfo();
        boolean healthy = mlServiceClient.isHealthy();
        
        if (healthy) {
            return ResponseEntity.ok(info);
        } else {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(info);
        }
    }

    /**
     * Export feedback data for model improvement (Phase 3 - FR3.3) 
     * GET /api/inspections/{id}/feedback-export
     */
    @GetMapping("/{id}/feedback-export")
    public ResponseEntity<FeedbackExportResponse> exportFeedback(@PathVariable UUID id) {
        try {
            log.info("Exporting feedback for inspection: {}", id);
            FeedbackExportResponse feedback = inspectionService.exportFeedback(id);
            return ResponseEntity.ok(feedback);
        } catch (Exception e) {
            log.error("Error exporting feedback: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to export feedback: " + e.getMessage());
        }
    }

    /**
     * Export feedback as CSV file (Phase 3 - FR3.3)
     * GET /api/inspections/{id}/feedback-export/csv
     */
    @GetMapping("/{id}/feedback-export/csv")
    public ResponseEntity<String> exportFeedbackCSV(@PathVariable UUID id) {
        try {
            log.info("Exporting feedback as CSV for inspection: {}", id);
            String csv = inspectionService.exportFeedbackAsCSV(id);
            
            return ResponseEntity.ok()
                    .header("Content-Type", "text/csv")
                    .header("Content-Disposition", "attachment; filename=\"feedback_" + id + ".csv\"")
                    .body(csv);
        } catch (Exception e) {
            log.error("Error exporting feedback as CSV: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to export feedback as CSV: " + e.getMessage());
        }
    }
}
