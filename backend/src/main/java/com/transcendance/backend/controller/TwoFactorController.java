package com.transcendance.backend.controller;

import java.util.HashMap;
import java.util.Map;

import org.apache.logging.log4j.Logger;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.transcendance.backend.dto.TwoFactorCodeRequestDto;
import com.transcendance.backend.model.User;
import com.transcendance.backend.services.TwoFactorService;

import dev.samstevens.totp.exceptions.QrGenerationException;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth/2fa")
public class TwoFactorController {

    private static final Logger log = org.apache.logging.log4j.LogManager.getLogger(TwoFactorController.class);

    private final TwoFactorService twoFactorService;

    public TwoFactorController(TwoFactorService twoFactorService) {
        this.twoFactorService = twoFactorService;
    }

    /**
     * Starts the 2FA setup: generates a TOTP secret and its QR code.
     *
     * @param user the authenticated user
     * @return 200 with the QR code data URI and the secret, 409 if 2FA is
     *         already enabled, 500 if the QR code cannot be generated
     */
    @PostMapping("/setup")
    public ResponseEntity<?> setup(@AuthenticationPrincipal User user) {
        log.info("2FA setup requested by user id: {}", user.getIdUser());

        try {
            return ResponseEntity.ok(twoFactorService.generateSetup(user));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (QrGenerationException e) {
            log.error("QR code generation failed for user id: {}", user.getIdUser(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", "Could not generate QR code"));
        }
    }

    /**
     * Enables 2FA after checking a first code from the authenticator app.
     *
     * @param user the authenticated user
     * @param request the code to verify
     * @param bindingResult the result of validation checks on the request
     * @return 200 if enabled, 400 if the code is malformed or invalid, 409 if
     *         2FA is already enabled or setup was not done
     */
    @PostMapping("/enable")
    public ResponseEntity<?> enable(@AuthenticationPrincipal User user,
            @Valid @RequestBody TwoFactorCodeRequestDto request, BindingResult bindingResult) {

        if (bindingResult.hasErrors()) {
            Map<String, String> errors = new HashMap<>();
            bindingResult.getFieldErrors().forEach(error ->
                    errors.put(error.getField(), error.getDefaultMessage())
            );
            log.warn("2FA enable failed due to validation error: {}", errors);
            return ResponseEntity.badRequest().body(errors);
        }

        try {
            twoFactorService.enable(user, request.getCode());
            return ResponseEntity.ok(Map.of("message", "Two-factor authentication enabled"));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Disables 2FA after checking a code from the authenticator app.
     *
     * @param user the authenticated user
     * @param request the code to verify
     * @param bindingResult the result of validation checks on the request
     * @return 200 if disabled, 400 if the code is malformed or invalid, 409 if
     *         2FA is not enabled
     */
    @PostMapping("/disable")
    public ResponseEntity<?> disable(@AuthenticationPrincipal User user,
            @Valid @RequestBody TwoFactorCodeRequestDto request, BindingResult bindingResult) {

        if (bindingResult.hasErrors()) {
            Map<String, String> errors = new HashMap<>();
            bindingResult.getFieldErrors().forEach(error ->
                    errors.put(error.getField(), error.getDefaultMessage())
            );
            log.warn("2FA disable failed due to validation error: {}", errors);
            return ResponseEntity.badRequest().body(errors);
        }

        try {
            twoFactorService.disable(user, request.getCode());
            return ResponseEntity.ok(Map.of("message", "Two-factor authentication disabled"));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
