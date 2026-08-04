package com.transcendance.backend.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.transcendance.backend.model.User;

@RestController
@RequestMapping("/api/friend-list")
public class FriendListController {
    
    @PostMapping("/send-request")
    public ResponseEntity<?> sendFriendRequest(@AuthenticationPrincipal User user, 
            @RequestBody String Username) {
        // Implementation for sending friend request
        return ResponseEntity.ok().build();
    }
}
