package com.transcendance.backend.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RefreshTokenRotationResult {

    private String newRefreshToken;

}