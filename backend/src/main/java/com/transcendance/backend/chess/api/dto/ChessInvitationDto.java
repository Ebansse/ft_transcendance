package com.transcendance.backend.chess.api.dto;

import java.util.UUID;

import com.transcendance.backend.chess.domain.ChessInvitation;
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

    /**
     * Traduit une invitation du domaine en contrat d'API.
     *
     * Le pseudo n'est pas porte par le domaine : il est fourni par l'appelant,
     * qui dispose deja du User ou sait le resoudre.
     */
    public static ChessInvitationDto of(ChessInvitation invitation, String fromUsername,
            ChessInvitationState state) {
        return new ChessInvitationDto(invitation.id(), invitation.fromUserId(), fromUsername, state);
    }
}
