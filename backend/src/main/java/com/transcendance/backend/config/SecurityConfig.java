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
	public SecurityFilterChain filterChain(HttpSecurity http, JWTAuthenticationFilter jwtAuthFilter) throws Exception {
		http
			.cors(cors -> {})
			.csrf(csrf -> csrf.disable())
			.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
			.formLogin(form -> form.disable())
			.httpBasic(basic -> basic.disable())
			.authorizeHttpRequests(auth -> auth
                // --- Public : aucune authentification requise ---
                .requestMatchers(HttpMethod.POST,
                    "/api/auth/register",
                    "/api/auth/login",
                    "/api/auth/refresh-token",
                    "/api/auth/logout"
                ).permitAll()
                .requestMatchers(HttpMethod.GET,
                    "/api/hello",
                    "/default-avatar.png"
                ).permitAll()

                // --- USER et ADMIN ---
                .requestMatchers(HttpMethod.GET,
                    "/api/users/me",
                    "/api/users/{idUser}",
                    "/api/friend-list/me/list"
                ).hasAnyRole("USER", "ADMIN")
                .requestMatchers(HttpMethod.POST,
                    "/api/friend-list/send-request",
                    "/api/friend-list/{idUser}/accept",
                    "/api/friend-list/{idUser}/decline",
                    "/api/friend-list/{idUser}/delete",
                    "/api/friend-list/{idUser}/block"
                ).hasAnyRole("USER", "ADMIN")

                // --- USER update ---
                .requestMatchers(HttpMethod.PUT,
                    "/api/users/{idUser}").hasAnyRole("USER", "ADMIN")

                // --- ADMIN uniquement ---
                .requestMatchers(HttpMethod.GET,
                    "/api/users"
                ).hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST,
                    "/api/users/{idUser}",
                    "/api/users/delete/{idUser}"
                ).hasRole("ADMIN")

                // --- Tout le reste est refuse ---
                .anyRequest().denyAll()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

		return http.build();
	}

	@Bean
    public BCryptPasswordEncoder passwordEncoder(){
        return new BCryptPasswordEncoder();
    }

}
