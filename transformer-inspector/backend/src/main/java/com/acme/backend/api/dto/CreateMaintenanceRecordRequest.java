package com.acme.backend.api.dto;

import java.util.UUID;

/**
 * Phase 4: Request to create a maintenance record from an inspection
 */
public record CreateMaintenanceRecordRequest(
        UUID inspectionId,
        String createdBy
) {}
