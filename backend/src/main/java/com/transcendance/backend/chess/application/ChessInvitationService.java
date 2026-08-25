package com.transcendance.backend.chess.application;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.messaging.simp.user.SimpUserRegistry;
import org.springframework.stereotype.Service;

import com.transcendance.backend.chess.api.dto.ChessInvitationDto;
import com.transcendance.backend.chess.domain.ChessInvitation;
import com.transcendance.backend.chess.domain.ChessInvitationState;
import com.transcendance.backend.chess.persistence.repository.ChessMatchEntityRepository;
import com.transcendance.backend.model.User;
import com.transcendance.backend.services.FriendListService;
import com.transcendance.backend.services.UserService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ChessInvitationService {

    private final Map<UUID, ChessInvitation> pending = new ConcurrentHashMap<>();

    private final UserService userService;
    private final FriendListService friendListService;
    private final ChessMatchEntityRepository chessMatchEntityRepository;
    private final SimpUserRegistry simpUserRegistry;

    private final static org.apache.logging.log4j.Logger log = org.apache.logging.log4j.LogManager
            .getLogger(ChessInvitationService.class.getName());

    /**
     * Send a chess invitation from one user to another.
     *
     * @param user             the user sending the invitation
     * @param opponentUsername the username of the opponent
     * @return the created ChessInvitationDto
     * @throws IllegalArgumentException if any validation fails (e.g., opponent not
     *                                  found, already friends, etc.)
     */
    public ChessInvitationDto sendInvitation(User user, String opponentUsername) {
        User opponent = userService.getUserByUserName(opponentUsername)
                .orElseThrow(() -> new IllegalArgumentException("Opponent not found"));

        if (opponent.getIdUser().equals(user.getIdUser())) {
            throw new IllegalArgumentException("Cannot invite yourself to a game");
        }

        if (!friendListService.checkFriendship(user, opponent)) {
            throw new IllegalArgumentException("You are not friends with this user");
        }

        if (chessMatchEntityRepository.existsActiveMatch(user.getIdUser())) {
            throw new IllegalArgumentException("You already have an active match");
        }

        if (chessMatchEntityRepository.existsActiveMatch(opponent.getIdUser())) {
            throw new IllegalArgumentException("Opponent already has an active match");
        }

        var simpUser = simpUserRegistry.getUser(opponent.getIdUser().toString());
        if (simpUser == null) {
            throw new IllegalArgumentException("Opponent is not online");
        }

        pending.values().removeIf(invitation -> invitation.isExpired());

        boolean alreadyPending = pending.values().stream()
                .anyMatch(existing -> existing.fromUserId().equals(user.getIdUser())
                        && existing.toUserId().equals(opponent.getIdUser()));

        if (alreadyPending) {
            throw new IllegalArgumentException("You already have a pending invitation to this player");
        }

        ChessInvitation invitation = ChessInvitation.create(user.getIdUser(), opponent.getIdUser());
        pending.put(invitation.id(), invitation);

        log.info("Chess invitation sent from {} to {} at {} Id: {}", user.getUserName(), opponent.getUserName(),
                invitation.createdAt(), invitation.id());

        ChessInvitationDto invitationDto = new ChessInvitationDto(invitation.id(),
            user.getIdUser(), user.getUserName(), ChessInvitationState.PENDING);
        return invitationDto;
    }

}
