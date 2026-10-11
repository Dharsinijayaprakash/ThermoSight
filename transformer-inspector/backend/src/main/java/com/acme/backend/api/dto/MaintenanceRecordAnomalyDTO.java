package com.acme.backend.api.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Phase 4: DTO for MaintenanceRecordAnomaly entity
 */
public record MaintenanceRecordAnomalyDTO(
        UUID id,
        Integer boxNumber,
        Integer classId,
        String className,
        BigDecimal confidence,
        Integer bboxX1,
        Integer bboxY1,
        Integer bboxX2,
        Integer bboxY2,
        String source,
        Instant createdAt
) {}
