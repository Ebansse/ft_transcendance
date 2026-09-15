package com.transcendance.backend.undercover.domain;

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
}
