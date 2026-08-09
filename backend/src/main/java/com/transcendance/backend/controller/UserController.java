package com.transcendance.backend.controller;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.apache.logging.log4j.Logger;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.transcendance.backend.dto.UserPublicProfileDto;
import com.transcendance.backend.model.User;
import com.transcendance.backend.services.UserRoleService;
import com.transcendance.backend.services.UserService;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private static final Logger log = org.apache.logging.log4j.LogManager.getLogger(UserController.class);

    private final UserService userService;
    private final UserRoleService userRoleService;

    public UserController(UserService userService, UserRoleService userRoleService) {
        this.userService = userService;
        this.userRoleService = userRoleService;
    }

    /**
     * Maps a user entity to its public profile representation.
     *
     * @param user the user to map
     * @return the corresponding {@link UserPublicProfileDto}
     */
    private UserPublicProfileDto toDto(User user) {
        UserPublicProfileDto dto = new UserPublicProfileDto();
        dto.setAvatarUrl(user.getAvatarUrl());
        dto.setId(user.getIdUser());
        dto.setOnline(user.getOnline());
        dto.setUserName(user.getUserName());
        dto.setRole(userRoleService.getRoleName(user));
        return dto;
    }

    /**
     * Retrieves the public profile of every user stored in the database.
     * <p>
     * Public route: no JWT is read here, the data comes straight from the
     * database.
     *
     * @return an HTTP 200 response containing one {@link UserPublicProfileDto}
     *         per user, or an empty list if the table is empty
     */
    @GetMapping
    public ResponseEntity<List<UserPublicProfileDto>> getAllUsers() {
        log.info("Fetching public profiles of all users");

        List<UserPublicProfileDto> profiles = userService.getAllUsers()
                .stream()
                .map(this::toDto)
                .toList();

        log.info("{} public profiles fetched", profiles.size());
        return ResponseEntity.ok(profiles);
    }

    /**
     * Retrieves the authenticated user's public profile.
     *
     * @param user the authenticated user
     * @return an HTTP 200 response containing the {@link UserPublicProfileDto}
     */
    @GetMapping("/me")
    public ResponseEntity<?> getMeProfile(@AuthenticationPrincipal User user) {
        log.info("Fetching public profile for user id: {}", user.getIdUser());

        UserPublicProfileDto dto = toDto(user);

        log.info("Public profile fetched for user: {}", user.getIdUser());
        return ResponseEntity.ok(dto);
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
        UserPublicProfileDto dto = toDto(user);

        return ResponseEntity.ok(dto);
    }
}
