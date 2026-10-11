package com.acme.backend.service;

import com.acme.backend.domain.*;
import com.acme.backend.repo.AnnotationRepo;
import com.acme.backend.repo.InspectionRepo;
import com.acme.backend.repo.MaintenanceRecordRepo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Phase 4: Service for managing maintenance records
 * Handles creation, updating, and finalization of maintenance records
 */
@Service
@Transactional
public class MaintenanceRecordService {
    
    private static final Logger log = LoggerFactory.getLogger(MaintenanceRecordService.class);
    
    private final MaintenanceRecordRepo maintenanceRecordRepo;
    private final InspectionRepo inspectionRepo;
    private final AnnotationRepo annotationRepo;
    
    public MaintenanceRecordService(
            MaintenanceRecordRepo maintenanceRecordRepo,
            InspectionRepo inspectionRepo,
            AnnotationRepo annotationRepo) {
        this.maintenanceRecordRepo = maintenanceRecordRepo;
        this.inspectionRepo = inspectionRepo;
        this.annotationRepo = annotationRepo;
    }
    
    /**
     * Create a new maintenance record from an inspection
     * Pre-populates system-generated fields from inspection data
     */
    public MaintenanceRecord createFromInspection(UUID inspectionId, String createdBy) {
        Inspection inspection = inspectionRepo.findById(inspectionId)
                .orElseThrow(() -> new RuntimeException("Inspection not found with id: " + inspectionId));
        
        // Check if maintenance record already exists for this inspection
        if (maintenanceRecordRepo.existsByInspectionId(inspectionId)) {
            throw new RuntimeException("Maintenance record already exists for this inspection");
        }
        
        Transformer transformer = inspection.getTransformer();
        
        // Generate unique record number: MR-{transformer_code}-{sequence}
        long sequence = maintenanceRecordRepo.countByTransformerId(transformer.getId()) + 1;
        String recordNumber = String.format("MR-%s-%03d", transformer.getCode(), sequence);
        
        // Get active annotations for anomaly snapshot
        List<Annotation> annotations = annotationRepo.findActiveByInspectionId(inspectionId);
        
        MaintenanceRecord record = new MaintenanceRecord();
        record.setRecordNumber(recordNumber);
        record.setTransformer(transformer);
        record.setInspection(inspection);
        
        // Pre-populate system-generated fields
        LocalDate inspectionDate = inspection.getInspectedAt() != null 
                ? LocalDate.ofInstant(inspection.getInspectedAt(), ZoneId.systemDefault())
                : LocalDate.now();
        
        record.setInspectionDate(inspectionDate);
        record.setWeatherCondition(
            inspection.getWeatherCondition() != null 
                ? inspection.getWeatherCondition().name()
                : null
        );
        record.setThermalImageUrl(
            inspection.getInspectionImage() != null
                ? inspection.getInspectionImage().getPublicUrl()
                : null
        );
        record.setAnomalyCount(annotations.size());
        
        // Pre-populate engineer-editable fields from inspection/transformer data
        record.setBranch(inspection.getBranch());
        record.setTransformerNo(transformer.getCode());
        record.setPoleNo(transformer.getPoleNo());
        record.setInspectedBy(inspection.getInspectedBy());
        record.setDateOfInspection(inspectionDate);
        record.setInspectedDate(inspectionDate); // Auto-fill with inspection date
        
        // Auto-fill transformer data from transformer entity
        if (transformer.getLocation() != null) {
            record.setTransformerType(MaintenanceRecord.TransformerType.DISTRIBUTION); // Default
        }
        
        // Set metadata
        record.setStatus(MaintenanceRecord.Status.DRAFT);
        record.setCreatedBy(createdBy);
        record.setUpdatedBy(createdBy);
        
        // Save the record first to get the ID
        record = maintenanceRecordRepo.save(record);
        
        // Create anomaly snapshots
        for (Annotation annotation : annotations) {
            MaintenanceRecordAnomaly anomaly = new MaintenanceRecordAnomaly();
            anomaly.setBoxNumber(annotation.getBoxNumber());
            anomaly.setClassId(annotation.getClassId());
            anomaly.setClassName(annotation.getClassName());
            anomaly.setConfidence(annotation.getConfidence());
            anomaly.setBboxX1(annotation.getBboxX1());
            anomaly.setBboxY1(annotation.getBboxY1());
            anomaly.setBboxX2(annotation.getBboxX2());
            anomaly.setBboxY2(annotation.getBboxY2());
            anomaly.setSource(annotation.getSource().name());
            
            record.addAnomaly(anomaly);
        }
        
        record = maintenanceRecordRepo.save(record);
        log.info("Created maintenance record: {} for inspection: {}", 
                 recordNumber, inspection.getInspectionNumber());
        
        return record;
    }
    
    /**
     * Update an existing maintenance record
     * Only allowed for DRAFT records
     */
    public MaintenanceRecord updateRecord(UUID recordId, MaintenanceRecord updates, String updatedBy) {
        try {
            MaintenanceRecord record = maintenanceRecordRepo.findById(recordId)
                    .orElseThrow(() -> new RuntimeException("Maintenance record not found with id: " + recordId));
            
            if (record.getStatus() == MaintenanceRecord.Status.FINALIZED) {
                throw new RuntimeException("Cannot update finalized maintenance record");
            }
            
            log.info("Updating maintenance record: {}, version: {}", record.getRecordNumber(), record.getVersion());
            
            // Update all engineer-editable fields from Tab 1
            if (updates.getDateOfInspection() != null) record.setDateOfInspection(updates.getDateOfInspection());
            if (updates.getStartTime() != null) record.setStartTime(updates.getStartTime());
            if (updates.getCompletionTime() != null) record.setCompletionTime(updates.getCompletionTime());
            if (updates.getSupervisedBy() != null) record.setSupervisedBy(updates.getSupervisedBy());
            if (updates.getGangTech1() != null) record.setGangTech1(updates.getGangTech1());
            if (updates.getGangTech2() != null) record.setGangTech2(updates.getGangTech2());
            if (updates.getGangTech3() != null) record.setGangTech3(updates.getGangTech3());
            if (updates.getGangHelpers() != null) record.setGangHelpers(updates.getGangHelpers());
            if (updates.getInspectedBy() != null) record.setInspectedBy(updates.getInspectedBy());
            if (updates.getInspectedDate() != null) record.setInspectedDate(updates.getInspectedDate());
            if (updates.getRectifiedBy() != null) record.setRectifiedBy(updates.getRectifiedBy());
            if (updates.getRectifiedDate() != null) record.setRectifiedDate(updates.getRectifiedDate());
            if (updates.getCssInspector() != null) record.setCssInspector(updates.getCssInspector());
            if (updates.getCssInspectorDate() != null) record.setCssInspectorDate(updates.getCssInspectorDate());
            
            // Update all engineer-editable fields from Tab 2
            if (updates.getBranch() != null) record.setBranch(updates.getBranch());
            if (updates.getTransformerNo() != null) record.setTransformerNo(updates.getTransformerNo());
            if (updates.getPoleNo() != null) record.setPoleNo(updates.getPoleNo());
            if (updates.getBaselineRight() != null) record.setBaselineRight(updates.getBaselineRight());
            if (updates.getBaselineLeft() != null) record.setBaselineLeft(updates.getBaselineLeft());
            if (updates.getBaselineFront() != null) record.setBaselineFront(updates.getBaselineFront());
            if (updates.getLoadGrowthKva() != null) record.setLoadGrowthKva(updates.getLoadGrowthKva());
            if (updates.getBaselineCondition() != null) record.setBaselineCondition(updates.getBaselineCondition());
            if (updates.getTransformerStatus() != null) record.setTransformerStatus(updates.getTransformerStatus());
            if (updates.getTransformerType() != null) record.setTransformerType(updates.getTransformerType());
            if (updates.getMeterSerialNo() != null) record.setMeterSerialNo(updates.getMeterSerialNo());
            if (updates.getMeterMaker() != null) record.setMeterMaker(updates.getMeterMaker());
            if (updates.getMeterMake() != null) record.setMeterMake(updates.getMeterMake());
            if (updates.getWorkContent() != null) {
                log.info("Setting workContent: {}", updates.getWorkContent());
                record.setWorkContent(updates.getWorkContent());
            }
            
            // Update first inspection readings
            if (updates.getFirstVoltageR() != null) record.setFirstVoltageR(updates.getFirstVoltageR());
            if (updates.getFirstVoltageY() != null) record.setFirstVoltageY(updates.getFirstVoltageY());
            if (updates.getFirstVoltageB() != null) record.setFirstVoltageB(updates.getFirstVoltageB());
            if (updates.getFirstCurrentR() != null) record.setFirstCurrentR(updates.getFirstCurrentR());
            if (updates.getFirstCurrentY() != null) record.setFirstCurrentY(updates.getFirstCurrentY());
            if (updates.getFirstCurrentB() != null) record.setFirstCurrentB(updates.getFirstCurrentB());
            if (updates.getFirstPowerFactorR() != null) record.setFirstPowerFactorR(updates.getFirstPowerFactorR());
            if (updates.getFirstPowerFactorY() != null) record.setFirstPowerFactorY(updates.getFirstPowerFactorY());
            if (updates.getFirstPowerFactorB() != null) record.setFirstPowerFactorB(updates.getFirstPowerFactorB());
            if (updates.getFirstKwR() != null) record.setFirstKwR(updates.getFirstKwR());
            if (updates.getFirstKwY() != null) record.setFirstKwY(updates.getFirstKwY());
            if (updates.getFirstKwB() != null) record.setFirstKwB(updates.getFirstKwB());
            
            // Update second inspection readings
            if (updates.getSecondVoltageR() != null) record.setSecondVoltageR(updates.getSecondVoltageR());
            if (updates.getSecondVoltageY() != null) record.setSecondVoltageY(updates.getSecondVoltageY());
            if (updates.getSecondVoltageB() != null) record.setSecondVoltageB(updates.getSecondVoltageB());
            if (updates.getSecondCurrentR() != null) record.setSecondCurrentR(updates.getSecondCurrentR());
            if (updates.getSecondCurrentY() != null) record.setSecondCurrentY(updates.getSecondCurrentY());
            if (updates.getSecondCurrentB() != null) record.setSecondCurrentB(updates.getSecondCurrentB());
            if (updates.getSecondPowerFactorR() != null) record.setSecondPowerFactorR(updates.getSecondPowerFactorR());
            if (updates.getSecondPowerFactorY() != null) record.setSecondPowerFactorY(updates.getSecondPowerFactorY());
            if (updates.getSecondPowerFactorB() != null) record.setSecondPowerFactorB(updates.getSecondPowerFactorB());
            if (updates.getSecondKwR() != null) record.setSecondKwR(updates.getSecondKwR());
            if (updates.getSecondKwY() != null) record.setSecondKwY(updates.getSecondKwY());
            if (updates.getSecondKwB() != null) record.setSecondKwB(updates.getSecondKwB());
            if (updates.getSecondInspectionDate() != null) record.setSecondInspectionDate(updates.getSecondInspectionDate());
            
            // Update notes
            if (updates.getNotes() != null) record.setNotes(updates.getNotes());
            if (updates.getEngineerRemarks() != null) record.setEngineerRemarks(updates.getEngineerRemarks());
            
            // Update metadata
            record.setUpdatedBy(updatedBy);
            record.setVersion(record.getVersion() + 1);
            
            log.info("Saving updated maintenance record...");
            record = maintenanceRecordRepo.save(record);
            log.info("Updated maintenance record successfully: {}", record.getRecordNumber());
            
            return record;
        } catch (Exception e) {
            log.error("Error updating maintenance record {}: {}", recordId, e.getMessage(), e);
            throw new RuntimeException("Failed to update maintenance record: " + e.getMessage(), e);
        }
    }
    
    /**
     * Finalize a maintenance record
     * Once finalized, the record becomes read-only
     */
    public MaintenanceRecord finalizeRecord(UUID recordId, String finalizedBy) {
        MaintenanceRecord record = maintenanceRecordRepo.findById(recordId)
                .orElseThrow(() -> new RuntimeException("Maintenance record not found with id: " + recordId));
        
        if (record.getStatus() == MaintenanceRecord.Status.FINALIZED) {
            throw new RuntimeException("Maintenance record is already finalized");
        }
        
        record.setStatus(MaintenanceRecord.Status.FINALIZED);
        record.setFinalizedBy(finalizedBy);
        record.setFinalizedAt(Instant.now());
        
        record = maintenanceRecordRepo.save(record);
        log.info("Finalized maintenance record: {} by {}", record.getRecordNumber(), finalizedBy);
        
        return record;
    }
    
    /**
     * Get a maintenance record by ID
     */
    @Transactional(readOnly = true)
    public Optional<MaintenanceRecord> getRecordById(UUID recordId) {
        return maintenanceRecordRepo.findById(recordId);
    }
    
    /**
     * Get a maintenance record by record number
     */
    @Transactional(readOnly = true)
    public Optional<MaintenanceRecord> getRecordByNumber(String recordNumber) {
        return maintenanceRecordRepo.findByRecordNumber(recordNumber);
    }
    
    /**
     * Get maintenance record for an inspection
     */
    @Transactional(readOnly = true)
    public Optional<MaintenanceRecord> getRecordByInspectionId(UUID inspectionId) {
        return maintenanceRecordRepo.findByInspectionId(inspectionId);
    }
    
    /**
     * Get all maintenance records for a transformer
     */
    @Transactional(readOnly = true)
    public List<MaintenanceRecord> getRecordsByTransformerId(UUID transformerId) {
        return maintenanceRecordRepo.findByTransformerId(transformerId);
    }
    
    /**
     * Get paginated maintenance records for a transformer
     */
    @Transactional(readOnly = true)
    public Page<MaintenanceRecord> getRecordsByTransformerId(UUID transformerId, Pageable pageable) {
        return maintenanceRecordRepo.findByTransformerId(transformerId, pageable);
    }
    
    /**
     * Get finalized maintenance records for a transformer
     */
    @Transactional(readOnly = true)
    public List<MaintenanceRecord> getFinalizedRecordsByTransformerId(UUID transformerId) {
        return maintenanceRecordRepo.findFinalizedByTransformerId(transformerId);
    }
    
    /**
     * Search maintenance records
     */
    @Transactional(readOnly = true)
    public Page<MaintenanceRecord> searchRecords(String query, Pageable pageable) {
        return maintenanceRecordRepo.findBySearchQuery(query, pageable);
    }
    
    /**
     * Get all maintenance records (paginated)
     */
    @Transactional(readOnly = true)
    public Page<MaintenanceRecord> getAllRecords(Pageable pageable) {
        return maintenanceRecordRepo.findAll(pageable);
    }
    
    /**
     * Get recent maintenance records
     */
    @Transactional(readOnly = true)
    public Page<MaintenanceRecord> getRecentRecords(Pageable pageable) {
        return maintenanceRecordRepo.findRecentRecords(pageable);
    }
    
    /**
     * Delete a maintenance record (only DRAFT records can be deleted)
     */
    public void deleteRecord(UUID recordId) {
        MaintenanceRecord record = maintenanceRecordRepo.findById(recordId)
                .orElseThrow(() -> new RuntimeException("Maintenance record not found with id: " + recordId));
        
        if (record.getStatus() == MaintenanceRecord.Status.FINALIZED) {
            throw new RuntimeException("Cannot delete finalized maintenance record");
        }
        
        maintenanceRecordRepo.delete(record);
        log.info("Deleted maintenance record: {}", record.getRecordNumber());
    }
    
    /**
     * Sync anomalies from current annotations
     * This updates the maintenance record with the latest annotations from the inspection
     */
    public MaintenanceRecord syncAnomalies(UUID recordId) {
        MaintenanceRecord record = maintenanceRecordRepo.findById(recordId)
                .orElseThrow(() -> new RuntimeException("Maintenance record not found with id: " + recordId));
        
        if (record.getStatus() == MaintenanceRecord.Status.FINALIZED) {
            throw new RuntimeException("Cannot sync anomalies for finalized maintenance record");
        }
        
        UUID inspectionId = record.getInspection().getId();
        
        // Get current active annotations
        List<Annotation> annotations = annotationRepo.findActiveByInspectionId(inspectionId);
        
        // Clear existing anomalies
        record.getAnomalies().clear();
        
        // Create new anomaly snapshots from current annotations
        for (Annotation annotation : annotations) {
            MaintenanceRecordAnomaly anomaly = new MaintenanceRecordAnomaly();
            anomaly.setBoxNumber(annotation.getBoxNumber());
            anomaly.setClassId(annotation.getClassId());
            anomaly.setClassName(annotation.getClassName());
            anomaly.setConfidence(annotation.getConfidence());
            anomaly.setBboxX1(annotation.getBboxX1());
            anomaly.setBboxY1(annotation.getBboxY1());
            anomaly.setBboxX2(annotation.getBboxX2());
            anomaly.setBboxY2(annotation.getBboxY2());
            anomaly.setSource(annotation.getSource().name());
            
            record.addAnomaly(anomaly);
        }
        
        // Update anomaly count
        record.setAnomalyCount(annotations.size());
        
        record = maintenanceRecordRepo.save(record);
        log.info("Synced {} anomalies for maintenance record: {}", annotations.size(), record.getRecordNumber());
        
        return record;
    }
}
