package com.transcendance.backend.services;

import java.util.Optional;
import java.util.UUID;

import org.apache.logging.log4j.Logger;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import com.transcendance.backend.config.Oauth42Properties;
import com.transcendance.backend.dto.Oauth42TokenResponseDto;
import com.transcendance.backend.dto.Oauth42UserInfoDto;
import com.transcendance.backend.model.User;

@Service
public class Oauth42Service {

    private static final Logger log = org.apache.logging.log4j.LogManager.getLogger(Oauth42Service.class);

    private static final String DEFAULT_AVATAR_URL = "/default-avatar.png";

    private final Oauth42Properties properties;
    private final UserService userService;
    private final UserRoleService userRoleService;
    private final RestClient restClient = RestClient.create();

    public Oauth42Service(Oauth42Properties properties, UserService userService, UserRoleService userRoleService) {
        this.properties = properties;
        this.userService = userService;
        this.userRoleService = userRoleService;
    }

    public String buildAuthorizationUrl() {
        log.info("Building 42 OAuth authorization URL");

        return UriComponentsBuilder.fromUriString(properties.getAuthorizeUri())
            .queryParam("client_id", properties.getClientId())
            .queryParam("redirect_uri", properties.getRedirectUri())
            .queryParam("response_type", "code")
            .queryParam("scope", "public")
            .build()
            .toUriString();
    }

    /**
     * Server-to-server call: never exposed to the frontend, since the
     * client_secret is used right here.
     *
     * @param code the temporary authorization code 42 gave the browser
     * @return a real access token for the 42 API
     */
    public String exchangeCodeForAccessToken(String code) {
        log.info("Exchanging 42 OAuth code for an access token");

        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("grant_type", "authorization_code");
        formData.add("client_id", properties.getClientId());
        formData.add("client_secret", properties.getClientSecret());
        formData.add("code", code);
        formData.add("redirect_uri", properties.getRedirectUri());

        Oauth42TokenResponseDto response = restClient.post()
            .uri(properties.getTokenUri())
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .body(formData)
            .retrieve()
            .body(Oauth42TokenResponseDto.class);

        return response.getAccessToken();
    }

    public Oauth42UserInfoDto fetchUserInfo(String accessToken) {
        log.info("Fetching 42 profile info");

        Oauth42UserInfoDto response = restClient.get()
            .uri(properties.getUserInfoUri())
            .header("Authorization", "Bearer " + accessToken)
            .retrieve()
            .body(Oauth42UserInfoDto.class);

        return response;
    }

    /**
     * Creates the local account on the fly if this is the user's first
     * login via 42.
     *
     * @param info the 42 profile to match or create a local account from
     * @return the matching or newly created local {@link User}
     */
    public User findOrCreateUser(Oauth42UserInfoDto info) {
        log.info("Looking up local account for 42 login: {}", info.getLogin());

        Optional<User> userOpt = userService.getUserByEmail(info.getEmail());
        if (userOpt.isPresent()) {
            log.info("Existing local account found for email: {}", info.getEmail());
            User user = userOpt.get();
            return user;
        }

        String username = info.getLogin();
        if (userService.isUserNameTaken(username)) {
            log.warn("Username '{}' already taken locally, appending suffix", username);
            username += "_42";
        }

        String passwd = UUID.randomUUID().toString();
        User newUser = new User(username, info.getEmail(), passwd);

        newUser.setAvatarUrl(DEFAULT_AVATAR_URL);

        User user = userService.createUser(newUser);
        userRoleService.assignRoleUserToNewUser(user);

        log.info("Created new local account for 42 login: {}", info.getLogin());
        return user;
    }
}
