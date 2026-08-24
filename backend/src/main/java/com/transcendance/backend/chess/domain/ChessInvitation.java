package com.transcendance.backend.chess.domain;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;


public record ChessInvitation(UUID id, UUID fromUserId, UUID toUserId, Instant createdAt) {

    public static final Duration TTL = Duration.ofMinutes(2);

    public static ChessInvitation create(UUID fromUserId, UUID toUserId) {
        return new ChessInvitation(UUID.randomUUID(), fromUserId, toUserId, Instant.now());
    }

    public boolean isExpired() {
        return createdAt.plus(TTL).isBefore(Instant.now());
    }
}
