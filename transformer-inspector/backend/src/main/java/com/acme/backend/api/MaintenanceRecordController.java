package com.acme.backend.api;

import com.acme.backend.api.dto.*;
import com.acme.backend.domain.MaintenanceRecord;
import com.acme.backend.domain.MaintenanceRecordAnomaly;
import com.acme.backend.service.MaintenanceRecordService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Phase 4: REST Controller for Maintenance Record management
 * Handles CRUD operations for digital maintenance records
 */
@RestController
@RequestMapping("/api/maintenance-records")
@CrossOrigin(origins = "${app.cors.allowed-origins}")
public class MaintenanceRecordController {
    
    private static final Logger log = LoggerFactory.getLogger(MaintenanceRecordController.class);
    
    private final MaintenanceRecordService maintenanceRecordService;
    
    public MaintenanceRecordController(MaintenanceRecordService maintenanceRecordService) {
        this.maintenanceRecordService = maintenanceRecordService;
    }
    
    /**
     * Create a new maintenance record from an inspection
     * POST /api/maintenance-records
     */
    @PostMapping
    public ResponseEntity<MaintenanceRecordDTO> createMaintenanceRecord(
            @Valid @RequestBody CreateMaintenanceRecordRequest request) {
        try {
            log.info("Creating maintenance record for inspection: {}", request.inspectionId());
            MaintenanceRecord record = maintenanceRecordService.createFromInspection(
                    request.inspectionId(), 
                    request.createdBy()
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(record));
        } catch (Exception e) {
            log.error("Error creating maintenance record: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create maintenance record: " + e.getMessage());
        }
    }
    
    /**
     * Get all maintenance records with pagination and search
     * GET /api/maintenance-records?page=0&size=10&q=search&transformerId=uuid
     */
    @GetMapping
    public ResponseEntity<Page<MaintenanceRecordDTO>> getAllMaintenanceRecords(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(required = false) UUID transformerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") Sort.Direction direction
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        
        Page<MaintenanceRecord> records;
        if (transformerId != null) {
            // Filter by transformer ID
            records = maintenanceRecordService.getRecordsByTransformerId(transformerId, pageable);
        } else if (q.trim().isEmpty()) {
            records = maintenanceRecordService.getAllRecords(pageable);
        } else {
            records = maintenanceRecordService.searchRecords(q, pageable);
        }
        
        return ResponseEntity.ok(records.map(this::toDTO));
    }
    
    /**
     * Get maintenance record by ID
     * GET /api/maintenance-records/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<MaintenanceRecordDTO> getMaintenanceRecordById(@PathVariable UUID id) {
        try {
            MaintenanceRecord record = maintenanceRecordService.getRecordById(id)
                    .orElseThrow(() -> new RuntimeException("Maintenance record not found"));
            return ResponseEntity.ok(toDTO(record));
        } catch (Exception e) {
            log.debug("Maintenance record not found: {}", id);
            return ResponseEntity.notFound().build();
        }
    }
    
    /**
     * Get maintenance record by inspection ID
     * GET /api/maintenance-records/inspection/{inspectionId}
     */
    @GetMapping("/inspection/{inspectionId}")
    public ResponseEntity<MaintenanceRecordDTO> getMaintenanceRecordByInspectionId(
            @PathVariable UUID inspectionId) {
        try {
            MaintenanceRecord record = maintenanceRecordService.getRecordByInspectionId(inspectionId)
                    .orElseThrow(() -> new RuntimeException("Maintenance record not found for inspection"));
            return ResponseEntity.ok(toDTO(record));
        } catch (Exception e) {
            log.debug("Maintenance record not found for inspection: {} (this is expected if record hasn't been created yet)", inspectionId);
            return ResponseEntity.notFound().build();
        }
    }
    
    /**
     * Get all maintenance records for a transformer
     * GET /api/maintenance-records/transformer/{transformerId}
     */
    @GetMapping("/transformer/{transformerId}")
    public ResponseEntity<List<MaintenanceRecordDTO>> getMaintenanceRecordsByTransformerId(
            @PathVariable UUID transformerId) {
        try {
            List<MaintenanceRecord> records = maintenanceRecordService.getRecordsByTransformerId(transformerId);
            return ResponseEntity.ok(records.stream().map(this::toDTO).collect(Collectors.toList()));
        } catch (Exception e) {
            log.error("Error fetching maintenance records for transformer: {}", transformerId);
            throw new RuntimeException("Failed to fetch maintenance records: " + e.getMessage());
        }
    }
    
    /**
     * Update a maintenance record (only DRAFT records can be updated)
     * PUT /api/maintenance-records/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<MaintenanceRecordDTO> updateMaintenanceRecord(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateMaintenanceRecordRequest request) {
        try {
            log.info("Updating maintenance record: {} with data: {}", id, request);
            
            // Convert request to entity for update
            MaintenanceRecord updates = new MaintenanceRecord();
            updates.setDateOfInspection(request.dateOfInspection());
            updates.setStartTime(request.startTime());
            updates.setCompletionTime(request.completionTime());
            updates.setSupervisedBy(request.supervisedBy());
            updates.setGangTech1(request.gangTech1());
            updates.setGangTech2(request.gangTech2());
            updates.setGangTech3(request.gangTech3());
            updates.setGangHelpers(request.gangHelpers());
            updates.setInspectedBy(request.inspectedBy());
            updates.setInspectedDate(request.inspectedDate());
            updates.setRectifiedBy(request.rectifiedBy());
            updates.setRectifiedDate(request.rectifiedDate());
            updates.setCssInspector(request.cssInspector());
            updates.setCssInspectorDate(request.cssInspectorDate());
            
            updates.setBranch(request.branch());
            updates.setTransformerNo(request.transformerNo());
            updates.setPoleNo(request.poleNo());
            updates.setBaselineRight(request.baselineRight());
            updates.setBaselineLeft(request.baselineLeft());
            updates.setBaselineFront(request.baselineFront());
            updates.setLoadGrowthKva(request.loadGrowthKva());
            
            // Handle enum fields safely
            if (request.baselineCondition() != null) {
                updates.setBaselineCondition(request.baselineCondition());
            }
            if (request.transformerStatus() != null) {
                updates.setTransformerStatus(request.transformerStatus());
            }
            if (request.transformerType() != null) {
                updates.setTransformerType(request.transformerType());
            }
            
            updates.setMeterSerialNo(request.meterSerialNo());
            updates.setMeterMaker(request.meterMaker());
            updates.setMeterMake(request.meterMake());
            
            // Handle workContent map - log it
            if (request.workContent() != null) {
                log.info("WorkContent received: {}", request.workContent());
                updates.setWorkContent(request.workContent());
            } else {
                log.info("WorkContent is null, skipping");
            }
            
            updates.setFirstVoltageR(request.firstVoltageR());
            updates.setFirstVoltageY(request.firstVoltageY());
            updates.setFirstVoltageB(request.firstVoltageB());
            updates.setFirstCurrentR(request.firstCurrentR());
            updates.setFirstCurrentY(request.firstCurrentY());
            updates.setFirstCurrentB(request.firstCurrentB());
            updates.setFirstPowerFactorR(request.firstPowerFactorR());
            updates.setFirstPowerFactorY(request.firstPowerFactorY());
            updates.setFirstPowerFactorB(request.firstPowerFactorB());
            updates.setFirstKwR(request.firstKwR());
            updates.setFirstKwY(request.firstKwY());
            updates.setFirstKwB(request.firstKwB());
            
            updates.setSecondVoltageR(request.secondVoltageR());
            updates.setSecondVoltageY(request.secondVoltageY());
            updates.setSecondVoltageB(request.secondVoltageB());
            updates.setSecondCurrentR(request.secondCurrentR());
            updates.setSecondCurrentY(request.secondCurrentY());
            updates.setSecondCurrentB(request.secondCurrentB());
            updates.setSecondPowerFactorR(request.secondPowerFactorR());
            updates.setSecondPowerFactorY(request.secondPowerFactorY());
            updates.setSecondPowerFactorB(request.secondPowerFactorB());
            updates.setSecondKwR(request.secondKwR());
            updates.setSecondKwY(request.secondKwY());
            updates.setSecondKwB(request.secondKwB());
            updates.setSecondInspectionDate(request.secondInspectionDate());
            
            updates.setNotes(request.notes());
            updates.setEngineerRemarks(request.engineerRemarks());
            
            MaintenanceRecord updated = maintenanceRecordService.updateRecord(
                    id, 
                    updates, 
                    request.updatedBy()
            );
            return ResponseEntity.ok(toDTO(updated));
        } catch (Exception e) {
            log.error("Error updating maintenance record: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to update maintenance record: " + e.getMessage());
        }
    }
    
    /**
     * Finalize a maintenance record (make it read-only)
     * POST /api/maintenance-records/{id}/finalize
     */
    @PostMapping("/{id}/finalize")
    public ResponseEntity<MaintenanceRecordDTO> finalizeMaintenanceRecord(
            @PathVariable UUID id,
            @RequestBody Map<String, String> request) {
        try {
            String finalizedBy = request.get("finalizedBy");
            if (finalizedBy == null || finalizedBy.isEmpty()) {
                throw new RuntimeException("finalizedBy is required");
            }
            
            log.info("Finalizing maintenance record: {} by {}", id, finalizedBy);
            MaintenanceRecord finalized = maintenanceRecordService.finalizeRecord(id, finalizedBy);
            return ResponseEntity.ok(toDTO(finalized));
        } catch (Exception e) {
            log.error("Error finalizing maintenance record: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to finalize maintenance record: " + e.getMessage());
        }
    }
    
    /**
     * Delete a maintenance record (only DRAFT records can be deleted)
     * DELETE /api/maintenance-records/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMaintenanceRecord(@PathVariable UUID id) {
        try {
            log.info("Deleting maintenance record: {}", id);
            maintenanceRecordService.deleteRecord(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("Error deleting maintenance record: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to delete maintenance record: " + e.getMessage());
        }
    }
    
    /**
     * Sync anomalies with current annotations from the inspection
     * POST /api/maintenance-records/{id}/sync-anomalies
     */
    @PostMapping("/{id}/sync-anomalies")
    public ResponseEntity<MaintenanceRecordDTO> syncAnomalies(@PathVariable UUID id) {
        try {
            log.info("Syncing anomalies for maintenance record: {}", id);
            MaintenanceRecord synced = maintenanceRecordService.syncAnomalies(id);
            return ResponseEntity.ok(toDTO(synced));
        } catch (Exception e) {
            log.error("Error syncing anomalies: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to sync anomalies: " + e.getMessage());
        }
    }
    
    // DTO Conversion Helper
    private MaintenanceRecordDTO toDTO(MaintenanceRecord record) {
        List<MaintenanceRecordAnomalyDTO> anomalies = record.getAnomalies().stream()
                .map(this::toAnomalyDTO)
                .collect(Collectors.toList());
        
        return new MaintenanceRecordDTO(
                record.getId(),
                record.getRecordNumber(),
                record.getTransformer().getId(),
                record.getTransformer().getCode(),
                record.getInspection().getId(),
                record.getInspection().getInspectionNumber(),
                
                record.getInspectionDate(),
                record.getWeatherCondition(),
                record.getThermalImageUrl(),
                record.getAnomalyCount(),
                
                record.getDateOfInspection(),
                record.getStartTime(),
                record.getCompletionTime(),
                record.getSupervisedBy(),
                record.getGangTech1(),
                record.getGangTech2(),
                record.getGangTech3(),
                record.getGangHelpers(),
                record.getInspectedBy(),
                record.getInspectedDate(),
                record.getRectifiedBy(),
                record.getRectifiedDate(),
                record.getCssInspector(),
                record.getCssInspectorDate(),
                
                record.getBranch(),
                record.getTransformerNo(),
                record.getPoleNo(),
                record.getBaselineRight(),
                record.getBaselineLeft(),
                record.getBaselineFront(),
                record.getLoadGrowthKva(),
                record.getBaselineCondition(),
                record.getTransformerStatus(),
                record.getTransformerType(),
                record.getMeterSerialNo(),
                record.getMeterMaker(),
                record.getMeterMake(),
                record.getWorkContent(),
                
                record.getFirstVoltageR(),
                record.getFirstVoltageY(),
                record.getFirstVoltageB(),
                record.getFirstCurrentR(),
                record.getFirstCurrentY(),
                record.getFirstCurrentB(),
                record.getFirstPowerFactorR(),
                record.getFirstPowerFactorY(),
                record.getFirstPowerFactorB(),
                record.getFirstKwR(),
                record.getFirstKwY(),
                record.getFirstKwB(),
                
                record.getSecondVoltageR(),
                record.getSecondVoltageY(),
                record.getSecondVoltageB(),
                record.getSecondCurrentR(),
                record.getSecondCurrentY(),
                record.getSecondCurrentB(),
                record.getSecondPowerFactorR(),
                record.getSecondPowerFactorY(),
                record.getSecondPowerFactorB(),
                record.getSecondKwR(),
                record.getSecondKwY(),
                record.getSecondKwB(),
                record.getSecondInspectionDate(),
                
                record.getNotes(),
                record.getEngineerRemarks(),
                
                record.getStatus(),
                record.getVersion(),
                record.getCreatedBy(),
                record.getUpdatedBy(),
                record.getFinalizedBy(),
                record.getFinalizedAt(),
                record.getCreatedAt(),
                record.getUpdatedAt(),
                
                anomalies
        );
    }
    
    private MaintenanceRecordAnomalyDTO toAnomalyDTO(MaintenanceRecordAnomaly anomaly) {
        return new MaintenanceRecordAnomalyDTO(
                anomaly.getId(),
                anomaly.getBoxNumber(),
                anomaly.getClassId(),
                anomaly.getClassName(),
                anomaly.getConfidence(),
                anomaly.getBboxX1(),
                anomaly.getBboxY1(),
                anomaly.getBboxX2(),
                anomaly.getBboxY2(),
                anomaly.getSource(),
                anomaly.getCreatedAt()
        );
    }
}
