// src/api/history.ts
import { api } from './client';

export type InspectorAccessRequest = {
  inspectorName: string;
  accessType: 'CREATE' | 'EDIT' | 'VIEW';
  reason?: string;
};

export type InspectorAccessResponse = {
  accessGranted: boolean;
  accessLevel: 'READ_WRITE' | 'READ_ONLY' | 'DENIED';
  message: string;
  currentInspector?: string;
  inspectionStatus: string;
  requiresNamePrompt: boolean;
};

export type HistoryEntry = {
  id: string;
  inspectionId: string;
  inspectionNumber: string;
  boxNumber?: number;
  actionType: string;
  actionDescription: string;
  userName: string;
  previousData?: string;
  newData?: string;
  createdAt: string;
  inspectionStatus: string;
  currentInspector?: string;
};

export type HistoryStats = {
  inspectionId: string;
  inspectionNumber: string;
  totalActions: number;
  totalBoxes: number;
  actionsByType: Record<string, number>;
  actionsByUser: Record<string, number>;
  boxesByClass: Record<string, number>;
  firstAction?: string;
  lastAction?: string;
  contributingInspectors: string[];
};

/**
 * Validate inspector access to an inspection
 */
export async function validateInspectorAccess(
  inspectionId: string,
  request: InspectorAccessRequest
): Promise<InspectorAccessResponse> {
  return await api(`/api/inspections/${inspectionId}/history/access`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
}

/**
 * Get inspection history
 */
export async function getInspectionHistory(
  inspectionId: string,
  includeJsonData: boolean = false
): Promise<HistoryEntry[]> {
  const params = new URLSearchParams({ includeJsonData: includeJsonData.toString() });
  return await api(`/api/inspections/${inspectionId}/history?${params}`);
}

/**
 * Get inspection history summary (recent actions)
 */
export async function getInspectionHistorySummary(
  inspectionId: string,
  limit: number = 10
): Promise<HistoryEntry[]> {
  const params = new URLSearchParams({ limit: limit.toString() });
  return await api(`/api/inspections/${inspectionId}/history/summary?${params}`);
}

/**
 * Get history for a specific box
 */
export async function getBoxHistory(
  inspectionId: string,
  boxNumber: number
): Promise<HistoryEntry[]> {
  return await api(`/api/inspections/${inspectionId}/history/box/${boxNumber}`);
}

/**
 * Get inspection statistics and activity summary
 */
export async function getInspectionStatistics(inspectionId: string): Promise<HistoryStats> {
  return await api(`/api/inspections/${inspectionId}/history/stats`);
}

/**
 * Log a custom history event
 */
export async function logCustomEvent(
  inspectionId: string,
  eventData: {
    action_type: string;
    description: string;
    user_name: string;
    box_number?: number;
  }
): Promise<string> {
  return await api(`/api/inspections/${inspectionId}/history/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData),
  });
}