package com.transcendance.backend.chess.application;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;

import com.transcendance.backend.chess.domain.ChessException;
import com.transcendance.backend.chess.persistence.entity.ChessMatchEntity;
import com.transcendance.backend.chess.persistence.repository.ChessMatchEntityRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ChessDisconnectionService {

    private static final Logger log = LogManager.getLogger(ChessDisconnectionService.class);

    private final ChessMatchEntityRepository chessMatchRepository;
    private final ChessGameService chessGameService;
    private final ChessPlayerChannel playerChannel;
    private final TaskScheduler taskScheduler;

    /**
     * How long a player may stay away before his match is given to his opponent.
     */
    @Value("${app.chess.disconnect-grace-seconds:60}")
    private long graceSeconds;

    /**
     * Called when a player drops his connection. If he does not come back within
     * the grace period, he will forfeit the match.
     * 
     * @param userId
     */
    public void playerDisconnected(UUID userId) {
        chessMatchRepository.findActiveMatchId(userId).ifPresent(matchId -> {
            log.info("Chess player {} dropped his connection during match {}, {}s to come back",
                    userId, matchId, graceSeconds);

            taskScheduler.schedule(
                    () -> forfeitIfStillAway(matchId, userId),
                    Instant.now().plus(Duration.ofSeconds(graceSeconds)));
        });
    }

    /**
     * The verdict, taken once the grace period has elapsed.
     *
     * Everything is caught: an exception thrown from a scheduled task is
     * swallowed by the scheduler, and would leave no trace at all.
     */
    private void forfeitIfStillAway(long matchId, UUID userId) {
        try {
            if (playerChannel.isOnline(userId)) {
                log.info("Chess player {} came back before the deadline, match {} goes on", userId, matchId);
                return;
            }

            // No status pre-check here: resignMatch reads it inside its own
            // transaction and refuses an already decided match itself, which no
            // check made from out here could do without racing the other player.
            ChessMatchEntity match = chessGameService.resignMatch(matchId, userId);

            log.info("Chess match {} forfeited: player {} stayed away for {}s", matchId, userId, graceSeconds);

            notifyOpponent(match, userId);
        } catch (ChessException e) {
            log.info("Chess match {} needed no forfeit for {}: {}", matchId, userId, e.getMessage());
        } catch (Exception e) {
            log.error("Chess forfeit failed for player {} on match {}", userId, matchId, e);
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
