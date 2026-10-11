package com.acme.backend.api.dto;

import com.acme.backend.domain.Inspection;

import java.time.Instant;
import java.util.UUID;

/**
 * DTO for Inspection entity (Phase 2 & 3)
 */
public record InspectionDTO(
        UUID id,
        String inspectionNumber,
        UUID transformerId,
        String transformerCode,
        String branch,
        UUID baselineImageId,
        String baselineImageUrl,
        UUID inspectionImageId,
        String inspectionImageUrl,
        UUID originalInspectionImageId,
        String originalInspectionImageUrl,
        Inspection.WeatherCondition weatherCondition,
        Inspection.Status status,
        String inspectedBy,
        String currentInspector,  // Phase 3: Current inspector tracking
        Instant inspectedAt,
        Instant maintenanceDate,
        String notes,
        Long annotationCount,  // Total annotations
        Instant createdAt,
        Instant updatedAt
) {}
