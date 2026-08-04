package com.transcendance.backend.controller;

import java.util.Map;

import org.apache.logging.log4j.Logger;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.transcendance.backend.model.User;
import com.transcendance.backend.services.FriendListService;


@RestController
@RequestMapping("/api/friend-list")
public class FriendListController {
    
    private static final Logger log = org.apache.logging.log4j.LogManager.getLogger(FriendListController.class);

    private final FriendListService friendListService;

    public FriendListController(FriendListService friendListService) {
        this.friendListService = friendListService;
    }

    @PostMapping("/send-request")
    public ResponseEntity<?> sendFriendRequest(@AuthenticationPrincipal User user, 
            @RequestBody String Username) {
        
        if (Username == null) {
            log.warn("Friend request failed: Username is null");
            return ResponseEntity.status(401).body(Map.of("error", "Username is null"));
        }
        log.info("Sending friend request from {} to {}", user.getUserName(), Username);
        try {
            friendListService.sendFriendRequest(user, Username);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            log.error("Error occurred while sending friend request", e);
            return ResponseEntity.status(401).body(Map.of("error", "Failed to send friend request"));
        }
    }
}

