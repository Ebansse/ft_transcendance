package com.transcendance.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Payload of an administrative user update.
 * <p>
 * Every field is overwritten with the value received, even when unchanged. The
 * user identifier is not part of the body: it is read from the request path.
 */
@Getter
@Setter
@NoArgsConstructor
public class UpdateUserRequestDto {

    @NotBlank(message = "Username is required")
    private String userName;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Role is required")
    private String role;
}
