package com.acme.backend.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Annotation entity for Phase 2 & 3
 * Stores bounding box annotations (AI-generated and human-edited)
 * Supports version control and undo/redo functionality
 */
@Entity
@Table(name = "annotations")
public class Annotation {
    
    public enum Source {
        ai,
        human
    }
    
    public enum ActionType {
        created,
        edited,
        deleted,
        approved,
        rejected
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "inspection_id", nullable = false)
    private Inspection inspection;
    
    @Column(nullable = false)
    private Integer version = 1;
    
    // Bounding box coordinates (pixel values)
    @Column(name = "bbox_x1", nullable = false)
    private Integer bboxX1;
    
    @Column(name = "bbox_y1", nullable = false)
    private Integer bboxY1;
    
    @Column(name = "bbox_x2", nullable = false)
    private Integer bboxX2;
    
    @Column(name = "bbox_y2", nullable = false)
    private Integer bboxY2;
    
    // Classification based on rules.txt
    // Classes: Faulty, faulty_loose_joint, faulty_point_overload, potential_faulty
    @Column(name = "class_id")
    private Integer classId;
    
    @Column(name = "class_name", length = 50)
    private String className;
    
    // Box numbering for history tracking (Phase 3)
    @Column(name = "box_number")
    private Integer boxNumber;
    
    @Column(precision = 5, scale = 3)
    private BigDecimal confidence;
    
    // Metadata for Phase 3 tracking
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Source source;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "action_type")
    private ActionType actionType = ActionType.created;
    
    // User tracking
    @Column(name = "created_by", length = 100)
    private String createdBy;
    
    // Current inspector working on this annotation (Phase 3)
    @Column(name = "current_inspector", length = 255)
    private String currentInspector;
    
    @CreationTimestamp
    @Column(name = "created_at")
    private Instant createdAt;
    
    @Column(name = "modified_by", length = 100)
    private String modifiedBy;
    
    @Column(name = "modified_at")
    private Instant modifiedAt;
    
    // Version control for Phase 3 undo/redo
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_annotation_id")
    private Annotation parentAnnotation;  // Points to previous version
    
    @Column(name = "is_active")
    private Boolean isActive = true;  // Current active version
    
    // Optional fields
    @Column(columnDefinition = "TEXT")
    private String comments;

    // Constructors
    public Annotation() {}

    // Getters and Setters
    public UUID getId() {
        return id;
    }

    public Inspection getInspection() {
        return inspection;
    }

    public void setInspection(Inspection inspection) {
        this.inspection = inspection;
    }

    public Integer getVersion() {
        return version;
    }

    public void setVersion(Integer version) {
        this.version = version;
    }

    public Integer getBboxX1() {
        return bboxX1;
    }

    public void setBboxX1(Integer bboxX1) {
        this.bboxX1 = bboxX1;
    }

    public Integer getBboxY1() {
        return bboxY1;
    }

    public void setBboxY1(Integer bboxY1) {
        this.bboxY1 = bboxY1;
    }

    public Integer getBboxX2() {
        return bboxX2;
    }

    public void setBboxX2(Integer bboxX2) {
        this.bboxX2 = bboxX2;
    }

    public Integer getBboxY2() {
        return bboxY2;
    }

    public void setBboxY2(Integer bboxY2) {
        this.bboxY2 = bboxY2;
    }

    public Integer getClassId() {
        return classId;
    }

    public void setClassId(Integer classId) {
        this.classId = classId;
    }

    public String getClassName() {
        return className;
    }

    public void setClassName(String className) {
        this.className = className;
    }

    public Integer getBoxNumber() {
        return boxNumber;
    }

    public void setBoxNumber(Integer boxNumber) {
        this.boxNumber = boxNumber;
    }

    public BigDecimal getConfidence() {
        return confidence;
    }

    public void setConfidence(BigDecimal confidence) {
        this.confidence = confidence;
    }

    public Source getSource() {
        return source;
    }

    public void setSource(Source source) {
        this.source = source;
    }

    public ActionType getActionType() {
        return actionType;
    }

    public void setActionType(ActionType actionType) {
        this.actionType = actionType;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public String getCurrentInspector() {
        return currentInspector;
    }

    public void setCurrentInspector(String currentInspector) {
        this.currentInspector = currentInspector;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public String getModifiedBy() {
        return modifiedBy;
    }

    public void setModifiedBy(String modifiedBy) {
        this.modifiedBy = modifiedBy;
    }

    public Instant getModifiedAt() {
        return modifiedAt;
    }

    public void setModifiedAt(Instant modifiedAt) {
        this.modifiedAt = modifiedAt;
    }

    public Annotation getParentAnnotation() {
        return parentAnnotation;
    }

    public void setParentAnnotation(Annotation parentAnnotation) {
        this.parentAnnotation = parentAnnotation;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

    public String getComments() {
        return comments;
    }

    public void setComments(String comments) {
        this.comments = comments;
    }
    
    /**
     * Helper method to create a new version of this annotation
     */
    public Annotation createNewVersion() {
        Annotation newVersion = new Annotation();
        newVersion.setInspection(this.inspection);
        newVersion.setVersion(this.version + 1);
        newVersion.setBboxX1(this.bboxX1);
        newVersion.setBboxY1(this.bboxY1);
        newVersion.setBboxX2(this.bboxX2);
        newVersion.setBboxY2(this.bboxY2);
        newVersion.setClassId(this.classId);
        newVersion.setClassName(this.className);
        newVersion.setBoxNumber(this.boxNumber);
        newVersion.setConfidence(this.confidence);
        newVersion.setSource(this.source);
        newVersion.setComments(this.comments);
        newVersion.setCurrentInspector(this.currentInspector);
        newVersion.setParentAnnotation(this);
        newVersion.setIsActive(true);
        return newVersion;
    }
}
