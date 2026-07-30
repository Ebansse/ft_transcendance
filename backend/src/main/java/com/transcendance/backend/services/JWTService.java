package com.transcendance.backend.services;


import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.transcendance.backend.model.User;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Service
public class JWTService {

    // The secret key used for signing the JWT token is injected from the application properties.
    @Value("${jwt.secret}")
    private String secret;

    /**
     * Generates a JWT token for the given user.
     *
     * @param user the user for whom the token is generated
     * @return a JWT token as a String
     */
    public String generateToken(User user) {  

        // Create a signing key from the secret
        Key key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)); 
        // Generate the JWT token with the user's ID as the subject, current time as issuedAt, and expiration time set to 15 minutes from now
        return Jwts.builder()
                .subject(String.valueOf(user.getIdUser()))
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 15 * 60 * 1000))
                .signWith(key)
                .compact();
    }
}
