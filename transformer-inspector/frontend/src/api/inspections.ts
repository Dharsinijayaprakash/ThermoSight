// src/api/inspections.ts
import { api } from './client';

export type Inspection = {
  id: string;
  inspectionNumber: string;  // Updated field name
  transformerId: string;
  transformerCode?: string;
  branch?: string;
  baselineImageId?: string | null;
  baselineImageUrl?: string | null;
  inspectionImageId?: string | null;
  inspectionImageUrl?: string | null;
  originalInspectionImageId?: string | null;
  originalInspectionImageUrl?: string | null;
  weatherCondition?: 'SUNNY' | 'CLOUDY' | 'RAINY' | null;
  status: 'DRAFT' | 'IN_PROGRESS' | 'UNDER_REVIEW' | 'COMPLETED' | 'CANCELLED';
  notes?: string | null;
  inspectedAt?: string | null;
  inspectedBy?: string | null;
  inspector?: {
    id: string;
    name: string;
  } | null;
  maintenanceDate?: string | null;
  annotationCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type PageResp<T> = {
  content: T[];
  totalElements: number;
  totalPages?: number;
  number?: number;
  size?: number;
};

export type CreateInspectionBody = {
  inspectionNumber: string;
  transformerId: string;
  weatherCondition?: 'SUNNY' | 'CLOUDY' | 'RAINY';
  inspectedBy?: string;
  notes?: string;
};

export async function listInspections(q = '', transformerId = '', page = 0, size = 10) {
  const params = new URLSearchParams({ q, page: String(page), size: String(size) });
  if (transformerId) params.set('transformerId', transformerId);
  return api<PageResp<Inspection>>(`/api/inspections?${params.toString()}`);
}

export async function getInspection(id: string) {
  return api<Inspection>(`/api/inspections/${id}`);
}

export async function createInspection(body: CreateInspectionBody) {
  return api<Inspection>(`/api/inspections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function updateInspection(id: string, body: CreateInspectionBody) {
  return api<Inspection>(`/api/inspections/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function updateInspectionStatus(id: string, status: 'DRAFT' | 'IN_PROGRESS' | 'UNDER_REVIEW' | 'COMPLETED' | 'CANCELLED') {
  return api<Inspection>(`/api/inspections/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

export async function updateInspectionNotes(id: string, notes: string) {
  return api<Inspection>(`/api/inspections/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
}

export async function uploadInspectionImage(id: string, imageId: string) {
  return api<Inspection>(`/api/inspections/${id}/upload-image?imageId=${imageId}`, {
    method: 'POST',
  });
}

export async function uploadAnnotatedImage(id: string, imageId: string) {
  return api<Inspection>(`/api/inspections/${id}/upload-annotated-image?imageId=${imageId}`, {
    method: 'POST',
  });
}

export async function removeInspectionImage(id: string) {
  return api<Inspection>(`/api/inspections/${id}/inspection-image`, {
    method: 'DELETE',
  });
}

export async function detectAnomalies(id: string, confidenceThreshold: number = 0.25) {
  return api<{ 
    success: boolean;
    detections: Array<{
      id: string;
      classId: number;
      className: string;
      confidence: number;
      bbox: {x1: number; y1: number; x2: number; y2: number};
      color: number[];
      source: string;
    }>;
    imageDimensions?: {width: number; height: number};
    inferenceTimeMs?: number;
    error?: string;
  }>(`/api/inspections/${id}/detect-anomalies?confidenceThreshold=${confidenceThreshold}`, {
    method: 'POST',
  });
}

export async function deleteInspection(id: string) {
  return api<void>(`/api/inspections/${id}`, { method: 'DELETE' });
}
