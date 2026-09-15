package com.transcendance.backend.undercover.entity.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.transcendance.backend.undercover.entity.UndercoverVoteEntity;

@Repository
public interface UndercoverVoteRepository extends JpaRepository<UndercoverVoteEntity, Long> {

        /**
         * The votes cast in one round, target included.
         *
         * Fetched with their target: the caller tallies them, and a lazy read per
         * vote would mean a query per voter.
         */
        @Query("SELECT v FROM UndercoverVoteEntity v JOIN FETCH v.target "
                        + "WHERE v.match.undercoverMatchId = :matchId AND v.round = :round")
        List<UndercoverVoteEntity> findRound(Long matchId, int round);

        /**
         * How many players have voted this round, to tell a complete vote from one
         * still waiting on someone.
         */
        @Query("SELECT COUNT(v) FROM UndercoverVoteEntity v "
                        + "WHERE v.match.undercoverMatchId = :matchId AND v.round = :round")
        long countRound(Long matchId, int round);

        @Query("SELECT COUNT(v) > 0 FROM UndercoverVoteEntity v "
                        + "WHERE v.match.undercoverMatchId = :matchId AND v.round = :round "
                        + "AND v.voter.id = :participantId")
        boolean hasVoted(Long matchId, int round, Long participantId);
}
