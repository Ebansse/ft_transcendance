package com.transcendance.backend.chess.api;

import java.util.Map;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.transcendance.backend.chess.api.dto.ChessInvitationDto;
import com.transcendance.backend.chess.api.dto.ChessInviteRequestDto;
import com.transcendance.backend.chess.application.ChessInvitationService;
import com.transcendance.backend.chess.domain.ChessInvitation;
import com.transcendance.backend.chess.domain.ChessInvitationState;
import com.transcendance.backend.model.User;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/chess/invitations")
public class ChessInvitationController {

    private static final Logger log = LogManager.getLogger(ChessInvitationController.class);

    private final ChessInvitationService chessInvitationService;

    @PostMapping
    public ResponseEntity<?> sendInvitation(@AuthenticationPrincipal User user,
            @Valid @RequestBody ChessInviteRequestDto request,
            BindingResult bindingResult) {

        if (user == null) {
            log.warn("Chess invitation refused: no authenticated user");
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }

        if (bindingResult.hasErrors()) {
            String reason = bindingResult.getFieldErrors().stream()
                    .findFirst()
                    .map(error -> error.getField() + ": " + error.getDefaultMessage())
                    .orElse("Invalid request");
            log.warn("Chess invitation refused for {}: {}", user.getUserName(), reason);
            return ResponseEntity.badRequest().body(Map.of("error", reason));
        }

        try {
            ChessInvitation invitation = chessInvitationService.sendInvitation(
                    user, request.getOpponentUsername());

            return ResponseEntity.ok(
                    ChessInvitationDto.of(invitation, user.getUserName(), ChessInvitationState.PENDING));

        } catch (IllegalArgumentException e) {
            log.warn("Chess invitation from {} to {} refused: {}",
                    user.getUserName(), request.getOpponentUsername(), e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /* @PostMapping("/{id}/accept")
    public ResponseEntity<?> acceptInvitation(@AuthenticationPrincipal User user,
            @Valid @RequestBody ChessInviteRequestDto request,
            BindingResult bindingResult) {

        if (user == null) {
            log.warn("Chess invitation acceptance refused: no authenticated user");
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }

        if (bindingResult.hasErrors()) {
            String reason = bindingResult.getFieldErrors().stream()
                    .findFirst()
                    .map(error -> error.getField() + ": " + error.getDefaultMessage())
                    .orElse("Invalid request");
            log.warn("Chess invitation acceptance refused for {}: {}", user.getUserName(), reason);
            return ResponseEntity.badRequest().body(Map.of("error", reason));
        }

        try {
            ChessInvitationDto invitation = chessInvitationService.acceptInvitation(
                    user, request.getOpponentUsername());

            return ResponseEntity.ok(invitation);

        } catch (IllegalArgumentException e) {
            log.warn("Chess invitation acceptance from {} to {} refused: {}",
                    user.getUserName(), request.getOpponentUsername(), e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/decline")
    public ResponseEntity<?> declineInvitation(@AuthenticationPrincipal User user,
            @Valid @RequestBody ChessInviteRequestDto request,
            BindingResult bindingResult) {

        if (user == null) {
            log.warn("Chess invitation decline refused: no authenticated user");
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }

        if (bindingResult.hasErrors()) {
            String reason = bindingResult.getFieldErrors().stream()
                    .findFirst()
                    .map(error -> error.getField() + ": " + error.getDefaultMessage())
                    .orElse("Invalid request");
            log.warn("Chess invitation decline refused for {}: {}", user.getUserName(), reason);
            return ResponseEntity.badRequest().body(Map.of("error", reason));
        }

        try {
            ChessInvitationDto invitation = chessInvitationService.declineInvitation(
                    user, request.getOpponentUsername());

            return ResponseEntity.ok(invitation);

        } catch (IllegalArgumentException e) {
            log.warn("Chess invitation decline from {} to {} refused: {}",
                    user.getUserName(), request.getOpponentUsername(), e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    } */
}
