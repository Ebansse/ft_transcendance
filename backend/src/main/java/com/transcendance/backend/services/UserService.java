package com.transcendance.backend.services;

import java.util.Optional;
import java.util.UUID;

import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Service;

import com.transcendance.backend.config.SecurityConfig;
import com.transcendance.backend.model.User;
import com.transcendance.backend.repository.UserRepository;

@Service
public class UserService {

    private static final Logger Log = org.apache.logging.log4j.LogManager.getLogger(UserService.class);

    private final UserRepository userRepository;
    private final SecurityConfig securityConfig;

    public UserService(UserRepository userRepository, SecurityConfig securityConfig) {
        this.userRepository = userRepository;
        this.securityConfig = securityConfig;
    }

    // Method to check if the email format is invalid
    public boolean isInvalidEmail(String email) {
        String emailRegex = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$";
        return !email.matches(emailRegex);
    }

    // Method to check if the username format is invalid
    public boolean isInvalidUsername(String username) {
        String usernameRegex = "^[A-Za-z0-9_]{3,20}$"; // Example: 3-20 characters, alphanumeric and underscores
        return !username.matches(usernameRegex);
    }

    // Method to check if a user with the given email already exists
    public Optional<User> getUserByEmail(String email) {
        Log.debug("Fetching user by email: {}", email);
        return userRepository.findByEmail(email);
    }

    // Method to fetch a user by their id
    public Optional<User> getUserById(UUID idUser) {
        Log.debug("Fetching user by id: {}", idUser);
        return userRepository.findById(idUser);
    }

    // Method to check if the provided password matches the stored password for the user
    public boolean checkPassword(User user, String rawPassword) {
        Log.debug("Checking password for user: {}", user.getEmail());
        return securityConfig.passwordEncoder().matches(rawPassword, user.getPassword());
    }

    // Method to create and save a new user
    public User createUser(User user) {
        Log.debug("Saving user with email: {}", user.getEmail());
        user.setPassword(securityConfig.passwordEncoder().encode(user.getPassword()));
        return userRepository.save(user);
    }
}
