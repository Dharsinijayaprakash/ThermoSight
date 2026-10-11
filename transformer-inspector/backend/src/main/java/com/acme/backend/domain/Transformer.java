package com.acme.backend.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
        name = "transformers",
        uniqueConstraints = @UniqueConstraint(columnNames = "code")
)
public class Transformer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotBlank
    private String code;                 // "Transformer No."

    // --- Existing Phase-1 fields ---
    @NotBlank
    private String location;
    @Positive
    private Integer capacityKVA;

    // --- New optional fields to match your dialog ---
    private String region;              // Regions (free text for now)
    private String poleNo;              // Pole No.
    private String type;                // e.g., "Bulk", "Distribution"
    @Column(length = 2048)
    private String locationDetails;     // Notes / details

    @CreationTimestamp
    private Instant createdAt;
    @UpdateTimestamp
    private Instant updatedAt;

    public UUID getId() { return id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public Integer getCapacityKVA() { return capacityKVA; }
    public void setCapacityKVA(Integer capacityKVA) { this.capacityKVA = capacityKVA; }

    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }

    public String getPoleNo() { return poleNo; }
    public void setPoleNo(String poleNo) { this.poleNo = poleNo; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getLocationDetails() { return locationDetails; }
    public void setLocationDetails(String locationDetails) { this.locationDetails = locationDetails; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}