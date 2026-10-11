// src/api/transformers.ts
import { api } from './client';

export type Transformer = {
  id: string;
  code: string;                 // Transformer No.
  location: string;
  capacityKVA: number;
  region?: string | null;
  poleNo?: string | null;
  type?: string | null;         // "Bulk" | "Distribution" | etc.
  locationDetails?: string | null;
  createdAt: string;
};

export type PageResp<T> = {
  content: T[];
  totalElements: number;
  totalPages?: number;
  number?: number;
  size?: number;
};

export async function listTransformers(q = '', page = 0, size = 10) {
  const qs = new URLSearchParams({ q, page: String(page), size: String(size) }).toString();
  return api<PageResp<Transformer>>(`/api/transformers?${qs}`);
}

export async function getTransformer(id: string) {
  return api<Transformer>(`/api/transformers/${id}`);
}

type UpsertTransformerBody = {
  code: string;
  location: string;
  capacityKVA: number;
  region?: string;
  poleNo?: string;
  type?: string;
  locationDetails?: string;
};

export async function createTransformer(body: UpsertTransformerBody) {
  return api<Transformer>(`/api/transformers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function updateTransformer(id: string, body: UpsertTransformerBody) {
  return api<Transformer>(`/api/transformers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function deleteTransformer(id: string) {
  return api<void>(`/api/transformers/${id}`, { method: 'DELETE' });
}