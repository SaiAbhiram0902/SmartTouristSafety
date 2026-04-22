package com.safety.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private JwtAuthFilter jwtAuthFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // Use our CORS config — must be here, not just in CorsConfig
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // Disable CSRF — we use JWT, not sessions
                .csrf(csrf -> csrf.disable())

                // Stateless — no sessions
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                .authorizeHttpRequests(auth -> auth
                        // Public endpoints — no token needed
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/api/location/update").permitAll() // ESP32 posts here
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/location/history/**").authenticated() // breadcrumb trail
                        .requestMatchers("/ws/**").permitAll()               // WebSocket
                        .requestMatchers("/h2-console/**").permitAll()       // Dev only
                        .requestMatchers("/uploads/**").permitAll()          // Tourist photos

                        // Tourists can read hotspots, zones, alerts and post reviews
                        .requestMatchers(org.springframework.http.HttpMethod.GET,  "/api/hotspots/**").authenticated()
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/hotspots/*/reviews").authenticated()
                        .requestMatchers(org.springframework.http.HttpMethod.GET,  "/api/zones/**").authenticated()
                        .requestMatchers(org.springframework.http.HttpMethod.GET,  "/api/alerts/**").authenticated()
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/alerts/**").authenticated()
                        .requestMatchers("/api/chat/**").authenticated()
                        .requestMatchers("/api/chat/**").authenticated()  // AI chatbot proxy

                        // Admin-only endpoints (writes)
                        .requestMatchers("/api/zones/**").hasRole("ADMIN")
                        .requestMatchers("/api/hotspots/**").hasRole("ADMIN")
                        .requestMatchers("/api/alerts/**").hasRole("ADMIN")
                        .requestMatchers("/api/dashboard/**").hasRole("ADMIN")
                        .requestMatchers("/api/geo/**").hasRole("ADMIN")

                        // Tourist endpoints — both roles can access
                        .requestMatchers("/api/tourists/**").authenticated()

                        // Everything else requires authentication
                        .anyRequest().authenticated()
                )

                // Add JWT filter before Spring's default auth filter
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
