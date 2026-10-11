// src/api/images.ts
import { api } from './client';

export type ImageType = 'BASELINE' | 'MAINTENANCE' | 'INSPECTION';
export type EnvCondition = 'SUNNY' | 'CLOUDY' | 'RAINY';

export type ThermalImage = {
  id: string;
  transformerId: string;
  inspectionId?: string | null;
  type: ImageType;
  envCondition?: EnvCondition;
  uploader: string;
  uploadedAt: string;       // ISO string
  publicUrl: string;
  originalFilename: string;
  sizeBytes: number;
  contentType: string;
};

export type PageResp<T> = {
  content: T[];
  totalElements: number;
  totalPages?: number;
  number?: number;
  size?: number;
};

// ---- helpers --------------------------------------------------------------

function qs(params: Record<string, string | number | undefined | null>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

// ---- API ------------------------------------------------------------------

/** Upload a thermal image. Do NOT set Content-Type; the browser sets it for FormData. */
export async function uploadImage(params: {
  transformerId: string;
  type: ImageType;
  uploader: string;
  file: File;
  envCondition?: EnvCondition; // required when type === 'BASELINE'
  inspectionId?: string; // required when type === 'INSPECTION'
}) {
  const fd = new FormData();
  fd.set('transformerId', params.transformerId);
  fd.set('type', params.type);
  if (params.type === 'BASELINE' && params.envCondition) {
    fd.set('envCondition', params.envCondition);
  }
  if (params.type === 'INSPECTION' && params.inspectionId) {
    fd.set('inspectionId', params.inspectionId);
  }
  fd.set('uploader', params.uploader);
  fd.set('file', params.file);

  return api<ThermalImage>('/api/images', { method: 'POST', body: fd });
}

/** List images; supports filtering by transformerId and/or type. */
export async function listImages(params: {
  transformerId?: string;
  inspectionId?: string;
  type?: ImageType;
  page?: number;
  size?: number;
} = {}) {
  const query = qs({
    transformerId: params.transformerId,
    inspectionId: params.inspectionId,
    type: params.type,
    page: params.page ?? 0,
    size: params.size ?? 20,
  });
  return api<PageResp<ThermalImage>>(`/api/images${query}`);
}

/** Convenience helper used by the detail page if you want the latest pair. */
export async function getLatestForTransformer(transformerId: string) {
  const page = await listImages({ transformerId, page: 0, size: 200 });
  const sorted = [...(page.content ?? [])].sort(
    (a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt)
  );
  const latestBaseline = sorted.find(i => i.type === 'BASELINE') ?? null;
  const latestMaintenance = sorted.find(i => i.type === 'MAINTENANCE') ?? null;

  const pair: [ThermalImage | null, ThermalImage | null] =
    latestBaseline && latestMaintenance
      ? [latestBaseline, latestMaintenance]
      : (latestBaseline || latestMaintenance)
      ? [latestBaseline || latestMaintenance, latestBaseline || latestMaintenance]
      : [null, null];

  return { latestBaseline, latestMaintenance, pair, all: sorted };
}