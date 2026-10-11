package com.acme.backend.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public record CreateInspectionReq(
        @NotBlank String inspectionNo,
        @NotNull UUID transformerId,
        @NotBlank String branch,
        @NotNull LocalDate inspectionDate,
        @NotNull LocalTime inspectionTime,
        LocalDate maintenanceDate,
        LocalTime maintenanceTime,
        @NotBlank String inspectedBy,
        String notes
) {}
