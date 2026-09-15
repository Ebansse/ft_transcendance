package com.transcendance.backend.undercover.entity.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.transcendance.backend.undercover.entity.UndercoverMatchEntity;

@Repository
public interface UndercoverMatchRepository extends JpaRepository<UndercoverMatchEntity, Long> {

    @Query("SELECT COUNT(m) > 0 FROM UndercoverMatchEntity m JOIN m.participants p "
            + "WHERE p.player.userId = :userId AND m.status = IN_PROGRESS")
    boolean existsActiveMatch(UUID userId);

    @Query("SELECT m FROM UndercoverMatchEntity m JOIN m.participants p "
            + "WHERE p.player.userId = :userId AND m.status = IN_PROGRESS")
    Optional<UndercoverMatchEntity> findActiveMatch(UUID userId);

    /**
     * The match with its participants and their players already loaded.
     *
     * Every turn of play reads the whole table - who speaks next, who is still
     * alive, who voted - so the alternative is a query per participant.
     */
    @Query("SELECT m FROM UndercoverMatchEntity m "
            + "LEFT JOIN FETCH m.participants p LEFT JOIN FETCH p.player "
            + "WHERE m.undercoverMatchId = :matchId")
    Optional<UndercoverMatchEntity> findByIdWithParticipants(Long matchId);

    /**
     * Matches whose current phase has run out of time.
     *
     * Touches no association, so the rows stay readable once detached - this
     * is meant for a scheduled task, which has no session bound to it.
     */
    @Query("SELECT m FROM UndercoverMatchEntity m "
            + "WHERE m.status = IN_PROGRESS AND m.phaseDeadline IS NOT NULL AND m.phaseDeadline <= :now")
    List<UndercoverMatchEntity> findExpiredPhases(Instant now);

    /**
     * The matches this user has finished, most recent first.
     */
    @Query("SELECT DISTINCT m FROM UndercoverMatchEntity m "
            + "LEFT JOIN FETCH m.participants p LEFT JOIN FETCH p.player "
            + "WHERE EXISTS (SELECT 1 FROM UndercoverParticipantEntity q "
            + "WHERE q.match = m AND q.player.userId = :userId) "
            + "AND m.status <> IN_PROGRESS ORDER BY m.endedAt DESC")
    List<UndercoverMatchEntity> findFinishedMatches(UUID userId);
}
