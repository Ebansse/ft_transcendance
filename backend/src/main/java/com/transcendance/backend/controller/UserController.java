package com.transcendance.backend.controller;

import java.util.Optional;
import java.util.UUID;

import org.apache.logging.log4j.Logger;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.transcendance.backend.dto.UserPublicProfileDto;
import com.transcendance.backend.model.User;
import com.transcendance.backend.services.UserService;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private static final Logger log = org.apache.logging.log4j.LogManager.getLogger(UserController.class);

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * Retrieves a user's public profile by their identifier.
     *
     * @param idUser the UUID of the user to look up
     * @return an HTTP 200 response containing the {@link UserPublicProfileDto}
     *         if the user exists, or an HTTP 404 response otherwise
     */
    @GetMapping("/{idUser}")
    public ResponseEntity<?> getUserProfile(@PathVariable UUID idUser) {
        log.info("Fetching public profile for user id: {}", idUser);

        Optional<User> userOpt = userService.getUserById(idUser);

        if (userOpt.isEmpty()) {
            log.warn("User with id {} not found", idUser);
            return ResponseEntity.notFound().build();
        }

        User user = userOpt.get();
        UserPublicProfileDto dto = new UserPublicProfileDto();
        dto.setAvatarUrl(user.getAvatarUrl());
        dto.setId(user.getIdUser());
        dto.setOnline(user.getOnline());
        dto.setUserName(user.getUserName());

        return ResponseEntity.ok(dto);
    }
}
