package com.transcendance.backend.controller;

import java.util.Map;

import org.apache.logging.log4j.Logger;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.transcendance.backend.dto.UserNameRequestDto;
import com.transcendance.backend.model.User;
import com.transcendance.backend.services.FriendListService;

import jakarta.validation.Valid;


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
            @Valid @RequestBody UserNameRequestDto Username,
            BindingResult bindingResult) {
        
        if (Username == null) {
            log.warn("Friend request failed: Username is null");
            return ResponseEntity.status(401).body(Map.of("error", "Username is null"));
        }
        if (bindingResult.hasErrors()) {
            log.warn("Friend request failed: Invalid username format");
            return ResponseEntity.status(400).body(Map.of("error", "Invalid username format"));
        }
        log.info("Sending friend request from {} to {}", user.getUserName(), Username.getUserName());
        try {
            friendListService.sendFriendRequest(user, Username.getUserName());
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            log.error("Friend request failed: {}", e.getMessage());
            return ResponseEntity.status(401).body(Map.of("error", "Failed to send friend request"));
        }
    }
}

