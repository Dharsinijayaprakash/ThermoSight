package com.acme.backend.api;

import com.acme.backend.api.dto.CreateInspectionCommentRequest;
import com.acme.backend.api.dto.InspectionCommentDTO;
import com.acme.backend.service.InspectionCommentService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/inspection-comments")
public class InspectionCommentController {

    private static final Logger log = LoggerFactory.getLogger(InspectionCommentController.class);

    private final InspectionCommentService commentService;

    public InspectionCommentController(InspectionCommentService commentService) {
        this.commentService = commentService;
    }

    /**
     * Add a new comment to an inspection
     * POST /api/inspection-comments
     */
    @PostMapping
    public ResponseEntity<InspectionCommentDTO> addComment(@Valid @RequestBody CreateInspectionCommentRequest request) {
        try {
            log.info("Adding comment to inspection: {}", request.inspectionId());
            InspectionCommentDTO comment = commentService.addComment(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(comment);
        } catch (Exception e) {
            log.error("Error adding comment: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to add comment: " + e.getMessage());
        }
    }

    /**
     * Get all comments for an inspection
     * GET /api/inspection-comments/inspection/{inspectionId}
     */
    @GetMapping("/inspection/{inspectionId}")
    public ResponseEntity<List<InspectionCommentDTO>> getCommentsByInspection(@PathVariable UUID inspectionId) {
        try {
            log.info("Fetching comments for inspection: {}", inspectionId);
            List<InspectionCommentDTO> comments = commentService.getCommentsByInspection(inspectionId);
            return ResponseEntity.ok(comments);
        } catch (Exception e) {
            log.error("Error fetching comments: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch comments: " + e.getMessage());
        }
    }

    /**
     * Delete a comment
     * DELETE /api/inspection-comments/{commentId}
     */
    @DeleteMapping("/{commentId}")
    public ResponseEntity<Void> deleteComment(@PathVariable UUID commentId) {
        try {
            log.info("Deleting comment: {}", commentId);
            commentService.deleteComment(commentId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("Error deleting comment: {}", e.getMessage(), e);
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Get comment count for an inspection
     * GET /api/inspection-comments/inspection/{inspectionId}/count
     */
    @GetMapping("/inspection/{inspectionId}/count")
    public ResponseEntity<Long> getCommentCount(@PathVariable UUID inspectionId) {
        try {
            long count = commentService.getCommentCount(inspectionId);
            return ResponseEntity.ok(count);
        } catch (Exception e) {
            log.error("Error getting comment count: {}", e.getMessage(), e);
            return ResponseEntity.ok(0L);
        }
    }
}