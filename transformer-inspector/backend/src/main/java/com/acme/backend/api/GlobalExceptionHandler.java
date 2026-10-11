package com.acme.backend.api;

import com.acme.backend.exception.ImageFileNotFoundException;
import com.acme.backend.exception.MLServiceException;
import com.acme.backend.exception.ResourceNotFoundException;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.jpa.JpaSystemException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Global exception handler for REST API
 * Provides user-friendly error messages for all exceptions
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Handle validation errors from @Valid annotations
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            fieldErrors.put(fieldName, errorMessage);
        });

        Map<String, Object> response = createErrorResponse(
                "Validation Error",
                "Please check the following fields: " + String.join(", ", fieldErrors.keySet()),
                fieldErrors
        );
        
        log.warn("Validation error: {}", fieldErrors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    /**
     * Handle JSON parsing errors (including invalid enum values)
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleHttpMessageNotReadable(HttpMessageNotReadableException ex) {
        String userMessage = "Invalid data format in request";
        String field = null;
        
        Throwable cause = ex.getCause();
        if (cause instanceof InvalidFormatException ife) {
            String targetType = ife.getTargetType().getSimpleName();
            Object value = ife.getValue();
            
            // Extract field name from path
            if (!ife.getPath().isEmpty()) {
                field = ife.getPath().stream()
                        .map(ref -> ref.getFieldName())
                        .filter(f -> f != null)
                        .collect(Collectors.joining("."));
            }
            
            // Check if it's an enum error
            if (ife.getTargetType().isEnum()) {
                Object[] enumConstants = ife.getTargetType().getEnumConstants();
                String validValues = Arrays.stream(enumConstants)
                        .map(Object::toString)
                        .collect(Collectors.joining(", "));
                
                userMessage = String.format(
                        "Invalid value '%s' for field '%s'. Valid options are: %s",
                        value, field, validValues
                );
            } else {
                userMessage = String.format(
                        "Invalid value '%s' for field '%s'. Expected type: %s",
                        value, field, targetType
                );
            }
        }

        Map<String, Object> details = new HashMap<>();
        if (field != null) {
            details.put("field", field);
        }
        
        Map<String, Object> response = createErrorResponse("Invalid Request Data", userMessage, details);
        log.warn("JSON parsing error: {}", userMessage);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    /**
     * Handle JPA/Hibernate errors (database constraints, data truncation, etc.)
     */
    @ExceptionHandler(JpaSystemException.class)
    public ResponseEntity<Map<String, Object>> handleJpaSystemException(JpaSystemException ex) {
        String message = ex.getMessage();
        String userMessage = "Database error occurred while saving data";
        String field = null;
        
        // Parse the error message to extract useful information
        if (message != null) {
            if (message.contains("Data truncated for column")) {
                // Extract column name
                int startIdx = message.indexOf("'");
                int endIdx = message.indexOf("'", startIdx + 1);
                if (startIdx > 0 && endIdx > startIdx) {
                    field = message.substring(startIdx + 1, endIdx);
                    // Convert snake_case to camelCase for frontend
                    field = snakeToCamel(field);
                    userMessage = String.format(
                            "Invalid value for field '%s'. Please select a valid option from the dropdown.",
                            field
                    );
                }
            } else if (message.contains("cannot be null")) {
                userMessage = "A required field is missing. Please fill in all required fields.";
            }
        }

        Map<String, Object> details = new HashMap<>();
        if (field != null) {
            details.put("field", field);
        }
        
        Map<String, Object> response = createErrorResponse("Data Error", userMessage, details);
        log.error("JPA error: {}", message);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    /**
     * Handle data integrity violations (unique constraints, foreign keys, etc.)
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        String message = ex.getMessage();
        String userMessage = "Data integrity error. Please check your input.";
        
        if (message != null) {
            if (message.contains("Duplicate entry")) {
                userMessage = "This record already exists. Please use a unique value.";
            } else if (message.contains("foreign key constraint")) {
                userMessage = "Cannot delete or modify this record because it is referenced by other data.";
            }
        }

        Map<String, Object> response = createErrorResponse("Data Conflict", userMessage, null);
        log.error("Data integrity error: {}", message);
        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    /**
     * Handle IllegalArgumentException (often from enum conversions)
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        String message = ex.getMessage();
        String userMessage = "Invalid input value provided";
        
        if (message != null && message.contains("No enum constant")) {
            // Extract the enum class and value
            String[] parts = message.split("\\.");
            if (parts.length > 0) {
                String enumClass = parts[parts.length - 1];
                userMessage = String.format("Invalid value for %s. Please select a valid option.", enumClass);
            }
        }

        Map<String, Object> response = createErrorResponse("Invalid Input", userMessage, null);
        log.warn("Illegal argument: {}", message);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    /**
     * Handle missing database entities
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleResourceNotFound(ResourceNotFoundException ex) {
        log.warn("Resource not found: {}", ex.getMessage());
        Map<String, Object> response = createErrorResponse("Not Found", ex.getMessage(), null);
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    /**
     * Handle missing image files on disk
     */
    @ExceptionHandler(ImageFileNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleImageFileNotFound(ImageFileNotFoundException ex) {
        log.error("Image file missing: {}", ex.getMessage());
        Map<String, Object> response = createErrorResponse("Image File Missing", ex.getMessage(), null);
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    /**
     * Handle ML service errors (communication failure or inference failure)
     */
    @ExceptionHandler(MLServiceException.class)
    public ResponseEntity<Map<String, Object>> handleMLServiceException(MLServiceException ex) {
        log.error("ML service error: {}", ex.getMessage());
        Map<String, Object> response = createErrorResponse("ML Service Error", ex.getMessage(), null);
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(response);
    }

    /**
     * Handle generic RuntimeException
     */
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntimeException(RuntimeException ex) {
        String message = ex.getMessage();
        String userMessage = "An unexpected error occurred. Please try again.";
        
        if (message != null) {
            if (message.contains("ML service") || message.contains("detect anomalies") || message.contains("Failed to detect anomalies")) {
                userMessage = message;
            } else if (message.toLowerCase().contains("image file not found") || message.toLowerCase().contains("file not found")) {
                userMessage = message;
            } else if (message.equals("Transformer not found") || 
                       message.equals("Inspection not found") || 
                       message.equals("Baseline image not found") || 
                       message.equals("Image not found") ||
                       message.contains("record was not found") ||
                       message.matches(".*(Transformer|Inspection|ThermalImage|Record|User) not found.*")) {
                userMessage = "The requested record was not found.";
            } else if (message.contains("already exists")) {
                userMessage = "A record with these details already exists.";
            } else if (message.contains("Permission denied") || message.contains("Access denied")) {
                userMessage = "You don't have permission to perform this action.";
            } else {
                userMessage = message;
            }
        }

        Map<String, Object> response = createErrorResponse("Error", userMessage, null);
        log.error("Runtime error: {}", message, ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }

    /**
     * Handle all other exceptions
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleAllExceptions(Exception ex) {
        Map<String, Object> response = createErrorResponse(
                "Server Error",
                "An unexpected error occurred. Please try again later or contact support.",
                null
        );
        log.error("Unexpected error: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }

    /**
     * Create a standardized error response with sanitization for sensitive data
     */
    private Map<String, Object> createErrorResponse(String error, String message, Map<String, ?> details) {
        Map<String, Object> response = new HashMap<>();
        response.put("timestamp", LocalDateTime.now().toString());
        response.put("error", error);

        // Sanitize sensitive credentials if any appear in error messages
        String sanitizedMessage = message;
        if (sanitizedMessage != null) {
            sanitizedMessage = sanitizedMessage.replaceAll("(?i)(password\\s*=\\s*)[^;\\s,]+", "$1******")
                                               .replaceAll("(?i)(secret\\s*=\\s*)[^;\\s,]+", "$1******");
        }
        response.put("message", sanitizedMessage);

        if (details != null && !details.isEmpty()) {
            response.put("details", details);
        }
        return response;
    }

    /**
     * Convert snake_case to camelCase
     */
    private String snakeToCamel(String snakeCase) {
        if (snakeCase == null || snakeCase.isEmpty()) {
            return snakeCase;
        }
        StringBuilder result = new StringBuilder();
        boolean capitalizeNext = false;
        for (char c : snakeCase.toCharArray()) {
            if (c == '_') {
                capitalizeNext = true;
            } else if (capitalizeNext) {
                result.append(Character.toUpperCase(c));
                capitalizeNext = false;
            } else {
                result.append(c);
            }
        }
        return result.toString();
    }
}
