package com.transcendance.backend.controller;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.apache.logging.log4j.Logger;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.transcendance.backend.dto.LoginRequestDto;
import com.transcendance.backend.dto.LoginResponseTokenDto;
import com.transcendance.backend.services.LoginService;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class LoginController {

    private static final Logger log = org.apache.logging.log4j.LogManager.getLogger(LoginController.class);

    private final LoginService loginService;

    public LoginController(LoginService loginService) {
        this.loginService = loginService;
    }

    /**
     * Handles user login requests.
     *
     * @param loginRequest the login request containing email, password and the optional 2FA code
     * @param bindingResult the result of validation checks on the request
     * @return a ResponseEntity containing the JWT token in a cookie if successful,
     *         {"twoFactorRequired": true} if a 2FA code is missing, or an error message if failed
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(HttpServletRequest request, @Valid @RequestBody LoginRequestDto loginRequest,
                                    BindingResult bindingResult) {

        String refreshToken = extractRefreshTokenFromCookies(request);
        if (refreshToken != null) {
            return ResponseEntity.status(401).body("Refresh token found");
        }
        log.info("Processing login for email: {}", loginRequest.getEmail());
        
        if (bindingResult.hasErrors()) {
        Map<String, String> errors = new HashMap<>();
        bindingResult.getFieldErrors().forEach(error ->
                errors.put(error.getField(), error.getDefaultMessage())
        );
        log.warn("Login failed due to validation error: {}", errors);
        return ResponseEntity.badRequest().body(errors);
    }

        try {
            Optional<LoginResponseTokenDto> tokens = loginService.authenticate(
                    loginRequest.getEmail(), loginRequest.getPassword(), loginRequest.getCode());

            // 2FA account without code: no cookies yet, the front asks for the code and retries
            if (tokens.isEmpty()) {
                return ResponseEntity.ok(Map.of("twoFactorRequired", true));
            }
            LoginResponseTokenDto loginResponse = tokens.get();
            log.info("Login successful for email: {}", loginRequest.getEmail());
            
            ResponseCookie accessCookie = ResponseCookie.from("access_token", loginResponse.getAccessToken())
                    .httpOnly(true)
                    .secure(false) //TODO: Change to true in production
                    .sameSite("strict")
                    .path("/")
                    .maxAge(15 * 60)
                    .build();
            
            ResponseCookie refreshCookie = ResponseCookie.from("refresh_token", loginResponse.getRefreshToken())
                    .httpOnly(true)
                    .secure(false) //TODO: Change to true in production
                    .sameSite("strict")
                    .path("/api/auth")
                    .maxAge(7 * 24 * 60 * 60)
                    .build();

            return ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE, accessCookie.toString())
                    .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                    .body("Login successful");
        
        } catch (IllegalArgumentException e) {
        log.error("Login failed for email: {}. Error: {}", loginRequest.getEmail(), e.getMessage());
        return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
    }
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
