package com.acme.backend.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name = "thermal_images")
public class ThermalImage {
    public enum Type { BASELINE, MAINTENANCE, INSPECTION }
    public enum EnvCondition { SUNNY, CLOUDY, RAINY }

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    private Transformer transformer;

    @ManyToOne(optional = true, fetch = FetchType.LAZY)
    @JoinColumn(name = "inspection_id")
    private Inspection inspection;

    @Enumerated(EnumType.STRING) @Column(nullable = false)
    private Type type;

    @Enumerated(EnumType.STRING)
    private EnvCondition envCondition; // required only for BASELINE

    private String originalFilename;
    private String storedFilename;
    private String contentType;
    private Long sizeBytes;
    private String uploader;
    private String publicUrl;

    @CreationTimestamp
    private Instant uploadedAt;

    public UUID getId() { return id; }
    public Transformer getTransformer() { return transformer; }
    public void setTransformer(Transformer transformer) { this.transformer = transformer; }
    public Inspection getInspection() { return inspection; }
    public void setInspection(Inspection inspection) { this.inspection = inspection; }
    public Type getType() { return type; }
    public void setType(Type type) { this.type = type; }
    public EnvCondition getEnvCondition() { return envCondition; }
    public void setEnvCondition(EnvCondition envCondition) { this.envCondition = envCondition; }
    public String getOriginalFilename() { return originalFilename; }
    public void setOriginalFilename(String originalFilename) { this.originalFilename = originalFilename; }
    public String getStoredFilename() { return storedFilename; }
    public void setStoredFilename(String storedFilename) { this.storedFilename = storedFilename; }
    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }
    public Long getSizeBytes() { return sizeBytes; }
    public void setSizeBytes(Long sizeBytes) { this.sizeBytes = sizeBytes; }
    public String getUploader() { return uploader; }
    public void setUploader(String uploader) { this.uploader = uploader; }
    public String getPublicUrl() { return publicUrl; }
    public void setPublicUrl(String publicUrl) { this.publicUrl = publicUrl; }
    public Instant getUploadedAt() { return uploadedAt; }
}


