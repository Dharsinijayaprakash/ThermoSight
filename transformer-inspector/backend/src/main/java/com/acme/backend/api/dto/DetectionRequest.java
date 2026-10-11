package com.acme.backend.api.dto;

import java.util.UUID;

/**
 * Request DTO for triggering anomaly detection (Phase 2)
 */
public record DetectionRequest(
        UUID inspectionId,
        UUID inspectionImageId,
        Double confidenceThreshold
) {
    public DetectionRequest {
        if (confidenceThreshold == null) {
            confidenceThreshold = 0.25;
        }
    }
}
