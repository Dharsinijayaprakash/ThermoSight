package com.acme.backend.api.dto;

import java.time.LocalDateTime;

/**
 * DTO for inspection history records
 */
public record InspectionHistoryDTO(
    String id,
    String inspectionId,
    String inspectionNumber,
    Integer boxNumber,
    String actionType,
    String actionDescription,
    String userName,
    String previousData,  // JSON string
    String newData,       // JSON string
    LocalDateTime createdAt,
    String inspectionStatus,
    String currentInspector
) {
    
    /**
     * Create a simple summary version without JSON data
     */
    public InspectionHistoryDTO toSummary() {
        return new InspectionHistoryDTO(
            id, inspectionId, inspectionNumber, boxNumber,
            actionType, actionDescription, userName,
            null, null, // Exclude JSON data for summary
            createdAt, inspectionStatus, currentInspector
        );
    }
    
    /**
     * Check if this is a box-specific action
     */
    public boolean isBoxAction() {
        return boxNumber != null;
    }
    
    /**
     * Get action category for grouping
     */
    public String getActionCategory() {
        return switch (actionType) {
            case "AI_DETECTION_RUN" -> "AI_ACTIONS";
            case "BOX_CREATED", "BOX_EDITED", "BOX_MOVED", "BOX_RESIZED" -> "BOX_MODIFICATIONS";
            case "BOX_APPROVED", "BOX_REJECTED", "BOX_DELETED" -> "BOX_DECISIONS";
            case "CLASS_CHANGED", "CONFIDENCE_UPDATED" -> "CLASSIFICATION_CHANGES";
            case "INSPECTION_CREATED", "STATUS_CHANGED", "INSPECTION_COMPLETED" -> "INSPECTION_LIFECYCLE";
            case "INSPECTOR_CHANGED" -> "ACCESS_CONTROL";
            default -> "OTHER";
        };
    }
}