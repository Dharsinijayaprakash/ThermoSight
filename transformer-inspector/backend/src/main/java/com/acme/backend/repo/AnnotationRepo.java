package com.acme.backend.repo;

import com.acme.backend.domain.Annotation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

/**
 * Repository for Annotation entity (Phase 2 & 3)
 */
public interface AnnotationRepo extends JpaRepository<Annotation, UUID> {
    
    /**
     * Find all active annotations for an inspection
     */
    @Query("SELECT a FROM Annotation a WHERE a.inspection.id = :inspectionId AND a.isActive = true")
    List<Annotation> findActiveByInspectionId(@Param("inspectionId") UUID inspectionId);
    
    /**
     * Find all annotations (including inactive) for an inspection
     */
    List<Annotation> findByInspectionId(UUID inspectionId);
    
    /**
     * Find annotations by source (ai or human)
     */
    @Query("SELECT a FROM Annotation a WHERE a.inspection.id = :inspectionId AND a.source = :source AND a.isActive = true")
    List<Annotation> findByInspectionIdAndSource(
        @Param("inspectionId") UUID inspectionId,
        @Param("source") Annotation.Source source
    );
    
    /**
     * Find annotation history (all versions) for a specific annotation
     */
    @Query("SELECT a FROM Annotation a WHERE a.id = :annotationId OR a.parentAnnotation.id = :annotationId ORDER BY a.version DESC")
    List<Annotation> findAnnotationHistory(@Param("annotationId") UUID annotationId);
    
    /**
     * Get version history for an inspection
     */
    @Query("SELECT a FROM Annotation a WHERE a.inspection.id = :inspectionId ORDER BY a.version DESC, a.createdAt DESC")
    List<Annotation> findVersionHistory(@Param("inspectionId") UUID inspectionId);
    
    /**
     * Count active annotations by inspection
     */
    @Query("SELECT COUNT(a) FROM Annotation a WHERE a.inspection.id = :inspectionId AND a.isActive = true")
    Long countActiveByInspectionId(@Param("inspectionId") UUID inspectionId);
    
    /**
     * Delete all annotations for an inspection
     */
    void deleteByInspectionId(UUID inspectionId);
}
