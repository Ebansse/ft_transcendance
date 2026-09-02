package com.transcendance.backend.chess.domain;

/**
 * Everything the chess module can refuse to do, for the whole module: matches,
 * moves and invitations alike.
 *
 * One type per outcome, so the api layer can give each its own HTTP status
 * without parsing error messages - a match that does not exist and a move that
 * is not yours are not the same failure, and a client should not have to read
 * English to tell them apart.
 *
 * Deliberately unaware of HTTP: the domain states what went wrong,
 * ChessExceptionHandler decides how to phrase it on the wire.
 */
public abstract class ChessException extends RuntimeException {

    protected ChessException(String message) {
        super(message);
    }

    // ---------------------------------------------------------------- missing

    /**
     * No match carries this id.
     */
    public static class MatchNotFound extends ChessException {
        public MatchNotFound(long matchId) {
            super("Match " + matchId + " not found");
        }
    }

    /**
     * No user carries this username.
     */
    public static class OpponentNotFound extends ChessException {
        public OpponentNotFound(String username) {
            super("Opponent not found: " + username);
        }
    }

    /**
     * This player never invited the caller, or the invitation is already gone.
     */
    public static class InvitationNotFound extends ChessException {
        public InvitationNotFound() {
            super("No pending invitation from this player");
        }
    }

    // -------------------------------------------------------------- forbidden

    /**
     * The match exists, but this user is neither of its two players. Distinct
     * from NotYourTurn: this one is never going to become allowed.
     */
    public static class NotAPlayer extends ChessException {
        public NotAPlayer() {
            super("You are not a player of this match");
        }
    }

    /**
     * Invitations are limited to friends.
     */
    public static class NotFriends extends ChessException {
        public NotFriends() {
            super("You are not friends with this user");
        }
    }

    // --------------------------------------------------------------- conflict

    /**
     * The match is already decided, so no further move can be recorded.
     */
    public static class MatchAlreadyOver extends ChessException {
        public MatchAlreadyOver(ChessMatchStatus status) {
            super("Match is already over: " + status);
        }
    }

    /**
     * The user is a player of this match, but the other side has to move first.
     */
    public static class NotYourTurn extends ChessException {
        public NotYourTurn() {
            super("It is not your turn");
        }
    }

    /**
     * A player can only be in one match at a time. Carries its own wording,
     * since the blocker may be the caller or his opponent.
     */
    public static class AlreadyInMatch extends ChessException {
        public AlreadyInMatch(String message) {
            super(message);
        }
    }

    /**
     * Both players must hold a live session for a match to start.
     */
    public static class OpponentOffline extends ChessException {
        public OpponentOffline() {
            super("Opponent is not online");
        }
    }

    /**
     * Another call accepted or declined this invitation first.
     */
    public static class InvitationAlreadyHandled extends ChessException {
        public InvitationAlreadyHandled() {
            super("Invitation has already been handled");
        }
    }

    /**
     * The invitation timed out before it was answered.
     */
    public static class InvitationExpired extends ChessException {
        public InvitationExpired() {
            super("Invitation has expired");
        }
    }

    /**
     * One invitation at a time towards the same player.
     */
    public static class DuplicateInvitation extends ChessException {
        public DuplicateInvitation() {
            super("You already have a pending invitation to this player");
        }
    }

    // ------------------------------------------------------------ bad request

    /**
     * The move is not even in UCI notation, so no position was consulted.
     */
    public static class MalformedMove extends ChessException {
        public MalformedMove(String move) {
            super("Move is not valid UCI notation: " + move);
        }
    }

    /**
     * The move is well formed, but the rules of chess reject it in the current
     * position - a pinned piece, castling through check, leaving the king en
     * prise, and so on.
     */
    public static class IllegalMove extends ChessException {
        public IllegalMove(String move) {
            super("Illegal move in this position: " + move);
        }
    }

    /**
     * A player cannot face himself.
     */
    public static class SelfPlay extends ChessException {
        public SelfPlay() {
            super("Cannot play against yourself");
        }
    }
}
