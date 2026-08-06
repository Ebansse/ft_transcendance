package com.transcendance.backend.config;

import java.security.Principal;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

@Configuration
public class StompPrincipalConfig {

    public static class UserHandshakeHandler extends DefaultHandshakeHandler {
        @Override
        protected Principal determineUser(org.springframework.http.server.ServerHttpRequest request,
                                           org.springframework.web.socket.WebSocketHandler wsHandler,
                                           java.util.Map<String, Object> attributes) {
            return (Principal) attributes.get("principal");
        }
    }
}