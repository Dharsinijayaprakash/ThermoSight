package com.acme.backend.api.dto;

/**
 * Response DTO for inspector access validation
 */
public record InspectorAccessResponse(
    boolean accessGranted,
    String accessLevel,     // "READ_WRITE", "READ_ONLY", "DENIED"
    String message,
    String currentInspector,
    String inspectionStatus,
    boolean requiresNamePrompt
) {
    
    public static InspectorAccessResponse readOnly(String message, String currentInspector, String status) {
        return new InspectorAccessResponse(true, "READ_ONLY", message, currentInspector, status, false);
    }
    
    public static InspectorAccessResponse readWrite(String message, String inspector, String status) {
        return new InspectorAccessResponse(true, "READ_WRITE", message, inspector, status, false);
    }
    
    public static InspectorAccessResponse requireName(String message, String status) {
        return new InspectorAccessResponse(false, "PROMPT_REQUIRED", message, null, status, true);
    }
    
    public static InspectorAccessResponse denied(String message, String status) {
        return new InspectorAccessResponse(false, "DENIED", message, null, status, false);
    }
}