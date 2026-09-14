package com.transcendance.backend.services;

import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Service;

import com.transcendance.backend.dto.TwoFactorSetupResponseDto;
import com.transcendance.backend.model.User;

import dev.samstevens.totp.code.CodeVerifier;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.code.DefaultCodeVerifier;
import dev.samstevens.totp.code.HashingAlgorithm;
import dev.samstevens.totp.exceptions.QrGenerationException;
import dev.samstevens.totp.qr.QrData;
import dev.samstevens.totp.qr.QrGenerator;
import dev.samstevens.totp.qr.ZxingPngQrGenerator;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.secret.SecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import dev.samstevens.totp.util.Utils;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TwoFactorService {

    private static final Logger log = org.apache.logging.log4j.LogManager.getLogger(TwoFactorService.class);

    private static final String ISSUER = "ft_transcendence";

    private final UserService userService;

    private final SecretGenerator secretGenerator = new DefaultSecretGenerator();
    private final QrGenerator qrGenerator = new ZxingPngQrGenerator();
    private final CodeVerifier codeVerifier = new DefaultCodeVerifier(
            new DefaultCodeGenerator(), new SystemTimeProvider());

    /**
     * Generates a new TOTP secret for the user and the matching QR code.
     * <p>
     * The secret is stored right away but 2FA stays disabled until the user
     * proves their app is configured by sending a first valid code to
     * {@link #enable(User, String)}. Calling setup again before that simply
     * replaces the pending secret.
     *
     * @param user the authenticated user
     * @return the QR code as a PNG data URI and the raw secret
     * @throws IllegalStateException if 2FA is already enabled for this user
     * @throws QrGenerationException if the QR code image cannot be generated
     */
    public TwoFactorSetupResponseDto generateSetup(User user) throws QrGenerationException {
        if (user.isTwoFactorEnabled()) {
            log.warn("2FA setup refused, already enabled for user id: {}", user.getIdUser());
            throw new IllegalStateException("Two-factor authentication is already enabled");
        }

        String secret = secretGenerator.generate();

        QrData data = new QrData.Builder()
                .label(user.getEmail())
                .secret(secret)
                .issuer(ISSUER)
                .algorithm(HashingAlgorithm.SHA1)
                .digits(6)
                .period(30)
                .build();

        String qrCodeDataUri = Utils.getDataUriForImage(qrGenerator.generate(data), qrGenerator.getImageMimeType());

        user.setTotpSecret(secret);
        userService.saveUser(user);

        log.info("2FA secret generated for user id: {}", user.getIdUser());
        return new TwoFactorSetupResponseDto(qrCodeDataUri, secret);
    }

    /**
     * Checks a login code against the user's active 2FA secret.
     *
     * @param user the user trying to log in, with 2FA enabled
     * @param code the 6-digit code from the authenticator app
     * @return true if the code matches the current time window
     */
    public boolean isValidLoginCode(User user, String code) {
        return user.isTwoFactorEnabled() && codeVerifier.isValidCode(user.getTotpSecret(), code);
    }

    /**
     * Enables 2FA once the user has sent a valid code generated from the
     * pending secret.
     *
     * @param user the authenticated user
     * @param code the 6-digit code from the authenticator app
     * @throws IllegalStateException if 2FA is already enabled or no setup was done
     * @throws IllegalArgumentException if the code is invalid
     */
    public void enable(User user, String code) {
        if (user.isTwoFactorEnabled()) {
            throw new IllegalStateException("Two-factor authentication is already enabled");
        }
        if (user.getTotpSecret() == null) {
            throw new IllegalStateException("Two-factor authentication setup is required first");
        }
        if (!codeVerifier.isValidCode(user.getTotpSecret(), code)) {
            log.warn("Invalid 2FA code for user id: {}", user.getIdUser());
            throw new IllegalArgumentException("Invalid code");
        }

        user.setTwoFactorEnabled(true);
        userService.saveUser(user);

        log.info("2FA enabled for user id: {}", user.getIdUser());
    }

    /**
     * Disables 2FA after checking a code from the authenticator app, so a
     * hijacked session alone is not enough to turn it off. The secret is
     * cleared: enabling again requires a fresh setup and a new QR code.
     *
     * @param user the authenticated user
     * @param code the 6-digit code from the authenticator app
     * @throws IllegalStateException if 2FA is not enabled
     * @throws IllegalArgumentException if the code is invalid
     */
    public void disable(User user, String code) {
        if (!user.isTwoFactorEnabled()) {
            throw new IllegalStateException("Two-factor authentication is not enabled");
        }
        if (!codeVerifier.isValidCode(user.getTotpSecret(), code)) {
            log.warn("Invalid 2FA code on disable for user id: {}", user.getIdUser());
            throw new IllegalArgumentException("Invalid code");
        }

        user.setTwoFactorEnabled(false);
        user.setTotpSecret(null);
        userService.saveUser(user);

        log.info("2FA disabled for user id: {}", user.getIdUser());
    }
}
