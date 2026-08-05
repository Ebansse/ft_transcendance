package com.transcendance.backend.services;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Service;

import com.transcendance.backend.model.FriendshipStatus;
import com.transcendance.backend.model.User;
import com.transcendance.backend.model.FriendList;
import com.transcendance.backend.repository.UserRepository;
import com.transcendance.backend.repository.FriendListRepository;

import jakarta.transaction.Transactional;


@Service
public class FriendListService {
    
    private static final Logger log = org.apache.logging.log4j.LogManager.getLogger(FriendListService.class);

    private UserRepository userRepository;
    private FriendListRepository friendListRepository;

    public FriendListService(UserRepository userRepository, FriendListRepository friendListRepository) {
        this.userRepository = userRepository;
        this.friendListRepository = friendListRepository;
    }

    /**
     * Sends a friend request from one user to another.
     *
     * @param user     The user sending the request.
     * @param username The username of the user receiving the request.
     */
    @Transactional
    public void sendFriendRequest(User user, String username) {

        log.info("Sending friend request from {} to {}", user.getUserName(), username);

        User target = userRepository.findByUserName(username)
                .orElseThrow(() -> {
                    log.info("User not found: {}", username);
                    return new IllegalArgumentException("User not found");
                });

        if (target.getIdUser().equals(user.getIdUser())) {
            throw new IllegalArgumentException("You cannot add yourself as a friend");
        }

        List<UUID> ids = compareUUIDs(user, target);
        UUID id1 = ids.get(0);
        UUID id2 = ids.get(1);

        var existing = friendListRepository.findByUserId1AndUserId2(id1, id2);

        if (existing.isPresent()) {
            switch (existing.get().getStatus()) {
                case PENDING:
                    throw new IllegalArgumentException("A friend request is already pending");

                case ACCEPTED:
                    throw new IllegalArgumentException("You are already friends");

                case BLOCKED:
                    throw new IllegalArgumentException("A friend request is already pending");

                case DECLINED:  
                        existing.get().setStatus(FriendshipStatus.PENDING);
                        existing.get().setCreatedAt(LocalDateTime.now());
                        friendListRepository.save(existing.get());
                        log.info("Friend request sent from {} to {}", user.getUserName(), username);
                        return;
                    }
            };

        FriendList friendList = new FriendList();
        friendList.setUserId1(id1);
        friendList.setUserId2(id2);
        friendList.setStatus(FriendshipStatus.PENDING);
        friendList.setCreatedAt(LocalDateTime.now());
        friendList.setSenderId(user.getIdUser());
        friendListRepository.save(friendList);

        log.info("Friend request sent from {} to {}", user.getUserName(), username);
    }

    /**
     * Accepts a friend request from one user to another.
     *
     * @param user     The user accepting the request.
     * @param idUser   The ID of the user sending the request.
     */
    @Transactional
    public void acceptFriendRequest(User user, UUID idUser) {

        if (user == null) {
            throw new IllegalArgumentException("User must be authenticated");
        }
        
        log.info("Accepting friend request from {} to {}", user.getUserName(), idUser);

        User userTarget = userRepository.findById(idUser)
                .orElseThrow(() -> {
                    log.info("User not found: {}", idUser);
                    return new IllegalArgumentException("User not found");
                });
        
        if (user.equals(userTarget)) {
            log.info("You cannot accept your own friend request");
            throw new IllegalArgumentException("You cannot accept your own friend request");
        }
        List<UUID> ids = compareUUIDs(user, userTarget);
        UUID id1 = ids.get(0);
        UUID id2 = ids.get(1);

        var existing = friendListRepository.findByUserId1AndUserId2(id1, id2);
        if (existing.isPresent()) {
            if (existing.get().getSenderId().equals(user.getIdUser())) {
                log.warn("Friend request from {} to {} is already pending", user.getUserName(), userTarget.getUserName());
                throw new IllegalArgumentException("Friend request is already pending");
            }
            if (existing.get().getStatus() == FriendshipStatus.PENDING) {
                existing.get().setStatus(FriendshipStatus.ACCEPTED);
                existing.get().setCreatedAt(LocalDateTime.now());
                friendListRepository.save(existing.get());
                log.info("Friend request accepted from {} to {}", user.getUserName(), userTarget.getUserName());
                return;
            }
            if (existing.get().getStatus() == FriendshipStatus.ACCEPTED) {
                log.info("Users {} and {} are already friends", user.getUserName(), userTarget.getUserName());
                throw new IllegalArgumentException("Users are already friends");
            }
        }
        log.warn("No friend request from {} to {} is pending", user.getUserName(), userTarget.getUserName());
        throw new IllegalArgumentException("No friend request is pending");
    }

    /**
     * Declines a friend request from one user to another.
     *
     * @param user     The user declining the request.
     * @param idUser   The ID of the user sending the request.
     */
    @Transactional
    public void declineFriendRequest(User user, UUID idUser) {

        if (user == null) {
            throw new IllegalArgumentException("User must be authenticated");
        }

        log.info("Declining friend request from {} to {}", user.getUserName(), idUser);

        User userTarget = userRepository.findById(idUser)
                .orElseThrow(() -> {
                    log.info("User not found: {}", idUser);
                    return new IllegalArgumentException("User not found");
                });

        if (user.equals(userTarget)) {
            log.info("You cannot decline yourself");
            throw new IllegalArgumentException("You cannot decline yourself");
        }
        List<UUID> ids = compareUUIDs(user, userTarget);
        UUID id1 = ids.get(0);
        UUID id2 = ids.get(1);

        var existing = friendListRepository.findByUserId1AndUserId2(id1, id2);
        if (existing.isPresent()) {
            if (existing.get().getStatus() == FriendshipStatus.PENDING) {
                existing.get().setStatus(FriendshipStatus.DECLINED);
                existing.get().setCreatedAt(LocalDateTime.now());
                friendListRepository.save(existing.get());
                log.info("Friend request declined from {} to {}", user.getUserName(), userTarget.getUserName());
                return;
            }
        }
        log.warn("No friend request from {} to {} is pending", user.getUserName(), userTarget.getUserName());
        throw new IllegalArgumentException("No friend request is pending");
    }

    /**
     * Compares the UUIDs of two users and returns them in a sorted list.
     *
     * @param user     The first user.
     * @param userTarget The second user.
     * @return A list containing the sorted UUIDs.
     */
    public List<UUID> compareUUIDs(User user, User userTarget) {
         List<UUID> ids = new ArrayList<>();
        ids.add(user.getIdUser());
        ids.add(userTarget.getIdUser());

        Collections.sort(ids);

        return ids;
    }
}