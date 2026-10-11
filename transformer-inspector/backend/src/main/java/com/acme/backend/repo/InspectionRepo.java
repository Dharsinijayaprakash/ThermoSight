package com.acme.backend.repo;

import com.acme.backend.domain.Inspection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InspectionRepo extends JpaRepository<Inspection, UUID> {
    
    // Find by inspection number
    Optional<Inspection> findByInspectionNumber(String inspectionNumber);
    
    // Find by transformer
    Page<Inspection> findByTransformerId(UUID transformerId, Pageable pageable);
    List<Inspection> findByTransformerId(UUID transformerId);
    
    // Find by status
    Page<Inspection> findByStatus(Inspection.Status status, Pageable pageable);
    
    // Search query for Phase 2/3
    @Query("SELECT i FROM Inspection i WHERE " +
           "LOWER(i.inspectionNumber) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(i.transformer.code) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(i.branch) LIKE LOWER(CONCAT('%', :q, '%'))")
    Page<Inspection> findBySearchQuery(@Param("q") String q, Pageable pageable);
    
    // Find recent inspections
    @Query("SELECT i FROM Inspection i ORDER BY i.createdAt DESC")
    Page<Inspection> findRecentInspections(Pageable pageable);
    
    void deleteByTransformerId(UUID transformerId);
}
