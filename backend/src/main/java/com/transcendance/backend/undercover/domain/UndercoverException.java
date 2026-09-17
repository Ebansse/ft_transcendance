package com.transcendance.backend.undercover.domain;

import java.util.UUID;

public abstract class UndercoverException extends RuntimeException {

    protected UndercoverException(String message) {
        super(message);
    }
    
    public static class InvalidRules extends UndercoverException {
        public InvalidRules(String message) {
            super(message);
        }
    }

    public static class DuplicatePlayer extends UndercoverException {
        public DuplicatePlayer() {
            super("A player cannot take more than one seat in a match");
        }
    }

    /**
     * A player can only sit at one table at a time.
     */
    public static class AlreadyInMatch extends UndercoverException {
        public AlreadyInMatch(UUID userId) {
            // The id stays out of the message: it reaches the players as is.
            super("A player is still in another Undercover match");
        }
    }

    /**
     * The word pair table is empty - a seeding problem, not something a player
     * did.
     */
    public static class InvalidWordList extends UndercoverException {
        public InvalidWordList(String message) {
            super(message);
        }
    }

    public static class NoWordPair extends UndercoverException {
        public NoWordPair() {
            super("No word pair available to start a match");
        }
    }

    // ---------------------------------------------------------------- missing

    public static class MatchNotFound extends UndercoverException {
        public MatchNotFound(long matchId) {
            super("Match " + matchId + " not found");
        }
    }

    // -------------------------------------------------------------- forbidden

    /**
     * The match exists, but this user holds no seat at it.
     */
    public static class NotAPlayer extends UndercoverException {
        public NotAPlayer() {
            super("You are not a player of this match");
        }
    }

    /**
     * The user sits at this table, but has been voted out and no longer takes
     * part in describing or voting.
     */
    public static class PlayerEliminated extends UndercoverException {
        public PlayerEliminated() {
            super("You have been eliminated from this match");
        }
    }

    // --------------------------------------------------------------- conflict

    public static class MatchAlreadyOver extends UndercoverException {
        public MatchAlreadyOver(UndercoverMatchStatus status) {
            super("Match is already over: " + status);
        }
    }

    /**
     * The action belongs to another phase - a clue during a vote, a vote during
     * the descriptions.
     */
    public static class WrongPhase extends UndercoverException {
        public WrongPhase(UndercoverPhase expected, UndercoverPhase actual) {
            super("This action is only allowed during " + expected + ", the match is in " + actual);
        }
    }

    /**
     * Describing, but another seat is the one the table is waiting on.
     */
    public static class NotYourTurn extends UndercoverException {
        public NotYourTurn() {
            super("It is not your turn");
        }
    }

    /**
     * The match waits on Mr White's guess, but this player is not the Mr White
     * who was just voted out.
     */
    public static class NotTheGuesser extends UndercoverException {
        public NotTheGuesser() {
            super("Only the Mr White who was just eliminated can guess");
        }
    }

    public static class AlreadyVoted extends UndercoverException {
        public AlreadyVoted() {
            super("You have already voted");
        }
    }

    // ------------------------------------------------------------ bad request

    public static class InvalidClue extends UndercoverException {
        public InvalidClue(String message) {
            super(message);
        }
    }

    /**
     * An empty guess is refused rather than counted as wrong: a misclick should
     * not cost the match. Running out of time is what counts as a failed guess.
     */
    public static class InvalidGuess extends UndercoverException {
        public InvalidGuess(String message) {
            super(message);
        }
    }

    public static class InvalidVoteTarget extends UndercoverException {
        public InvalidVoteTarget(String message) {
            super(message);
        }
    }

    public static class InvalidChatMessage extends UndercoverException {
        public InvalidChatMessage(String message) {
            super(message);
        }
    }

    // ------------------------------------------------------------------ rooms

    public static class RoomNotFound extends UndercoverException {
        public RoomNotFound(String code) {
            super("No room with code " + code);
        }
    }

    /**
     * The user asked about his room, but is not in any.
     */
    public static class NotInRoom extends UndercoverException {
        public NotInRoom() {
            super("You are not in a room");
        }
    }

    /**
     * Only the host changes the settings or starts the match.
     */
    public static class NotRoomHost extends UndercoverException {
        public NotRoomHost() {
            super("Only the host of the room can do that");
        }
    }

    public static class RoomFull extends UndercoverException {
        public RoomFull(int capacity) {
            super("This room is full (" + capacity + " players)");
        }
    }

    public static class NotEnoughPlayers extends UndercoverException {
        public NotEnoughPlayers(int minimum) {
            super("At least " + minimum + " players are needed to start");
        }
    }
}
