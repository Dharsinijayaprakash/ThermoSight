package com.acme.backend.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * Repository for managing box numbering sequences
 */
@Repository
public class BoxNumberingSequenceRepository {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    /**
     * Get the next box number for an inspection
     */
    public Integer getNextBoxNumber(String inspectionId) {
        String sql = """
            SELECT next_box_number 
            FROM box_numbering_sequence 
            WHERE inspection_id = UNHEX(REPLACE(?, '-', ''))
            """;
        
        try {
            return jdbcTemplate.queryForObject(sql, Integer.class, inspectionId);
        } catch (Exception e) {
            // If no sequence exists, return null
            return null;
        }
    }

    /**
     * Initialize box numbering sequence for a new inspection
     */
    public void initializeSequence(String inspectionId, int startingNumber) {
        String sql = """
            INSERT INTO box_numbering_sequence (inspection_id, next_box_number, last_updated_at)
            VALUES (UNHEX(REPLACE(?, '-', '')), ?, NOW())
            ON DUPLICATE KEY UPDATE 
                next_box_number = VALUES(next_box_number),
                last_updated_at = NOW()
            """;
        
        jdbcTemplate.update(sql, inspectionId, startingNumber);
    }

    /**
     * Update the next box number for an inspection
     */
    public void updateNextBoxNumber(String inspectionId, int nextNumber) {
        String sql = """
            UPDATE box_numbering_sequence 
            SET next_box_number = ?, last_updated_at = NOW()
            WHERE inspection_id = UNHEX(REPLACE(?, '-', ''))
            """;
        
        jdbcTemplate.update(sql, nextNumber, inspectionId);
    }

    /**
     * Get the highest box number currently used in an inspection
     */
    public Integer getMaxBoxNumber(String inspectionId) {
        String sql = """
            SELECT COALESCE(MAX(box_number), 0) as max_number
            FROM annotations 
            WHERE inspection_id = UNHEX(REPLACE(?, '-', '')) 
            AND is_active = 1 
            AND box_number IS NOT NULL
            """;
        
        try {
            return jdbcTemplate.queryForObject(sql, Integer.class, inspectionId);
        } catch (Exception e) {
            return 0;
        }
    }

    /**
     * Reset sequence based on existing annotations (repair function)
     */
    public void repairSequence(String inspectionId) {
        Integer maxBoxNumber = getMaxBoxNumber(inspectionId);
        int nextNumber = (maxBoxNumber != null ? maxBoxNumber : 0) + 1;
        
        // Delete existing sequence and recreate
        String deleteSql = """
            DELETE FROM box_numbering_sequence 
            WHERE inspection_id = UNHEX(REPLACE(?, '-', ''))
            """;
        jdbcTemplate.update(deleteSql, inspectionId);
        
        // Initialize with correct next number
        initializeSequence(inspectionId, nextNumber);
    }

    /**
     * Check if sequence exists for inspection
     */
    public boolean sequenceExists(String inspectionId) {
        String sql = """
            SELECT COUNT(*) 
            FROM box_numbering_sequence 
            WHERE inspection_id = UNHEX(REPLACE(?, '-', ''))
            """;
        
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, inspectionId);
        return count != null && count > 0;
    }
}