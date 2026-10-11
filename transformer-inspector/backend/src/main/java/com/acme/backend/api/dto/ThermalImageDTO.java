package com.acme.backend.api.dto;

import com.acme.backend.domain.ThermalImage;
import java.time.Instant; import java.util.UUID;

public record ThermalImageDTO(
        UUID id,
        UUID transformerId,
        UUID inspectionId,
        ThermalImage.Type type,
        ThermalImage.EnvCondition envCondition,
        String uploader,
        Instant uploadedAt,
        String publicUrl,
        String originalFilename,
        Long sizeBytes,
        String contentType
) {}