package com.acme.backend.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Phase 4: Maintenance Record Anomaly entity
 * Immutable snapshot of anomalies detected during inspection
 * Preserves anomaly data even if original annotations are modified
 */
@Entity
@Table(name = "maintenance_record_anomalies")
public class MaintenanceRecordAnomaly {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "maintenance_record_id")
    private MaintenanceRecord maintenanceRecord;

    @Column(name = "box_number")
    private Integer boxNumber;

    @Column(name = "class_id", nullable = false)
    private Integer classId;

    @Column(name = "class_name", length = 50, nullable = false)
    private String className;

    @Column(precision = 5, scale = 3)
    private BigDecimal confidence;

    // Bounding box coordinates (pixel values)
    @Column(name = "bbox_x1", nullable = false)
    private Integer bboxX1;

    @Column(name = "bbox_y1", nullable = false)
    private Integer bboxY1;

    @Column(name = "bbox_x2", nullable = false)
    private Integer bboxX2;

    @Column(name = "bbox_y2", nullable = false)
    private Integer bboxY2;

    @Column(length = 20)
    private String source; // 'ai' or 'human'

    @CreationTimestamp
    @Column(name = "created_at")
    private Instant createdAt;

    // Constructors
    public MaintenanceRecordAnomaly() {}

    // Getters and Setters
    public UUID getId() {
        return id;
    }

    public MaintenanceRecord getMaintenanceRecord() {
        return maintenanceRecord;
    }

    public void setMaintenanceRecord(MaintenanceRecord maintenanceRecord) {
        this.maintenanceRecord = maintenanceRecord;
    }

    public Integer getBoxNumber() {
        return boxNumber;
    }

    public void setBoxNumber(Integer boxNumber) {
        this.boxNumber = boxNumber;
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

    public BigDecimal getConfidence() {
        return confidence;
    }

    public void setConfidence(BigDecimal confidence) {
        this.confidence = confidence;
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

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
