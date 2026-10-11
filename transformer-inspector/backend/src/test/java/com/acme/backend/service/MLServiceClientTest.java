package com.acme.backend.service;

import com.acme.backend.api.dto.DetectionResponse;
import com.acme.backend.exception.ImageFileNotFoundException;
import com.acme.backend.storage.FileStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Path;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class MLServiceClientTest {

    private MLServiceClient client;
    private FileStorageService storageService;

    @BeforeEach
    void setUp() {
        client = new MLServiceClient();
        ReflectionTestUtils.setField(client, "mlServiceUrl", "http://localhost:5001");

        storageService = new FileStorageService();
        ReflectionTestUtils.setField(storageService, "root", "./uploads");
        ReflectionTestUtils.setField(storageService, "publicBase", "http://localhost:8080");
        storageService.init();
    }

    @Test
    void testMissingFileThrowsImageFileNotFoundException() {
        assertThrows(ImageFileNotFoundException.class, () -> {
            client.detectAnomalies("non_existent_file_path.jpg", null, 0.25);
        });
    }

    @Test
    void testDetectAnomaliesWithExistingFilesAgainstLiveMLService() {
        // Only run against live service if healthy
        if (!client.isHealthy()) {
            System.out.println("ML service not healthy on localhost:5001, skipping live integration test");
            return;
        }

        UUID transformerId = UUID.fromString("8346f964-a5fd-48c8-aed1-8b8b2fdd3c76");
        Path inspectionPath = storageService.resolveImagePath(
                transformerId,
                "inspection",
                "926369db-6c0d-493e-a9c8-83314a2ea67c_T1_faulty_001 (1).jpg"
        );
        Path baselinePath = storageService.resolveImagePath(
                transformerId,
                "baseline",
                "50871196-f654-44e6-b81b-afad70ddabe0_T1_normal_001.jpg"
        );

        assertNotNull(inspectionPath);
        assertTrue(inspectionPath.toFile().exists());

        DetectionResponse response = client.detectAnomalies(
                inspectionPath.toString(),
                baselinePath.toString(),
                0.25
        );

        assertNotNull(response);
        assertTrue(response.success());
        assertNotNull(response.detections());
        assertFalse(response.detections().isEmpty(), "Expected detections from YOLOv8");
        assertNotNull(response.inferenceTimeMs());
        assertTrue(response.inferenceTimeMs() > 0);
    }
}
