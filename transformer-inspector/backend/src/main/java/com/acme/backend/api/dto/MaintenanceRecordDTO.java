package com.acme.backend.api.dto;

import com.acme.backend.domain.MaintenanceRecord;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Phase 4: DTO for MaintenanceRecord entity
 * Complete representation of maintenance record with all fields
 */
public record MaintenanceRecordDTO(
        UUID id,
        String recordNumber,
        UUID transformerId,
        String transformerCode,
        UUID inspectionId,
        String inspectionNumber,
        
        // System-generated fields
        LocalDate inspectionDate,
        String weatherCondition,
        String thermalImageUrl,
        Integer anomalyCount,
        
        // Tab 1: Maintenance Record fields
        LocalDate dateOfInspection,
        LocalTime startTime,
        LocalTime completionTime,
        String supervisedBy,
        String gangTech1,
        String gangTech2,
        String gangTech3,
        String gangHelpers,
        String inspectedBy,
        LocalDate inspectedDate,
        String rectifiedBy,
        LocalDate rectifiedDate,
        String cssInspector,
        LocalDate cssInspectorDate,
        
        // Tab 2: Work-Data Sheet fields
        String branch,
        String transformerNo,
        String poleNo,
        BigDecimal baselineRight,
        BigDecimal baselineLeft,
        BigDecimal baselineFront,
        BigDecimal loadGrowthKva,
        MaintenanceRecord.BaselineCondition baselineCondition,
        MaintenanceRecord.TransformerStatus transformerStatus,
        MaintenanceRecord.TransformerType transformerType,
        String meterSerialNo,
        String meterMaker,
        String meterMake,
        Map<String, Boolean> workContent,
        
        // First inspection readings
        BigDecimal firstVoltageR,
        BigDecimal firstVoltageY,
        BigDecimal firstVoltageB,
        BigDecimal firstCurrentR,
        BigDecimal firstCurrentY,
        BigDecimal firstCurrentB,
        BigDecimal firstPowerFactorR,
        BigDecimal firstPowerFactorY,
        BigDecimal firstPowerFactorB,
        BigDecimal firstKwR,
        BigDecimal firstKwY,
        BigDecimal firstKwB,
        
        // Second inspection readings
        BigDecimal secondVoltageR,
        BigDecimal secondVoltageY,
        BigDecimal secondVoltageB,
        BigDecimal secondCurrentR,
        BigDecimal secondCurrentY,
        BigDecimal secondCurrentB,
        BigDecimal secondPowerFactorR,
        BigDecimal secondPowerFactorY,
        BigDecimal secondPowerFactorB,
        BigDecimal secondKwR,
        BigDecimal secondKwY,
        BigDecimal secondKwB,
        LocalDate secondInspectionDate,
        
        // Notes
        String notes,
        String engineerRemarks,
        
        // Metadata
        MaintenanceRecord.Status status,
        Integer version,
        String createdBy,
        String updatedBy,
        String finalizedBy,
        Instant finalizedAt,
        Instant createdAt,
        Instant updatedAt,
        
        // Anomalies
        List<MaintenanceRecordAnomalyDTO> anomalies
) {}
