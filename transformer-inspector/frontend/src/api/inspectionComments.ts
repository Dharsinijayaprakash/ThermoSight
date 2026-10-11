// src/api/inspectionComments.ts
import { api } from './client';

export type InspectionComment = {
  id: string;
  inspectionId: string;
  commentText: string;
  author: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateCommentRequest = {
  inspectionId: string;
  commentText: string;
  author: string;
};

// Add a new comment to an inspection
export async function addInspectionComment(request: CreateCommentRequest) {
  return api<InspectionComment>('/api/inspection-comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
}

// Get all comments for an inspection
export async function getInspectionComments(inspectionId: string) {
  return api<InspectionComment[]>(`/api/inspection-comments/inspection/${inspectionId}`);
}

// Delete a comment (optional)
export async function deleteInspectionComment(commentId: string) {
  return api<void>(`/api/inspection-comments/${commentId}`, {
    method: 'DELETE',
  });
}

// Get comment count for an inspection
export async function getInspectionCommentCount(inspectionId: string) {
  return api<number>(`/api/inspection-comments/inspection/${inspectionId}/count`);
}