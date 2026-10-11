package com.acme.backend.api;

import com.acme.backend.api.dto.CreateTransformerReq;
import com.acme.backend.api.dto.TransformerDTO;
import com.acme.backend.domain.Transformer;
import com.acme.backend.repo.InspectionRepo;
import com.acme.backend.repo.ThermalImageRepo;
import com.acme.backend.repo.TransformerRepo;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/transformers")
public class TransformerController {

    private final TransformerRepo repo;
    private final ThermalImageRepo imageRepo;
    private final InspectionRepo inspectionRepo;

    public TransformerController(TransformerRepo repo, ThermalImageRepo imageRepo, InspectionRepo inspectionRepo) {
        this.repo = repo;
        this.imageRepo = imageRepo;
        this.inspectionRepo = inspectionRepo;
    }

    @PostMapping
    public TransformerDTO create(@Valid @RequestBody CreateTransformerReq req) {
        Transformer t = new Transformer();
        t.setCode(req.code());
        t.setLocation(req.location());
        t.setCapacityKVA(req.capacityKVA());
        t.setRegion(req.region());
        t.setPoleNo(req.poleNo());
        t.setType(req.type());
        t.setLocationDetails(req.locationDetails());
        repo.save(t);
        return toDTO(t);
    }

    @GetMapping
    public Page<TransformerDTO> list(@RequestParam(defaultValue = "") String q, Pageable pageable) {
        return repo
                .findByCodeContainingIgnoreCaseOrLocationContainingIgnoreCase(q, q, pageable)
                .map(this::toDTO);
    }

    @GetMapping("/{id}")
    public TransformerDTO get(@PathVariable UUID id) {
        return repo.findById(id).map(this::toDTO).orElseThrow();
    }

    @PutMapping("/{id}")
    public TransformerDTO update(@PathVariable UUID id, @Valid @RequestBody CreateTransformerReq req) {
        var t = repo.findById(id).orElseThrow();
        t.setCode(req.code());
        t.setLocation(req.location());
        t.setCapacityKVA(req.capacityKVA());
        t.setRegion(req.region());
        t.setPoleNo(req.poleNo());
        t.setType(req.type());
        t.setLocationDetails(req.locationDetails());
        repo.save(t);
        return toDTO(t);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public void delete(@PathVariable UUID id) {
        imageRepo.deleteByTransformerId(id);
        inspectionRepo.deleteByTransformerId(id);
        repo.deleteById(id);
    }

    private TransformerDTO toDTO(Transformer t) {
        return new TransformerDTO(
                t.getId(), t.getCode(), t.getLocation(), t.getCapacityKVA(),
                t.getRegion(), t.getPoleNo(), t.getType(), t.getLocationDetails(),
                t.getCreatedAt()
        );
    }
}