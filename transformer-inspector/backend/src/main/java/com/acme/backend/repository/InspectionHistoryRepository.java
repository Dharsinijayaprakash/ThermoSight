package com.acme.backend.repository;

import com.acme.backend.api.dto.InspectionHistoryDTO;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import org.springframework.beans.factory.annotation.Autowired;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository for inspection history operations
 */
@Repository
public class InspectionHistoryRepository {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final RowMapper<InspectionHistoryDTO> historyMapper = new RowMapper<InspectionHistoryDTO>() {
        @Override
        public InspectionHistoryDTO mapRow(ResultSet rs, int rowNum) throws SQLException {
            return new InspectionHistoryDTO(
                rs.getString("id"),
                rs.getString("inspection_id_hex"),
                rs.getString("inspection_number"),
                rs.getObject("box_number", Integer.class),
                rs.getString("action_type"),
                rs.getString("action_description"),
                rs.getString("user_name"),
                rs.getString("previous_data"),
                rs.getString("new_data"),
                rs.getTimestamp("created_at").toLocalDateTime(),
                rs.getString("inspection_status"),
                rs.getString("current_inspector")
            );
        }
    };

    /**
     * Insert a new history record
     */
    public void insertHistoryRecord(String inspectionId, Integer boxNumber, String actionType,
                                  String description, String userName, String previousData, String newData) {
        String sql = """
            INSERT INTO inspection_history (
                id, inspection_id, box_number, action_type, action_description,
                user_name, previous_data, new_data, created_at
            ) VALUES (
                UNHEX(REPLACE(UUID(), '-', '')),
                UNHEX(REPLACE(?, '-', '')),
                ?, ?, ?, ?, ?, ?, NOW()
            )
            """;
        
        jdbcTemplate.update(sql, inspectionId, boxNumber, actionType, description, 
                          userName, previousData, newData);
    }

    /**
     * Get complete history for an inspection (ordered by newest first)
     */
    public List<InspectionHistoryDTO> findHistoryByInspectionId(String inspectionId) {
        String sql = """
            SELECT 
                HEX(h.id) as id,
                h.inspection_id_hex,
                h.inspection_number,
                h.box_number,
                h.action_type,
                h.action_description,
                h.user_name,
                h.previous_data,
                h.new_data,
                h.created_at,
                h.inspection_status,
                h.current_inspector
            FROM inspection_history_view h
            WHERE h.inspection_id_hex = ?
            ORDER BY h.created_at DESC
            """;
        
        return jdbcTemplate.query(sql, historyMapper, inspectionId.replace("-", "").toUpperCase());
    }

    /**
     * Get recent history (limited) for an inspection
     */
    public List<InspectionHistoryDTO> findRecentHistoryByInspectionId(String inspectionId, int limit) {
        String sql = """
            SELECT 
                HEX(h.id) as id,
                h.inspection_id_hex,
                h.inspection_number,
                h.box_number,
                h.action_type,
                h.action_description,
                h.user_name,
                NULL as previous_data,
                NULL as new_data,
                h.created_at,
                h.inspection_status,
                h.current_inspector
            FROM inspection_history_view h
            WHERE h.inspection_id_hex = ?
            ORDER BY h.created_at DESC
            LIMIT ?
            """;
        
        return jdbcTemplate.query(sql, historyMapper, 
                                inspectionId.replace("-", "").toUpperCase(), limit);
    }

    /**
     * Get history for a specific box number
     */
    public List<InspectionHistoryDTO> findHistoryByInspectionIdAndBoxNumber(String inspectionId, Integer boxNumber) {
        String sql = """
            SELECT 
                HEX(h.id) as id,
                h.inspection_id_hex,
                h.inspection_number,
                h.box_number,
                h.action_type,
                h.action_description,
                h.user_name,
                h.previous_data,
                h.new_data,
                h.created_at,
                h.inspection_status,
                h.current_inspector
            FROM inspection_history_view h
            WHERE h.inspection_id_hex = ? AND h.box_number = ?
            ORDER BY h.created_at DESC
            """;
        
        return jdbcTemplate.query(sql, historyMapper, 
                                inspectionId.replace("-", "").toUpperCase(), boxNumber);
    }

    /**
     * Get action counts by type for an inspection
     */
    public java.util.Map<String, Integer> getActionCountsByType(String inspectionId) {
        String sql = """
            SELECT action_type, COUNT(*) as count
            FROM inspection_history_view
            WHERE inspection_id_hex = ?
            GROUP BY action_type
            ORDER BY count DESC
            """;
        
        java.util.Map<String, Integer> results = new java.util.HashMap<>();
        jdbcTemplate.query(sql, rs -> {
            results.put(rs.getString("action_type"), rs.getInt("count"));
        }, inspectionId.replace("-", "").toUpperCase());
        
        return results;
    }

    /**
     * Get action counts by user for an inspection
     */
    public java.util.Map<String, Integer> getActionCountsByUser(String inspectionId) {
        String sql = """
            SELECT user_name, COUNT(*) as count
            FROM inspection_history_view
            WHERE inspection_id_hex = ?
            GROUP BY user_name
            ORDER BY count DESC
            """;
        
        java.util.Map<String, Integer> results = new java.util.HashMap<>();
        jdbcTemplate.query(sql, rs -> {
            results.put(rs.getString("user_name"), rs.getInt("count"));
        }, inspectionId.replace("-", "").toUpperCase());
        
        return results;
    }

    /**
     * Get list of contributing inspectors for an inspection
     */
    public List<String> getContributingInspectors(String inspectionId) {
        String sql = """
            SELECT DISTINCT user_name
            FROM inspection_history_view
            WHERE inspection_id_hex = ?
            ORDER BY user_name
            """;
        
        return jdbcTemplate.queryForList(sql, String.class, 
                                       inspectionId.replace("-", "").toUpperCase());
    }
}