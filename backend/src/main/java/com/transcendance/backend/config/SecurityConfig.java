package com.transcendance.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

        @Bean
        public SecurityFilterChain filterChain(HttpSecurity http, JWTAuthenticationFilter jwtAuthFilter)
                        throws Exception {
                http
                                .cors(cors -> {
                                })
                                .csrf(csrf -> csrf.disable())
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                                .formLogin(form -> form.disable())
                                .httpBasic(basic -> basic.disable())
                                .authorizeHttpRequests(auth -> auth
                                                // --- Public : aucune authentification requise ---
                                                .requestMatchers(HttpMethod.POST,
                                                                "/api/auth/register",
                                                                "/api/auth/login",
                                                                "/api/auth/refresh-token",
                                                                "/api/auth/logout")
                                                .permitAll()
                                                .requestMatchers(HttpMethod.GET,
                                                                "/api/hello",
                                                                "/api/default-avatar.png",
                                                                "/api/avatars/**")
                                                .permitAll()
                                                // --- WebSocket handshake: authenticated by JwtHandshakeInterceptor ---
                                                .requestMatchers("/ws/**").permitAll()

                                                // --- USER et ADMIN ---
                                                .requestMatchers(HttpMethod.GET,
                                                                "/api/users/me",
                                                                "/api/users/{idUser}",
                                                                "/api/friend-list/me/list")
                                                .hasAnyRole("USER", "ADMIN")

                                                .requestMatchers(HttpMethod.POST,
                                                                "/api/friend-list/send-request",
                                                                "/api/friend-list/{idUser}/accept",
                                                                "/api/friend-list/{idUser}/decline",
                                                                "/api/friend-list/{idUser}/delete",
                                                                "/api/friend-list/{idUser}/block",
                                                                "/api/friend-list/{idUser}/unblock",
                                                                "/api/users/me/avatar")
                                                .hasAnyRole("USER", "ADMIN")

                                                .requestMatchers(HttpMethod.PUT,
                                                                "/api/users/{idUser}")
                                                .hasAnyRole("USER", "ADMIN")

                                                // --- CHESS ---
                                                .requestMatchers(HttpMethod.POST,
                                                                "/api/chess/invitations",
                                                                "/api/chess/invitations/accept",
                                                                "/api/chess/invitations/decline",
                                                                "/api/chess/matches/{matchId}/moves",
                                                                "/api/chess/matches/{matchId}/resign")
                                                .hasAnyRole("USER", "ADMIN")
                                                .requestMatchers(HttpMethod.GET,
                                                                "/api/chess/invitations/pending",
                                                                "/api/chess/matches/me",
                                                                "/api/chess/stats/me",
                                                                "/api/chess/stats/{userId}")
                                                .hasAnyRole("USER", "ADMIN")
                                                // --- CHAT ---
                                                .requestMatchers(HttpMethod.GET,
                                                                "/api/chat/{userId}")
                                                .hasAnyRole("USER", "ADMIN")
                                                .requestMatchers(HttpMethod.PUT,
                                                                "/api/chat/{userId}/read")
                                                .hasAnyRole("USER", "ADMIN")

                                                // --- ADMIN uniquement ---
                                                .requestMatchers(HttpMethod.GET,
                                                                "/api/users")
                                                .hasRole("ADMIN")
                                                .requestMatchers(HttpMethod.POST,
                                                                "/api/users/{idUser}",
                                                                "/api/users/delete/{idUser}")
                                                .hasRole("ADMIN")

                                                // --- Tout le reste est refuse ---
                                                .anyRequest().denyAll())
                                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

                return http.build();
        }

        @Bean
        public BCryptPasswordEncoder passwordEncoder() {
                return new BCryptPasswordEncoder();
        }

}
