// src/main/java/com/acme/backend/repo/ThermalImageRepo.java
package com.acme.backend.repo;

import com.acme.backend.domain.ThermalImage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

public interface ThermalImageRepo extends JpaRepository<ThermalImage, UUID> {

    Page<ThermalImage> findByTransformerIdAndType(UUID transformerId, ThermalImage.Type type, Pageable pageable);

    Page<ThermalImage> findByTransformerId(UUID transformerId, Pageable pageable);   // ← NEW

    Page<ThermalImage> findByType(ThermalImage.Type type, Pageable pageable);       // ← optional, handy

    Page<ThermalImage> findByInspectionId(UUID inspectionId, Pageable pageable);    // ← NEW for inspections

    @Transactional
    void deleteByTransformerId(UUID transformerId);
    
    @Transactional
    void deleteByInspectionId(UUID inspectionId);
}