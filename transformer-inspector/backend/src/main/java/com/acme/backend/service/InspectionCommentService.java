package com.acme.backend.service;

import com.acme.backend.api.dto.CreateInspectionCommentRequest;
import com.acme.backend.api.dto.InspectionCommentDTO;
import com.acme.backend.domain.Inspection;
import com.acme.backend.domain.InspectionComment;
import com.acme.backend.repo.InspectionCommentRepo;
import com.acme.backend.repo.InspectionRepo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class InspectionCommentService {

    private static final Logger log = LoggerFactory.getLogger(InspectionCommentService.class);

    private final InspectionCommentRepo commentRepo;
    private final InspectionRepo inspectionRepo;

    public InspectionCommentService(InspectionCommentRepo commentRepo, InspectionRepo inspectionRepo) {
        this.commentRepo = commentRepo;
        this.inspectionRepo = inspectionRepo;
    }

    /**
     * Add a new comment to an inspection
     */
    public InspectionCommentDTO addComment(CreateInspectionCommentRequest request) {
        log.info("Adding comment to inspection: {}", request.inspectionId());

        // Validate that inspection exists
        Inspection inspection = inspectionRepo.findById(request.inspectionId())
                .orElseThrow(() -> new RuntimeException("Inspection not found with ID: " + request.inspectionId()));

        // Create new comment
        InspectionComment comment = new InspectionComment(
                inspection,
                request.commentText().trim(),
                request.author().trim()
        );

        // Save comment
        InspectionComment savedComment = commentRepo.save(comment);
        log.info("Comment added successfully with ID: {}", savedComment.getId());

        return toDTO(savedComment);
    }

    /**
     * Get all comments for an inspection
     */
    @Transactional(readOnly = true)
    public List<InspectionCommentDTO> getCommentsByInspection(UUID inspectionId) {
        log.info("Fetching comments for inspection: {}", inspectionId);

        List<InspectionComment> comments = commentRepo.findByInspectionIdOrderByCreatedAtDesc(inspectionId);
        return comments.stream().map(this::toDTO).toList();
    }

    /**
     * Delete a comment (optional - for admin use)
     */
    public void deleteComment(UUID commentId) {
        log.info("Deleting comment: {}", commentId);

        if (!commentRepo.existsById(commentId)) {
            throw new RuntimeException("Comment not found with ID: " + commentId);
        }

        commentRepo.deleteById(commentId);
        log.info("Comment deleted successfully: {}", commentId);
    }

    /**
     * Get comment count for an inspection
     */
    @Transactional(readOnly = true)
    public long getCommentCount(UUID inspectionId) {
        return commentRepo.countByInspectionId(inspectionId);
    }

    /**
     * Convert entity to DTO
     */
    private InspectionCommentDTO toDTO(InspectionComment comment) {
        return new InspectionCommentDTO(
                comment.getId(),
                comment.getInspection().getId(),
                comment.getCommentText(),
                comment.getAuthor(),
                comment.getCreatedAt(),
                comment.getUpdatedAt()
        );
    }
}