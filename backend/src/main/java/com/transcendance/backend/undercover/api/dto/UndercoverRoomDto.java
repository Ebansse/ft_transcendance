package com.transcendance.backend.undercover.api.dto;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.transcendance.backend.model.User;
import com.transcendance.backend.undercover.domain.UndercoverGameMode;
import com.transcendance.backend.undercover.domain.UndercoverRoom;
import com.transcendance.backend.undercover.domain.UndercoverRules;

public record UndercoverRoomDto(
        String code,
        UUID hostId,
        UndercoverGameMode mode,
        UndercoverRulesDto rules,
        List<UndercoverUserDto> members,
        int minPlayers,
        int maxPlayers) {

    /**
     * @param users the members' accounts by id; a member whose account is gone
     *              still shows, without a name
     */
    public static UndercoverRoomDto of(UndercoverRoom.View room, Map<UUID, User> users) {
        return new UndercoverRoomDto(
                room.code(),
                room.hostId(),
                room.mode(),
                UndercoverRulesDto.of(room.rules()),
                room.members().stream().map(id -> UndercoverUserDto.of(id, users.get(id))).toList(),
                UndercoverRules.MIN_PLAYERS,
                UndercoverRules.MAX_PLAYERS);
    }
}
