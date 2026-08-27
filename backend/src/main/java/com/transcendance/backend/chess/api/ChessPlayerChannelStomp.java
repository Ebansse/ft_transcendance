package com.transcendance.backend.chess.api;

import java.util.UUID;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.user.SimpUserRegistry;
import org.springframework.stereotype.Component;

import com.transcendance.backend.chess.api.dto.ChessInvitationDto;
import com.transcendance.backend.chess.application.ChessPlayerChannel;
import com.transcendance.backend.chess.domain.ChessInvitation;
import com.transcendance.backend.chess.domain.ChessInvitationState;

import lombok.RequiredArgsConstructor;

/**
 * STOMP implementation of the ChessPlayerChannel port.
 *
 * The only class in the module aware of SimpUserRegistry and
 * SimpMessagingTemplate.
 */
@Component
@RequiredArgsConstructor
public class ChessPlayerChannelStomp implements ChessPlayerChannel {

    /**
     * Suffix appended to /user/{principal} by convertAndSendToUser: the client
     * itself subscribes to /user/queue/chess.invitations.
     */
    private static final String INVITATION_DESTINATION = "/queue/chess.invitations";

    private static final Logger log = LogManager.getLogger(ChessPlayerChannelStomp.class);

    private final SimpUserRegistry simpUserRegistry;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public boolean isOnline(UUID userId) {
        return simpUserRegistry.getUser(userId.toString()) != null;
    }

    @Override
    public void invitationSent(UUID toUserId, ChessInvitation invitation, String fromUsername) {
        push(toUserId, ChessInvitationDto.of(invitation, fromUsername, ChessInvitationState.PENDING));
    }

    @Override
    public void invitationDeclined(UUID toUserId, ChessInvitation invitation, String fromUsername) {
        push(toUserId, ChessInvitationDto.of(invitation, fromUsername, ChessInvitationState.DECLINED));
    }

    @Override
    public void invitationAccepted(UUID toUserId, ChessInvitation invitation, String fromUsername) {
        push(toUserId, ChessInvitationDto.of(invitation, fromUsername, ChessInvitationState.ACCEPTED));
    }
    /**
     * Pushing is a side effect: if the broker rejects it we log, but we never
     * fail the business action that triggered it.
     */
    private void push(UUID toUserId, ChessInvitationDto payload) {
        try {
            messagingTemplate.convertAndSendToUser(toUserId.toString(), INVITATION_DESTINATION, payload);
        } catch (Exception e) {
            log.error("Chess invitation {} could not be pushed to {}: {}",
                    payload.getInvitationId(), toUserId, e.getMessage());
        }
    }
}
