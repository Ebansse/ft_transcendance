package com.transcendance.backend.services;

import org.springframework.stereotype.Service;

import com.transcendance.backend.model.User;

import jakarta.transaction.Transactional;

@Service
public class LoginService {

    private static final org.apache.logging.log4j.Logger log = org.apache.logging.log4j.LogManager.getLogger(LoginService.class);
    
    private final JWTService jwtService;
    private final UserService userService;

    public LoginService(JWTService jwtService, UserService userService) {
        this.jwtService = jwtService;
        this.userService = userService;
    }
    /**
     * Authenticates a user based on the provided email and password.
     * @param email the user's email
     * @param password the user's password
     * @return a JWT token if authentication is successful
     * @throws IllegalArgumentException if the email or password is invalid
     */
    @Transactional
    public String authenticate(String email, String password) {

        // Fetch the user by email
        User user = userService.getUserByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        // Check if the provided password matches the stored password
        if (!userService.checkPassword(user, password)) {
            log.warn("Invalid password for email: {}", email);
            throw new IllegalArgumentException("Invalid email or password");
        }
        // Generate and return a JWT token for the authenticated user
        return jwtService.generateToken(user);
    }
}
