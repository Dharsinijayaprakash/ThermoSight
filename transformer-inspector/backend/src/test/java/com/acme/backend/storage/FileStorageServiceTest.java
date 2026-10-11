package com.acme.backend.storage;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class FileStorageServiceTest {

    private FileStorageService storageService;

    @BeforeEach
    void setUp() {
        storageService = new FileStorageService();
        ReflectionTestUtils.setField(storageService, "root", "./uploads");
        ReflectionTestUtils.setField(storageService, "publicBase", "http://localhost:8080");
        storageService.init();
    }

    @Test
    void testResolveStorageRootResolvesToValidExistingDirectory() {
        Path root = storageService.getStorageRoot();
        assertNotNull(root, "Storage root must not be null");
        assertTrue(root.isAbsolute(), "Storage root must be an absolute path");
        assertTrue(Files.exists(root), "Storage root directory must exist on disk: " + root);
        assertTrue(Files.isDirectory(root), "Storage root must be a directory");
    }

    @Test
    void testResolveExistingInspectionImageWithParenthesesAndSpaces() {
        UUID transformerId = UUID.fromString("8346f964-a5fd-48c8-aed1-8b8b2fdd3c76");
        String filename = "926369db-6c0d-493e-a9c8-83314a2ea67c_T1_faulty_001 (1).jpg";

        Path resolved = storageService.resolveImagePath(transformerId, "inspection", filename);
        assertNotNull(resolved);
        assertTrue(resolved.isAbsolute(), "Resolved path must be absolute");
        assertTrue(Files.exists(resolved), "Existing inspection image must exist on disk at: " + resolved);
        assertTrue(Files.isRegularFile(resolved), "Resolved path must be a regular file");
    }

    @Test
    void testResolveExistingBaselineImage() {
        UUID transformerId = UUID.fromString("8346f964-a5fd-48c8-aed1-8b8b2fdd3c76");
        String filename = "50871196-f654-44e6-b81b-afad70ddabe0_T1_normal_001.jpg";

        Path resolved = storageService.resolveImagePath(transformerId, "baseline", filename);
        assertNotNull(resolved);
        assertTrue(resolved.isAbsolute(), "Resolved path must be absolute");
        assertTrue(Files.exists(resolved), "Existing baseline image must exist on disk at: " + resolved);
    }

    @Test
    void testResolveStorageRootFromDifferentWorkingDirectories() {
        // Test that resolveStorageRoot safely finds the directory even with different candidates
        Path resolved = storageService.resolveStorageRoot("./uploads");
        assertTrue(resolved.isAbsolute());
        assertTrue(Files.exists(resolved));
    }
}
