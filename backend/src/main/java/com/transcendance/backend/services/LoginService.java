package com.transcendance.backend.services;

import org.springframework.stereotype.Service;

import com.transcendance.backend.dto.LoginResponseDto;
import com.transcendance.backend.model.User;

import jakarta.transaction.Transactional;

@Service
public class LoginService {

    private static final org.apache.logging.log4j.Logger log = org.apache.logging.log4j.LogManager.getLogger(LoginService.class);
    
    private final JWTService jwtService;
    private final UserService userService;
    private final RefreshTokenService refreshTokenService;

    public LoginService(JWTService jwtService, UserService userService, RefreshTokenService refreshTokenService) {
        this.jwtService = jwtService;
        this.userService = userService;
        this.refreshTokenService = refreshTokenService;
    }
    /**
     * Authenticates a user based on the provided email and password.
     * @param email the user's email
     * @param password the user's password
     * @return a JWT token if authentication is successful
     * @throws IllegalArgumentException if the email or password is invalid
     */
    @Transactional
    public LoginResponseDto authenticate(String email, String password) {

        // Fetch the user by email
        User user = userService.getUserByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        // Check if the provided password matches the stored password
        if (!userService.checkPassword(user, password)) {
            log.warn("Invalid password for email: {}", email);
            throw new IllegalArgumentException("Invalid email or password");
        }
        
        // Generate the access and refresh tokens
        LoginResponseDto loginResponse = new LoginResponseDto(
            jwtService.generateAccessToken(user), 
            refreshTokenService.generateRefreshToken(user));

        return loginResponse;
    }
}
