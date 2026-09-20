package com.transcendance.backend.controller;

import java.net.URI;

import org.apache.logging.log4j.Logger;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClientException;

import com.transcendance.backend.config.Oauth42Properties;
import com.transcendance.backend.dto.Oauth42UserInfoDto;
import com.transcendance.backend.model.User;
import com.transcendance.backend.services.JWTService;
import com.transcendance.backend.services.Oauth42Service;
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

    public Oauth42Controller(Oauth42Service oauth42Service, Oauth42Properties properties,
            JWTService jwtService, RefreshTokenService refreshTokenService, TwoFactorService twoFactorService) {
        this.oauth42Service = oauth42Service;
        this.properties = properties;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.twoFactorService = twoFactorService;
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
     * 42 redirects here once the user has approved the app. Logs the user
     * in locally and redirects to the frontend with the session cookies
     * set: the refresh cookie is scoped to {@code /api/auth} only, while the
     * access cookie is usable app-wide.
     * <p>
     * If the account has 2FA enabled, no session cookie is set: a short-lived
     * {@code two_factor_token} cookie is set instead and the frontend asks for
     * the code, sent to {@code POST /api/auth/2fa/login}.
     *
     * @param code the temporary authorization code 42 appended to this callback
     * @return a redirect to the frontend, with the access/refresh cookies set
     */
    @GetMapping("/callback")
    public ResponseEntity<Void> handleCallback(@RequestParam String code) {
        log.info("Handling 42 OAuth callback");

        try {
            
            String access_token_42 = oauth42Service.exchangeCodeForAccessToken(code);
    
            Oauth42UserInfoDto userDto = oauth42Service.fetchUserInfo(access_token_42);
    
            User localUser = oauth42Service.findOrCreateUser(userDto);

            if (localUser.isTwoFactorEnabled()) {
                ResponseCookie twoFactorCookie = ResponseCookie.from("two_factor_token",
                        twoFactorService.createPendingLogin(localUser))
                  .httpOnly(true)
                  .secure(false)
                  .sameSite("strict")
                  .path("/api/auth/2fa")
                  .maxAge(5 * 60)
                  .build();

                log.info("42 OAuth login waiting for 2FA code, user id: {}", localUser.getIdUser());
                return ResponseEntity.status(HttpStatus.FOUND)
                    .location(URI.create(properties.getFrontendRedirectUri() + "?twoFactor=required"))
                    .header(HttpHeaders.SET_COOKIE, twoFactorCookie.toString())
                    .build();
            }
    
            String accessToken42 = jwtService.generateAccessToken(localUser);
            String refreshToken42 = refreshTokenService.generateRefreshToken(localUser);
    
            ResponseCookie accessCookie = ResponseCookie.from("access_token", accessToken42)
              .httpOnly(true)
              .secure(false)
              .sameSite("strict")
              .path("/")
              .maxAge(15 * 60)
              .build();
      
              ResponseCookie refreshCookie = ResponseCookie.from("refresh_token", refreshToken42)
              .httpOnly(true)
              .secure(false)
              .sameSite("strict")
              .path("/api/auth")
              .maxAge(7 * 24 * 60 * 60)
              .build();
    
            return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(properties.getFrontendRedirectUri()))
                .header(HttpHeaders.SET_COOKIE, accessCookie.toString())
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                .build();
    
        } catch (IllegalStateException e) {
            log.warn("42 OAuth callback refused: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(properties.getFrontendRedirectUri() + "?error=email_already_registered"))
                .build();
        } catch (RestClientException e) {
            log.warn("42 OAuth callback failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(properties.getFrontendRedirectUri() + "?error=oauth_failed"))
                .build();
        }
    }
}
