package com.transcendance.backend.chess.application;

import java.util.UUID;

import com.transcendance.backend.chess.domain.ChessInvitation;

/**
 * Outbound port from the chess module towards connected players.
 *
 * Deliberately expressed in business terms: no destination, no transport type.
 * The implementation lives in the api layer and is the only place that knows
 * any of this travels over STOMP.
 */
public interface ChessPlayerChannel {

    /**
     * @return true if this player has at least one open real-time session.
     */
    boolean isOnline(UUID userId);

    /**
     * Notifies a player that he has just been invited.
     */
    void invitationSent(UUID toUserId, ChessInvitation invitation, String fromUsername);

    /**
     * Notifies the inviter that his invitation was accepted.
     */
    void invitationAccepted(UUID toUserId, ChessInvitation invitation, String fromUsername);

    /**
     * Notifies the inviter that his invitation was declined.
     */
    void invitationDeclined(UUID toUserId, ChessInvitation invitation, String fromUsername);
}
