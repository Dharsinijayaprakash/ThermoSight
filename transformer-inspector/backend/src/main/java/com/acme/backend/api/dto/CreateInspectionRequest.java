package com.acme.backend.api.dto;

import com.acme.backend.domain.Inspection;

import java.time.Instant;
import java.util.UUID;

/**
 * Request DTO for creating a new inspection (Phase 2)
 */
public record CreateInspectionRequest(
        String inspectionNumber,
        UUID transformerId,
        String branch,
        UUID baselineImageId,
        Inspection.WeatherCondition weatherCondition,
        String inspectedBy,
        Instant inspectedAt,
        String notes
) {}
