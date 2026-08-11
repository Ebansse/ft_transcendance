package com.transcendance.backend.services;

import java.util.Optional;

import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.transcendance.backend.dto.UpdateUserRequestDto;
import com.transcendance.backend.logger.LogMessages;
import com.transcendance.backend.model.User;

@Service
public class UpdateUserService {

    private static final Logger log = org.apache.logging.log4j.LogManager.getLogger(UpdateUserService.class);

    private final UserService userService;
    private final UserRoleService userRoleService;

    public UpdateUserService(UserService userService, UserRoleService userRoleService) {
        this.userService = userService;
        this.userRoleService = userRoleService;
    }

    /**
     * Overwrite a user's username, email and role with the values received.
     * <p>
     * Unchanged fields are written back as well: the caller sends the full state
     * of the user, not a patch.
     *
     * @param user   the user to update
     * @param updateUserDto the new values
     * @return the updated user
     * @throws IllegalArgumentException if a value is malformed, already taken by
     *                                  another user, or if the role is unknown
     */
    @Transactional
    public User updateUser(User user, UpdateUserRequestDto updateUserDto) {
        log.info("Starting update for user id: {}", user.getIdUser());

        String userName = updateUserDto.getUserName().trim();
        String email = updateUserDto.getEmail().trim();
        String role = updateUserDto.getRole().trim().toUpperCase();

        // Check username format
        if (userService.isInvalidUsername(userName)) {
            log.error(LogMessages.INVALID_USERNAME, userName);
            throw new IllegalArgumentException("The username provided is invalid: " + userName);
        }

        // Validate email format
        if (userService.isInvalidEmail(email)) {
            log.error(LogMessages.INVALID_EMAIL, email);
            throw new IllegalArgumentException("The email provided is invalid: " + email);
        }

        // The user keeping their own email or username is not a conflict.
        if (isTakenBySomeoneElse(userService.getUserByEmail(email), user)) {
            log.error(LogMessages.EMAIL_ALREADY_USED, email);
            throw new IllegalArgumentException("The email is already used: " + email);
        }
        if (isTakenBySomeoneElse(userService.getUserByUserName(userName), user)) {
            log.error("The username is already used. {}", userName);
            throw new IllegalArgumentException("The username is already used: " + userName);
        }

        user.setUserName(userName);
        user.setEmail(email);
        User savedUser = userService.saveUser(user);

        // Throws if the role does not exist, which rolls the whole update back.
        userRoleService.setRole(savedUser, role);

        log.info("User updated successfully: {}", savedUser.getIdUser());
        return savedUser;
    }

    /**
     * Tells whether a lookup matched a user other than the one being updated.
     */
    private boolean isTakenBySomeoneElse(Optional<User> found, User user) {
        return found.isPresent() && !found.get().getIdUser().equals(user.getIdUser());
    }
}
