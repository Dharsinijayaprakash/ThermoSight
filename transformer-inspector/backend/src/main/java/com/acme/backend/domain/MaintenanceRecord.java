package com.acme.backend.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Phase 4: Maintenance Record entity
 * Digital maintenance record generation based on thermal inspection results
 * Two-tab form: (1) Maintenance Record tab, (2) Work-Data Sheet tab
 */
@Entity
@Table(name = "maintenance_records")
public class MaintenanceRecord {
    
    public enum Status {
        DRAFT,
        FINALIZED
    }
    
    public enum TransformerStatus {
        WORKING,
        NOT_WORKING,
        PARTIALLY_WORKING
    }
    
    public enum BaselineCondition {
        GOOD,
        FAIR,
        POOR
    }
    
    public enum TransformerType {
        DISTRIBUTION,
        POWER,
        INSTRUMENT,
        AUTO_TRANSFORMER
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotBlank
    @Column(name = "record_number", unique = true)
    private String recordNumber;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "transformer_id")
    private Transformer transformer;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "inspection_id")
    private Inspection inspection;

    // System-generated fields (from inspection)
    @Column(name = "inspection_date")
    private LocalDate inspectionDate;

    @Column(name = "weather_condition", length = 50)
    private String weatherCondition;

    @Column(name = "thermal_image_url", length = 512)
    private String thermalImageUrl;

    @Column(name = "anomaly_count")
    private Integer anomalyCount = 0;

    // Tab 1: Maintenance Record fields (engineer-editable)
    @Column(name = "date_of_inspection")
    private LocalDate dateOfInspection;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "completion_time")
    private LocalTime completionTime;

    @Column(name = "supervised_by", length = 100)
    private String supervisedBy;

    // Gang composition
    @Column(name = "gang_tech_1", length = 100)
    private String gangTech1;

    @Column(name = "gang_tech_2", length = 100)
    private String gangTech2;

    @Column(name = "gang_tech_3", length = 100)
    private String gangTech3;

    @Column(name = "gang_helpers", length = 255)
    private String gangHelpers;

    // Inspection signatures
    @Column(name = "inspected_by", length = 100)
    private String inspectedBy;

    @Column(name = "inspected_date")
    private LocalDate inspectedDate;

    @Column(name = "rectified_by", length = 100)
    private String rectifiedBy;

    @Column(name = "rectified_date")
    private LocalDate rectifiedDate;

    @Column(name = "css_inspector", length = 100)
    private String cssInspector;

    @Column(name = "css_inspector_date")
    private LocalDate cssInspectorDate;

    // Tab 2: Work-Data Sheet fields
    @Column(length = 100)
    private String branch;

    @Column(name = "transformer_no", length = 50)
    private String transformerNo;

    @Column(name = "pole_no", length = 50)
    private String poleNo;

    // Baseline thermal readings
    @Column(name = "baseline_right", precision = 5, scale = 2)
    private BigDecimal baselineRight;

    @Column(name = "baseline_left", precision = 5, scale = 2)
    private BigDecimal baselineLeft;

    @Column(name = "baseline_front", precision = 5, scale = 2)
    private BigDecimal baselineFront;

    @Column(name = "load_growth_kva", precision = 10, scale = 2)
    private BigDecimal loadGrowthKva;

    @Enumerated(EnumType.STRING)
    @Column(name = "baseline_condition")
    private BaselineCondition baselineCondition;

    @Enumerated(EnumType.STRING)
    @Column(name = "transformer_status")
    private TransformerStatus transformerStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "transformer_type")
    private TransformerType transformerType;

    // Meter information
    @Column(name = "meter_serial_no", length = 100)
    private String meterSerialNo;

    @Column(name = "meter_maker", length = 100)
    private String meterMaker;

    @Column(name = "meter_make", length = 100)
    private String meterMake;

    // Work content checklist (stored as JSON for flexibility)
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "work_content", columnDefinition = "JSON")
    private Map<String, Boolean> workContent;

    // First inspection readings
    @Column(name = "first_voltage_r", precision = 7, scale = 2)
    private BigDecimal firstVoltageR;

    @Column(name = "first_voltage_y", precision = 7, scale = 2)
    private BigDecimal firstVoltageY;

    @Column(name = "first_voltage_b", precision = 7, scale = 2)
    private BigDecimal firstVoltageB;

    @Column(name = "first_current_r", precision = 7, scale = 2)
    private BigDecimal firstCurrentR;

    @Column(name = "first_current_y", precision = 7, scale = 2)
    private BigDecimal firstCurrentY;

    @Column(name = "first_current_b", precision = 7, scale = 2)
    private BigDecimal firstCurrentB;

    @Column(name = "first_power_factor_r", precision = 4, scale = 3)
    private BigDecimal firstPowerFactorR;

    @Column(name = "first_power_factor_y", precision = 4, scale = 3)
    private BigDecimal firstPowerFactorY;

    @Column(name = "first_power_factor_b", precision = 4, scale = 3)
    private BigDecimal firstPowerFactorB;

    @Column(name = "first_kw_r", precision = 7, scale = 2)
    private BigDecimal firstKwR;

    @Column(name = "first_kw_y", precision = 7, scale = 2)
    private BigDecimal firstKwY;

    @Column(name = "first_kw_b", precision = 7, scale = 2)
    private BigDecimal firstKwB;

    // Second inspection readings
    @Column(name = "second_voltage_r", precision = 7, scale = 2)
    private BigDecimal secondVoltageR;

    @Column(name = "second_voltage_y", precision = 7, scale = 2)
    private BigDecimal secondVoltageY;

    @Column(name = "second_voltage_b", precision = 7, scale = 2)
    private BigDecimal secondVoltageB;

    @Column(name = "second_current_r", precision = 7, scale = 2)
    private BigDecimal secondCurrentR;

    @Column(name = "second_current_y", precision = 7, scale = 2)
    private BigDecimal secondCurrentY;

    @Column(name = "second_current_b", precision = 7, scale = 2)
    private BigDecimal secondCurrentB;

    @Column(name = "second_power_factor_r", precision = 4, scale = 3)
    private BigDecimal secondPowerFactorR;

    @Column(name = "second_power_factor_y", precision = 4, scale = 3)
    private BigDecimal secondPowerFactorY;

    @Column(name = "second_power_factor_b", precision = 4, scale = 3)
    private BigDecimal secondPowerFactorB;

    @Column(name = "second_kw_r", precision = 7, scale = 2)
    private BigDecimal secondKwR;

    @Column(name = "second_kw_y", precision = 7, scale = 2)
    private BigDecimal secondKwY;

    @Column(name = "second_kw_b", precision = 7, scale = 2)
    private BigDecimal secondKwB;

    @Column(name = "second_inspection_date")
    private LocalDate secondInspectionDate;

    // Notes and observations
    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "engineer_remarks", columnDefinition = "TEXT")
    private String engineerRemarks;

    // Metadata
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.DRAFT;

    @Column(nullable = false)
    private Integer version = 1;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @Column(name = "finalized_by", length = 100)
    private String finalizedBy;

    @Column(name = "finalized_at")
    private Instant finalizedAt;

    @CreationTimestamp
    @Column(name = "created_at")
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    // Relationships
    @OneToMany(mappedBy = "maintenanceRecord", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<MaintenanceRecordAnomaly> anomalies = new ArrayList<>();

    // Constructors
    public MaintenanceRecord() {}

    // Getters and Setters
    public UUID getId() {
        return id;
    }

    public String getRecordNumber() {
        return recordNumber;
    }

    public void setRecordNumber(String recordNumber) {
        this.recordNumber = recordNumber;
    }

    public Transformer getTransformer() {
        return transformer;
    }

    public void setTransformer(Transformer transformer) {
        this.transformer = transformer;
    }

    public Inspection getInspection() {
        return inspection;
    }

    public void setInspection(Inspection inspection) {
        this.inspection = inspection;
    }

    public LocalDate getInspectionDate() {
        return inspectionDate;
    }

    public void setInspectionDate(LocalDate inspectionDate) {
        this.inspectionDate = inspectionDate;
    }

    public String getWeatherCondition() {
        return weatherCondition;
    }

    public void setWeatherCondition(String weatherCondition) {
        this.weatherCondition = weatherCondition;
    }

    public String getThermalImageUrl() {
        return thermalImageUrl;
    }

    public void setThermalImageUrl(String thermalImageUrl) {
        this.thermalImageUrl = thermalImageUrl;
    }

    public Integer getAnomalyCount() {
        return anomalyCount;
    }

    public void setAnomalyCount(Integer anomalyCount) {
        this.anomalyCount = anomalyCount;
    }

    public LocalDate getDateOfInspection() {
        return dateOfInspection;
    }

    public void setDateOfInspection(LocalDate dateOfInspection) {
        this.dateOfInspection = dateOfInspection;
    }

    public LocalTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalTime startTime) {
        this.startTime = startTime;
    }

    public LocalTime getCompletionTime() {
        return completionTime;
    }

    public void setCompletionTime(LocalTime completionTime) {
        this.completionTime = completionTime;
    }

    public String getSupervisedBy() {
        return supervisedBy;
    }

    public void setSupervisedBy(String supervisedBy) {
        this.supervisedBy = supervisedBy;
    }

    public String getGangTech1() {
        return gangTech1;
    }

    public void setGangTech1(String gangTech1) {
        this.gangTech1 = gangTech1;
    }

    public String getGangTech2() {
        return gangTech2;
    }

    public void setGangTech2(String gangTech2) {
        this.gangTech2 = gangTech2;
    }

    public String getGangTech3() {
        return gangTech3;
    }

    public void setGangTech3(String gangTech3) {
        this.gangTech3 = gangTech3;
    }

    public String getGangHelpers() {
        return gangHelpers;
    }

    public void setGangHelpers(String gangHelpers) {
        this.gangHelpers = gangHelpers;
    }

    public String getInspectedBy() {
        return inspectedBy;
    }

    public void setInspectedBy(String inspectedBy) {
        this.inspectedBy = inspectedBy;
    }

    public LocalDate getInspectedDate() {
        return inspectedDate;
    }

    public void setInspectedDate(LocalDate inspectedDate) {
        this.inspectedDate = inspectedDate;
    }

    public String getRectifiedBy() {
        return rectifiedBy;
    }

    public void setRectifiedBy(String rectifiedBy) {
        this.rectifiedBy = rectifiedBy;
    }

    public LocalDate getRectifiedDate() {
        return rectifiedDate;
    }

    public void setRectifiedDate(LocalDate rectifiedDate) {
        this.rectifiedDate = rectifiedDate;
    }

    public String getCssInspector() {
        return cssInspector;
    }

    public void setCssInspector(String cssInspector) {
        this.cssInspector = cssInspector;
    }

    public LocalDate getCssInspectorDate() {
        return cssInspectorDate;
    }

    public void setCssInspectorDate(LocalDate cssInspectorDate) {
        this.cssInspectorDate = cssInspectorDate;
    }

    public String getBranch() {
        return branch;
    }

    public void setBranch(String branch) {
        this.branch = branch;
    }

    public String getTransformerNo() {
        return transformerNo;
    }

    public void setTransformerNo(String transformerNo) {
        this.transformerNo = transformerNo;
    }

    public String getPoleNo() {
        return poleNo;
    }

    public void setPoleNo(String poleNo) {
        this.poleNo = poleNo;
    }

    public BigDecimal getBaselineRight() {
        return baselineRight;
    }

    public void setBaselineRight(BigDecimal baselineRight) {
        this.baselineRight = baselineRight;
    }

    public BigDecimal getBaselineLeft() {
        return baselineLeft;
    }

    public void setBaselineLeft(BigDecimal baselineLeft) {
        this.baselineLeft = baselineLeft;
    }

    public BigDecimal getBaselineFront() {
        return baselineFront;
    }

    public void setBaselineFront(BigDecimal baselineFront) {
        this.baselineFront = baselineFront;
    }

    public BigDecimal getLoadGrowthKva() {
        return loadGrowthKva;
    }

    public void setLoadGrowthKva(BigDecimal loadGrowthKva) {
        this.loadGrowthKva = loadGrowthKva;
    }

    public BaselineCondition getBaselineCondition() {
        return baselineCondition;
    }

    public void setBaselineCondition(BaselineCondition baselineCondition) {
        this.baselineCondition = baselineCondition;
    }

    public TransformerStatus getTransformerStatus() {
        return transformerStatus;
    }

    public void setTransformerStatus(TransformerStatus transformerStatus) {
        this.transformerStatus = transformerStatus;
    }

    public TransformerType getTransformerType() {
        return transformerType;
    }

    public void setTransformerType(TransformerType transformerType) {
        this.transformerType = transformerType;
    }

    public String getMeterSerialNo() {
        return meterSerialNo;
    }

    public void setMeterSerialNo(String meterSerialNo) {
        this.meterSerialNo = meterSerialNo;
    }

    public String getMeterMaker() {
        return meterMaker;
    }

    public void setMeterMaker(String meterMaker) {
        this.meterMaker = meterMaker;
    }

    public String getMeterMake() {
        return meterMake;
    }

    public void setMeterMake(String meterMake) {
        this.meterMake = meterMake;
    }

    public Map<String, Boolean> getWorkContent() {
        return workContent;
    }

    public void setWorkContent(Map<String, Boolean> workContent) {
        this.workContent = workContent;
    }

    public BigDecimal getFirstVoltageR() {
        return firstVoltageR;
    }

    public void setFirstVoltageR(BigDecimal firstVoltageR) {
        this.firstVoltageR = firstVoltageR;
    }

    public BigDecimal getFirstVoltageY() {
        return firstVoltageY;
    }

    public void setFirstVoltageY(BigDecimal firstVoltageY) {
        this.firstVoltageY = firstVoltageY;
    }

    public BigDecimal getFirstVoltageB() {
        return firstVoltageB;
    }

    public void setFirstVoltageB(BigDecimal firstVoltageB) {
        this.firstVoltageB = firstVoltageB;
    }

    public BigDecimal getFirstCurrentR() {
        return firstCurrentR;
    }

    public void setFirstCurrentR(BigDecimal firstCurrentR) {
        this.firstCurrentR = firstCurrentR;
    }

    public BigDecimal getFirstCurrentY() {
        return firstCurrentY;
    }

    public void setFirstCurrentY(BigDecimal firstCurrentY) {
        this.firstCurrentY = firstCurrentY;
    }

    public BigDecimal getFirstCurrentB() {
        return firstCurrentB;
    }

    public void setFirstCurrentB(BigDecimal firstCurrentB) {
        this.firstCurrentB = firstCurrentB;
    }

    public BigDecimal getFirstPowerFactorR() {
        return firstPowerFactorR;
    }

    public void setFirstPowerFactorR(BigDecimal firstPowerFactorR) {
        this.firstPowerFactorR = firstPowerFactorR;
    }

    public BigDecimal getFirstPowerFactorY() {
        return firstPowerFactorY;
    }

    public void setFirstPowerFactorY(BigDecimal firstPowerFactorY) {
        this.firstPowerFactorY = firstPowerFactorY;
    }

    public BigDecimal getFirstPowerFactorB() {
        return firstPowerFactorB;
    }

    public void setFirstPowerFactorB(BigDecimal firstPowerFactorB) {
        this.firstPowerFactorB = firstPowerFactorB;
    }

    public BigDecimal getFirstKwR() {
        return firstKwR;
    }

    public void setFirstKwR(BigDecimal firstKwR) {
        this.firstKwR = firstKwR;
    }

    public BigDecimal getFirstKwY() {
        return firstKwY;
    }

    public void setFirstKwY(BigDecimal firstKwY) {
        this.firstKwY = firstKwY;
    }

    public BigDecimal getFirstKwB() {
        return firstKwB;
    }

    public void setFirstKwB(BigDecimal firstKwB) {
        this.firstKwB = firstKwB;
    }

    public BigDecimal getSecondVoltageR() {
        return secondVoltageR;
    }

    public void setSecondVoltageR(BigDecimal secondVoltageR) {
        this.secondVoltageR = secondVoltageR;
    }

    public BigDecimal getSecondVoltageY() {
        return secondVoltageY;
    }

    public void setSecondVoltageY(BigDecimal secondVoltageY) {
        this.secondVoltageY = secondVoltageY;
    }

    public BigDecimal getSecondVoltageB() {
        return secondVoltageB;
    }

    public void setSecondVoltageB(BigDecimal secondVoltageB) {
        this.secondVoltageB = secondVoltageB;
    }

    public BigDecimal getSecondCurrentR() {
        return secondCurrentR;
    }

    public void setSecondCurrentR(BigDecimal secondCurrentR) {
        this.secondCurrentR = secondCurrentR;
    }

    public BigDecimal getSecondCurrentY() {
        return secondCurrentY;
    }

    public void setSecondCurrentY(BigDecimal secondCurrentY) {
        this.secondCurrentY = secondCurrentY;
    }

    public BigDecimal getSecondCurrentB() {
        return secondCurrentB;
    }

    public void setSecondCurrentB(BigDecimal secondCurrentB) {
        this.secondCurrentB = secondCurrentB;
    }

    public BigDecimal getSecondPowerFactorR() {
        return secondPowerFactorR;
    }

    public void setSecondPowerFactorR(BigDecimal secondPowerFactorR) {
        this.secondPowerFactorR = secondPowerFactorR;
    }

    public BigDecimal getSecondPowerFactorY() {
        return secondPowerFactorY;
    }

    public void setSecondPowerFactorY(BigDecimal secondPowerFactorY) {
        this.secondPowerFactorY = secondPowerFactorY;
    }

    public BigDecimal getSecondPowerFactorB() {
        return secondPowerFactorB;
    }

    public void setSecondPowerFactorB(BigDecimal secondPowerFactorB) {
        this.secondPowerFactorB = secondPowerFactorB;
    }

    public BigDecimal getSecondKwR() {
        return secondKwR;
    }

    public void setSecondKwR(BigDecimal secondKwR) {
        this.secondKwR = secondKwR;
    }

    public BigDecimal getSecondKwY() {
        return secondKwY;
    }

    public void setSecondKwY(BigDecimal secondKwY) {
        this.secondKwY = secondKwY;
    }

    public BigDecimal getSecondKwB() {
        return secondKwB;
    }

    public void setSecondKwB(BigDecimal secondKwB) {
        this.secondKwB = secondKwB;
    }

    public LocalDate getSecondInspectionDate() {
        return secondInspectionDate;
    }

    public void setSecondInspectionDate(LocalDate secondInspectionDate) {
        this.secondInspectionDate = secondInspectionDate;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getEngineerRemarks() {
        return engineerRemarks;
    }

    public void setEngineerRemarks(String engineerRemarks) {
        this.engineerRemarks = engineerRemarks;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public Integer getVersion() {
        return version;
    }

    public void setVersion(Integer version) {
        this.version = version;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public String getUpdatedBy() {
        return updatedBy;
    }

    public void setUpdatedBy(String updatedBy) {
        this.updatedBy = updatedBy;
    }

    public String getFinalizedBy() {
        return finalizedBy;
    }

    public void setFinalizedBy(String finalizedBy) {
        this.finalizedBy = finalizedBy;
    }

    public Instant getFinalizedAt() {
        return finalizedAt;
    }

    public void setFinalizedAt(Instant finalizedAt) {
        this.finalizedAt = finalizedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public List<MaintenanceRecordAnomaly> getAnomalies() {
        return anomalies;
    }

    public void setAnomalies(List<MaintenanceRecordAnomaly> anomalies) {
        this.anomalies = anomalies;
    }

    // Helper methods
    public void addAnomaly(MaintenanceRecordAnomaly anomaly) {
        anomalies.add(anomaly);
        anomaly.setMaintenanceRecord(this);
    }

    public void removeAnomaly(MaintenanceRecordAnomaly anomaly) {
        anomalies.remove(anomaly);
        anomaly.setMaintenanceRecord(null);
    }
}
