package com.acme.backend.service;

import com.acme.backend.api.dto.AnnotationDTO;
import com.acme.backend.api.dto.FeedbackExportResponse;
import com.acme.backend.api.dto.SaveAnnotationRequest;
import com.acme.backend.domain.Annotation;
import com.acme.backend.domain.Inspection;
import com.acme.backend.repo.AnnotationRepo;
import com.acme.backend.repo.InspectionRepo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for managing annotations (Phase 3 - Interactive Annotation & Feedback)
 */
@Service
@Transactional
public class AnnotationService {
    
    private static final Logger log = LoggerFactory.getLogger(AnnotationService.class);
    
    private final AnnotationRepo annotationRepo;
    private final InspectionRepo inspectionRepo;
    
    public AnnotationService(AnnotationRepo annotationRepo, InspectionRepo inspectionRepo) {
        this.annotationRepo = annotationRepo;
        this.inspectionRepo = inspectionRepo;
    }
    
    /**
     * Get all active annotations for an inspection
     */
    @Transactional(readOnly = true)
    public List<AnnotationDTO> getActiveAnnotations(UUID inspectionId) {
        return annotationRepo.findActiveByInspectionId(inspectionId)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }
    
    /**
     * Get user name with fallback to default
     */
    private String getUserName(String userId) {
        if (userId == null || userId.trim().isEmpty()) {
            return "User"; // Default user name until authentication is implemented
        }
        return userId;
    }

    /**
     * Get the next available box number for an inspection
     */
    private Integer getNextBoxNumber(UUID inspectionId) {
        List<Annotation> existingAnnotations = annotationRepo.findActiveByInspectionId(inspectionId);
        
        if (existingAnnotations.isEmpty()) {
            return 1;
        }
        
        // Find the highest existing box number
        Integer maxBoxNumber = existingAnnotations.stream()
                .map(Annotation::getBoxNumber)
                .filter(Objects::nonNull)
                .max(Integer::compareTo)
                .orElse(0);
                
        return maxBoxNumber + 1;
    }

    /**
     * Create or update annotation (Phase 3)
     */
    public AnnotationDTO saveAnnotation(SaveAnnotationRequest request) {
        Inspection inspection = inspectionRepo.findById(request.inspectionId())
                .orElseThrow(() -> new RuntimeException("Inspection not found"));
        
        Annotation annotation;
        
        if (request.id() != null) {
            // Update existing annotation (create new version)
            Annotation existing = annotationRepo.findById(request.id())
                    .orElseThrow(() -> new RuntimeException("Annotation not found"));
            
            // Deactivate old version
            existing.setIsActive(false);
            annotationRepo.save(existing);
            
            // Create new version
            annotation = existing.createNewVersion();
            annotation.setActionType(Annotation.ActionType.edited);
            annotation.setModifiedBy(getUserName(request.userId()));
            annotation.setModifiedAt(Instant.now());
            
            log.info("Creating new version {} of annotation {}", 
                    annotation.getVersion(), existing.getId());
        } else {
            // Create new annotation
            annotation = new Annotation();
            annotation.setInspection(inspection);
            annotation.setActionType(Annotation.ActionType.created);
            annotation.setCreatedBy(getUserName(request.userId()));
            annotation.setIsActive(true);
            
            // Assign next box number for this inspection
            Integer nextBoxNumber = getNextBoxNumber(inspection.getId());
            annotation.setBoxNumber(nextBoxNumber);
            
            log.info("Creating new annotation for inspection {} with box number {}", 
                    inspection.getInspectionNumber(), nextBoxNumber);
        }
        
        // Set bounding box
        annotation.setBboxX1(request.bbox().x1());
        annotation.setBboxY1(request.bbox().y1());
        annotation.setBboxX2(request.bbox().x2());
        annotation.setBboxY2(request.bbox().y2());
        
        // Set classification
        annotation.setClassId(request.classId());
        annotation.setClassName(request.className());
        annotation.setConfidence(request.confidence());
        annotation.setSource(request.source());
        annotation.setComments(request.comments());
        
        annotation = annotationRepo.save(annotation);
        return toDTO(annotation);
    }
    
    /**
     * Delete annotation (mark as deleted, keep for history)
     */
    public void deleteAnnotation(UUID annotationId, String userId) {
        Annotation annotation = annotationRepo.findById(annotationId)
                .orElseThrow(() -> new RuntimeException("Annotation not found"));
        
        // Create a "deleted" version
        String userName = getUserName(userId);
        annotation.setIsActive(false);
        annotation.setActionType(Annotation.ActionType.deleted);
        annotation.setModifiedBy(userName);
        annotation.setModifiedAt(Instant.now());
        
        annotationRepo.save(annotation);
        log.info("Marked annotation {} as deleted by {}", annotationId, userName);
    }
    
    /**
     * Approve annotation (user validation)
     */
    public AnnotationDTO approveAnnotation(UUID annotationId, String userId) {
        Annotation annotation = annotationRepo.findById(annotationId)
                .orElseThrow(() -> new RuntimeException("Annotation not found"));
        
        annotation.setActionType(Annotation.ActionType.approved);
        annotation.setModifiedBy(getUserName(userId));
        annotation.setModifiedAt(Instant.now());
        
        annotation = annotationRepo.save(annotation);
        return toDTO(annotation);
    }
    
    /**
     * Reject annotation
     */
    public AnnotationDTO rejectAnnotation(UUID annotationId, String userId, String reason) {
        Annotation annotation = annotationRepo.findById(annotationId)
                .orElseThrow(() -> new RuntimeException("Annotation not found"));
        
        annotation.setActionType(Annotation.ActionType.rejected);
        annotation.setModifiedBy(getUserName(userId));
        annotation.setModifiedAt(Instant.now());
        annotation.setComments(reason);
        annotation.setIsActive(false);
        
        annotation = annotationRepo.save(annotation);
        return toDTO(annotation);
    }
    
    /**
     * Get annotation version history
     */
    @Transactional(readOnly = true)
    public List<AnnotationDTO> getAnnotationHistory(UUID annotationId) {
        return annotationRepo.findAnnotationHistory(annotationId)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }
    
    /**
     * Export feedback for model improvement (Phase 3 - FR3.3)
     */
    @Transactional(readOnly = true)
    public FeedbackExportResponse exportFeedback(UUID inspectionId) {
        Inspection inspection = inspectionRepo.findById(inspectionId)
                .orElseThrow(() -> new RuntimeException("Inspection not found"));
        
        List<Annotation> aiAnnotations = annotationRepo.findByInspectionIdAndSource(
                inspectionId, Annotation.Source.ai);
        List<Annotation> humanAnnotations = annotationRepo.findByInspectionIdAndSource(
                inspectionId, Annotation.Source.human);
        List<Annotation> allAnnotations = annotationRepo.findActiveByInspectionId(inspectionId);
        
        // Create comparisons
        List<FeedbackExportResponse.AnnotationComparison> comparisons = new ArrayList<>();
        
        for (Annotation ai : aiAnnotations) {
            AnnotationDTO aiDTO = toDTO(ai);
            AnnotationDTO humanDTO = null;
            String action = determineAction(ai);
            
            // Try to find corresponding human annotation (edited version)
            if (ai.getParentAnnotation() != null) {
                humanDTO = toDTO(ai);
            }
            
            comparisons.add(new FeedbackExportResponse.AnnotationComparison(
                    inspection.getInspectionImage() != null ? 
                            inspection.getInspectionImage().getId() : null,
                    aiDTO,
                    humanDTO,
                    action
            ));
        }
        
        // Add purely human-added annotations
        for (Annotation human : humanAnnotations) {
            if (human.getParentAnnotation() == null) {  // Not an edit of AI annotation
                comparisons.add(new FeedbackExportResponse.AnnotationComparison(
                        inspection.getInspectionImage() != null ? 
                                inspection.getInspectionImage().getId() : null,
                        null,
                        toDTO(human),
                        "added"
                ));
            }
        }
        
        // Calculate summary
        int totalAi = aiAnnotations.size();
        int totalHuman = humanAnnotations.size();
        int approved = (int) allAnnotations.stream()
                .filter(a -> a.getActionType() == Annotation.ActionType.approved)
                .count();
        int rejected = (int) allAnnotations.stream()
                .filter(a -> a.getActionType() == Annotation.ActionType.rejected)
                .count();
        int edited = (int) allAnnotations.stream()
                .filter(a -> a.getActionType() == Annotation.ActionType.edited)
                .count();
        int added = (int) humanAnnotations.stream()
                .filter(a -> a.getParentAnnotation() == null)
                .count();
        
        FeedbackExportResponse.Summary summary = new FeedbackExportResponse.Summary(
                totalAi, totalHuman, approved, rejected, edited, added);
        
        return new FeedbackExportResponse(
                inspectionId,
                inspection.getInspectionNumber(),
                inspection.getTransformer().getCode(),
                Instant.now(),
                comparisons,
                summary
        );
    }
    
    /**
     * Determine action taken on annotation
     */
    private String determineAction(Annotation annotation) {
        if (annotation.getActionType() == null) {
            return annotation.getIsActive() ? "pending" : "deleted";
        }
        return annotation.getActionType().name();
    }
    
    /**
     * Convert Annotation entity to DTO
     */
    private AnnotationDTO toDTO(Annotation annotation) {
        return new AnnotationDTO(
                annotation.getId(),
                annotation.getInspection().getId(),
                annotation.getVersion(),
                new AnnotationDTO.BoundingBox(
                        annotation.getBboxX1(),
                        annotation.getBboxY1(),
                        annotation.getBboxX2(),
                        annotation.getBboxY2()
                ),
                annotation.getClassId(),
                annotation.getClassName(),
                annotation.getConfidence(),
                annotation.getSource(),
                annotation.getActionType(),
                annotation.getBoxNumber(),
                annotation.getCreatedBy(),
                annotation.getCreatedAt(),
                annotation.getModifiedBy(),
                annotation.getModifiedAt(),
                annotation.getParentAnnotation() != null ? 
                        annotation.getParentAnnotation().getId() : null,
                annotation.getIsActive(),
                annotation.getComments()
        );
    }
}
