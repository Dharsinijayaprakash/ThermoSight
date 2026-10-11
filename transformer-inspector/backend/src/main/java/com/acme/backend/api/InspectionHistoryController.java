package com.acme.backend.api;

import com.acme.backend.api.dto.*;
import com.acme.backend.domain.Inspection;
import com.acme.backend.service.InspectionHistoryService;
import com.acme.backend.service.InspectionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Controller for managing inspection history and inspector access
 */
@RestController
@RequestMapping("/api/inspections/{inspectionId}/history")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://localhost:3000"}, allowCredentials = "true")
public class InspectionHistoryController {
    
    private static final Logger log = LoggerFactory.getLogger(InspectionHistoryController.class);
    
    @Autowired
    private InspectionHistoryService historyService;
    
    @Autowired
    private InspectionService inspectionService;

    /**
     * Validate inspector access to an inspection
     */
    @PostMapping("/access")
    public ResponseEntity<InspectorAccessResponse> validateAccess(
            @PathVariable String inspectionId,
            @RequestBody InspectorAccessRequest request) {
        
        log.info("🔑 Access validation requested for inspection: {} by: {}", 
                inspectionId, request.getCleanName());
        
        try {
            // Validate request
            if (!request.isValidName()) {
                return ResponseEntity.ok(InspectorAccessResponse.requireName(
                    "Please enter your name (minimum 2 characters)", "UNKNOWN"));
            }
            
            // Get inspection details
            InspectionDTO inspection = inspectionService.getInspectionById(UUID.fromString(inspectionId));
            if (inspection == null) {
                return ResponseEntity.ok(InspectorAccessResponse.denied(
                    "Inspection not found", "NOT_FOUND"));
            }
            
            // Check access based on inspection status
            String inspectorName = request.getCleanName();
            Inspection.Status status = inspection.status();
            
            switch (status) {
                case COMPLETED -> {
                    log.info("🔒 READ-ONLY access granted to completed inspection");
                    return ResponseEntity.ok(InspectorAccessResponse.readOnly(
                        "Inspection is completed - view only", 
                        inspection.currentInspector(), 
                        status.toString()));
                }
                
                case DRAFT, IN_PROGRESS, UNDER_REVIEW -> {
                    // Log inspector change if different from current
                    if (inspection.currentInspector() != null && 
                        !inspection.currentInspector().equals(inspectorName)) {
                        
                        historyService.logInspectorChange(
                            inspectionId, 
                            inspection.currentInspector(), 
                            inspectorName,
                            request.reason() != null ? request.reason() : "Inspector takeover"
                        );
                    }
                    
                    // Update current inspector in inspection
                    inspectionService.updateCurrentInspector(inspectionId, inspectorName);
                    
                    log.info("✅ READ-WRITE access granted to {} for {} inspection", 
                            inspectorName, status);
                    return ResponseEntity.ok(InspectorAccessResponse.readWrite(
                        "Access granted - you can edit this inspection",
                        inspectorName,
                        status.toString()));
                }
                
                case CANCELLED -> {
                    return ResponseEntity.ok(InspectorAccessResponse.denied(
                        "Inspection has been cancelled", status.toString()));
                }
                
                default -> {
                    return ResponseEntity.ok(InspectorAccessResponse.denied(
                        "Unknown inspection status", status.toString()));
                }
            }
            
        } catch (Exception e) {
            log.error("❌ Error validating inspector access", e);
            return ResponseEntity.ok(InspectorAccessResponse.denied(
                "System error during access validation", "ERROR"));
        }
    }

    /**
     * Get complete history for an inspection
     */
    @GetMapping
    public ResponseEntity<List<InspectionHistoryDTO>> getHistory(
            @PathVariable String inspectionId,
            @RequestParam(defaultValue = "false") boolean includeJsonData) {
        
        log.info("📚 Retrieving history for inspection: {} (includeJson: {})", 
                inspectionId, includeJsonData);
        
        try {
            List<InspectionHistoryDTO> history = historyService.getInspectionHistory(inspectionId);
            
            // If JSON data not requested, return summary version
            if (!includeJsonData) {
                history = history.stream().map(InspectionHistoryDTO::toSummary).toList();
            }
            
            return ResponseEntity.ok(history);
            
        } catch (Exception e) {
            log.error("❌ Error retrieving inspection history", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get recent history summary
     */
    @GetMapping("/summary")
    public ResponseEntity<List<InspectionHistoryDTO>> getHistorySummary(
            @PathVariable String inspectionId,
            @RequestParam(defaultValue = "10") int limit) {
        
        log.info("📋 Retrieving history summary for inspection: {} (limit: {})", 
                inspectionId, limit);
        
        try {
            List<InspectionHistoryDTO> history = 
                historyService.getInspectionHistorySummary(inspectionId, limit);
            return ResponseEntity.ok(history);
            
        } catch (Exception e) {
            log.error("❌ Error retrieving inspection history summary", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get history for a specific box
     */
    @GetMapping("/box/{boxNumber}")
    public ResponseEntity<List<InspectionHistoryDTO>> getBoxHistory(
            @PathVariable String inspectionId,
            @PathVariable Integer boxNumber) {
        
        log.info("📦 Retrieving history for box #{} in inspection: {}", boxNumber, inspectionId);
        
        try {
            List<InspectionHistoryDTO> history = 
                historyService.getBoxHistory(inspectionId, boxNumber);
            return ResponseEntity.ok(history);
            
        } catch (Exception e) {
            log.error("❌ Error retrieving box history", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get inspection statistics and activity summary
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStatistics(@PathVariable String inspectionId) {
        
        log.info("📊 Retrieving statistics for inspection: {}", inspectionId);
        
        try {
            Map<String, Object> stats = historyService.getInspectionStatistics(inspectionId);
            return ResponseEntity.ok(stats);
            
        } catch (Exception e) {
            log.error("❌ Error retrieving inspection statistics", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Log a custom history entry (for manual events)
     */
    @PostMapping("/log")
    public ResponseEntity<String> logCustomEvent(
            @PathVariable String inspectionId,
            @RequestBody Map<String, Object> eventData) {
        
        log.info("📝 Logging custom event for inspection: {}", inspectionId);
        
        try {
            String actionType = (String) eventData.get("action_type");
            String description = (String) eventData.get("description");
            String userName = (String) eventData.get("user_name");
            Integer boxNumber = (Integer) eventData.get("box_number");
            
            // This would typically be handled by service method
            // For now, just acknowledge receipt
            log.info("📋 Custom event logged: {} by {} for box #{}", 
                    actionType, userName, boxNumber);
            
            return ResponseEntity.ok("Event logged successfully");
            
        } catch (Exception e) {
            log.error("❌ Error logging custom event", e);
            return ResponseEntity.internalServerError().body("Error logging event");
        }
    }
}