// src/api/maintenanceRecords.ts
import { api } from './client';

export type MaintenanceRecordStatus = 'DRAFT' | 'FINALIZED';
export type TransformerStatus = 'WORKING' | 'NOT_WORKING' | 'PARTIALLY_WORKING';
export type BaselineCondition = 'GOOD' | 'FAIR' | 'POOR';
export type TransformerType = 'DISTRIBUTION' | 'POWER' | 'INSTRUMENT' | 'AUTO_TRANSFORMER';

export type MaintenanceRecordAnomaly = {
  id: string;
  boxNumber?: number;
  classId: number;
  className: string;
  confidence?: number;
  bboxX1: number;
  bboxY1: number;
  bboxX2: number;
  bboxY2: number;
  source: string;
  createdAt: string;
};

export type MaintenanceRecord = {
  id: string;
  recordNumber: string;
  transformerId: string;
  transformerCode: string;
  inspectionId: string;
  inspectionNumber: string;
  
  // System-generated fields
  inspectionDate?: string;
  weatherCondition?: string;
  thermalImageUrl?: string;
  anomalyCount: number;
  
  // Tab 1: Maintenance Record fields
  dateOfInspection?: string;
  startTime?: string;
  completionTime?: string;
  supervisedBy?: string;
  gangTech1?: string;
  gangTech2?: string;
  gangTech3?: string;
  gangHelpers?: string;
  inspectedBy?: string;
  inspectedDate?: string;
  rectifiedBy?: string;
  rectifiedDate?: string;
  cssInspector?: string;
  cssInspectorDate?: string;
  
  // Tab 2: Work-Data Sheet fields
  branch?: string;
  transformerNo?: string;
  poleNo?: string;
  baselineRight?: number;
  baselineLeft?: number;
  baselineFront?: number;
  loadGrowthKva?: number;
  baselineCondition?: BaselineCondition;
  transformerStatus?: TransformerStatus;
  transformerType?: TransformerType;
  meterSerialNo?: string;
  meterMaker?: string;
  meterMake?: string;
  workContent?: Record<string, boolean>;
  
  // First inspection readings
  firstVoltageR?: number;
  firstVoltageY?: number;
  firstVoltageB?: number;
  firstCurrentR?: number;
  firstCurrentY?: number;
  firstCurrentB?: number;
  firstPowerFactorR?: number;
  firstPowerFactorY?: number;
  firstPowerFactorB?: number;
  firstKwR?: number;
  firstKwY?: number;
  firstKwB?: number;
  
  // Second inspection readings
  secondVoltageR?: number;
  secondVoltageY?: number;
  secondVoltageB?: number;
  secondCurrentR?: number;
  secondCurrentY?: number;
  secondCurrentB?: number;
  secondPowerFactorR?: number;
  secondPowerFactorY?: number;
  secondPowerFactorB?: number;
  secondKwR?: number;
  secondKwY?: number;
  secondKwB?: number;
  secondInspectionDate?: string;
  
  // Notes
  notes?: string;
  engineerRemarks?: string;
  
  // Metadata
  status: MaintenanceRecordStatus;
  version: number;
  createdBy?: string;
  updatedBy?: string;
  finalizedBy?: string;
  finalizedAt?: string;
  createdAt: string;
  updatedAt: string;
  
  // Anomalies
  anomalies: MaintenanceRecordAnomaly[];
};

export type PageResp<T> = {
  content: T[];
  totalElements: number;
  totalPages?: number;
  number?: number;
  size?: number;
};

export type CreateMaintenanceRecordRequest = {
  inspectionId: string;
  createdBy: string;
};

export type UpdateMaintenanceRecordRequest = {
  // Tab 1: Maintenance Record fields
  dateOfInspection?: string;
  startTime?: string;
  completionTime?: string;
  supervisedBy?: string;
  gangTech1?: string;
  gangTech2?: string;
  gangTech3?: string;
  gangHelpers?: string;
  inspectedBy?: string;
  inspectedDate?: string;
  rectifiedBy?: string;
  rectifiedDate?: string;
  cssInspector?: string;
  cssInspectorDate?: string;
  
  // Tab 2: Work-Data Sheet fields
  branch?: string;
  transformerNo?: string;
  poleNo?: string;
  baselineRight?: number;
  baselineLeft?: number;
  baselineFront?: number;
  loadGrowthKva?: number;
  baselineCondition?: BaselineCondition;
  transformerStatus?: TransformerStatus;
  transformerType?: TransformerType;
  meterSerialNo?: string;
  meterMaker?: string;
  meterMake?: string;
  workContent?: Record<string, boolean>;
  
  // First inspection readings
  firstVoltageR?: number;
  firstVoltageY?: number;
  firstVoltageB?: number;
  firstCurrentR?: number;
  firstCurrentY?: number;
  firstCurrentB?: number;
  firstPowerFactorR?: number;
  firstPowerFactorY?: number;
  firstPowerFactorB?: number;
  firstKwR?: number;
  firstKwY?: number;
  firstKwB?: number;
  
  // Second inspection readings
  secondVoltageR?: number;
  secondVoltageY?: number;
  secondVoltageB?: number;
  secondCurrentR?: number;
  secondCurrentY?: number;
  secondCurrentB?: number;
  secondPowerFactorR?: number;
  secondPowerFactorY?: number;
  secondPowerFactorB?: number;
  secondKwR?: number;
  secondKwY?: number;
  secondKwB?: number;
  secondInspectionDate?: string;
  
  // Notes
  notes?: string;
  engineerRemarks?: string;
  
  // User
  updatedBy: string;
};

/**
 * List all maintenance records with pagination and search
 */
export async function listMaintenanceRecords(
  q = '', 
  transformerId = '', 
  page = 0, 
  size = 10
) {
  const params = new URLSearchParams({ q, page: String(page), size: String(size) });
  if (transformerId) params.set('transformerId', transformerId);
  return api<PageResp<MaintenanceRecord>>(`/api/maintenance-records?${params.toString()}`);
}

/**
 * Get a maintenance record by ID
 */
export async function getMaintenanceRecord(id: string) {
  return api<MaintenanceRecord>(`/api/maintenance-records/${id}`);
}

/**
 * Get maintenance record by inspection ID
 */
export async function getMaintenanceRecordByInspection(inspectionId: string) {
  return api<MaintenanceRecord>(`/api/maintenance-records/inspection/${inspectionId}`);
}

/**
 * Get all maintenance records for a transformer
 */
export async function getMaintenanceRecordsByTransformer(transformerId: string) {
  return api<MaintenanceRecord[]>(`/api/maintenance-records/transformer/${transformerId}`);
}

/**
 * Create a new maintenance record from an inspection
 */
export async function createMaintenanceRecord(body: CreateMaintenanceRecordRequest) {
  return api<MaintenanceRecord>(`/api/maintenance-records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/**
 * Update a maintenance record (DRAFT only)
 */
export async function updateMaintenanceRecord(id: string, body: UpdateMaintenanceRecordRequest) {
  return api<MaintenanceRecord>(`/api/maintenance-records/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/**
 * Finalize a maintenance record (make it read-only)
 */
export async function finalizeMaintenanceRecord(id: string, finalizedBy: string) {
  return api<MaintenanceRecord>(`/api/maintenance-records/${id}/finalize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ finalizedBy }),
  });
}

/**
 * Delete a maintenance record (DRAFT only)
 */
export async function deleteMaintenanceRecord(id: string) {
  return api<void>(`/api/maintenance-records/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Sync anomalies with current annotations from the inspection
 * This updates the maintenance record with the latest annotations
 */
export async function syncAnomalies(id: string) {
  return api<MaintenanceRecord>(`/api/maintenance-records/${id}/sync-anomalies`, {
    method: 'POST',
  });
}
