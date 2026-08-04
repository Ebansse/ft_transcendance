package com.transcendance.backend.services;

import java.time.LocalDateTime;
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

        UUID id1;
        UUID id2;

        if (user.getIdUser().compareTo(target.getIdUser()) < 0) {
            id1 = user.getIdUser();
            id2 = target.getIdUser();
        } else {
            id1 = target.getIdUser();
            id2 = user.getIdUser();
}

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
        friendListRepository.save(friendList);

        log.info("Friend request sent from {} to {}", user.getUserName(), username);
    }

}

#TODO JE DOIS FAIRE UN DTO pour recuperer lusername qui est envoyer en JSON et apres je peux le traiter dans mon controller et service