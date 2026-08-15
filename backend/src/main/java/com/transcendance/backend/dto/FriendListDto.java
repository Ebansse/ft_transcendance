package com.transcendance.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import com.transcendance.backend.model.FriendshipStatus;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class FriendListDto {

    /** The other end of the relationship: the id every friend-list route takes. */
    private UUID idUser;
    private String userName;
    private LocalDateTime createAt;
    private FriendshipStatus status;

    /** Who opened the relationship: tells a received request from a sent one. */
    private UUID senderId;
}
