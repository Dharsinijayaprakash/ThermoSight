package com.acme.backend.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CreateInspectionCommentRequest(
        @NotNull UUID inspectionId,
        @NotBlank String commentText,
        @NotBlank String author
) {}