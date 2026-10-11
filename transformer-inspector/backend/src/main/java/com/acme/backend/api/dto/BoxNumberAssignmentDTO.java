package com.acme.backend.api.dto;

/**
 * DTO for box numbering assignments
 */
public record BoxNumberAssignmentDTO(
    String inspectionId,
    Integer boxNumber,
    String annotationId,
    String className,
    Double confidence,
    String source,
    String assignedBy
) {}