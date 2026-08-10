package com.transcendance.backend.services;

import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.transcendance.backend.model.User;
import com.transcendance.backend.repository.FriendListRepository;
import com.transcendance.backend.repository.RefreshTokenRepository;
import com.transcendance.backend.repository.UserRoleRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DeleteUserService {

    private static final Logger log = org.apache.logging.log4j.LogManager.getLogger(DeleteUserService.class);

    private final UserService userService;
    private final UserRoleRepository userRoleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final FriendListRepository friendListRepository;

    /**
     * Remove a user and everything hanging off them.
     * <p>
     * The rows are dropped in dependency order: {@code user_roles} and
     * {@code refresh_tokens} carry a foreign key on the user and would block the
     * deletion, {@code friend_list} stores raw UUIDs and would only leave
     * orphans behind. The whole thing runs in one transaction, so a failure
     * halfway through leaves the account untouched.
     *
     * @param user the user to delete
     */
    @Transactional
    public void deleteUser(User user) {
        log.info("Deleting user id: {}", user.getIdUser());

        refreshTokenRepository.deleteByUser(user);
        userRoleRepository.deleteByUser(user);
        friendListRepository.deleteByUserId1OrUserId2(user.getIdUser(), user.getIdUser());
        userService.deleteUser(user);

        log.info("User deleted: {}", user.getIdUser());
    }
}
