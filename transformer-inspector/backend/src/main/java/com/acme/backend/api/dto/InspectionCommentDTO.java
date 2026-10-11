package com.acme.backend.api.dto;

import java.time.Instant;
import java.util.UUID;

public record InspectionCommentDTO(
        UUID id,
        UUID inspectionId,
        String commentText,
        String author,
        Instant createdAt,
        Instant updatedAt
) {}