package com.acme.backend.storage;

import com.acme.backend.domain.ThermalImage;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class FileStorageService {
    private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);

    @Value("${app.storage.root:./uploads}")
    private String root;

    @Value("${app.server.public-base-url:http://localhost:8080}")
    private String publicBase;

    private Path resolvedStorageRoot;

    @PostConstruct
    public void init() {
        this.resolvedStorageRoot = resolveStorageRoot(this.root);
        log.info("FileStorageService initialized. Storage root resolved to: {}", this.resolvedStorageRoot);
        try {
            Files.createDirectories(this.resolvedStorageRoot);
        } catch (IOException e) {
            log.warn("Could not create storage root directory: {}", e.getMessage());
        }
    }

    /**
     * Resolves the configured storage root to a valid absolute path.
     * Searches project tree candidates to ensure the directory is found regardless of CWD.
     */
    public Path resolveStorageRoot(String rootPath) {
        if (rootPath == null || rootPath.trim().isEmpty()) {
            rootPath = "./uploads";
        }
        Path path = Paths.get(rootPath.trim());
        if (path.isAbsolute()) {
            return path.normalize();
        }

        Path cwd = Paths.get("").toAbsolutePath();
        List<Path> candidates = new ArrayList<>();

        // 1. Candidate relative to current working directory
        candidates.add(cwd.resolve(path));
        candidates.add(cwd.resolve("backend").resolve(path));
        candidates.add(cwd.resolve("transformer-inspector").resolve("backend").resolve(path));
        candidates.add(cwd.resolve("TransX-Transformer-Maintenance-Platform")
                .resolve("transformer-inspector").resolve("backend").resolve(path));

        // 2. Candidate searching upwards from CWD
        Path current = cwd;
        for (int i = 0; i < 4 && current != null; i++) {
            candidates.add(current.resolve(path));
            candidates.add(current.resolve("backend").resolve(path));
            candidates.add(current.resolve("transformer-inspector").resolve("backend").resolve(path));
            candidates.add(current.resolve("TransX-Transformer-Maintenance-Platform")
                    .resolve("transformer-inspector").resolve("backend").resolve(path));
            current = current.getParent();
        }

        // Pick the first candidate directory that exists
        for (Path candidate : candidates) {
            Path normalized = candidate.normalize();
            if (Files.exists(normalized) && Files.isDirectory(normalized)) {
                log.info("Found existing uploads directory at: {}", normalized);
                return normalized;
            }
        }

        // If not found yet, choose the most sensible location based on project structure
        if (Files.exists(cwd.resolve("backend"))) {
            return cwd.resolve("backend").resolve(path).normalize();
        }
        if (Files.exists(cwd.resolve("transformer-inspector").resolve("backend"))) {
            return cwd.resolve("transformer-inspector").resolve("backend").resolve(path).normalize();
        }

        return cwd.resolve(path).normalize();
    }

    public Path getStorageRoot() {
        if (resolvedStorageRoot == null) {
            resolvedStorageRoot = resolveStorageRoot(this.root);
        }
        return resolvedStorageRoot;
    }

    /**
     * Resolve filesystem path for a specific stored image file.
     */
    public Path resolveImagePath(UUID transformerId, String type, String filename) {
        if (transformerId == null || type == null || filename == null || filename.isBlank()) {
            return null;
        }
        return getStorageRoot()
                .resolve(transformerId.toString())
                .resolve(type.toLowerCase())
                .resolve(filename)
                .toAbsolutePath()
                .normalize();
    }

    /**
     * Resolve filesystem path for a ThermalImage entity.
     */
    public Path resolveImagePath(ThermalImage image) {
        if (image == null || image.getStoredFilename() == null) {
            return null;
        }
        UUID transformerId = image.getTransformer() != null ? image.getTransformer().getId() : null;
        if (transformerId == null) {
            return null;
        }
        String type = image.getType() != null ? image.getType().name().toLowerCase() : "inspection";
        return resolveImagePath(transformerId, type, image.getStoredFilename());
    }

    /**
     * Check if the image file exists on the filesystem.
     */
    public boolean imageExists(ThermalImage image) {
        Path path = resolveImagePath(image);
        return path != null && Files.exists(path) && Files.isRegularFile(path);
    }

    public StoredFile store(UUID transformerId, String type, MultipartFile file) throws IOException {
        Path dir = getStorageRoot().resolve(transformerId.toString()).resolve(type.toLowerCase());
        Files.createDirectories(dir);
        String stored = UUID.randomUUID() + "_" + StringUtils.cleanPath(file.getOriginalFilename());
        Path dest = dir.resolve(stored);
        try (var in = file.getInputStream()) {
            Files.copy(in, dest, StandardCopyOption.REPLACE_EXISTING);
        }
        String publicUrl = publicBase + "/files/" + transformerId + "/" + type.toLowerCase() + "/" + stored;
        return new StoredFile(stored, publicUrl, file.getContentType(), file.getSize());
    }

    public record StoredFile(String storedName, String publicUrl, String contentType, long size) {}
}