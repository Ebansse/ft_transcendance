package com.transcendance.backend.services;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;

import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.transcendance.backend.model.RefreshToken;
import com.transcendance.backend.model.User;
import com.transcendance.backend.repository.RefreshTokenRepository;


@Service
public class RefreshTokenService {

    private static final Logger log = org.apache.logging.log4j.LogManager.getLogger(RefreshTokenService.class);

    private RefreshTokenRepository RefreshTokenRepository;
    
    public RefreshTokenService(RefreshTokenRepository refreshTokenRepository) {
        this.RefreshTokenRepository = refreshTokenRepository;
    }

    @Value("${jwt.refresh-token-validity-days}")
    private int refreshTokenValidityDays;

    public String generateRefreshToken(User user) {
        
        log.info("Generating refresh token for user: {}", user.getEmail());
        // Generate a secure random token
        String rawToken = generateSecureRandomToken();

        // Hash the token
        String hashedToken = hashToken(rawToken);

        // Create a new refresh token
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setTokenHash(hashedToken);
        refreshToken.setExpiresAt(Instant.now().plus(refreshTokenValidityDays, ChronoUnit.DAYS));
        refreshToken.setRevoked(false);
        refreshToken.setCreatedAt(Instant.now());

        // Save the refresh token
        RefreshTokenRepository.save(refreshToken);

        log.info("Refresh token generated for user: {}", user.getEmail());
        return rawToken;
    }

    private String generateSecureRandomToken() {
        
        // Initialize the secure random number generator
        SecureRandom secureRandom = new SecureRandom();
        
        // Generate 64 random bytes
        byte[] tokenBytes = new byte[64];
        
        // Fill the byte array with random values
        secureRandom.nextBytes(tokenBytes);
        
        // Encode the token bytes to a Base64 string
        return Base64.getEncoder().withoutPadding().encodeToString(tokenBytes);
    }

    private String hashToken(String rawToken) {
        try {
            // Initialize the message digest
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            // Hash the raw token
            byte[] hashedBytes = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hashedBytes);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }

}
