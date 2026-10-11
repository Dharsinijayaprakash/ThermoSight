package com.acme.backend.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

// Optional fields are allowed to be null for now.
public record CreateTransformerReq(
        @NotBlank String code,
        @NotBlank String location,
        @Positive Integer capacityKVA,
        String region,
        String poleNo,
        String type,
        String locationDetails
) {}