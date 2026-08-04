package com.transcendance.backend.services;

import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Service;

import com.transcendance.backend.model.User;
import com.transcendance.backend.repository.UserRepository;

import jakarta.transaction.Transactional;
import lombok.NoArgsConstructor;


@Service
public class FriendListService {
    
    private static final Logger log = org.apache.logging.log4j.LogManager.getLogger(FriendListService.class);

    private UserRepository userRepository;

    public FriendListService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    public void sendFriendRequest(User user, String username) {
        
        //find player username
        User user2 = userRepository.findByUsername(username).orElseThrow(() -> {
            log.info("User not found");
            return new RuntimeException("User not found");
        });
        //verification de doublon
        
        //save db  
    }

    public boolean isFriend(User user, User user2) {
        
    }

    public boolean alreadyInvited(User user, User user2) {
}
