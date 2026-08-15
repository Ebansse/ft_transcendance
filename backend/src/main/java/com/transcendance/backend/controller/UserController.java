package com.transcendance.backend.controller;

import java.util.Optional;
import java.util.UUID;

import org.apache.logging.log4j.Logger;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.transcendance.backend.config.AvatarProperties;
import com.transcendance.backend.dto.UserPublicProfileDto;
import com.transcendance.backend.model.User;
import com.transcendance.backend.services.AvatarStorageService;
import com.transcendance.backend.services.UserRoleService;
import com.transcendance.backend.services.UserService;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private static final Logger log = org.apache.logging.log4j.LogManager.getLogger(UserController.class);

    private final UserService userService;
    private final UserRoleService userRoleService;
    private final AvatarStorageService avatarStorageService;
    private final AvatarProperties avatarProperties;

    public UserController(UserService userService, UserRoleService userRoleService,
            AvatarStorageService avatarStorageService, AvatarProperties avatarProperties) {
        this.userService = userService;
        this.userRoleService = userRoleService;
        this.avatarStorageService = avatarStorageService;
        this.avatarProperties = avatarProperties;
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

    /**
     * Uploads (and replaces) the authenticated user's avatar.
     *
     * @param user the authenticated user
     * @param file the uploaded image file
     * @return an HTTP 200 response containing the updated {@link UserPublicProfileDto},
     *         or an HTTP 400 response if the file is invalid
     */
    @PostMapping("/me/avatar")
    public ResponseEntity<?> uploadAvatar(@AuthenticationPrincipal User user, @RequestParam("file") MultipartFile file) {
        log.info("Uploading avatar for user id: {}", user.getIdUser());

        String newFilename;
        try {
            newFilename = avatarStorageService.store(file);
        } catch (IllegalArgumentException e) {
            log.warn("Invalid avatar file for user id: {}", user.getIdUser(), e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }

        String oldAvatarUrl = user.getAvatarUrl();

        String newAvatarUrl = avatarProperties.getPublicPath() + "/" + newFilename;

        userService.updateAvatarUrl(user, newAvatarUrl);

        if (oldAvatarUrl != null && !oldAvatarUrl.isBlank()) {
            String oldFilename = oldAvatarUrl.substring(oldAvatarUrl.lastIndexOf('/') + 1);
            avatarStorageService.delete(oldFilename);
        }

        log.info("Avatar uploaded for user id: {}", user.getIdUser());
        return ResponseEntity.ok(toDto(user));
    }
}
