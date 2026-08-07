package com.transcendance.backend.dto;

import java.time.Instant;
import java.util.UUID;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UserPublicProfileDto {
        private UUID            id;
        private String          userName;
        private Instant         online;
        private String          avatarUrl;
        private String          role;
        //private UserStatsDto    stats;
}
