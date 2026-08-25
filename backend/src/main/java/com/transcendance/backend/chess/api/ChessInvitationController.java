package com.transcendance.backend.chess.api;


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
import com.transcendance.backend.model.User;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/chess/invitations")
public class ChessInvitationController {

    private final ChessInvitationService chessInvitationService;

    @PostMapping("/send")
    public ResponseEntity<ChessInvitationDto> sendInvitation(@AuthenticationPrincipal User user, @Valid @RequestBody ChessInviteRequestDto opponentUsername, BindingResult bindingResult) {
        if (bindingResult.hasErrors()) {
            throw new IllegalArgumentException("Invalid invitation request");
        }
        try {
            ChessInvitationDto invitationDto = chessInvitationService.sendInvitation(user, opponentUsername.getOpponentUsername());
            return ResponseEntity.ok(invitationDto);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Failed to send invitation: " + e.getMessage());
        }
    }
}
