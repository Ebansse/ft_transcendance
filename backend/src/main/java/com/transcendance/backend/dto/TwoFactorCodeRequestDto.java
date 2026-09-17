package com.transcendance.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Payload carrying a 6-digit TOTP code from the user's authenticator app.
 */
@Getter
@Setter
@NoArgsConstructor
public class TwoFactorCodeRequestDto {

    @NotBlank(message = "Code is required")
    @Pattern(regexp = "^\\d{6}$", message = "Code must be 6 digits")
    private String code;
}
