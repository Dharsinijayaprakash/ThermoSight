package com.acme.backend.api.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Response DTO for annotation feedback export (Phase 3)
 */
public record FeedbackExportResponse(
        UUID inspectionId,
        String inspectionNumber,
        String transformerCode,
        Instant exportedAt,
        List<AnnotationComparison> comparisons,
        Summary summary
) {
    /**
     * Comparison of AI vs Human annotations
     */
    public record AnnotationComparison(
            UUID imageId,
            AnnotationDTO aiPrediction,
            AnnotationDTO humanAnnotation,
            String actionTaken  // approved, rejected, edited, added
    ) {}
    
    /**
     * Summary statistics
     */
    public record Summary(
            Integer totalAiDetections,
            Integer totalHumanAnnotations,
            Integer approved,
            Integer rejected,
            Integer edited,
            Integer added
    ) {}
}
