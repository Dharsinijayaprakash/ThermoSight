package com.acme.backend.repo;

import com.acme.backend.domain.Transformer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface TransformerRepo extends JpaRepository<Transformer, UUID> {
    Page<Transformer> findByCodeContainingIgnoreCaseOrLocationContainingIgnoreCase(
            String code, String location, Pageable pageable);
}