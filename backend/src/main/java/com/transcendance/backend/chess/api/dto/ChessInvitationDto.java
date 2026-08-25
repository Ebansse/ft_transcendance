package com.transcendance.backend.chess.api.dto;

import java.util.UUID;

import com.transcendance.backend.chess.domain.ChessInvitationState;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class ChessInvitationDto {
    private UUID invitationId;
    private UUID fromUserId;
    private String fromUsername;
    private ChessInvitationState state;

}
