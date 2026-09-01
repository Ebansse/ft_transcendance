package com.transcendance.backend.chess.application;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.transcendance.backend.chess.domain.ChessInvitation;
import com.transcendance.backend.chess.persistence.entity.ChessMatchEntity;
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
    private final ChessGameService chessGameService;
    private final ChessPlayerChannel playerChannel;

    private final static org.apache.logging.log4j.Logger log = org.apache.logging.log4j.LogManager
            .getLogger(ChessInvitationService.class.getName());

    /**
     * Send a chess invitation from one user to another.
     *
     * @param user             the user sending the invitation
     * @param opponentUsername the username of the opponent
     * @return the created ChessInvitation
     * @throws IllegalArgumentException if any validation fails (e.g., opponent not
     *                                  found, already friends, etc.)
     */
    public ChessInvitation sendInvitation(User user, String opponentUsername) {
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

        if (!playerChannel.isOnline(opponent.getIdUser())) {
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

        playerChannel.invitationSent(opponent.getIdUser(), invitation, user.getUserName());

        return invitation;
    }

    /**
     * Accept a chess invitation.
     *
     * @param user             the user accepting the invitation
     * @param opponentUsername the username of the opponent who sent the invitation
     * @return the match that was just created
     * @throws IllegalArgumentException if any validation fails (e.g., no pending
     *                   invitation from this player)
     */
    public ChessMatchEntity acceptInvitation(User user, String opponentUsername) {
        User opponent = userService.getUserByUserName(opponentUsername)
                .orElseThrow(() -> new IllegalArgumentException("Opponent not found"));

        ChessInvitation invitation = claimInvitation(user, opponent);

        log.info("Chess invitation accepted by {} from {} at {} Id: {}", user.getUserName(), opponent.getUserName(),
                java.time.Instant.now(), invitation.id());

        if (!playerChannel.isOnline(opponent.getIdUser())) {
            throw new IllegalArgumentException("Opponent is no longer online");
        }

        UUID whiteUserId = opponent.getIdUser();
        UUID blackUserId = user.getIdUser();

        ChessMatchEntity match = chessGameService.createNewGame(whiteUserId, blackUserId);

        playerChannel.matchStarted(opponent.getIdUser(), match);

        return match;
    }
    /**
     * Decline a chess invitation from one user to another.
     *
     * @param user             the user declining the invitation
     * @param opponentUsername the username of the opponent
     * @return the declined ChessInvitation
     * @throws IllegalArgumentException if any validation fails (e.g., opponent not
     *                                  found, no pending invitation, etc.)
     */
    public ChessInvitation declineInvitation(User user, String opponentUsername) {
        User opponent = userService.getUserByUserName(opponentUsername)
                .orElseThrow(() -> new IllegalArgumentException("Opponent not found"));

        ChessInvitation invitation = claimInvitation(user, opponent);

        log.info("Chess invitation declined by {} from {} at {} Id: {}", user.getUserName(), opponent.getUserName(),
                java.time.Instant.now(), invitation.id());

        playerChannel.invitationDeclined(opponent.getIdUser(), invitation, user.getUserName());

        return invitation;
    }

    /**
     * Takes an invitation out of the pending map, for good.
     *
     * @param user     the user acting on the invitation
     * @param opponent the opponent who sent the invitation
     * @return the claimed ChessInvitation
     * @throws IllegalArgumentException if there is no such invitation, if another
     *                                  call claimed it first, or if it expired
     */
    private ChessInvitation claimInvitation(User user, User opponent) {
        ChessInvitation invitation = pending.values().stream()
                .filter(inv -> inv.toUserId().equals(user.getIdUser())
                        && inv.fromUserId().equals(opponent.getIdUser()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("No pending invitation from this player"));

        if (pending.remove(invitation.id()) == null) {
            throw new IllegalArgumentException("Invitation has already been handled");
        }

        if (invitation.isExpired()) {
            throw new IllegalArgumentException("Invitation has expired");
        }

        return invitation;
    }

    /**
     * Periodically cleans up expired invitations from the pending map.
     * This method is scheduled to run every 60 seconds.
     */
    @Scheduled(fixedRate = 60_000)
    private void cleanupExpiredInvitations() {
        pending.values().removeIf(invitation -> invitation.isExpired());
    }


    /**
     * Returns the list of pending invitations for a user.
     *
     * @param user the user whose pending invitations are requested
     * @return a list of ChessInvitation objects that are still valid and pending
     */
    public List<ChessInvitation> getPendingInvitations(User user) {
        return pending.values().stream()
                .filter(invitation -> invitation.toUserId().equals(user.getIdUser()))
                .filter(invitation -> !invitation.isExpired())
                .toList();
    }
}
