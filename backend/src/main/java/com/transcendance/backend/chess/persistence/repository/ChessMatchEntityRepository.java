package com.transcendance.backend.chess.persistence.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.transcendance.backend.chess.persistence.entity.ChessMatchEntity;

@Repository
public interface ChessMatchEntityRepository extends JpaRepository<ChessMatchEntity, Long> {

        @Query("SELECT COUNT(m) > 0 FROM ChessMatchEntity m LEFT JOIN m.whitePlayer w LEFT JOIN m.blackPlayer b "
                        + "WHERE (w.userId = :userId OR b.userId = :userId) AND m.status = IN_PROGRESS")
        boolean existsActiveMatch(UUID userId);

        @Query("SELECT m FROM ChessMatchEntity m LEFT JOIN m.whitePlayer w LEFT JOIN m.blackPlayer b "
                        + "WHERE (w.userId = :userId OR b.userId = :userId) AND m.status = IN_PROGRESS")
        Optional<ChessMatchEntity> findByUserId(UUID userId);

        /**
         * Same match as findByUserId, reduced to its id.
         *
         * Meant for callers running outside a web request - a scheduled task, a
         * WebSocket event - where the entity would come back detached and its two
         * lazy player associations could no longer be read.
         */
        @Query("SELECT m.chessMatchId FROM ChessMatchEntity m LEFT JOIN m.whitePlayer w LEFT JOIN m.blackPlayer b "
                        + "WHERE (w.userId = :userId OR b.userId = :userId) AND m.status = IN_PROGRESS")
        Optional<Long> findActiveMatchId(UUID userId);
}
