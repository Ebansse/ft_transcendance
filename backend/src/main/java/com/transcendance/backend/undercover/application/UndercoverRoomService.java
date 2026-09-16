package com.transcendance.backend.undercover.application;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.transcendance.backend.undercover.domain.UndercoverException;
import com.transcendance.backend.undercover.domain.UndercoverGameMode;
import com.transcendance.backend.undercover.domain.UndercoverRoom;
import com.transcendance.backend.undercover.domain.UndercoverRules;
import com.transcendance.backend.undercover.entity.UndercoverMatchEntity;
import com.transcendance.backend.undercover.entity.repository.UndercoverMatchRepository;

import lombok.RequiredArgsConstructor;

/**
 * Waiting rooms, joined with a short code, where players gather before a match.
 *
 * Kept in memory, like chess invitations: a restart only loses rooms nobody has
 * started yet. Every method holds the service's lock - rooms are few and their
 * operations quick, and one lock rules out a player ending up in two rooms.
 */
@Service
@RequiredArgsConstructor
public class UndercoverRoomService {

    private static final Logger log = LogManager.getLogger(UndercoverRoomService.class);

    /** No 0/O or 1/I: codes are read aloud and typed by hand. */
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int CODE_LENGTH = 6;

    /** A room nobody touched for this long is dropped. */
    private static final Duration IDLE_TIMEOUT = Duration.ofHours(2);

    private final UndercoverService undercoverService;
    private final UndercoverMatchRepository matchRepository;
    private final UndercoverPlayerChannel playerChannel;
    private final Clock clock;

    private final SecureRandom random = new SecureRandom();
    private final Map<String, UndercoverRoom> roomsByCode = new HashMap<>();
    private final Map<UUID, String> roomCodeByUser = new HashMap<>();

    /**
     * Opens a room with this user as host, leaving the room he was in if any.
     *
     * @throws UndercoverException.AlreadyInMatch the user still sits at a match
     */
    public synchronized UndercoverRoom.View createRoom(UUID userId) {
        requireNotInMatch(userId);
        leaveCurrentRoom(userId);

        UndercoverRoom room = new UndercoverRoom(newCode(), userId, clock.instant());
        roomsByCode.put(room.getCode(), room);
        roomCodeByUser.put(userId, room.getCode());
        return room.view();
    }

    /**
     * Joins the room with this code, leaving the room he was in if any.
     *
     * @throws UndercoverException.RoomNotFound   no room with this code
     * @throws UndercoverException.RoomFull       the room seats no one more
     * @throws UndercoverException.AlreadyInMatch the user still sits at a match
     */
    public synchronized UndercoverRoom.View joinRoom(UUID userId, String code) {
        String normalized = code == null ? "" : code.trim().toUpperCase();
        UndercoverRoom room = roomsByCode.get(normalized);
        if (room == null) {
            throw new UndercoverException.RoomNotFound(normalized);
        }
        if (room.getMembers().contains(userId)) {
            return room.view();
        }
        requireNotInMatch(userId);
        if (room.size() >= UndercoverRules.MAX_PLAYERS) {
            throw new UndercoverException.RoomFull(UndercoverRules.MAX_PLAYERS);
        }

        leaveCurrentRoom(userId);
        room.add(userId, clock.instant());
        roomCodeByUser.put(userId, room.getCode());

        UndercoverRoom.View view = room.view();
        playerChannel.roomUpdated(view);
        return view;
    }

    /**
     * Leaves the current room. The next member becomes host if needed; an
     * emptied room is closed. Doing it outside of any room changes nothing.
     */
    public synchronized void leaveRoom(UUID userId) {
        leaveCurrentRoom(userId);
    }

    /**
     * @throws UndercoverException.NotInRoom   the user is in no room
     * @throws UndercoverException.NotRoomHost the user is not the host
     * @throws UndercoverException.InvalidRules CUSTOM without rules
     */
    public synchronized UndercoverRoom.View configure(UUID userId, UndercoverGameMode mode,
            UndercoverRules customRules) {
        UndercoverRoom room = hostedRoom(userId);
        if (mode == null) {
            throw new UndercoverException.InvalidRules("A mode is required");
        }
        if (mode == UndercoverGameMode.CUSTOM && customRules == null) {
            throw new UndercoverException.InvalidRules("A custom match needs its rules");
        }
        room.configure(mode, customRules, clock.instant());

        UndercoverRoom.View view = room.view();
        playerChannel.roomUpdated(view);
        return view;
    }

    /**
     * Starts the match with every member of the room, then closes the room.
     *
     * A refused start - rules that do not fit the table, a member who joined a
     * match meanwhile - leaves the room as it was.
     *
     * @throws UndercoverException.NotInRoom        the user is in no room
     * @throws UndercoverException.NotRoomHost      the user is not the host
     * @throws UndercoverException.NotEnoughPlayers fewer members than a match needs
     */
    public synchronized UndercoverMatchEntity startMatch(UUID userId) {
        UndercoverRoom room = hostedRoom(userId);
        if (room.size() < UndercoverRules.MIN_PLAYERS) {
            throw new UndercoverException.NotEnoughPlayers(UndercoverRules.MIN_PLAYERS);
        }

        UndercoverMatchEntity match = undercoverService.createMatch(room.getMembers(), room.getMode(),
                room.getMode() == UndercoverGameMode.CUSTOM ? room.effectiveRules() : null);

        roomsByCode.remove(room.getCode());
        room.getMembers().forEach(roomCodeByUser::remove);
        playerChannel.matchUpdated(match.getUndercoverMatchId());
        return match;
    }

    /**
     * @return the room this user is in, if any
     */
    public synchronized Optional<UndercoverRoom.View> roomOf(UUID userId) {
        return Optional.ofNullable(roomCodeByUser.get(userId))
                .map(roomsByCode::get)
                .map(UndercoverRoom::view);
    }

    /**
     * Drops rooms left idle, so abandoned ones do not pile up in memory.
     */
    @Scheduled(fixedRate = 600_000)
    public synchronized void dropIdleRooms() {
        Instant limit = clock.instant().minus(IDLE_TIMEOUT);
        roomsByCode.values().removeIf(room -> {
            if (room.getLastActivity().isAfter(limit)) {
                return false;
            }
            room.getMembers().forEach(roomCodeByUser::remove);
            log.info("Undercover room {} dropped after staying idle", room.getCode());
            return true;
        });
    }

    private void leaveCurrentRoom(UUID userId) {
        String code = roomCodeByUser.remove(userId);
        if (code == null) {
            return;
        }
        UndercoverRoom room = roomsByCode.get(code);
        if (room == null) {
            return;
        }
        room.remove(userId, clock.instant());
        if (room.isEmpty()) {
            roomsByCode.remove(code);
            return;
        }
        playerChannel.roomUpdated(room.view());
    }

    private UndercoverRoom hostedRoom(UUID userId) {
        UndercoverRoom room = Optional.ofNullable(roomCodeByUser.get(userId))
                .map(roomsByCode::get)
                .orElseThrow(UndercoverException.NotInRoom::new);
        if (!room.isHost(userId)) {
            throw new UndercoverException.NotRoomHost();
        }
        return room;
    }

    private void requireNotInMatch(UUID userId) {
        if (matchRepository.existsActiveMatch(userId)) {
            throw new UndercoverException.AlreadyInMatch(userId);
        }
    }

    private String newCode() {
        String code;
        do {
            StringBuilder builder = new StringBuilder(CODE_LENGTH);
            for (int i = 0; i < CODE_LENGTH; i++) {
                builder.append(CODE_ALPHABET.charAt(random.nextInt(CODE_ALPHABET.length())));
            }
            code = builder.toString();
        } while (roomsByCode.containsKey(code));
        return code;
    }
}
