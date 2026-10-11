package com.acme.backend.api.dto;

import com.acme.backend.domain.Annotation;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * Request DTO for creating/updating annotations (Phase 3)
 */
public record SaveAnnotationRequest(
        UUID id,  // null for new, provided for update
        UUID inspectionId,
        BoundingBox bbox,
        Integer classId,
        String className,
        BigDecimal confidence,
        Annotation.Source source,
        String comments,
        String userId
) {
    public record BoundingBox(
            Integer x1,
            Integer y1,
            Integer x2,
            Integer y2
    ) {}
}
