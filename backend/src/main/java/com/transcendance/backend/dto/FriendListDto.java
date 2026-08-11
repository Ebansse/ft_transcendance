package com.transcendance.backend.dto;

import java.time.LocalDateTime;

import com.transcendance.backend.model.FriendshipStatus;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class FriendListDto {

    private String userName;
    private LocalDateTime createAt;
    private FriendshipStatus status;
}
