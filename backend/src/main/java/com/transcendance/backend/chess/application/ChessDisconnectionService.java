package com.transcendance.backend.chess.application;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.transcendance.backend.chess.domain.ChessException;
import com.transcendance.backend.chess.persistence.entity.ChessMatchEntity;
import com.transcendance.backend.chess.persistence.repository.ChessMatchEntityRepository;

import lombok.RequiredArgsConstructor;

/**
 * Gives a player who lost his connection a chance to come back, and hands the
 * match to his opponent when he does not.
 *
 * The countdown lives in the database rather than in a scheduled task: a
 * restart in the middle of it would otherwise forget the match was at stake,
 * leaving it IN_PROGRESS for good - and existsActiveMatch would then keep both
 * players from ever starting another one.
 */
@Service
@RequiredArgsConstructor
public class ChessDisconnectionService {

    private static final Logger log = LogManager.getLogger(ChessDisconnectionService.class);

    private final ChessMatchEntityRepository chessMatchRepository;
    private final ChessGameService chessGameService;
    private final ChessPlayerChannel playerChannel;

    /**
     * How long a player may stay away before his match is given to his opponent.
     */
    @Value("${app.chess.disconnect-grace-seconds:60}")
    private long graceSeconds;

    /**
     * Called when a player drops his connection. If he does not come back within
     * the grace period, he will forfeit the match.
     *
     * @param userId the player who just went away
     */
    public void playerDisconnected(UUID userId) {
        chessGameService.armForfeit(userId, Duration.ofSeconds(graceSeconds))
                .ifPresent(matchId -> log.info(
                        "Chess player {} dropped his connection during match {}, {}s to come back",
                        userId, matchId, graceSeconds));
    }

    /**
     * Settles every countdown that has run out.
     *
     * Runs often enough that the verdict lands within a few seconds of the
     * deadline, and cheaply: the query only ever returns matches with a deadline
     * already behind us, which is nearly always none.
     */
    @Scheduled(fixedRate = 5_000)
    public void settleExpiredForfeits() {
        for (ChessMatchEntity match : chessMatchRepository.findExpiredForfeits(Instant.now())) {
            settle(match.getChessMatchId(), match.getAwayPlayerId());
        }
    }

    /**
     * The verdict for one match.
     *
     * Everything is caught: an exception thrown from a scheduled task is
     * swallowed by the scheduler, and one broken match must not stop the others
     * from being settled.
     */
    private void settle(long matchId, UUID awayUserId) {
        try {
            if (playerChannel.isOnline(awayUserId)) {
                log.info("Chess player {} came back before the deadline, match {} goes on", awayUserId, matchId);
                chessGameService.cancelForfeit(matchId);
                return;
            }

            // No status pre-check here: resignMatch reads it inside its own
            // transaction and refuses an already decided match itself, which no
            // check made from out here could do without racing the other player.
            ChessMatchEntity match = chessGameService.resignMatch(matchId, awayUserId);

            log.info("Chess match {} forfeited: player {} stayed away for {}s", matchId, awayUserId, graceSeconds);

            notifyOpponent(match, awayUserId);

        } catch (ChessException e) {
            log.info("Chess match {} needed no forfeit for {}: {}", matchId, awayUserId, e.getMessage());
        } catch (Exception e) {
            log.error("Chess forfeit failed for player {} on match {}", awayUserId, matchId, e);
        }
    }

    /**
     * Tells the player who stayed that he has just won. Nobody else is going to:
     * the loser has no session left, and no move was played that his board could
     * have deduced the ending from.
     *
     * Stays silent when the other side is a bot, which has no session to push to.
     */
    private void notifyOpponent(ChessMatchEntity match, UUID absentUserId) {
        UUID opponentId = match.opponentOf(absentUserId);

        if (opponentId != null) {
            playerChannel.matchEnded(opponentId, match);
        }
    }
}
