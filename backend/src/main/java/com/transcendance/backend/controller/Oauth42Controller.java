package com.transcendance.backend.controller;

import java.net.URI;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.apache.logging.log4j.Logger;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClientException;

import com.transcendance.backend.config.Oauth42Properties;
import com.transcendance.backend.dto.Oauth42UserInfoDto;
import com.transcendance.backend.model.User;
import com.transcendance.backend.services.JWTService;
import com.transcendance.backend.services.Oauth42Service;
import com.transcendance.backend.services.UserService;
import com.transcendance.backend.services.RefreshTokenService;
import com.transcendance.backend.services.TwoFactorService;

@RestController
@RequestMapping("/api/auth/42")
public class Oauth42Controller {

    private static final Logger log = org.apache.logging.log4j.LogManager.getLogger(Oauth42Controller.class);

    private final Oauth42Service oauth42Service;
    private final Oauth42Properties properties;
    private final JWTService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final TwoFactorService twoFactorService;
    private final UserService userService;

    public Oauth42Controller(Oauth42Service oauth42Service, Oauth42Properties properties,
            JWTService jwtService, RefreshTokenService refreshTokenService, TwoFactorService twoFactorService,
            UserService userService) {
        this.oauth42Service = oauth42Service;
        this.properties = properties;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.twoFactorService = twoFactorService;
        this.userService = userService;
    }

    /**
     * Builds a frontend URL, whatever the configured base looks like.
     *
     * @param suffix the path and query to append, may be empty
     * @return the absolute frontend URL to redirect the browser to
     */
    private String frontendUrl(String suffix) {
        String base = properties.getFrontendRedirectUri();
        if (!base.endsWith("/")) {
            base += "/";
        }
        return base + suffix;
    }

    /**
     * Entry point of the OAuth flow: sends the browser to 42's own login
     * and authorization page.
     *
     * @return a redirect to 42's authorization page
     */
    @GetMapping("/login")
    public ResponseEntity<Void> redirectTo42() {
        log.info("Redirecting to 42 OAuth authorization page");

        String	targetUrl = oauth42Service.buildAuthorizationUrl();
        return ResponseEntity.status(HttpStatus.FOUND)
				.location(URI.create(targetUrl))
				.build();
    }

    /**
     * Entry point of the account linking flow, for someone already logged in
     * locally: same authorization page, but with a signed state that says who
     * asked. Called through a real browser navigation, so the sameSite=strict
     * session cookie is sent (this request is same-site, unlike the callback).
     *
     * @param user the authenticated local account
     * @return a redirect to 42's authorization page, or to the profile page
     *         with an error if this account is already linked
     */
    @GetMapping("/link")
    public ResponseEntity<Void> linkAccount(@AuthenticationPrincipal User user) {
        log.info("42 account linking requested by user id: {}", user.getIdUser());

        if (user.getOauth42Id() != null) {
            return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(frontendUrl("profile?error=already_linked")))
                .build();
        }

        String targetUrl = oauth42Service.buildAuthorizationUrl(jwtService.generateLink42State(user));
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(targetUrl))
                .build();
    }

    /**
     * Drops the link between this account and its 42 one.
     *
     * @param user the authenticated local account
     * @return 200 once unlinked, 409 if the account was created through 42
     *         and has no password its owner could log in with
     */
    @PostMapping("/unlink")
    public ResponseEntity<?> unlinkAccount(@AuthenticationPrincipal User user) {
        log.info("42 account unlinking requested by user id: {}", user.getIdUser());

        try {
            oauth42Service.unlinkAccount(user);
            return ResponseEntity.ok().build();
        } catch (IllegalStateException e) {
            log.warn("42 unlink refused for user {}: {}", user.getIdUser(), e.getMessage());
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * 42 redirects here once the user has approved the app. Logs the user
     * in locally and redirects to the frontend with the session cookies
     * set: the refresh cookie is scoped to {@code /api/auth} only, while the
     * access cookie is usable app-wide.
     * <p>
     * If the account has 2FA enabled, no session cookie is set: a short-lived
     * {@code two_factor_token} cookie is set instead and the frontend asks for
     * the code, sent to {@code POST /api/auth/2fa/login}.
     *
     * A {@code state} means the round trip started from {@code /link}: the
     * browser is then coming back to attach this 42 identity to the account
     * named by the state, and no session cookie is set.
     *
     * @param code the temporary authorization code 42 appended to this callback
     * @param state the signed linking token, absent on a plain login
     * @return a redirect to the frontend, with the access/refresh cookies set
     */
    @GetMapping("/callback")
    public ResponseEntity<Void> handleCallback(@RequestParam String code,
            @RequestParam(required = false) String state) {
        log.info("Handling 42 OAuth callback");

        try {
            
            String access_token_42 = oauth42Service.exchangeCodeForAccessToken(code);
    
            Oauth42UserInfoDto userDto = oauth42Service.fetchUserInfo(access_token_42);

            if (state != null) {
                return handleLinkCallback(state, userDto);
            }

            User localUser = oauth42Service.findOrCreateUser(userDto);

            if (localUser.isTwoFactorEnabled()) {
                ResponseCookie twoFactorCookie = ResponseCookie.from("two_factor_token",
                        twoFactorService.createPendingLogin(localUser))
                  .httpOnly(true)
                  .secure(true)
                  .sameSite("strict")
                  .path("/api/auth/2fa")
                  .maxAge(5 * 60)
                  .build();

                log.info("42 OAuth login waiting for 2FA code, user id: {}", localUser.getIdUser());
                return ResponseEntity.status(HttpStatus.FOUND)
                    .location(URI.create(frontendUrl("?twoFactor=required")))
                    .header(HttpHeaders.SET_COOKIE, twoFactorCookie.toString())
                    .build();
            }
    
            String accessToken42 = jwtService.generateAccessToken(localUser);
            String refreshToken42 = refreshTokenService.generateRefreshToken(localUser);
    
            ResponseCookie accessCookie = ResponseCookie.from("access_token", accessToken42)
              .httpOnly(true)
              .secure(true)
              .sameSite("strict")
              .path("/")
              .maxAge(15 * 60)
              .build();
      
              ResponseCookie refreshCookie = ResponseCookie.from("refresh_token", refreshToken42)
              .httpOnly(true)
              .secure(true)
              .sameSite("strict")
              .path("/api/auth")
              .maxAge(7 * 24 * 60 * 60)
              .build();
    
            return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(frontendUrl("")))
                .header(HttpHeaders.SET_COOKIE, accessCookie.toString())
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                .build();
    
        } catch (IllegalStateException e) {
            log.warn("42 OAuth callback refused: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(frontendUrl("?error=email_already_registered")))
                .build();
        } catch (RestClientException e) {
            // Un echange de code rate pendant un liage doit ramener sur le profil,
            // d'ou le liage est reparti, et non sur l'accueil.
            log.warn("42 OAuth callback failed: {}", e.getMessage());
            String target = state != null ? "profile?error=oauth_failed" : "?error=oauth_failed";
            return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(frontendUrl(target)))
                .build();
        }
    }

    /**
     * Linking branch of the callback: the state, not a cookie, says who is
     * linking. Nothing here opens a session.
     *
     * @param state the signed token issued by {@code /link}
     * @param info the 42 profile that just came back
     * @return a redirect to the profile page, with the outcome in the query
     */
    private ResponseEntity<Void> handleLinkCallback(String state, Oauth42UserInfoDto info) {
        String idUser = jwtService.extractUserIdFromLink42State(state);
        if (idUser == null) {
            log.warn("42 linking callback got an invalid state");
            return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(frontendUrl("profile?error=link_failed")))
                .build();
        }

        Optional<User> userOpt = userService.getUserById(UUID.fromString(idUser));
        if (userOpt.isEmpty()) {
            log.warn("42 linking callback names an unknown user: {}", idUser);
            return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(frontendUrl("profile?error=link_failed")))
                .build();
        }

        try {
            oauth42Service.linkAccount(userOpt.get(), info);
        } catch (IllegalStateException e) {
            log.warn("42 linking refused for user {}: {}", idUser, e.getMessage());
            return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(frontendUrl("profile?error=already_linked")))
                .build();
        }

        log.info("42 account linked to user {}", idUser);
        return ResponseEntity.status(HttpStatus.FOUND)
            .location(URI.create(frontendUrl("profile?linked=42")))
            .build();
    }
}
