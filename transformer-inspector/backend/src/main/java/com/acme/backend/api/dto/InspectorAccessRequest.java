package com.acme.backend.api.dto;

/**
 * DTO for managing inspector access and name prompts
 */
public record InspectorAccessRequest(
    String inspectorName,
    String accessType, // "CREATE", "EDIT", "VIEW"
    String reason      // Optional reason for accessing
) {
    
    public boolean isValidName() {
        return inspectorName != null && 
               !inspectorName.trim().isEmpty() && 
               inspectorName.trim().length() >= 2;
    }
    
    public String getCleanName() {
        return inspectorName != null ? inspectorName.trim() : "";
    }
}