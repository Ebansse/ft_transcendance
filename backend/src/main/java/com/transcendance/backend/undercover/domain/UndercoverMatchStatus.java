package com.transcendance.backend.undercover.domain;

public enum UndercoverMatchStatus {
    IN_PROGRESS,
    UNDERCOVER_WIN,
    AGENTS_WIN;

    public boolean isOver() {
        return this != IN_PROGRESS;
    }
}
