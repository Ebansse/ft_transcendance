package com.transcendance.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class LogoutController {
    
    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        // Implementation for logout logic
        return ResponseEntity.ok().build();
    }
}
