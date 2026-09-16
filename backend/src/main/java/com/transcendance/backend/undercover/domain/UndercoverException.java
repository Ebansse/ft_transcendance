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
            super("Player " + userId + " is already in a match");
        }
    }

    /**
     * The word pair table is empty - a seeding problem, not something a player
     * did.
     */
    public static class NoWordPair extends UndercoverException {
        public NoWordPair() {
            super("No word pair available to start a match");
        }
    }
}
