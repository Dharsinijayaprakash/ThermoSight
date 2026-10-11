package com.acme.backend.service;

import com.acme.backend.api.dto.DetectionResponse;
import com.acme.backend.domain.Inspection;
import com.acme.backend.domain.ThermalImage;
import com.acme.backend.domain.Transformer;
import com.acme.backend.exception.ImageFileNotFoundException;
import com.acme.backend.repo.AnnotationRepo;
import com.acme.backend.repo.InspectionRepo;
import com.acme.backend.repo.ThermalImageRepo;
import com.acme.backend.repo.TransformerRepo;
import com.acme.backend.storage.FileStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class InspectionServiceTest {

    private InspectionRepo inspectionRepo;
    private AnnotationRepo annotationRepo;
    private TransformerRepo transformerRepo;
    private ThermalImageRepo thermalImageRepo;
    private MLServiceClient mlServiceClient;
    private InspectionHistoryService historyService;
    private FileStorageService fileStorageService;
    private InspectionService inspectionService;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        inspectionRepo = mock(InspectionRepo.class);
        annotationRepo = mock(AnnotationRepo.class);
        transformerRepo = mock(TransformerRepo.class);
        thermalImageRepo = mock(ThermalImageRepo.class);
        mlServiceClient = mock(MLServiceClient.class);
        historyService = mock(InspectionHistoryService.class);
        fileStorageService = mock(FileStorageService.class);

        inspectionService = new InspectionService(
                inspectionRepo,
                annotationRepo,
                transformerRepo,
                thermalImageRepo,
                mlServiceClient,
                historyService,
                fileStorageService
        );
    }

    @Test
    void testDetectAnomaliesThrowsWhenImageFileMissingOnDisk() {
        UUID inspectionId = UUID.randomUUID();
        UUID transformerId = UUID.randomUUID();

        Transformer transformer = new Transformer();
        org.springframework.test.util.ReflectionTestUtils.setField(transformer, "id", transformerId);

        ThermalImage image = new ThermalImage();
        image.setTransformer(transformer);
        image.setType(ThermalImage.Type.INSPECTION);
        image.setStoredFilename("test_missing.jpg");

        Inspection inspection = new Inspection();
        org.springframework.test.util.ReflectionTestUtils.setField(inspection, "id", inspectionId);
        inspection.setInspectionNumber("INS-001");
        inspection.setTransformer(transformer);
        inspection.setInspectionImage(image);

        when(inspectionRepo.findById(inspectionId)).thenReturn(Optional.of(inspection));
        when(fileStorageService.resolveImagePath(image)).thenReturn(tempDir.resolve("non_existent_file.jpg"));

        assertThrows(ImageFileNotFoundException.class, () -> {
            inspectionService.detectAnomalies(inspectionId, 0.25);
        });

        verifyNoInteractions(mlServiceClient);
    }

    @Test
    void testDetectAnomaliesPassesAbsolutePathsAndHandlesOptionalBaseline() throws IOException {
        UUID inspectionId = UUID.randomUUID();
        UUID transformerId = UUID.randomUUID();

        // Create actual dummy image files in tempDir
        File inspectionFile = tempDir.resolve("inspection.jpg").toFile();
        assertTrue(inspectionFile.createNewFile());

        File baselineFile = tempDir.resolve("baseline.jpg").toFile();
        assertTrue(baselineFile.createNewFile());

        Transformer transformer = new Transformer();
        org.springframework.test.util.ReflectionTestUtils.setField(transformer, "id", transformerId);

        ThermalImage inspectionImage = new ThermalImage();
        inspectionImage.setTransformer(transformer);
        inspectionImage.setType(ThermalImage.Type.INSPECTION);
        inspectionImage.setStoredFilename("inspection.jpg");

        ThermalImage baselineImage = new ThermalImage();
        baselineImage.setTransformer(transformer);
        baselineImage.setType(ThermalImage.Type.BASELINE);
        baselineImage.setStoredFilename("baseline.jpg");

        Inspection inspection = new Inspection();
        org.springframework.test.util.ReflectionTestUtils.setField(inspection, "id", inspectionId);
        inspection.setInspectionNumber("INS-002");
        inspection.setTransformer(transformer);
        inspection.setInspectionImage(inspectionImage);

        when(inspectionRepo.findById(inspectionId)).thenReturn(Optional.of(inspection));
        when(fileStorageService.resolveImagePath(inspectionImage)).thenReturn(inspectionFile.toPath());
        when(fileStorageService.resolveImagePath(baselineImage)).thenReturn(baselineFile.toPath());
        when(thermalImageRepo.findByTransformerIdAndType(eq(transformerId), eq(ThermalImage.Type.BASELINE), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(baselineImage)));

        DetectionResponse dummyResponse = new DetectionResponse(
                true,
                Collections.emptyList(),
                new DetectionResponse.ImageDimensions(640, 640),
                100.0,
                null,
                null
        );
        when(mlServiceClient.detectAnomalies(anyString(), anyString(), anyDouble())).thenReturn(dummyResponse);

        DetectionResponse response = inspectionService.detectAnomalies(inspectionId, 0.25);
        assertNotNull(response);
        assertTrue(response.success());

        ArgumentCaptor<String> inspCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> baseCaptor = ArgumentCaptor.forClass(String.class);
        verify(mlServiceClient).detectAnomalies(inspCaptor.capture(), baseCaptor.capture(), eq(0.25));

        assertEquals(inspectionFile.getAbsolutePath(), inspCaptor.getValue());
        assertEquals(baselineFile.getAbsolutePath(), baseCaptor.getValue());
    }
}
