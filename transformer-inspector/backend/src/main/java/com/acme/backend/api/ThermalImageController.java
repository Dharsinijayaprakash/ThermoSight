package com.acme.backend.api;

import com.acme.backend.api.dto.ThermalImageDTO;
import com.acme.backend.domain.ThermalImage;
import com.acme.backend.repo.InspectionRepo;
import com.acme.backend.repo.ThermalImageRepo;
import com.acme.backend.repo.TransformerRepo;
import com.acme.backend.storage.FileStorageService;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.UUID;

@RestController
@RequestMapping("/api/images")
public class ThermalImageController {

    private final TransformerRepo transformerRepo;
    private final InspectionRepo inspectionRepo;
    private final ThermalImageRepo imageRepo;
    private final FileStorageService storage;

    public ThermalImageController(
            TransformerRepo transformerRepo,
            InspectionRepo inspectionRepo,
            ThermalImageRepo imageRepo,
            FileStorageService storage
    ) {
        this.transformerRepo = transformerRepo;
        this.inspectionRepo = inspectionRepo;
        this.imageRepo = imageRepo;
        this.storage = storage;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ThermalImageDTO upload(
            @RequestParam UUID transformerId,
            @RequestParam ThermalImage.Type type,
            @RequestParam(required = false) ThermalImage.EnvCondition envCondition,
            @RequestParam(required = false) UUID inspectionId,
            @RequestParam String uploader,
            @RequestPart("file") @NotNull MultipartFile file
    ) throws IOException {
        var transformer = transformerRepo.findById(transformerId).orElseThrow();

        if (type == ThermalImage.Type.BASELINE && envCondition == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Baseline requires envCondition");
        }

        if (type == ThermalImage.Type.INSPECTION && inspectionId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Inspection images require inspectionId");
        }

        var stored = storage.store(transformerId, type.name(), file);

        var img = new ThermalImage();
        img.setTransformer(transformer);
        img.setType(type);
        img.setEnvCondition(envCondition);
        
        if (inspectionId != null) {
            var inspection = inspectionRepo.findById(inspectionId).orElseThrow();
            img.setInspection(inspection);
        }
        
        img.setOriginalFilename(file.getOriginalFilename());
        img.setStoredFilename(stored.storedName());
        img.setContentType(stored.contentType());
        img.setSizeBytes(stored.size());
        img.setUploader(uploader);
        img.setPublicUrl(stored.publicUrl());

        imageRepo.save(img);
        return toDTO(img);
    }

    @GetMapping
    public Page<ThermalImageDTO> list(
            @RequestParam(required = false) UUID transformerId,
            @RequestParam(required = false) UUID inspectionId,
            @RequestParam(required = false) ThermalImage.Type type,
            Pageable pageable
    ) {
        if (inspectionId != null) {
            return imageRepo.findByInspectionId(inspectionId, pageable).map(this::toDTO);
        }
        
        if (transformerId != null) {
            if (type != null) {
                return imageRepo
                        .findByTransformerIdAndType(transformerId, type, pageable)
                        .map(this::toDTO);
            }
            // Only transformerId provided → filter by transformerId
            return imageRepo
                    .findByTransformerId(transformerId, pageable)
                    .map(this::toDTO);
        }

        if (type != null) {
            return imageRepo.findByType(type, pageable).map(this::toDTO);
        }

        return imageRepo.findAll(pageable).map(this::toDTO);
    }

    // ---------- helpers ----------

    private ThermalImageDTO toDTO(ThermalImage i) {
        return new ThermalImageDTO(
                i.getId(),
                i.getTransformer().getId(),
                i.getInspection() != null ? i.getInspection().getId() : null,
                i.getType(),
                i.getEnvCondition(),
                i.getUploader(),
                i.getUploadedAt(),
                i.getPublicUrl(),
                i.getOriginalFilename(),
                i.getSizeBytes(),
                i.getContentType()
        );
    }
}