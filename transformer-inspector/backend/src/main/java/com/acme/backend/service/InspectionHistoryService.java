package com.acme.backend.service;

import com.acme.backend.domain.Inspection;
import com.acme.backend.domain.Annotation;
import com.acme.backend.api.dto.InspectionHistoryDTO;
import com.acme.backend.api.dto.BoxNumberAssignmentDTO;
import com.acme.backend.repository.InspectionHistoryRepository;
import com.acme.backend.repository.BoxNumberingSequenceRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Service for managing inspection history and bounding box numbering
 */
@Service
public class InspectionHistoryService {
    
    private static final Logger log = LoggerFactory.getLogger(InspectionHistoryService.class);
    
    @Autowired
    private InspectionHistoryRepository historyRepo;
    
    @Autowired
    private BoxNumberingSequenceRepository boxSequenceRepo;
    
    @Autowired
    private ObjectMapper objectMapper;

    /**
     * Assign sequential numbers to new annotations for an inspection
     */
    @Transactional
    public void assignBoxNumbers(String inspectionId, List<Annotation> newAnnotations, String inspectorName) {
        log.info("Assigning box numbers for {} new annotations in inspection: {}", 
                newAnnotations.size(), inspectionId);
        
        // Get or create box numbering sequence for this inspection
        Integer nextBoxNumber = boxSequenceRepo.getNextBoxNumber(inspectionId);
        if (nextBoxNumber == null) {
            nextBoxNumber = 1;
            boxSequenceRepo.initializeSequence(inspectionId, 1);
        }
        
        // Assign sequential numbers to new annotations
        for (Annotation annotation : newAnnotations) {
            if (annotation.getBoxNumber() == null) {
                annotation.setBoxNumber(nextBoxNumber);
                annotation.setCurrentInspector(inspectorName);
                nextBoxNumber++;
                
                log.debug("📍 Assigned box #{} to {} annotation (confidence: {})", 
                        annotation.getBoxNumber(), 
                        annotation.getClassName(), 
                        annotation.getConfidence());
            }
        }
        
        // Update sequence counter
        boxSequenceRepo.updateNextBoxNumber(inspectionId, nextBoxNumber);
        
        log.info("Box numbering complete. Next available number: {}", nextBoxNumber);
    }

    /**
     * Log inspection creation
     */
    @Transactional
    public void logInspectionCreated(String inspectionId, String inspectorName, 
                                   String inspectionNumber, Map<String, Object> metadata) {
        try {
            Map<String, Object> data = new HashMap<>();
            data.put("inspection_number", inspectionNumber);
            data.put("created_by", inspectorName);
            data.put("metadata", metadata);
            
            historyRepo.insertHistoryRecord(
                inspectionId,
                null, // no box number for inspection-level events
                "INSPECTION_CREATED",
                String.format("Inspection %s created by %s", inspectionNumber, inspectorName),
                inspectorName,
                null, // no previous data
                objectMapper.writeValueAsString(data)
            );
            
            log.info("Logged inspection creation: {} by {}", inspectionNumber, inspectorName);
        } catch (Exception e) {
            log.error("Failed to log inspection creation", e);
        }
    }

    /**
     * Log AI detection run
     */
    @Transactional
    public void logAIDetectionRun(String inspectionId, String inspectorName, 
                                List<Annotation> detectedAnnotations, Map<String, Object> detectionMetadata) {
        try {
            Map<String, Object> data = new HashMap<>();
            data.put("total_detections", detectedAnnotations.size());
            data.put("detection_metadata", detectionMetadata);
            data.put("detected_boxes", detectedAnnotations.stream()
                .map(this::annotationToMap)
                .toList());
            
            historyRepo.insertHistoryRecord(
                inspectionId,
                null,
                "AI_DETECTION_RUN",
                String.format("AI detected %d anomalies using %s", 
                            detectedAnnotations.size(), 
                            detectionMetadata.getOrDefault("model_type", "YOLOv8")),
                inspectorName,
                null,
                objectMapper.writeValueAsString(data)
            );
            
            log.info("Logged AI detection: {} boxes detected by {}", 
                    detectedAnnotations.size(), inspectorName);
        } catch (Exception e) {
            log.error("Failed to log AI detection run", e);
        }
    }

    /**
     * Log inspector change
     */
    @Transactional
    public void logInspectorChange(String inspectionId, String previousInspector, 
                                 String newInspector, String reason) {
        try {
            Map<String, Object> previousData = new HashMap<>();
            previousData.put("inspector", previousInspector);
            
            Map<String, Object> newData = new HashMap<>();
            newData.put("inspector", newInspector);
            newData.put("change_reason", reason);
            
            historyRepo.insertHistoryRecord(
                inspectionId,
                null,
                "INSPECTOR_CHANGED",
                String.format("Inspector changed from %s to %s. Reason: %s", 
                            previousInspector != null ? previousInspector : "none", 
                            newInspector, reason),
                newInspector,
                objectMapper.writeValueAsString(previousData),
                objectMapper.writeValueAsString(newData)
            );
            
            log.info("Logged inspector change: {} → {} ({})", 
                    previousInspector, newInspector, reason);
        } catch (Exception e) {
            log.error("Failed to log inspector change", e);
        }
    }

    /**
     * Log inspection completion
     */
    @Transactional
    public void logInspectionCompleted(String inspectionId, String inspectorName, 
                                     int totalBoxes, Map<String, Integer> classificationSummary) {
        try {
            Map<String, Object> data = new HashMap<>();
            data.put("completed_by", inspectorName);
            data.put("total_boxes", totalBoxes);
            data.put("classification_summary", classificationSummary);
            data.put("completed_at", LocalDateTime.now().toString());
            
            historyRepo.insertHistoryRecord(
                inspectionId,
                null,
                "INSPECTION_COMPLETED",
                String.format("Inspection completed by %s with %d total boxes", 
                            inspectorName, totalBoxes),
                inspectorName,
                null,
                objectMapper.writeValueAsString(data)
            );
            
            log.info("Logged inspection completion: {} boxes by {}", totalBoxes, inspectorName);
        } catch (Exception e) {
            log.error("Failed to log inspection completion", e);
        }
    }

    /**
     * Get complete history for an inspection
     */
    public List<InspectionHistoryDTO> getInspectionHistory(String inspectionId) {
        log.info("Retrieving history for inspection: {}", inspectionId);
        return historyRepo.findHistoryByInspectionId(inspectionId);
    }

    /**
     * Get history summary (recent actions only)
     */
    public List<InspectionHistoryDTO> getInspectionHistorySummary(String inspectionId, int limit) {
        log.info("Retrieving history summary for inspection: {} (limit: {})", inspectionId, limit);
        return historyRepo.findRecentHistoryByInspectionId(inspectionId, limit);
    }

    /**
     * Get box-specific history
     */
    public List<InspectionHistoryDTO> getBoxHistory(String inspectionId, Integer boxNumber) {
        log.info("Retrieving history for box #{} in inspection: {}", boxNumber, inspectionId);
        return historyRepo.findHistoryByInspectionIdAndBoxNumber(inspectionId, boxNumber);
    }

    /**
     * Get statistics for inspection activity
     */
    public Map<String, Object> getInspectionStatistics(String inspectionId) {
        log.info("Calculating statistics for inspection: {}", inspectionId);
        
        List<InspectionHistoryDTO> history = getInspectionHistory(inspectionId);
        
        Map<String, Object> stats = new HashMap<>();
        
        // Count actions by type
        Map<String, Long> actionCounts = history.stream()
            .collect(java.util.stream.Collectors.groupingBy(
                InspectionHistoryDTO::actionType,
                java.util.stream.Collectors.counting()
            ));
        
        // Count actions by user
        Map<String, Long> userCounts = history.stream()
            .collect(java.util.stream.Collectors.groupingBy(
                InspectionHistoryDTO::userName,
                java.util.stream.Collectors.counting()
            ));
        
        // Timeline data
        stats.put("total_actions", history.size());
        stats.put("action_counts", actionCounts);
        stats.put("user_activity", userCounts);
        stats.put("first_action", history.isEmpty() ? null : 
                 history.get(history.size() - 1).createdAt());
        stats.put("last_action", history.isEmpty() ? null : 
                 history.get(0).createdAt());
        
        return stats;
    }

    /**
     * Convert annotation to map for JSON storage
     */
    private Map<String, Object> annotationToMap(Annotation annotation) {
        Map<String, Object> map = new HashMap<>();
        map.put("box_number", annotation.getBoxNumber());
        map.put("class_name", annotation.getClassName());
        map.put("class_id", annotation.getClassId());
        map.put("confidence", annotation.getConfidence());
        map.put("source", annotation.getSource().toString());
        map.put("bbox", Map.of(
            "x1", annotation.getBboxX1(),
            "y1", annotation.getBboxY1(),
            "x2", annotation.getBboxX2(),
            "y2", annotation.getBboxY2()
        ));
        return map;
    }

    /**
     * Validate inspector access to inspection
     */
    public boolean validateInspectorAccess(String inspectionId, String inspectorName, 
                                         Inspection.Status inspectionStatus) {
        // Completed inspections are read-only
        if (inspectionStatus == Inspection.Status.COMPLETED) {
            log.info("Inspector {} attempting to access COMPLETED inspection {} - READ-ONLY mode", 
                    inspectorName, inspectionId);
            return false; // Read-only access only
        }
        
        // Draft and in-progress inspections allow editing
        log.info("Inspector {} granted edit access to inspection {} (status: {})", 
                inspectorName, inspectionId, inspectionStatus);
        return true;
    }
}