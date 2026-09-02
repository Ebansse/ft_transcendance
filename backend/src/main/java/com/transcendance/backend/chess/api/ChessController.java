package com.transcendance.backend.chess.api;

import java.util.Map;
import java.util.UUID;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.transcendance.backend.chess.api.dto.ChessMatchDto;
import com.transcendance.backend.chess.api.dto.ChessMoveRequestDto;
import com.transcendance.backend.chess.application.ChessGameService;
import com.transcendance.backend.chess.application.ChessPlayerChannel;
import com.transcendance.backend.chess.persistence.entity.ChessMatchEntity;
import com.transcendance.backend.model.User;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@RequestMapping("/api/chess")
@RestController
public class ChessController {

    private static final Logger log = LogManager.getLogger(ChessController.class);

    private final ChessGameService chessGameService;
    private final ChessPlayerChannel playerChannel;

    @PostMapping("/matches/{matchId}/moves")
    public ResponseEntity<?> playMove(@AuthenticationPrincipal User user,
            @PathVariable long matchId,
            @Valid @RequestBody ChessMoveRequestDto request,
            BindingResult bindingResult) {

        if (user == null) {
            log.warn("Chess move refused on match {}: no authenticated user", matchId);
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }

        if (bindingResult.hasErrors()) {
            String reason = bindingResult.getFieldErrors().stream()
                    .findFirst()
                    .map(error -> error.getField() + ": " + error.getDefaultMessage())
                    .orElse("Invalid request");
            log.warn("Chess move refused for {} on match {}: {}", user.getUserName(), matchId, reason);
            return ResponseEntity.badRequest().body(Map.of("error", reason));
        }

        ChessMatchEntity match = chessGameService.playMove(
                matchId, user.getIdUser(), request.getMove());

        notifyOpponent(match, user.getIdUser(), request.getMove());

        return ResponseEntity.ok(ChessMatchDto.of(match));
    }

    /**
     * Pushed once the move is committed, so the opponent never learns about a
     * move that a rollback would have taken back.
     *
     * Stays silent when the opponent is a bot, which has no session to push to.
     */
    private void notifyOpponent(ChessMatchEntity match, UUID moverId, String move) {
        UUID opponentId = moverId.equals(match.getWhitePlayerId())
                ? match.getBlackPlayerId()
                : match.getWhitePlayerId();

        if (opponentId != null) {
            playerChannel.movePlayed(opponentId, match, move);
        }
    }
}
