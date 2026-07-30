package com.transcendance.backend.controller;

import org.apache.logging.log4j.Logger;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.transcendance.backend.dto.LoginRequestDto;
import com.transcendance.backend.services.LoginService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class LoginController {

    private static final Logger log = org.apache.logging.log4j.LogManager.getLogger(LoginController.class);

    private final LoginService loginService;

     public LoginController(LoginService loginService) {
        this.loginService = loginService;
    }

    /**
     * Handles user login requests.
     *
     * @param loginRequest the login request containing email and password
     * @param bindingResult the result of validation checks on the request
     * @return a ResponseEntity containing the JWT token in a cookie if successful, or an error message if failed
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequestDto loginRequest,
                                    BindingResult bindingResult) {
        log.info("Processing login for email: {}", loginRequest.getEmail());
        
        if (bindingResult.hasErrors()) {
            
            log.warn("Login failed due to validation error: {}",
                    bindingResult.getAllErrors().get(0).getDefaultMessage());
            
            return ResponseEntity.badRequest().body(bindingResult.getAllErrors());
        }

        try {
            String token = loginService.authenticate(loginRequest.getEmail(), loginRequest.getPassword());
            log.info("Login successful for email: {}", loginRequest.getEmail());
            
            ResponseCookie cookie = ResponseCookie.from("access_token", token)
                    .httpOnly(true)
                    .secure(false) //TODO: Change to true in production
                    .sameSite("strict")
                    .path("/")
                    .maxAge(15 * 60)
                    .build();
            
             return ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE, cookie.toString())
                    .body("Login successful");
        
        } catch (Exception e) {
            log.error("Login failed for email: {}. Error: {}", loginRequest.getEmail(), e.getMessage());
            return ResponseEntity.status(401).body("Invalid credentials");
        }
    }
}
