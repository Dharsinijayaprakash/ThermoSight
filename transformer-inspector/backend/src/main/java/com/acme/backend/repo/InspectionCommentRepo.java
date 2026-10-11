package com.acme.backend.repo;

import com.acme.backend.domain.InspectionComment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface InspectionCommentRepo extends JpaRepository<InspectionComment, UUID> {

    @Query("SELECT c FROM InspectionComment c WHERE c.inspection.id = :inspectionId ORDER BY c.createdAt DESC")
    List<InspectionComment> findByInspectionIdOrderByCreatedAtDesc(@Param("inspectionId") UUID inspectionId);

    @Query("SELECT c FROM InspectionComment c WHERE c.inspection.id = :inspectionId ORDER BY c.createdAt DESC")
    Page<InspectionComment> findByInspectionIdOrderByCreatedAtDesc(@Param("inspectionId") UUID inspectionId, Pageable pageable);

    @Query("SELECT COUNT(c) FROM InspectionComment c WHERE c.inspection.id = :inspectionId")
    long countByInspectionId(@Param("inspectionId") UUID inspectionId);
}