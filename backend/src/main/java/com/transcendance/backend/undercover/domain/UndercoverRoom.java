package com.transcendance.backend.undercover.domain;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;

/**
 * A waiting room, before a match exists. Lives in memory only.
 *
 * Not thread-safe on its own: UndercoverRoomService serializes every access.
 */
public class UndercoverRoom {

    private final String code;
    private UUID hostId;
    /** In arrival order, so the host can be handed down to whoever came next. */
    private final LinkedHashSet<UUID> members = new LinkedHashSet<>();
    private UndercoverGameMode mode = UndercoverGameMode.CLASSIC;
    /** Only read for CUSTOM. */
    private UndercoverRules customRules = UndercoverRules.defaultsFor(UndercoverGameMode.CLASSIC);
    private Instant lastActivity;

    public UndercoverRoom(String code, UUID hostId, Instant now) {
        this.code = code;
        this.hostId = hostId;
        this.members.add(hostId);
        this.lastActivity = now;
    }

    public String getCode() {
        return code;
    }

    public UUID getHostId() {
        return hostId;
    }

    public boolean isHost(UUID userId) {
        return hostId.equals(userId);
    }

    public List<UUID> getMembers() {
        return new ArrayList<>(members);
    }

    public int size() {
        return members.size();
    }

    public boolean isEmpty() {
        return members.isEmpty();
    }

    public void add(UUID userId, Instant now) {
        members.add(userId);
        lastActivity = now;
    }

    /**
     * Removes a member, and hands the room to the next one if he was the host.
     */
    public void remove(UUID userId, Instant now) {
        members.remove(userId);
        if (hostId.equals(userId) && !members.isEmpty()) {
            hostId = members.iterator().next();
        }
        lastActivity = now;
    }

    public UndercoverGameMode getMode() {
        return mode;
    }

    /**
     * @param customRules kept only for CUSTOM; ignored otherwise
     */
    public void configure(UndercoverGameMode mode, UndercoverRules customRules, Instant now) {
        this.mode = mode;
        if (mode == UndercoverGameMode.CUSTOM && customRules != null) {
            this.customRules = customRules;
        }
        lastActivity = now;
    }

    /**
     * The rules the match would be played with if it started now.
     */
    public UndercoverRules effectiveRules() {
        return mode == UndercoverGameMode.CUSTOM ? customRules : UndercoverRules.defaultsFor(mode);
    }

    public Instant getLastActivity() {
        return lastActivity;
    }

    /**
     * A copy safe to hand out of the lock.
     */
    public View view() {
        return new View(code, hostId, getMembers(), mode, effectiveRules());
    }

    public record View(String code, UUID hostId, List<UUID> members, UndercoverGameMode mode,
            UndercoverRules rules) {
    }
}
