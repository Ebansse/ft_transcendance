package com.transcendance.backend.controller;

import java.util.Map;

import org.apache.logging.log4j.Logger;
import org.springframework.http.HttpHeaders;

import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.transcendance.backend.services.LogoutService;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import lombok.AllArgsConstructor;

@RestController
@AllArgsConstructor
@RequestMapping("/api/auth")
public class LogoutController {

    private final static Logger log = org.apache.logging.log4j.LogManager.getLogger(LogoutController.class);

    private final LogoutService logoutService;
    
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
    
        String refreshToken = extractRefreshTokenFromCookies(request);

        if (refreshToken != null) {
            try {
                logoutService.revokeRefreshToken(refreshToken);
            } catch (IllegalArgumentException e) {
                log.warn("Invalid refresh token provided");
                return ResponseEntity.status(401).body(Map.of("error", "Invalid refresh token"));
            }
        }else{
            log.warn("Invalid refresh token provided");
            return ResponseEntity.status(401).body(Map.of("error", "Invalid refresh token"));
        }
       ResponseCookie expiredAccessCookie = ResponseCookie.from("access_token", "")
                .httpOnly(true)
                .secure(true)
                .sameSite("strict")
                .path("/")
                .maxAge(0)
                .build();

        ResponseCookie expiredRefreshCookie = ResponseCookie.from("refresh_token", "")
                .httpOnly(true)
                .secure(true)
                .sameSite("strict")
                .path("/api/auth")
                .maxAge(0)
                .build();

        log.info("User logged out");

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, expiredAccessCookie.toString())
                .header(HttpHeaders.SET_COOKIE, expiredRefreshCookie.toString())
                .body("Logged out");
    }

    private String extractRefreshTokenFromCookies(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        for (Cookie cookie : request.getCookies()) {
            if ("refresh_token".equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }
}
