package com.acme.backend.repo;

import com.acme.backend.domain.MaintenanceRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Phase 4: Repository for Maintenance Records
 */
public interface MaintenanceRecordRepo extends JpaRepository<MaintenanceRecord, UUID> {
    
    // Find by record number
    Optional<MaintenanceRecord> findByRecordNumber(String recordNumber);
    
    // Find by transformer
    Page<MaintenanceRecord> findByTransformerId(UUID transformerId, Pageable pageable);
    List<MaintenanceRecord> findByTransformerId(UUID transformerId);
    
    // Find by inspection
    Optional<MaintenanceRecord> findByInspectionId(UUID inspectionId);
    
    // Find by status
    Page<MaintenanceRecord> findByStatus(MaintenanceRecord.Status status, Pageable pageable);
    List<MaintenanceRecord> findByStatus(MaintenanceRecord.Status status);
    
    // Find by date range
    @Query("SELECT mr FROM MaintenanceRecord mr WHERE mr.dateOfInspection BETWEEN :startDate AND :endDate")
    Page<MaintenanceRecord> findByDateRange(
        @Param("startDate") LocalDate startDate, 
        @Param("endDate") LocalDate endDate, 
        Pageable pageable
    );
    
    // Count by transformer
    @Query("SELECT COUNT(mr) FROM MaintenanceRecord mr WHERE mr.transformer.id = :transformerId")
    long countByTransformerId(@Param("transformerId") UUID transformerId);
    
    // Find finalized records for a transformer
    @Query("SELECT mr FROM MaintenanceRecord mr WHERE mr.transformer.id = :transformerId AND mr.status = 'FINALIZED' ORDER BY mr.dateOfInspection DESC")
    List<MaintenanceRecord> findFinalizedByTransformerId(@Param("transformerId") UUID transformerId);
    
    // Search query for maintenance records
    @Query("SELECT mr FROM MaintenanceRecord mr WHERE " +
           "LOWER(mr.recordNumber) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(mr.transformer.code) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(mr.branch) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(mr.inspectedBy) LIKE LOWER(CONCAT('%', :q, '%'))")
    Page<MaintenanceRecord> findBySearchQuery(@Param("q") String q, Pageable pageable);
    
    // Find recent records
    @Query("SELECT mr FROM MaintenanceRecord mr ORDER BY mr.createdAt DESC")
    Page<MaintenanceRecord> findRecentRecords(Pageable pageable);
    
    // Check if inspection already has a maintenance record
    boolean existsByInspectionId(UUID inspectionId);
    
    // Delete cascade for transformer
    void deleteByTransformerId(UUID transformerId);
}
