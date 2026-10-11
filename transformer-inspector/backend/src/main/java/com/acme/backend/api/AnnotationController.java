package com.acme.backend.api;

import com.acme.backend.api.dto.AnnotationDTO;
import com.acme.backend.api.dto.FeedbackExportResponse;
import com.acme.backend.api.dto.SaveAnnotationRequest;
import com.acme.backend.service.AnnotationService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * REST Controller for Annotation management (Phase 3 - Interactive Annotation & Feedback)
 */
@RestController
@RequestMapping("/api/annotations")
@CrossOrigin(origins = "${app.cors.allowed-origins}")
public class AnnotationController {
    
    private static final Logger log = LoggerFactory.getLogger(AnnotationController.class);
    
    private final AnnotationService annotationService;
    
    public AnnotationController(AnnotationService annotationService) {
        this.annotationService = annotationService;
    }
    
    /**
     * Get all active annotations for an inspection
     * GET /api/annotations?inspectionId={id}
     */
    @GetMapping
    public ResponseEntity<List<AnnotationDTO>> getAnnotations(
            @RequestParam UUID inspectionId
    ) {
        try {
            List<AnnotationDTO> annotations = annotationService.getActiveAnnotations(inspectionId);
            return ResponseEntity.ok(annotations);
        } catch (Exception e) {
            log.error("Error fetching annotations: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch annotations: " + e.getMessage());
        }
    }
    
    /**
     * Create or update annotation (Phase 3 - FR3.1)
     * POST /api/annotations
     */
    @PostMapping
    public ResponseEntity<AnnotationDTO> saveAnnotation(
            @Valid @RequestBody SaveAnnotationRequest request
    ) {
        try {
            log.info("Saving annotation for inspection: {}", request.inspectionId());
            AnnotationDTO annotation = annotationService.saveAnnotation(request);
            
            if (request.id() == null) {
                return ResponseEntity.status(HttpStatus.CREATED).body(annotation);
            } else {
                return ResponseEntity.ok(annotation);
            }
        } catch (Exception e) {
            log.error("Error saving annotation: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to save annotation: " + e.getMessage());
        }
    }
    
    /**
     * Batch save annotations (for AI detections)
     * POST /api/annotations/batch
     */
    @PostMapping("/batch")
    public ResponseEntity<List<AnnotationDTO>> saveAnnotationsBatch(
            @Valid @RequestBody List<SaveAnnotationRequest> requests
    ) {
        try {
            log.info("Batch saving {} annotations", requests.size());
            List<AnnotationDTO> saved = requests.stream()
                    .map(annotationService::saveAnnotation)
                    .toList();
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (Exception e) {
            log.error("Error batch saving annotations: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to batch save annotations: " + e.getMessage());
        }
    }
    
    /**
     * Delete annotation (Phase 3 - FR3.1)
     * DELETE /api/annotations/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAnnotation(
            @PathVariable UUID id,
            @RequestParam String userId
    ) {
        try {
            log.info("Deleting annotation: {}", id);
            annotationService.deleteAnnotation(id, userId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("Error deleting annotation: {}", e.getMessage(), e);
            return ResponseEntity.notFound().build();
        }
    }
    
    /**
     * Approve annotation (user validation)
     * POST /api/annotations/{id}/approve
     */
    @PostMapping("/{id}/approve")
    public ResponseEntity<AnnotationDTO> approveAnnotation(
            @PathVariable UUID id,
            @RequestParam String userId
    ) {
        try {
            log.info("Approving annotation: {}", id);
            AnnotationDTO annotation = annotationService.approveAnnotation(id, userId);
            return ResponseEntity.ok(annotation);
        } catch (Exception e) {
            log.error("Error approving annotation: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to approve annotation: " + e.getMessage());
        }
    }
    
    /**
     * Reject annotation
     * POST /api/annotations/{id}/reject
     */
    @PostMapping("/{id}/reject")
    public ResponseEntity<AnnotationDTO> rejectAnnotation(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body
    ) {
        try {
            String userId = body.get("userId");
            String reason = body.get("reason");
            
            log.info("Rejecting annotation: {}", id);
            AnnotationDTO annotation = annotationService.rejectAnnotation(id, userId, reason);
            return ResponseEntity.ok(annotation);
        } catch (Exception e) {
            log.error("Error rejecting annotation: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to reject annotation: " + e.getMessage());
        }
    }
    
    /**
     * Get annotation version history (Phase 3 - undo/redo support)
     * GET /api/annotations/{id}/history
     */
    @GetMapping("/{id}/history")
    public ResponseEntity<List<AnnotationDTO>> getAnnotationHistory(
            @PathVariable UUID id
    ) {
        try {
            List<AnnotationDTO> history = annotationService.getAnnotationHistory(id);
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            log.error("Error fetching annotation history: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch annotation history: " + e.getMessage());
        }
    }
    
    /**
     * Export feedback for model improvement (Phase 3 - FR3.3)
     * GET /api/annotations/feedback/export?inspectionId={id}
     */
    @GetMapping("/feedback/export")
    public ResponseEntity<FeedbackExportResponse> exportFeedback(
            @RequestParam UUID inspectionId
    ) {
        try {
            log.info("Exporting feedback for inspection: {}", inspectionId);
            FeedbackExportResponse feedback = annotationService.exportFeedback(inspectionId);
            return ResponseEntity.ok(feedback);
        } catch (Exception e) {
            log.error("Error exporting feedback: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to export feedback: " + e.getMessage());
        }
    }
}
