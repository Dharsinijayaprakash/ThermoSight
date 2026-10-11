package com.acme.backend.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "inspections")
public class Inspection {
    
    public enum Status {
        DRAFT,
        IN_PROGRESS,
        UNDER_REVIEW,
        COMPLETED,
        CANCELLED
    }
    
    public enum WeatherCondition {
        SUNNY,
        CLOUDY,
        RAINY
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotBlank
    @Column(name = "inspection_number")
    private String inspectionNumber;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "transformer_id")
    private Transformer transformer;
    
    // Phase 2: Baseline and Inspection thermal images
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "baseline_image_id")
    private ThermalImage baselineImage;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inspection_image_id")
    private ThermalImage inspectionImage;
    
    // Original inspection image for editing annotations (before annotations are drawn)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "original_inspection_image_id")
    private ThermalImage originalInspectionImage;

    private String branch;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "weather_condition")
    private WeatherCondition weatherCondition;

    @NotNull
    @Column(name = "inspected_at")
    private Instant inspectedAt;

    @Column(name = "maintenance_date")
    private Instant maintenanceDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.DRAFT;

    @Column(name = "inspected_by")
    private String inspectedBy;

    // Phase 3: Inspector history tracking
    @Column(name = "current_inspector")
    private String currentInspector;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "completed_by")
    private String completedBy;

    @Column(length = 2048)
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at")
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    // Getters and Setters
    public UUID getId() { return id; }

    public String getInspectionNumber() { return inspectionNumber; }
    public void setInspectionNumber(String inspectionNumber) { this.inspectionNumber = inspectionNumber; }

    public Transformer getTransformer() { return transformer; }
    public void setTransformer(Transformer transformer) { this.transformer = transformer; }
    
    public ThermalImage getBaselineImage() { return baselineImage; }
    public void setBaselineImage(ThermalImage baselineImage) { this.baselineImage = baselineImage; }
    
    public ThermalImage getInspectionImage() { return inspectionImage; }
    public void setInspectionImage(ThermalImage inspectionImage) { this.inspectionImage = inspectionImage; }
    
    public ThermalImage getOriginalInspectionImage() { return originalInspectionImage; }
    public void setOriginalInspectionImage(ThermalImage originalInspectionImage) { this.originalInspectionImage = originalInspectionImage; }

    public String getBranch() { return branch; }
    public void setBranch(String branch) { this.branch = branch; }
    
    public WeatherCondition getWeatherCondition() { return weatherCondition; }
    public void setWeatherCondition(WeatherCondition weatherCondition) { this.weatherCondition = weatherCondition; }

    public Instant getInspectedAt() { return inspectedAt; }
    public void setInspectedAt(Instant inspectedAt) { this.inspectedAt = inspectedAt; }

    public Instant getMaintenanceDate() { return maintenanceDate; }
    public void setMaintenanceDate(Instant maintenanceDate) { this.maintenanceDate = maintenanceDate; }

    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }

    public String getInspectedBy() { return inspectedBy; }
    public void setInspectedBy(String inspectedBy) { this.inspectedBy = inspectedBy; }

    public String getCurrentInspector() { return currentInspector; }
    public void setCurrentInspector(String currentInspector) { this.currentInspector = currentInspector; }

    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }

    public String getCompletedBy() { return completedBy; }
    public void setCompletedBy(String completedBy) { this.completedBy = completedBy; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
