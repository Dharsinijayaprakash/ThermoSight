package com.acme.backend.service;

import com.acme.backend.api.dto.DetectionResponse;
import com.acme.backend.exception.ImageFileNotFoundException;
import com.acme.backend.exception.MLServiceException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

/**
 * Client for communicating with Python ML Service (Phase 2)
 * Sends absolute image paths for inference and receives detection results
 */
@Service
public class MLServiceClient {
    
    private static final Logger log = LoggerFactory.getLogger(MLServiceClient.class);
    
    @Value("${app.ml-service.url:http://localhost:5001}")
    private String mlServiceUrl;
    
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    
    public MLServiceClient() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }
    
    /**
     * Check if ML service is healthy and ready
     */
    public boolean isHealthy() {
        try {
            String url = mlServiceUrl + "/api/health";
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            log.error("ML Service health check failed: {}", e.getMessage());
            return false;
        }
    }
    
    /**
     * Send image for anomaly detection (backward compatibility)
     * 
     * @param imagePath Absolute file path to the thermal image
     * @param confidenceThreshold Minimum confidence threshold (default 0.25)
     * @return DetectionResponse with bounding boxes and classifications
     */
    public DetectionResponse detectAnomalies(String imagePath, Double confidenceThreshold) {
        return detectAnomalies(imagePath, null, confidenceThreshold);
    }
    
    /**
     * Send both baseline and inspection images for anomaly detection with comparison
     * 
     * @param inspectionImagePath Absolute file path to the inspection thermal image
     * @param baselineImagePath Absolute file path to the baseline thermal image (optional)
     * @param confidenceThreshold Minimum confidence threshold (default 0.25)
     * @return DetectionResponse with bounding boxes and classifications
     */
    public DetectionResponse detectAnomalies(String inspectionImagePath, String baselineImagePath, Double confidenceThreshold) {
        String url = mlServiceUrl + "/api/detect";
        try {
            if (inspectionImagePath == null || inspectionImagePath.trim().isEmpty()) {
                throw new IllegalArgumentException("Inspection image path must not be null or empty");
            }

            // Ensure inspection image path is absolute, normalized, and exists
            Path inspectionPath = Paths.get(inspectionImagePath.trim()).toAbsolutePath().normalize();
            if (!Files.exists(inspectionPath) || !Files.isRegularFile(inspectionPath)) {
                log.error("Inspection image file not found on disk at: {}", inspectionPath);
                throw new ImageFileNotFoundException("Inspection image file not found on disk: " + inspectionPath);
            }
            String finalInspectionPath = inspectionPath.toString();

            // Handle optional baseline image path
            String finalBaselinePath = null;
            if (baselineImagePath != null && !baselineImagePath.trim().isEmpty()) {
                Path baselinePath = Paths.get(baselineImagePath.trim()).toAbsolutePath().normalize();
                if (Files.exists(baselinePath) && Files.isRegularFile(baselinePath)) {
                    finalBaselinePath = baselinePath.toString();
                } else {
                    log.warn("Baseline image file not found at: {}. Proceeding with single-image inference.", baselinePath);
                }
            }

            // Prepare request payload for Flask endpoint
            Map<String, Object> request = new HashMap<>();
            request.put("inspection_image_path", finalInspectionPath);
            if (finalBaselinePath != null) {
                request.put("baseline_image_path", finalBaselinePath);
                log.info("Sending anomaly detection with baseline comparison to ML service at {}", url);
                log.info("   Inspection: {}", finalInspectionPath);
                log.info("   Baseline: {}", finalBaselinePath);
            } else {
                log.info("Sending anomaly detection without baseline to ML service at {}", url);
                log.info("   Inspection: {}", finalInspectionPath);
            }
            request.put("confidence_threshold", confidenceThreshold != null ? confidenceThreshold : 0.25);
            
            // Set headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
            
            // Call ML service
            ResponseEntity<DetectionResponse> response = restTemplate.postForEntity(
                url,
                entity,
                DetectionResponse.class
            );
            
            DetectionResponse result = response.getBody();
            
            if (result != null && Boolean.TRUE.equals(result.success())) {
                int detectionCount = result.detections() != null ? result.detections().size() : 0;
                log.info("Detection completed successfully: {} detections found in {}ms",
                        detectionCount,
                        result.inferenceTimeMs());
                return result;
            } else {
                String errorMsg = result != null && result.error() != null ? result.error() : "Unknown error from ML service";
                log.error("Detection failed from ML service: {}", errorMsg);
                throw new MLServiceException("ML Service returned failure: " + errorMsg);
            }
            
        } catch (HttpStatusCodeException e) {
            String responseBody = e.getResponseBodyAsString();
            log.error("ML service HTTP error {} on POST {}. Response body: {}", e.getStatusCode(), url, responseBody);
            String detailMsg = extractErrorMessage(responseBody, e.getMessage());
            throw new MLServiceException("Failed to communicate with ML service: " + detailMsg, e);
        } catch (ResourceAccessException e) {
            log.error("Cannot connect to ML service at {}: {}", url, e.getMessage());
            throw new MLServiceException("Failed to communicate with ML service: service unavailable at " + mlServiceUrl, e);
        } catch (MLServiceException | ImageFileNotFoundException | IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error calling ML service: {}", e.getMessage(), e);
            throw new MLServiceException("Failed to communicate with ML service: " + e.getMessage(), e);
        }
    }
    
    /**
     * Helper to extract clean error message from ML service JSON response
     */
    private String extractErrorMessage(String responseBody, String defaultMsg) {
        if (responseBody != null && !responseBody.isBlank()) {
            try {
                JsonNode node = objectMapper.readTree(responseBody);
                if (node.has("error") && !node.get("error").isNull()) {
                    return node.get("error").asText();
                }
                if (node.has("message") && !node.get("message").isNull()) {
                    return node.get("message").asText();
                }
            } catch (Exception ignored) {}
            return responseBody;
        }
        return defaultMsg;
    }

    /**
     * Get ML service information
     */
    public Map<String, Object> getServiceInfo() {
        try {
            String url = mlServiceUrl + "/api/health";
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            return response.getBody();
        } catch (Exception e) {
            log.error("Failed to get ML service info: {}", e.getMessage());
            Map<String, Object> errorInfo = new HashMap<>();
            errorInfo.put("status", "unavailable");
            errorInfo.put("error", e.getMessage());
            return errorInfo;
        }
    }
}
