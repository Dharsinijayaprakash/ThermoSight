// src/components/CommentsSection.tsx
import { useState, useEffect } from 'react';
import { addInspectionComment, getInspectionComments } from '../api/inspectionComments';
import type { InspectionComment } from '../api/inspectionComments';

interface CommentsSectionProps {
  inspectionId: string;
}

export default function CommentsSection({ inspectionId }: CommentsSectionProps) {
  const [comments, setComments] = useState<InspectionComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [author, setAuthor] = useState('admin'); // Default author - could come from auth context
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load comments on component mount
  useEffect(() => {
    loadComments();
  }, [inspectionId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const commentsData = await getInspectionComments(inspectionId);
      setComments(commentsData);
    } catch (e: any) {
      setLoadError(e?.message || 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) {
      setSubmitError('Please enter a comment');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      
      await addInspectionComment({
        inspectionId,
        commentText: newComment.trim(),
        author: author.trim()
      });
      
      setNewComment('');
      await loadComments(); // Reload comments
    } catch (e: any) {
      setSubmitError(e?.message || 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInHours / 24);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      padding: '20px',
      marginTop: '16px',
      border: '1px solid #e5e7eb',
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <h3 style={{ 
        margin: '0 0 16px 0', 
        fontSize: '18px', 
        fontWeight: '600', 
        color: '#374151',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexShrink: 0
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
        Comments ({comments.length})
      </h3>

      {/* Add New Comment Form */}
      <form onSubmit={handleSubmitComment} style={{ marginBottom: '16px', flexShrink: 0 }}>
        <div style={{ marginBottom: '8px' }}>
          <input
            type="text"
            placeholder="Your name"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            style={{
              width: '200px',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              marginBottom: '8px'
            }}
          />
        </div>
        <textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            lineHeight: '1.5',
            resize: 'vertical',
            fontFamily: 'inherit'
          }}
        />
        
        {submitError && (
          <div style={{ 
            marginTop: '8px', 
            color: '#dc2626', 
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            {submitError}
          </div>
        )}
        
        <div style={{ marginTop: '12px' }}>
          <button
            type="submit"
            disabled={isSubmitting || !newComment.trim()}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: 'none',
              background: (isSubmitting || !newComment.trim()) ? '#9ca3af' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: (isSubmitting || !newComment.trim()) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {isSubmitting ? (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg> Adding...</>
            ) : (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> Add Comment</>
            )}
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        minHeight: 0,
        paddingRight: '4px'
      }}>
        {loading && (
          <div style={{ 
            textAlign: 'center', 
            color: '#6b7280', 
            fontSize: '14px',
            padding: '20px'
          }}>
            Loading comments...
          </div>
        )}
        
        {loadError && (
          <div style={{ 
            color: '#dc2626', 
            fontSize: '14px',
            padding: '12px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px'
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: '6px', verticalAlign: 'middle' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </span>
            {loadError}
          </div>
        )}
        
        {!loading && !loadError && comments.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            color: '#6b7280', 
            fontSize: '14px',
            padding: '40px 20px',
            fontStyle: 'italic'
          }}>
            No comments yet. Be the first to add a comment!
          </div>
        )}
        
        {comments.map((comment) => (
          <div
            key={comment.id}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '12px',
              background: '#f9fafb'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{
                  fontWeight: '600',
                  color: '#1f2937',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  {comment.author}
                </span>
                <span style={{
                  color: '#6b7280',
                  fontSize: '12px'
                }}>
                  {getTimeAgo(comment.createdAt)}
                </span>
              </div>
              <span style={{
                color: '#9ca3af',
                fontSize: '11px'
              }}>
                {formatDateTime(comment.createdAt)}
              </span>
            </div>
            <div style={{
              color: '#374151',
              fontSize: '14px',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap'
            }}>
              {comment.commentText}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}