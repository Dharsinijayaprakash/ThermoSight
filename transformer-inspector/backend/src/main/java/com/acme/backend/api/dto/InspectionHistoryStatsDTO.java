package com.acme.backend.api.dto;

/**
 * DTO for inspection history statistics
 */
public record InspectionHistoryStatsDTO(
    String inspectionId,
    String inspectionNumber,
    int totalActions,
    int totalBoxes,
    java.util.Map<String, Integer> actionsByType,
    java.util.Map<String, Integer> actionsByUser,
    java.util.Map<String, Integer> boxesByClass,
    String firstAction,
    String lastAction,
    java.util.List<String> contributingInspectors
) {}